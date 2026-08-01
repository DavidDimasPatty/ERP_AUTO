import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const purchaseId = parseInt(id, 10);
    if (isNaN(purchaseId)) {
      return NextResponse.json({ message: 'ID pembelian tidak valid' }, { status: 400 });
    }

    const purchase = await prisma.t_purchase.findUnique({
      where: { purchase_id: purchaseId },
      include: {
        supplier: true,
        creator: {
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
      },
    });

    if (!purchase) {
      return NextResponse.json({ message: 'Transaksi pembelian tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error: any) {
    console.error('GET purchase detail error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
