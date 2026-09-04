'use client';

import { Outlet } from '@tanstack/react-router';
import { cn } from '#/lib/utils';

interface MainLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <main
      className={cn(
        'min-h-svh bg-[#f3f2f2] text-[#201e1d] flex flex-col',
        className,
      )}
    >
      {children ?? <Outlet />}
    </main>
  );
}
