// src/components/ResponsiveSidebarWrapper.tsx
'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import type { MenuItem } from '@/components/Sidebar';

interface ResponsiveSidebarWrapperProps {
  user: { full_name: string; username: string; role_name: string };
  menus: MenuItem[];
  children: React.ReactNode;
}

export default function ResponsiveSidebarWrapper({
  user,
  menus,
  children,
}: ResponsiveSidebarWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <div className={`app-container ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        {sidebarOpen && <Sidebar user={user} menus={menus} />}
        <button
          className="toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ left: sidebarOpen ? '260px' : '0' }}
        >
          {sidebarOpen ? '<' : '>'}
        </button>
        <main className="main-content">{children}</main>
      </div>
    </>
  );
}
