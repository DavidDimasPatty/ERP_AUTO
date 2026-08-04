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
          { sales_number: { contains: search } },
          { customer_name_snapshot: { contains: search } },
          { cashier_name_snapshot: { contains: search } },
        ],
      }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.t_sales.count({ where }),
      prisma.t_sales.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          cashier: {
            select: {
              user_id: true,
              username: true,
              full_name: true,
            },
          },
        },
        orderBy: { sales_datetime: 'desc' },
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
    console.error('GET sales error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    //cek sesi user
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
      sales_type, // 'BENGKEL' atau 'ECERAN'
      customer_id,
      discount_amount, // diskon
      details, // Array: [ { product_id, price_level_id, quantity, unit_price } ]
      payment, // Object: { payment_method, tendered_amount, reference_number }
    } = body;

    // validasi inputan
    if (!sales_type || !['BENGKEL', 'ECERAN'].includes(sales_type)) {
      return NextResponse.json({ message: 'Jenis penjualan tidak valid (BENGKEL/ECERAN)' }, { status: 400 });
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json({ message: 'Minimal harus ada 1 produk dalam transaksi' }, { status: 400 });
    }
    const productIds = details.map((d) => d.product_id);
    const hasDuplicates = new Set(productIds).size !== productIds.length;
    if (hasDuplicates) {
      return NextResponse.json({ message: 'Tidak boleh ada produk duplikat dalam satu transaksi' }, { status: 400 });
    }
    if (!payment || !payment.payment_method) {
      return NextResponse.json({ message: 'Metode pembayaran wajib diisi' }, { status: 400 });
    }
    if (!['CASH', 'TRANSFER', 'QRIS'].includes(payment.payment_method)) {
      return NextResponse.json({ message: 'Metode pembayaran tidak valid' }, { status: 400 });
    }
    const discount = discount_amount !== undefined && discount_amount !== null ? parseFloat(discount_amount) : 0;
    if (isNaN(discount) || discount < 0) {
      return NextResponse.json({ message: 'Diskon tidak boleh bernilai negatif' }, { status: 400 });
    }
    if (sales_type === 'BENGKEL' && !customer_id) {
      return NextResponse.json({ message: 'Pelanggan wajib dipilih untuk penjualan BENGKEL' }, { status: 400 });
    }

    // pake transaction db 
    const finalSales = await prisma.$transaction(async (tx) => {
      // cek kasir aktif
      const cashier = await tx.m_user.findUnique({
        where: { user_id: userSession.user_id },
      });
      if (!cashier || !cashier.is_active) {
        throw new Error('Kasir tidak aktif atau tidak ditemukan');
      }

      // Verify customer
      let customerName = 'Pelanggan Umum';
      let finalCustomerId = null;
      if (customer_id) {
        const customer = await tx.m_customer.findUnique({
          where: { customer_id: parseInt(customer_id, 10) },
        });
        if (!customer || !customer.is_active) {
          throw new Error('Pelanggan tidak ditemukan atau tidak aktif');
        }
        customerName = customer.customer_name;
        finalCustomerId = customer.customer_id;
      }

      let subtotal = 0;
      const detailsToInsert = [];

      for (const item of details) {
        const productId = parseInt(item.product_id, 10);
        const qty = parseInt(item.quantity, 10);
        const price = parseFloat(item.unit_price);
        const priceLevelId = item.price_level_id ? parseInt(item.price_level_id, 10) : null;

        //cek produk inputan
        if (isNaN(productId) || isNaN(qty) || isNaN(price)) {
          throw new Error('Format data produk tidak valid');
        }
        if (qty <= 0) {
          throw new Error('Kuantitas produk harus berupa bilangan bulat positif');
        }
        if (price < 0) {
          throw new Error('Harga unit tidak boleh negatif');
        }

        const product = await tx.m_product.findUnique({
          where: { product_id: productId },
          include: { unit: true, stock: true },
        });

        if (!product || !product.is_active) {
          throw new Error(`Produk dengan ID ${productId} tidak ditemukan atau tidak aktif`);
        }

        const currentStock = product.stock ? product.stock.stock_quantity : 0;
        if (currentStock < qty) {
          throw new Error(`Stok produk "${product.product_name}" tidak mencukupi (Sisa: ${currentStock}, Diminta: ${qty})`);
        }

        const lineTotal = qty * price;
        subtotal += lineTotal;

        detailsToInsert.push({
          product_id: product.product_id,
          product_code_snapshot: product.product_code,
          product_name_snapshot: product.product_name,
          unit_name_snapshot: product.unit.unit_name,
          price_level_id: priceLevelId,
          quantity: qty,
          unit_price: price,
          line_total: lineTotal,
          cost_price_snapshot: product.cost_price,
        });
      }

      //cek diskon
      if (discount > subtotal) {
        throw new Error('Nilai diskon tidak boleh melebihi nilai subtotal');
      }
      const totalAmount = subtotal - discount;

      const tendered = parseFloat(payment.tendered_amount);
      if (isNaN(tendered)) {
        throw new Error('Jumlah bayar/tendered wajib diisi dengan angka');
      }

      //validasi pembayaran
      if (payment.payment_method === 'CASH') {
        if (tendered < totalAmount) {
          throw new Error(`Jumlah bayar tunai (${tendered}) kurang dari total tagihan (${totalAmount})`);
        }
      } else {
        if (tendered !== totalAmount) {
          throw new Error(`Pembayaran Non-Tunai harus pas sebesar ${totalAmount}`);
        }
      }

      const changeAmount = payment.payment_method === 'CASH' ? tendered - totalAmount : 0;

      //generate sales number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;

      const lastSale = await tx.$queryRawUnsafe<any[]>(
        `SELECT sales_number FROM t_sales WHERE sales_number LIKE 'PJ-${dateStr}-%' ORDER BY sales_number DESC LIMIT 1 FOR UPDATE`
      );

      let nextSeq = 1;
      if (lastSale && lastSale.length > 0) {
        const lastNum = lastSale[0].sales_number;
        const parts = lastNum.split('-');
        if (parts.length === 3) {
          nextSeq = parseInt(parts[2], 10) + 1;
        }
      }
      const seqFormatted = String(nextSeq).padStart(6, '0');
      const salesNumber = `PJ-${dateStr}-${seqFormatted}`;

      //masukin ke sale
      const sales = await tx.t_sales.create({
        data: {
          sales_number: salesNumber,
          sales_type: sales_type,
          sales_datetime: now,
          customer_id: finalCustomerId,
          customer_name_snapshot: customerName,
          cashier_user_id: cashier.user_id,
          cashier_name_snapshot: cashier.full_name,
          subtotal: subtotal,
          discount_amount: discount,
          total_amount: totalAmount,
          payment_status: 'PAID',
          transaction_status: 'DRAFT',
        },
      });

      // masukin ke sale detail
      let lineNum = 1;
      for (const d of detailsToInsert) {
        const detailRecord = await tx.t_sales_detail.create({
          data: {
            sales_id: sales.sales_id,
            line_number: lineNum++,
            product_id: d.product_id,
            product_code_snapshot: d.product_code_snapshot,
            product_name_snapshot: d.product_name_snapshot,
            unit_name_snapshot: d.unit_name_snapshot,
            price_level_id: d.price_level_id,
            quantity: d.quantity,
            unit_price: d.unit_price,
            line_total: d.line_total,
          },
        });

        // jagaan race condition
        const affected = await tx.$executeRawUnsafe(
          `UPDATE m_product_stock SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?`,
          d.quantity, d.product_id, d.quantity
        );

        if (affected === 0) {
          throw new Error(`Stok produk "${d.product_name_snapshot}" tidak mencukupi karena ada transaksi lain bersamaan. Silakan coba lagi.`);
        }

        //insert stock movement
        await tx.t_stock_movement.create({
          data: {
            product_id: d.product_id,
            movement_type: 'SALES_OUT',
            reference_number: salesNumber,
            reference_id: sales.sales_id,
            reference_detail_id: detailRecord.sales_detail_id,
            quantity_in: 0,
            quantity_out: d.quantity,
            unit_cost: d.cost_price_snapshot,
            movement_datetime: new Date(),
            created_by_user_id: cashier.user_id,
          },
        });
      }

      // insert payment
      await tx.t_sales_payment.create({
        data: {
          sales_id: sales.sales_id,
          payment_method: payment.payment_method,
          payment_amount: totalAmount,
          tendered_amount: tendered,
          change_amount: changeAmount,
          reference_number: payment.reference_number ? payment.reference_number.trim() : null,
          paid_at: now,
          created_by_user_id: cashier.user_id,
        },
      });

      // update status sales jadi completed
      const completedSales = await tx.t_sales.update({
        where: { sales_id: sales.sales_id },
        data: {
          transaction_status: 'COMPLETED',
        },
        include: {
          details: true,
          payments: true,
        },
      });

      return completedSales;
    });

    return NextResponse.json(finalSales, { status: 201 });
  } catch (error: any) {
    console.error('Sales creation error:', error);
    return NextResponse.json({ message: error.message || 'Kesalahan server internal' }, { status: 500 });
  }
}
