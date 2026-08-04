import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where: any = {};

    if (start || end) {
      where.purchase_datetime = {};
      if (start) {
        where.purchase_datetime.gte = new Date(`${start}T00:00:00.000Z`);
      }
      if (end) {
        where.purchase_datetime.lte = new Date(`${end}T23:59:59.999Z`);
      }
    }

    const purchases = await prisma.t_purchase.findMany({
      where,
      orderBy: { purchase_datetime: 'desc' },
      include: {
        supplier: true,
        creator: {
          select: {
            full_name: true,
            username: true,
          },
        },
      },
    });

    const data = purchases.map((p) => ({
      purchase_id: p.purchase_id,
      purchase_number: p.purchase_number,
      date: p.purchase_datetime ? format(new Date(p.purchase_datetime), "d-M-yyyy HH:mm:ss") : "-",
      supplier: p.supplier_name_snapshot || p.supplier?.supplier_name || '-',
      invoice_no: p.supplier_invoice_number || '-',
      total: Number(p.total_amount) || 0,
      user: p.created_by_name_snapshot || p.creator?.full_name || '-',
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET Laporan Purchase Error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
