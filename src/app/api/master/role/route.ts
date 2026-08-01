import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const roles = await prisma.m_role.findMany({
      where: { is_active: true },
      orderBy: { role_name: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error: any) {
    console.error('GET roles error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
