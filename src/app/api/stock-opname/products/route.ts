import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/stock-opname/products
 * Lightweight endpoint for stock opname — only fetches
 * product_id, product_code, product_name, stock_quantity.
 * Supports ?search=&page=&limit=
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;
    const keywords = search
      ? search.split(/\s+/)
      : [];

    const where = search
      ? {
        is_active: true,
        OR: [
          { product_code: { contains: search } },
          { product_name: { contains: search } },
          { brand: { brand_name: { contains: search } } },
          {
            AND: keywords.map((keyword) => ({
              OR: [
                { brand: { brand_name: { contains: keyword } } },
                { product_name: { contains: keyword } },
              ],
            })),
          },
        ],
      }
      : {
        is_active: true,
      };

    // Use $transaction to avoid double round-trip
    const [total, rows] = await prisma.$transaction([
      prisma.m_product.count({ where }),
      prisma.m_product.findMany({
        where,
        skip,
        take: limit,
        select: {
          product_id: true,
          product_code: true,
          product_name: true,
          brand: {
            select: { brand_name: true },
          },
          stock: {
            select: { stock_quantity: true },
          },
        },
        orderBy: { product_code: 'asc' },
      }),
    ]);

    // Flatten to plain objects (no Decimal fields here, but be safe)
    const data = rows.map((p) => ({
      product_id: p.product_id,
      product_code: p.product_code,
      product_name: p.product_name,
      brand_name: p.brand?.brand_name ?? '-',
      stock_quantity: p.stock?.stock_quantity ?? 0,
    }));

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
    console.error('GET stock-opname/products error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
