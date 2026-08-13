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
          { sales_return_number: { contains: search } },
          { sales_number_snapshot: { contains: search } },
          { customer_name_snapshot: { contains: search } },
        ],
      }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.t_sales_return.count({ where }),
      prisma.t_sales_return.findMany({
        where,
        skip,
        take: limit,
        include: {
          sales: true,
          creator: {
            select: {
              user_id: true,
              username: true,
              full_name: true,
            },
          },
        },
        orderBy: { return_datetime: 'desc' },
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
    console.error('GET returns error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // ngecek sesi dan cookie
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
      sales_id,
      return_reason,
      notes,
      details, // Array: [ { sales_detail_id, product_id, return_quantity, return_reason } ]
    } = body;

    // validasi input
    if (!sales_id) {
      return NextResponse.json({ message: 'Transaksi penjualan wajib ditentukan' }, { status: 400 });
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json({ message: 'Minimal harus ada 1 produk yang diretur' }, { status: 400 });
    }

    // buat pake transaction (locking)
    const finalReturn = await prisma.$transaction(async (tx) => {

      // dapetin sale dari db dari salei id
      const sale = await tx.t_sales.findUnique({
        where: { sales_id: parseInt(sales_id, 10) },
        include: { details: true },
      });

      if (!sale) {
        throw new Error('Transaksi penjualan tidak ditemukan');
      }
      if (sale.transaction_status !== 'COMPLETED') {
        throw new Error('Hanya transaksi penjualan berstatus COMPLETED yang dapat diretur');
      }

      // Verify creator user
      const user = await tx.m_user.findUnique({
        where: { user_id: userSession.user_id },
      });
      if (!user || !user.is_active) {
        throw new Error('User pembuat tidak aktif atau tidak ditemukan');
      }

      const detailsToInsert = [];
      let lineNum = 1;

      for (const item of details) {
        const salesDetailId = parseInt(item.sales_detail_id, 10);
        const productId = parseInt(item.product_id, 10);
        const returnQty = parseInt(item.return_quantity, 10);
        const itemReason = item.return_reason ? item.return_reason.trim() : null;

        // ngecek id 
        if (isNaN(salesDetailId) || isNaN(productId) || isNaN(returnQty)) {
          throw new Error('Format data retur tidak valid');
        }
        if (returnQty <= 0) {
          throw new Error('Jumlah retur harus berupa bilangan bulat positif');
        }

        // ngecek id di db
        const origDetail = sale.details.find((d) => d.sales_detail_id === salesDetailId);
        if (!origDetail || origDetail.product_id !== productId) {
          throw new Error('Produk yang diretur tidak cocok dengan transaksi penjualan asli');
        }

        // Query sum of previous returns dari produk ini, pastikan tidak melebihi jumlah yang pernah di return dan dijual
        const prevReturnAgg = await tx.t_sales_return_detail.aggregate({
          where: {
            sales_detail_id: salesDetailId,
            return_header: {
              return_status: 'COMPLETED',
            },
          },
          _sum: {
            return_quantity: true,
          },
        });

        const prevQty = prevReturnAgg._sum.return_quantity || 0;
        const returnableQty = origDetail.quantity - prevQty;

        if (returnQty > returnableQty) {
          throw new Error(
            `Jumlah retur (${returnQty}) melebihi batas maksimal yang dapat diretur (${returnableQty}) untuk produk ${origDetail.product_name_snapshot}`
          );
        }

        //generate detail untuk di insert ke t_sales_return_detail
        detailsToInsert.push({
          sales_detail_id: salesDetailId,
          line_number: lineNum++,
          product_id: productId,
          product_code_snapshot: origDetail.product_code_snapshot,
          product_name_snapshot: origDetail.product_name_snapshot,
          unit_name_snapshot: origDetail.unit_name_snapshot,
          sold_quantity_snapshot: origDetail.quantity,
          previous_return_quantity: prevQty,
          return_quantity: returnQty,
          return_reason: itemReason,
        });
      }

      // Generate Return Number  dari tanggal dan +1 transaksi sebelumnya
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;

      const lastReturn = await tx.$queryRawUnsafe<any[]>(
        `SELECT sales_return_number FROM t_sales_return WHERE sales_return_number LIKE 'RTMM-${dateStr}-%' ORDER BY sales_return_number DESC LIMIT 1 FOR UPDATE`
      );

      let nextSeq = 1;
      if (lastReturn && lastReturn.length > 0) {
        const lastNum = lastReturn[0].sales_return_number;
        const parts = lastNum.split('-');
        if (parts.length === 3) {
          nextSeq = parseInt(parts[2], 10) + 1;
        }
      }
      const seqFormatted = String(nextSeq).padStart(6, '0');
      const returnNumber = `RTMM-${dateStr}-${seqFormatted}`;

      // Insert return sales
      const returnHeader = await tx.t_sales_return.create({
        data: {
          sales_return_number: returnNumber,
          sales_id: sale.sales_id,
          sales_number_snapshot: sale.sales_number,
          return_datetime: now,
          customer_id: sale.customer_id,
          customer_name_snapshot: sale.customer_name_snapshot,
          created_by_user_id: user.user_id,
          created_by_name_snapshot: user.full_name,
          return_reason: return_reason ? return_reason.trim() : null,
          return_status: 'COMPLETED',
          notes: notes ? notes.trim() : null,
        },
      });

      // Insert details dari insertan id return sales 
      for (const d of detailsToInsert) {
        const detailRecord = await tx.t_sales_return_detail.create({
          data: {
            sales_return_id: returnHeader.sales_return_id,
            sales_detail_id: d.sales_detail_id,
            line_number: d.line_number,
            product_id: d.product_id,
            product_code_snapshot: d.product_code_snapshot,
            product_name_snapshot: d.product_name_snapshot,
            unit_name_snapshot: d.unit_name_snapshot,
            sold_quantity_snapshot: d.sold_quantity_snapshot,
            previous_return_quantity: d.previous_return_quantity,
            return_quantity: d.return_quantity,
            return_reason: d.return_reason,
          },
        });

        await tx.m_product_stock.upsert({
          where: { product_id: d.product_id },
          update: {
            stock_quantity: { increment: d.return_quantity },
          },
          create: {
            product_id: d.product_id,
            stock_quantity: d.return_quantity,
          },
        });

        // dapetin harga produk untuk dicatat di stock movement history
        const product = await tx.m_product.findUnique({
          where: { product_id: d.product_id },
        });
        const unitCost = product ? product.cost_price : 0;

        // insert movement history
        await tx.t_stock_movement.create({
          data: {
            product_id: d.product_id,
            movement_type: 'SALES_RETURN_IN',
            reference_number: returnNumber,
            reference_id: returnHeader.sales_return_id,
            reference_detail_id: detailRecord.sales_return_detail_id,
            quantity_in: d.return_quantity,
            quantity_out: 0,
            unit_cost: unitCost,
            movement_datetime: new Date(),
            created_by_user_id: user.user_id,
          },
        });
      }

      return returnHeader;
    });

    return NextResponse.json(finalReturn, { status: 201 });
  } catch (error: any) {
    console.error('Return creation error:', error);
    return NextResponse.json({ message: error.message || 'Kesalahan server internal' }, { status: 500 });
  }
}
