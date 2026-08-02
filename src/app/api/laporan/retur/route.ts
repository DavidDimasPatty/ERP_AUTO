import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where: any = {};

    if (start || end) {
      where.return_datetime = {};
      if (start) {
        where.return_datetime.gte = new Date(`${start}T00:00:00.000Z`);
      }
      if (end) {
        where.return_datetime.lte = new Date(`${end}T23:59:59.999Z`);
      }
    }

    const retur = await prisma.t_sales_return.findMany({
      where,
      orderBy: { return_datetime: 'desc' },
      include: {
        creator: {
          select: {
            full_name: true,
            username: true,
          },
        },
        details: true,
      },
    });

    const data = retur.map((r) => ({
      sales_return_id: r.sales_return_id,
      sales_return_number: r.sales_return_number,
      date: r.return_datetime ? new Date(r.return_datetime).toLocaleString('id-ID') : '-',
      sales_number: r.sales_number_snapshot || '-',
      customer: r.customer_name_snapshot || 'Pelanggan Umum',
      operator: r.created_by_name_snapshot || r.creator?.full_name || '-',
      total_items: r.details.length,
      total_quantity: r.details.reduce((sum, detail) => sum + (Number(detail.return_quantity) || 0), 0),
      status: r.return_status || '-',
      reason: r.return_reason || '-',
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET Laporan Retur Error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
