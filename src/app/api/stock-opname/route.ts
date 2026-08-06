import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface OpnameItem {
  product_id: number;
  counted_quantity: number;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('user_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
    }

    let sessionUser;
    try {
      sessionUser = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
    }

    const body = await req.json();

    // Support both single item and batch array
    let items: OpnameItem[];
    if (Array.isArray(body.items)) {
      items = body.items.map((item: any) => ({
        product_id: Number(item.product_id),
        counted_quantity: Number(item.counted_quantity),
        notes: item.notes || '',
      }));
    } else {
      // Backward-compatible single item
      items = [{
        product_id: Number(body.product_id),
        counted_quantity: Number(body.counted_quantity),
        notes: body.notes || '',
      }];
    }

    if (items.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data stock opname' }, { status: 400 });
    }

    // Validate all items
    for (const item of items) {
      if (!item.product_id || Number.isNaN(item.counted_quantity)) {
        return NextResponse.json({ message: `Produk ID ${item.product_id}: data tidak valid` }, { status: 400 });
      }
    }

    const referenceNumber = `OP-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const results: { product_id: number; adjustment: number }[] = [];

      for (const item of items) {
        const product = await tx.m_product.findUnique({
          where: { product_id: item.product_id },
          include: { stock: true },
        });

        if (!product || !product.is_active) {
          throw new Error(`Produk ID ${item.product_id} tidak ditemukan atau tidak aktif`);
        }

        const currentStock = product.stock?.stock_quantity ?? 0;
        const adjustment = item.counted_quantity - currentStock;

        // Skip if no change
        if (adjustment === 0) continue;

        await tx.m_product_stock.update({
          where: { product_id: item.product_id },
          data: { stock_quantity: item.counted_quantity },
        });

        await tx.t_stock_movement.create({
          data: {
            product_id: item.product_id,
            movement_type: adjustment >= 0 ? 'PURCHASE_IN' : 'SALES_OUT',
            reference_number: referenceNumber,
            reference_id: 0,
            reference_detail_id: 0,
            quantity_in: adjustment >= 0 ? adjustment : 0,
            quantity_out: adjustment < 0 ? Math.abs(adjustment) : 0,
            unit_cost: product.cost_price,
            movement_datetime: new Date(),
            created_by_user_id: sessionUser.user_id,
          },
        });

        results.push({ product_id: item.product_id, adjustment });
      }

      return results;
    });

    return NextResponse.json({
      message: `Stock opname berhasil: ${result.length} produk diperbarui`,
      updated: result.length,
      details: result,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Stock opname error:', error);
    return NextResponse.json({ message: error.message || 'Kesalahan server internal' }, { status: 500 });
  }
}
