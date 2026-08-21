'use client';

import React, { useState } from 'react';
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
  const [collapsed, setCollapsed] = useState(false);

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
    return pathname == route;
  };

  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? "10px" : "250px",
        transition: "width 0.3s ease",
        overflow: "visible",
      }}
    >

      {!collapsed && (
        <div className="brand">
          <div className="brand-icon">M</div>
          <span>Mitra Motor</span>
        </div>
      )}

      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          border: "1px solid rgba(0,0,0,0.16)",
          position: "absolute",
          background: "var(--bg-primary)",
          cursor: "pointer",
          fontSize: "18px",
          top: "50%",
          left: "100%",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          boxShadow: "0 12px 30px rgba(0,0,0,0.16)",
          transition: "transform 0.2s ease, background 0.2s ease",
          zIndex: 99999,
          transform: "translate(calc(-50% + 2px), -50%)",
          color: "var(--text-primary)",
          backgroundColor: "#ffffff",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.96)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
        }}
      >
        {collapsed ? "»" : "«"}
      </button>

      <nav style={{ flexGrow: 1, overflowY: 'auto' }}>
        <ul className="nav-list">
          {menus.map((parent) => {
            const hasChildren = parent.children && parent.children.length > 0;

            if (!hasChildren) {
              return (
                <li key={parent.menu_id} className="nav-item" >
                  <Link
                    href={parent.route_path || '#'}
                    className={`nav-link ${isLinkActive(parent.route_path) ? 'active' : ''}`}
                  >
                    <span
                      style={{ fontSize: '0.8rem' }}
                    >{parent.menu_name}</span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={parent.menu_id} className="nav-item">
                <span className="nav-parent-label"
                  style={{ fontSize: '0.8rem' }}
                >{parent.menu_name}</span>
                <ul className="nav-submenu">
                  {parent.children?.map((child) => (
                    <li key={child.menu_id}>
                      <Link
                        href={child.route_path || '#'}
                        className={`nav-link ${isLinkActive(child.route_path) ? 'active' : ''}`}
                        style={{ paddingLeft: '0.75rem', fontSize: '0.8rem' }}
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
      {!collapsed ? (
        <div
          className="sidebar-footer"
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: collapsed ? 'center' : 'stretch',
          }}
        >

          <div className="user-info">
            <div className="user-name">{user.full_name}</div>
            <div className="user-role">{user.role_name}</div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            title="Keluar"
            style={{
              width: '100%',
              padding: collapsed ? '0.5rem' : '0.5rem 1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {collapsed ? '⏻' : 'Keluar'}
          </button>

        </div>
      ) : (<></>)}
    </aside>
  );
}
