import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ message: 'ID pelanggan tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const {
      customer_code,
      customer_name,
      address,
      city_name,
      phone,
      notes,
      is_active,
    } = body;

    if (!customer_code || !customer_name) {
      return NextResponse.json({ message: 'Kode dan nama pelanggan wajib diisi' }, { status: 400 });
    }

    const normalizedCode = customer_code.trim().toUpperCase();
    const normalizedName = customer_name.trim().toUpperCase();

    // Check duplicate code (excluding current)
    const existing = await prisma.m_customer.findFirst({
      where: {
        customer_code: normalizedCode,
        NOT: { customer_id: customerId },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode pelanggan sudah digunakan oleh pelanggan lain' }, { status: 400 });
    }

    const cleanString = (val: string | undefined | null) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const updatedCustomer = await prisma.m_customer.update({
      where: { customer_id: customerId },
      data: {
        customer_code: normalizedCode,
        customer_name: normalizedName,
        address: cleanString(address),
        city_name: cleanString(city_name),
        phone: cleanString(phone),
        notes: cleanString(notes),
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    console.error('PUT customer error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ message: 'ID pelanggan tidak valid' }, { status: 400 });
    }

    var isActive = await prisma.m_customer.findUnique({
      where: { customer_id: customerId },
    }).then(customer => customer?.is_active ?? false);

    if (!isActive) {
      isActive = true;
    }
    else {
      isActive = false;
    }
    const softDeleted = await prisma.m_customer.update({
      where: { customer_id: customerId },
      data: { is_active: isActive },
    });
    
    return NextResponse.json({ message: 'Pelanggan berhasil dinonaktifkan', data: softDeleted });
  } catch (error: any) {
    console.error('DELETE customer error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
