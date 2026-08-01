import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { purchase_number: { contains: search } },
            { supplier_name_snapshot: { contains: search } },
            { supplier_invoice_number: { contains: search } },
          ],
        }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.t_purchase.count({ where }),
      prisma.t_purchase.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          creator: {
            select: {
              user_id: true,
              username: true,
              full_name: true,
            },
          },
        },
        orderBy: { purchase_datetime: 'desc' },
      }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('GET purchases error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Read session from cookie
    const sessionCookie = req.cookies.get('user_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali' }, { status: 401 });
    }

    let userSession;
    try {
      userSession = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
    }

    const body = await req.json();
    const {
      supplier_id,
      supplier_invoice_number,
      notes,
      details, // Array: [ { product_id, quantity, purchase_unit_price, line_total } ]
    } = body;

    // 1. Basic validation
    if (!supplier_id) {
      return NextResponse.json({ message: 'Supplier wajib dipilih' }, { status: 400 });
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json({ message: 'Minimal harus ada 1 produk dalam transaksi' }, { status: 400 });
    }

    // Check for duplicate products
    const productIds = details.map((d) => d.product_id);
    const hasDuplicates = new Set(productIds).size !== productIds.length;
    if (hasDuplicates) {
      return NextResponse.json({ message: 'Tidak boleh ada produk duplikat dalam satu transaksi' }, { status: 400 });
    }

    // 2. Database validation and processing inside 1 transaction
    const result = await prisma.$transaction(async (tx) => {
      // Verify supplier is active
      const supplier = await tx.m_supplier.findUnique({
        where: { supplier_id: parseInt(supplier_id, 10) },
      });
      if (!supplier || !supplier.is_active) {
        throw new Error('Supplier tidak ditemukan atau status tidak aktif');
      }

      // Verify creator user is active
      const user = await tx.m_user.findUnique({
        where: { user_id: userSession.user_id },
      });
      if (!user || !user.is_active) {
        throw new Error('User pembuat tidak aktif atau tidak ditemukan');
      }

      let calculatedTotal = 0;
      const detailsToInsert = [];
      const stockUpdates = [];
      const stockMovements = [];
      const costUpdates = [];

      let lineNum = 1;
      for (const item of details) {
        const productId = parseInt(item.product_id, 10);
        const qty = parseInt(item.quantity, 10);
        const unitPrice = parseFloat(item.purchase_unit_price);
        const lineTotalInput = parseFloat(item.line_total);

        // Validations per line
        if (isNaN(productId) || isNaN(qty) || isNaN(unitPrice) || isNaN(lineTotalInput)) {
          throw new Error('Format data produk tidak valid');
        }
        if (qty <= 0) {
          throw new Error('Kuantitas produk harus berupa bilangan bulat positif');
        }
        if (unitPrice < 0) {
          throw new Error('Harga beli produk tidak boleh negatif');
        }

        const product = await tx.m_product.findUnique({
          where: { product_id: productId },
          include: { unit: true },
        });

        if (!product || !product.is_active) {
          throw new Error(`Produk dengan ID ${productId} tidak ditemukan atau tidak aktif`);
        }

        // Expected total check
        const expectedLineTotal = Math.round(qty * unitPrice * 100) / 100;
        const diff = Math.abs(lineTotalInput - expectedLineTotal);
        if (diff > 0.01) {
          // Throw special error for frontend mismatch handling
          const errorResponse = {
            errorType: 'PRICE_MISMATCH',
            productName: product.product_name,
            productId: product.product_id,
            expected: expectedLineTotal,
            actual: lineTotalInput,
            quantity: qty,
            purchase_unit_price: unitPrice,
          };
          throw new Error(JSON.stringify(errorResponse));
        }

        calculatedTotal += lineTotalInput;

        // Detail record
        detailsToInsert.push({
          line_number: lineNum++,
          product_id: product.product_id,
          product_code_snapshot: product.product_code,
          product_name_snapshot: product.product_name,
          unit_name_snapshot: product.unit.unit_name,
          quantity: qty,
          purchase_unit_price: unitPrice,
          line_total: lineTotalInput,
        });

        // Stock update operations
        stockUpdates.push({
          product_id: product.product_id,
          quantity: qty,
        });

        // Cost price update
        costUpdates.push({
          product_id: product.product_id,
          cost_price: unitPrice,
        });
      }

      // Generate Purchase Number safely under lock
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;

      // Write-lock matching records for sequence count
      const lastPurchase = await tx.$queryRawUnsafe<any[]>(
        `SELECT purchase_number FROM t_purchase WHERE purchase_number LIKE 'PB-${dateStr}-%' ORDER BY purchase_number DESC LIMIT 1 FOR UPDATE`
      );

      let nextSeq = 1;
      if (lastPurchase && lastPurchase.length > 0) {
        const lastNum = lastPurchase[0].purchase_number;
        const parts = lastNum.split('-');
        if (parts.length === 3) {
          nextSeq = parseInt(parts[2], 10) + 1;
        }
      }
      const seqFormatted = String(nextSeq).padStart(6, '0');
      const purchaseNumber = `PB-${dateStr}-${seqFormatted}`;

      // 3. Create purchase header
      const purchase = await tx.t_purchase.create({
        data: {
          purchase_number: purchaseNumber,
          purchase_datetime: new Date(),
          supplier_id: supplier.supplier_id,
          supplier_name_snapshot: supplier.supplier_name,
          supplier_invoice_number: supplier_invoice_number ? supplier_invoice_number.trim() : null,
          created_by_user_id: user.user_id,
          created_by_name_snapshot: user.full_name,
          total_amount: calculatedTotal,
          notes: notes ? notes.trim() : null,
        },
      });

      // 4. Create details, update stock, write movements, update product costs
      for (const d of detailsToInsert) {
        const detailRecord = await tx.t_purchase_detail.create({
          data: {
            ...d,
            purchase_id: purchase.purchase_id,
          },
        });

        // Update Stock
        await tx.m_product_stock.upsert({
          where: { product_id: d.product_id },
          update: {
            stock_quantity: { increment: d.quantity },
          },
          create: {
            product_id: d.product_id,
            stock_quantity: d.quantity,
          },
        });

        // Write movement history
        await tx.t_stock_movement.create({
          data: {
            product_id: d.product_id,
            movement_type: 'PURCHASE_IN',
            reference_number: purchaseNumber,
            reference_id: purchase.purchase_id,
            reference_detail_id: detailRecord.purchase_detail_id,
            quantity_in: d.quantity,
            quantity_out: 0,
            unit_cost: d.purchase_unit_price,
            created_by_user_id: user.user_id,
          },
        });

        // Update product cost_price
        await tx.m_product.update({
          where: { product_id: d.product_id },
          data: {
            cost_price: d.purchase_unit_price,
          },
        });
      }

      return purchase;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Purchase creation error:', error.message);
    try {
      // Check if it's our JSON error format
      const errObj = JSON.parse(error.message);
      if (errObj && errObj.errorType === 'PRICE_MISMATCH') {
        return NextResponse.json(errObj, { status: 400 });
      }
    } catch {}

    return NextResponse.json({ message: error.message || 'Kesalahan server internal' }, { status: 500 });
  }
}
