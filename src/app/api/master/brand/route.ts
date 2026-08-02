import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where = search
      ? {
        OR: [
          { brand_code: { contains: search } },
          { brand_name: { contains: search } },
        ],
      }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.m_brand.count({ where }),
      prisma.m_brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { brand_code: 'asc' },
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
    console.error('GET brands error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brand_name, is_active } = body;

    if (!brand_name || !is_active) {
      return NextResponse.json({ message: 'status aktif dan nama merek wajib diisi' }, { status: 400 });
    }

    const count = await prisma.m_brand.count({});
    var newBrandCode = '';
    if (count === 0) {
      newBrandCode = 'MRK0001';
    } else {
      newBrandCode = 'MRK' + (count + 1).toString().padStart(5, '0');
    }

    const normalizedCode = newBrandCode.trim().toUpperCase();
    const normalizedName = brand_name.trim().toUpperCase();

    // Check duplicate code
    const existing = await prisma.m_brand.findUnique({
      where: { brand_code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode merek sudah terdaftar' }, { status: 400 });
    }

    if (is_active !== true && is_active !== false) {
      return NextResponse.json({ message: 'status aktif harus berupa boolean' }, { status: 400 });
    }

    const newBrand = await prisma.m_brand.create({
      data: {
        brand_code: normalizedCode,
        brand_name: normalizedName,
        is_active: is_active,
      },
    });

    return NextResponse.json(newBrand, { status: 201 });
  } catch (error: any) {
    console.error('POST brand error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const brandId = parseInt(id || '', 10);
    if (isNaN(brandId)) {
      return NextResponse.json({ message: 'ID merek tidak valid' }, { status: 400 });
    }

    const hardDeleted = await prisma.m_brand.delete({
      where: { brand_id: brandId }
    });

    return NextResponse.json({ message: 'Merek berhasil dihapus', data: hardDeleted });
  } catch (error: any) {
    console.error('HARD DELETE brand error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}