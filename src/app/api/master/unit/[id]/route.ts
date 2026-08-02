import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ message: 'ID unit tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { unit_code, unit_name, is_active } = body;

    if (!unit_code || !unit_name) {
      return NextResponse.json({ message: 'Kode dan nama unit wajib diisi' }, { status: 400 });
    }

    const normalizedCode = unit_code.trim().toUpperCase();
    const normalizedName = unit_name.trim().toUpperCase();

    // Check duplicate code (excluding current unit)
    const existing = await prisma.m_unit.findFirst({
      where: {
        unit_code: normalizedCode,
        NOT: { unit_id: unitId },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode unit sudah digunakan oleh unit lain' }, { status: 400 });
    }

    const updatedUnit = await prisma.m_unit.update({
      where: { unit_id: unitId },
      data: {
        unit_code: normalizedCode,
        unit_name: normalizedName,
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    return NextResponse.json(updatedUnit);
  } catch (error: any) {
    console.error('PUT unit error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ message: 'ID unit tidak valid' }, { status: 400 });
    }

    var isActive = await prisma.m_unit.findUnique({
      where: { unit_id: unitId },
    }).then(unit => unit?.is_active ?? false);

    if (!isActive) {
      isActive = true;
    }
    else {
      isActive = false;
    }
    const softDeleted = await prisma.m_unit.update({
      where: { unit_id: unitId },
      data: { is_active: isActive },
    });

    return NextResponse.json({ message: 'Unit berhasil dinonaktifkan', data: softDeleted });
  } catch (error: any) {
    console.error('DELETE unit error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
