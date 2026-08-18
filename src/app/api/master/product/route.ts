import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    const isActiveParam = searchParams.get('is_active');

    const keywords = search
      ? search.split(/\s+/)
      : [];

    const where = search
      ? {
        is_active: true,

        OR: [
          // Search full string
          {
            product_code: {
              contains: search,
            },
          },
          {
            product_name: {
              contains: search,
            },
          },
          {
            product_description: {
              contains: search,
            },
          },
          {
            brand: {
              brand_name: {
                contains: search,
              },
            },
          },

          // Search berdasarkan setiap kata
          {
            AND: keywords.map((keyword) => ({
              OR: [
                {
                  brand: {
                    brand_name: {
                      contains: keyword,
                    },
                  },
                },
                {
                  product_name: {
                    contains: keyword,
                  },
                },
              ],
            })),
          },
        ],
      }
      : {
        is_active: true,
      };

    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.is_active = isActiveParam == "true";
    }

    const [total, data] = await prisma.$transaction([
      prisma.m_product.count({ where }),
      prisma.m_product.findMany({
        where,
        skip,
        take: limit,
        include: {
          unit: true,
          brand: true,
          prices: {
            orderBy: { price_level_id: 'asc' },
          },
          stock: true,
        },
        orderBy: { product_code: 'asc' },
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
    console.error('GET products error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product_code,
      product_name,
      unit_id,
      brand_id,
      product_description,
      cost_price,
      minimum_stock,
      prices, // Object like { 1: 5000, 2: 4800, 3: 4600, 4: 4400, 5: 4200 }
    } = body;

    if (!product_name || !unit_id) {
      return NextResponse.json({ message: 'Nama dan satuan wajib diisi' }, { status: 400 });
    }

    let price1 = parseFloat(prices[1]);
    if (price1 == undefined || Number.isNaN(price1) || prices[1] == "" || price1 <= 0) {
      return NextResponse.json({ message: 'Harga level 1 wajib diisi' }, { status: 400 });
    }

    const normalizedName = product_name.trim().toUpperCase();
    let normalizedCode = product_code?.trim().toUpperCase() || '';

    // if (!normalizedCode) {
    //   const count = await prisma.m_product.count();
    //   normalizedCode = `PRD${(count + 1).toString().padStart(5, '0')}`;
    // }

    // const existing = await prisma.m_product.findUnique({
    //   where: { product_code: normalizedCode },
    // });

    // if (existing) {
    //   return NextResponse.json({ message: 'Kode produk sudah terdaftar' }, { status: 400 });
    // }

    const cleanString = (val: string | undefined | null) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const finalCostPrice = cost_price !== undefined && cost_price !== null ? parseFloat(cost_price) : 0;
    const finalMinStock = minimum_stock !== undefined && minimum_stock !== null ? parseInt(minimum_stock, 10) : 0;
    if (finalMinStock <= 0) {
      return NextResponse.json({ message: 'Mohon isi minimal stock' }, { status: 400 });
    }
    // Run insert in a single transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const product = await tx.m_product.create({
        data: {
          product_code: normalizedCode,
          product_name: normalizedName,
          unit_id: parseInt(unit_id, 10),
          brand_id: brand_id ? parseInt(brand_id, 10) : null,
          product_description: cleanString(product_description),
          cost_price: finalCostPrice,
          minimum_stock: finalMinStock,
          is_active: true,
        },
      });

      // 2. Initialize stock to 0
      await tx.m_product_stock.create({
        data: {
          product_id: product.product_id,
          stock_quantity: 0,
        },
      });

      // 3. Create 5 price level items
      const priceList = [];
      for (let level = 1; level <= 5; level++) {
        const amount = prices && prices[level] !== undefined ? parseFloat(prices[level]) : 0;
        priceList.push({
          product_id: product.product_id,
          price_level_id: level,
          price_amount: amount,
        });
      }

      await tx.m_product_price.createMany({
        data: priceList,
      });

      return product;
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('POST product error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal atau data referensi tidak ditemukan' }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const productId = parseInt(id || '', 10);
    if (isNaN(productId)) {
      return NextResponse.json({ message: 'ID produk tidak valid' }, { status: 400 });
    }

    const hardDeleted = await prisma.m_product.delete({
      where: { product_id: productId },
    });

    return NextResponse.json({ message: 'Produk berhasil dihapus', data: hardDeleted });
  } catch (error: any) {
    console.error('HARD DELETE product error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}