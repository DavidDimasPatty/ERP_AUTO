import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ message: 'ID produk tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const {
      product_code,
      product_name,
      unit_id,
      brand_id,
      product_description,
      cost_price,
      minimum_stock,
      prices, // Object like { 1: 5000, 2: 4800, 3: 4600, ... }
      is_active,
    } = body;

    if (!product_code || !product_name || !unit_id) {
      return NextResponse.json({ message: 'Kode, nama, dan satuan wajib diisi' }, { status: 400 });
    }

    const normalizedCode = product_code.trim().toUpperCase();
    const normalizedName = product_name.trim().toUpperCase();

    // Check duplicate code (excluding current)
    const existing = await prisma.m_product.findFirst({
      where: {
        product_code: normalizedCode,
        NOT: { product_id: productId },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Kode produk sudah digunakan oleh produk lain' }, { status: 400 });
    }

    const cleanString = (val: string | undefined | null) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const finalCostPrice = cost_price !== undefined && cost_price !== null ? parseFloat(cost_price) : 0;
    const finalMinStock = minimum_stock !== undefined && minimum_stock !== null ? parseInt(minimum_stock, 10) : 0;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Update product main data
      const prod = await tx.m_product.update({
        where: { product_id: productId },
        data: {
          product_code: normalizedCode,
          product_name: normalizedName,
          unit_id: parseInt(unit_id, 10),
          brand_id: brand_id ? parseInt(brand_id, 10) : null,
          product_description: cleanString(product_description),
          cost_price: finalCostPrice,
          minimum_stock: finalMinStock,
          is_active: is_active !== undefined ? is_active : true,
        },
      });

      // 2. Refresh/Upsert the 5 price levels
      // Delete existing prices first
      await tx.m_product_price.deleteMany({
        where: { product_id: productId },
      });

      // Create new prices
      const priceList = [];
      for (let level = 1; level <= 5; level++) {
        const amount = prices && prices[level] !== undefined ? parseFloat(prices[level]) : 0;
        priceList.push({
          product_id: productId,
          price_level_id: level,
          price_amount: amount,
        });
      }

      await tx.m_product_price.createMany({
        data: priceList,
      });

      return prod;
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error('PUT product error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal atau data referensi tidak ditemukan' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ message: 'ID produk tidak valid' }, { status: 400 });
    }

    // Soft delete via is_active = false
    const softDeleted = await prisma.m_product.update({
      where: { product_id: productId },
      data: { is_active: false },
    });

    return NextResponse.json({ message: 'Produk berhasil dinonaktifkan', data: softDeleted });
  } catch (error: any) {
    console.error('DELETE product error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
