import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('user_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let parsedSession;
    try {
      parsedSession = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify user in db
    const user = await prisma.m_user.findUnique({
      where: { user_id: parsedSession.user_id },
      include: { role: true },
    });

    if (!user || !user.is_active) {
      // Clear invalid cookie
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.set('user_session', '', { httpOnly: true, expires: new Date(0), path: '/' });
      return response;
    }

    // Fetch permitted menus for this role
    const roleMenus = await prisma.m_role_menu.findMany({
      where: {
        role_id: user.role_id,
        menu: { is_active: true },
      },
      include: {
        menu: true,
      },
    });

    const activeMenus = roleMenus.map((rm) => rm.menu);

    // Group menus into a tree structure
    const parents = activeMenus
      .filter((m) => m.parent_menu_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);

    const menuTree = parents.map((parent) => {
      const children = activeMenus
        .filter((m) => m.parent_menu_id === parent.menu_id)
        .sort((a, b) => a.sort_order - b.sort_order);
      return {
        ...parent,
        children,
      };
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role_id: user.role_id,
        role_code: user.role.role_code,
        role_name: user.role.role_name,
      },
      menus: menuTree,
    });
  } catch (error: any) {
    console.error('Session error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan server internal' },
      { status: 500 }
    );
  }
}
