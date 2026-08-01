import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const salesId = parseInt(id, 10);
    if (isNaN(salesId)) {
      return NextResponse.json({ message: 'ID penjualan tidak valid' }, { status: 400 });
    }

    const sale = await prisma.t_sales.findUnique({
      where: { sales_id: salesId },
      include: {
        customer: true,
        cashier: {
          select: {
            user_id: true,
            username: true,
            full_name: true,
          },
        },
        details: {
          orderBy: { line_number: 'asc' },
          include: {
            product: {
              include: {
                unit: true,
              },
            },
          },
        },
        payments: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ message: 'Transaksi penjualan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error('GET sales detail error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
