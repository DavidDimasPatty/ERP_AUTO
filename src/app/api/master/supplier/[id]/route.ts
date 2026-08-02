import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supplierId = parseInt(id, 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ message: 'ID supplier tidak valid' }, { status: 400 });
    }

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
      is_active,
    } = body;

    if (!supplier_code || !supplier_name) {
      return NextResponse.json({ message: 'Kode dan nama supplier wajib diisi' }, { status: 400 });
    }

    const normalizedCode = supplier_code.trim().toUpperCase();
    const normalizedName = supplier_name.trim().toUpperCase();

    // Check duplicate code (excluding current)
    const existing = await prisma.m_supplier.findFirst({
      where: {
        supplier_code: normalizedCode,
        NOT: { supplier_id: supplierId },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode supplier sudah digunakan oleh supplier lain' }, { status: 400 });
    }

    const cleanString = (val: string | undefined | null) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const updatedSupplier = await prisma.m_supplier.update({
      where: { supplier_id: supplierId },
      data: {
        supplier_code: normalizedCode,
        supplier_name: normalizedName,
        address: cleanString(address),
        city_name: cleanString(city_name),
        phone: cleanString(phone),
        contact_person: cleanString(contact_person),
        payment_term_days: payment_term_days !== undefined && payment_term_days !== null ? parseInt(payment_term_days, 10) : 0,
        notes: cleanString(notes),
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    return NextResponse.json(updatedSupplier);
  } catch (error: any) {
    console.error('PUT supplier error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supplierId = parseInt(id, 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ message: 'ID supplier tidak valid' }, { status: 400 });
    }


    var isActive = await prisma.m_supplier.findUnique({
      where: { supplier_id: supplierId },
    }).then(supplier => supplier?.is_active ?? false);

    if (!isActive) {
      isActive = true;
    }
    else {
      isActive = false;
    }
    const softDeleted = await prisma.m_supplier.update({
      where: { supplier_id: supplierId },
      data: { is_active: isActive },
    });

    return NextResponse.json({ message: 'Supplier berhasil dinonaktifkan', data: softDeleted });
  } catch (error: any) {
    console.error('DELETE supplier error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
