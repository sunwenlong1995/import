'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Upload, Settings, Table, FileText, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '文件导入', icon: Upload },
  { href: '/rules', label: '解析规则', icon: Settings },
  { href: '/preview', label: '数据预览', icon: Table },
  { href: '/waybills', label: '运单列表', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#1a1a2e] text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-semibold text-sm">UniversalImport</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="mt-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
