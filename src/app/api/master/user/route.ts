import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

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
            { username: { contains: search } },
            { full_name: { contains: search } },
          ],
        }
      : {};

    const [total, data] = await prisma.$transaction([
      prisma.m_user.count({ where }),
      prisma.m_user.findMany({
        where,
        skip,
        take: limit,
        include: { role: true },
        orderBy: { username: 'asc' },
      }),
    ]);

    // Omit password hash in response
    const sanitizedData = data.map(({ password_hash, ...user }) => user);

    return NextResponse.json({
      data: sanitizedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('GET users error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, full_name, password, role_id } = body;

    if (!username || !full_name || !password || !role_id) {
      return NextResponse.json({ message: 'Username, nama lengkap, password, dan role wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = full_name.trim();

    // Check unique username
    const existing = await prisma.m_user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json({ message: 'Username sudah digunakan' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.m_user.create({
      data: {
        username: cleanUsername,
        full_name: cleanFullName,
        password_hash: passwordHash,
        role_id: parseInt(role_id, 10),
        is_active: true,
      },
      include: { role: true },
    });

    const { password_hash, ...sanitized } = newUser;
    return NextResponse.json(sanitized, { status: 201 });
  } catch (error: any) {
    console.error('POST user error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
