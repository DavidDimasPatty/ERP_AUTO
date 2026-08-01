import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    const user = await prisma.m_user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user || !user.is_active) {
      return NextResponse.json(
        { message: 'Username atau password salah atau akun dinonaktifkan' },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.m_user.update({
      where: { user_id: user.user_id },
      data: { last_login_at: new Date() },
    });

    // Create session payload
    const sessionData = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role_id: user.role_id,
      role_code: user.role.role_code,
      role_name: user.role.role_name,
    };

    const response = NextResponse.json({
      message: 'Login berhasil',
      user: sessionData,
    });

    // Set cookie
    response.cookies.set('user_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan server internal' },
      { status: 500 }
    );
  }
}
