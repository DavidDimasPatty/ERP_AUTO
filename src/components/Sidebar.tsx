'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface MenuItem {
  menu_id: number;
  menu_code: string;
  menu_name: string;
  route_path: string | null;
  children?: MenuItem[];
}

interface SidebarProps {
  user: {
    full_name: string;
    username: string;
    role_name: string;
  };
  menus: MenuItem[];
}

export default function Sidebar({ user, menus }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isLinkActive = (route: string | null) => {
    if (!route) return false;
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">E</div>
        <span>ERP Motor</span>
      </div>

      <nav style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
        <ul className="nav-list">
          {menus.map((parent) => {
            const hasChildren = parent.children && parent.children.length > 0;

            if (!hasChildren) {
              return (
                <li key={parent.menu_id} className="nav-item">
                  <Link
                    href={parent.route_path || '#'}
                    className={`nav-link ${isLinkActive(parent.route_path) ? 'active' : ''}`}
                  >
                    <span>{parent.menu_name}</span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={parent.menu_id} className="nav-item">
                <span className="nav-parent-label">{parent.menu_name}</span>
                <ul className="nav-submenu">
                  {parent.children?.map((child) => (
                    <li key={child.menu_id}>
                      <Link
                        href={child.route_path || '#'}
                        className={`nav-link ${isLinkActive(child.route_path) ? 'active' : ''}`}
                        style={{ paddingLeft: '0.75rem', fontSize: '0.9rem' }}
                      >
                        <span>• {child.menu_name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-name">{user.full_name}</div>
          <div className="user-role">{user.role_name}</div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
