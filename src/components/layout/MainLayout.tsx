"use client"

import { Outlet, useLocation } from '@tanstack/react-router'
import { Header } from './Header'
import { cn } from '#/lib/utils'

interface MainLayoutProps {
  children?: React.ReactNode
  className?: string
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const location = useLocation()
  const isAuthRoute = location.pathname.startsWith('/auth')

  if (isAuthRoute) {
    return (
      <div className={cn('min-h-screen bg-[#f3f2f2] text-[#201e1d]', className)}>
        <main className="flex-1" id="main-content">
          {children ?? <Outlet />}
        </main>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen bg-[#f3f2f2] text-[#201e1d] flex flex-col', className)}>
      <Header />
      <main className="flex-1 px-6 py-7 lg:px-7 flex flex-col" id="main-content">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
