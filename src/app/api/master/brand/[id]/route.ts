import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const brandId = parseInt(id, 10);
    if (isNaN(brandId)) {
      return NextResponse.json({ message: 'ID merek tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { brand_code, brand_name, is_active } = body;

    if (!brand_code || !brand_name) {
      return NextResponse.json({ message: 'Kode dan nama merek wajib diisi' }, { status: 400 });
    }

    const normalizedCode = brand_code.trim().toUpperCase();
    const normalizedName = brand_name.trim().toUpperCase();

    // Check duplicate code (excluding current brand)
    const existing = await prisma.m_brand.findFirst({
      where: {
        brand_code: normalizedCode,
        NOT: { brand_id: brandId },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode merek sudah digunakan oleh merek lain' }, { status: 400 });
    }

    const updatedBrand = await prisma.m_brand.update({
      where: { brand_id: brandId },
      data: {
        brand_code: normalizedCode,
        brand_name: normalizedName,
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    return NextResponse.json(updatedBrand);
  } catch (error: any) {
    console.error('PUT brand error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const brandId = parseInt(id, 10);
    if (isNaN(brandId)) {
      return NextResponse.json({ message: 'ID merek tidak valid' }, { status: 400 });
    }

    // Soft delete via is_active = false
    const softDeleted = await prisma.m_brand.update({
      where: { brand_id: brandId },
      data: { is_active: false },
    });

    return NextResponse.json({ message: 'Merek berhasil dinonaktifkan', data: softDeleted });
  } catch (error: any) {
    console.error('DELETE brand error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
