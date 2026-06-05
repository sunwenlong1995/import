'use client';

import { Sidebar } from './sidebar';
import { ToastProvider } from '@/components/ui/toast';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-56 min-h-screen p-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
