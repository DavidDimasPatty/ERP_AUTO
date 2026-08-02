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
            { customer_code: { contains: search } },
            { customer_name: { contains: search } },
            { city_name: { contains: search } },
          ],
        }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.m_customer.count({ where }),
      prisma.m_customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { customer_code: 'asc' },
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
    console.error('GET customers error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_code,
      customer_name,
      address,
      city_name,
      phone,
      notes,
    } = body;

    if (!customer_name) {
      return NextResponse.json({ message: 'Nama pelanggan wajib diisi' }, { status: 400 });
    }

    const normalizedName = customer_name.trim().toUpperCase();
    let normalizedCode = customer_code?.trim().toUpperCase() || '';

    if (!normalizedCode) {
      const count = await prisma.m_customer.count();
      normalizedCode = `CUS${(count + 1).toString().padStart(5, '0')}`;
    }

    const existing = await prisma.m_customer.findUnique({
      where: { customer_code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode pelanggan sudah terdaftar' }, { status: 400 });
    }

    const cleanString = (val: string | undefined | null) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const newCustomer = await prisma.m_customer.create({
      data: {
        customer_code: normalizedCode,
        customer_name: normalizedName,
        address: cleanString(address),
        city_name: cleanString(city_name),
        phone: cleanString(phone),
        notes: cleanString(notes),
        is_active: true,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error: any) {
    console.error('POST customer error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const customerId = parseInt(id || '', 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ message: 'ID customer tidak valid' }, { status: 400 });
    }

    const hardDeleted = await prisma.m_customer.delete({
      where: { customer_id: customerId },
    });

    return NextResponse.json({ message: 'Customer berhasil dihapus', data: hardDeleted });
  } catch (error: any) {
    console.error('HARD DELETE customer error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
