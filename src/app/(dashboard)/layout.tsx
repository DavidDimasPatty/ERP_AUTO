import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('user_session');

  if (!sessionCookie || !sessionCookie.value) {
    redirect('/login');
  }

  let sessionUser;
  try {
    sessionUser = JSON.parse(sessionCookie.value);
  } catch {
    redirect('/login');
  }

  // Fetch current user details & menus
  const user = await prisma.m_user.findUnique({
    where: { user_id: sessionUser.user_id },
    include: { role: true },
  });

  if (!user || !user.is_active) {
    redirect('/login');
  }

  // Query menu items
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

  // Build tree
  const parents = activeMenus
    .filter((m) => m.parent_menu_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const menuTree = parents.map((parent) => {
    const childrenList = activeMenus
      .filter((m) => m.parent_menu_id === parent.menu_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      menu_id: parent.menu_id,
      menu_code: parent.menu_code,
      menu_name: parent.menu_name,
      route_path: parent.route_path,
      children: childrenList.map((c) => ({
        menu_id: c.menu_id,
        menu_code: c.menu_code,
        menu_name: c.menu_name,
        route_path: c.route_path,
      })),
    };
  });



  const userDataForSidebar = {
    full_name: user.full_name,
    username: user.username,
    role_name: user.role.role_name,
  };

  return (
    <div className="app-container">
      <Sidebar user={userDataForSidebar} menus={menuTree} />
      <main className="main-content">{children}</main>
    </div>
  );
}
