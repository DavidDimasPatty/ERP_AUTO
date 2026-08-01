import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const returnId = parseInt(id, 10);
    if (isNaN(returnId)) {
      return NextResponse.json({ message: 'ID retur tidak valid' }, { status: 400 });
    }

    const salesReturn = await prisma.t_sales_return.findUnique({
      where: { sales_return_id: returnId },
      include: {
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

    if (!salesReturn) {
      return NextResponse.json({ message: 'Transaksi retur tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(salesReturn);
  } catch (error: any) {
    console.error('GET return detail error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
