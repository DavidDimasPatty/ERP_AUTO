import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salesNumber: string }> }
) {
  try {
    const { salesNumber } = await params;
    const cleanNumber = salesNumber.trim().toUpperCase();
    console.log(cleanNumber);
    const sale = await prisma.t_sales.findUnique({
      where: { sales_number: cleanNumber },
      include: {
        customer: true,
        details: {
          orderBy: { line_number: 'asc' },
          include: {
            product: {
              include: {
                unit: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ message: 'Nomor penjualan tidak ditemukan' }, { status: 404 });
    }

    if (sale.transaction_status !== 'COMPLETED') {
      return NextResponse.json(
        { message: 'Transaksi penjualan ini belum selesai (DRAFT/CANCELLED)' },
        { status: 400 }
      );
    }

    // For each detail, aggregate previous returns
    const detailsWithReturnData = [];

    for (const det of sale.details) {
      const prevReturnAgg = await prisma.t_sales_return_detail.aggregate({
        where: {
          sales_detail_id: det.sales_detail_id,
          return_header: {
            return_status: 'COMPLETED',
          },
        },
        _sum: {
          return_quantity: true,
        },
      });

      const prevReturnQty = prevReturnAgg._sum.return_quantity || 0;
      const returnableQty = det.quantity - prevReturnQty;

      detailsWithReturnData.push({
        sales_detail_id: det.sales_detail_id,
        product_id: det.product_id,
        product_code_snapshot: det.product_code_snapshot,
        product_name_snapshot: det.product_name_snapshot,
        unit_name_snapshot: det.unit_name_snapshot,
        unit_price: det.unit_price,
        sold_quantity: det.quantity,
        previous_return_quantity: prevReturnQty,
        returnable_quantity: returnableQty,
        current_stock: det.product.stock ? det.product.stock.stock_quantity : 0,
      });
    }

    return NextResponse.json({
      sales_id: sale.sales_id,
      sales_number: sale.sales_number,
      sales_datetime: sale.sales_datetime,
      customer_name_snapshot: sale.customer_name_snapshot,
      total_amount: sale.total_amount,
      details: detailsWithReturnData,
    });
  } catch (error: any) {
    console.error('Check sales return error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
