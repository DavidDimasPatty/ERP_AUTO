import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where: any = {};

    if (start || end) {
      where.sales_datetime = {};
      if (start) {
        where.sales_datetime.gte = new Date(`${start}T00:00:00.000Z`);
      }
      if (end) {
        where.sales_datetime.lte = new Date(`${end}T23:59:59.999Z`);
      }
    }

    const sales = await prisma.t_sales.findMany({
      where,
      orderBy: { sales_datetime: 'desc' },
      include: {
        customer: true,
        cashier: {
          select: {
            full_name: true,
            username: true,
          },
        },
      },
    });

    const data = sales.map((s) => ({
      sales_id: s.sales_id,
      sales_number: s.sales_number,
      date: s.sales_datetime ? new Date(s.sales_datetime).toLocaleString('id-ID') : '-',
      type: s.sales_type || 'BENGKEL',
      customer: s.customer_name_snapshot || s.customer?.customer_name || 'Pelanggan Umum',
      cashier: s.cashier_name_snapshot || s.cashier?.full_name || '-',
      subtotal: Number(s.subtotal) || 0,
      discount: Number(s.discount_amount) || 0,
      total: Number(s.total_amount) || 0,
      status: s.payment_status || 'PAID',
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET Laporan Sales Error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
