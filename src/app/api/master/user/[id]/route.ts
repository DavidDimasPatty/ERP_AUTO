import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'ID user tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { username, full_name, password, role_id, is_active } = body;

    if (!username || !full_name || !role_id) {
      return NextResponse.json({ message: 'Username, nama lengkap, dan role wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = full_name.trim();

    // Check unique username (excluding current)
    const existing = await prisma.m_user.findFirst({
      where: {
        username: cleanUsername,
        NOT: { user_id: userId },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Username sudah digunakan oleh user lain' }, { status: 400 });
    }

    const updateData: any = {
      username: cleanUsername,
      full_name: cleanFullName,
      role_id: parseInt(role_id, 10),
      is_active: is_active !== undefined ? is_active : true,
    };

    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.m_user.update({
      where: { user_id: userId },
      data: updateData,
      include: { role: true },
    });

    const { password_hash, ...sanitized } = updatedUser;
    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('PUT user error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'ID user tidak valid' }, { status: 400 });
    }

    var isActive = await prisma.m_user.findUnique({
      where: { user_id: userId },
    }).then(user => user?.is_active ?? false);

    if (!isActive) {
      isActive = true;
    }
    else {
      isActive = false;
    }
    const softDeleted = await prisma.m_user.update({
      where: { user_id: userId },
      data: { is_active: isActive },
    });

    const { password_hash, ...sanitized } = softDeleted;
    return NextResponse.json({ message: 'User berhasil dinonaktifkan', data: sanitized });
  } catch (error: any) {
    console.error('DELETE user error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
