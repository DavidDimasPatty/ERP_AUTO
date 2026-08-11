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

    let where: any = {};

    if (search) {
      where.OR = [
        { supplier_code: { contains: search } },
        { supplier_name: { contains: search } },
        { city_name: { contains: search } },
      ];
    }

    if (isActiveParam !== null) {
      where.is_active = isActiveParam == "true";
    }

    const [total, data] = await prisma.$transaction([
      prisma.m_supplier.count({ where }),
      prisma.m_supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { supplier_code: 'asc' },
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
    console.error('GET suppliers error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      supplier_code,
      supplier_name,
      address,
      city_name,
      phone,
      contact_person,
      payment_term_days,
      notes,
    } = body;

    if (!supplier_name) {
      return NextResponse.json({ message: 'Nama supplier wajib diisi' }, { status: 400 });
    }

    const normalizedName = supplier_name.trim().toUpperCase();
    let normalizedCode = supplier_code?.trim().toUpperCase() || '';

    if (!normalizedCode) {
      const count = await prisma.m_supplier.count();
      normalizedCode = `SUP${(count + 1).toString().padStart(5, '0')}`;
    }

    const existing = await prisma.m_supplier.findUnique({
      where: { supplier_code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode supplier sudah terdaftar' }, { status: 400 });
    }

    const cleanString = (val: string | undefined | null) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const newSupplier = await prisma.m_supplier.create({
      data: {
        supplier_code: normalizedCode,
        supplier_name: normalizedName,
        address: cleanString(address),
        city_name: cleanString(city_name),
        phone: cleanString(phone),
        contact_person: cleanString(contact_person),
        payment_term_days: payment_term_days !== undefined && payment_term_days !== null ? parseInt(payment_term_days, 10) : 0,
        notes: cleanString(notes),
        is_active: true,
      },
    });

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error: any) {
    console.error('POST supplier error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const supplierId = parseInt(id || '', 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ message: 'ID supplier tidak valid' }, { status: 400 });
    }

    const hardDeleted = await prisma.m_supplier.delete({
      where: { supplier_id: supplierId },
    });

    return NextResponse.json({ message: 'Supplier berhasil dihapus', data: hardDeleted });
  } catch (error: any) {
    console.error('HARD DELETE supplier error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
