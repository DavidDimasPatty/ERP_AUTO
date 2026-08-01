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
            { unit_code: { contains: search } },
            { unit_name: { contains: search } },
          ],
        }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.m_unit.count({ where }),
      prisma.m_unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { unit_code: 'asc' },
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
    console.error('GET units error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit_code, unit_name } = body;

    if (!unit_code || !unit_name) {
      return NextResponse.json({ message: 'Kode dan nama unit wajib diisi' }, { status: 400 });
    }

    const normalizedCode = unit_code.trim().toUpperCase();
    const normalizedName = unit_name.trim().toUpperCase();

    // Check duplicate code
    const existing = await prisma.m_unit.findUnique({
      where: { unit_code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode unit sudah terdaftar' }, { status: 400 });
    }

    const newUnit = await prisma.m_unit.create({
      data: {
        unit_code: normalizedCode,
        unit_name: normalizedName,
        is_active: true,
      },
    });

    return NextResponse.json(newUnit, { status: 201 });
  } catch (error: any) {
    console.error('POST unit error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
