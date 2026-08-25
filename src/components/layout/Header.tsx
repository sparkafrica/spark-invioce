"use client"

import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { cn } from '#/lib/utils'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = authClient.useSession()

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  const navBtn = (active: boolean) =>
    cn(
      'px-3 py-[9px] text-xs font-semibold border',
      active ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'
    )

  const userName = session?.user?.name ?? ''
  const userRole = (session?.user as unknown as { role?: string })?.role ?? '—'
  const roleLabel = String(userRole).toUpperCase()

  return (
    <header
      data-chrome="1"
      className={cn(
        'sticky top-0 z-[5] flex w-full items-center justify-between gap-5 border-b-2 border-[#201e1d] bg-white px-6 py-3 lg:px-6',
        className
      )}
      style={{ padding: '12px 24px' }}
    >
      <div className="flex items-center gap-[22px]">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>

        <Link to="/dashboard" className="flex items-center">
          <img src="/assets/spark-logo.png" alt="Spark Africa Technologies" width={118} height={22} className="h-[22px] w-auto" style={{ width: 118 }} />
        </Link>

        <nav className="hidden md:flex items-center gap-[3px] flex-wrap" aria-label="Main navigation">
          {[
            { href: '/dashboard', label: 'Overview' },
            { href: '/invoices', label: 'Invoices' },
            { href: '/clients', label: 'Clients' },
            { href: '/products', label: 'Products' },
            { href: '/settings', label: 'Settings' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className={navBtn(isActive(item.href))}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: '/invoices/new' })}
          className="hidden sm:inline-flex bg-[#ec3013] text-white border border-transparent px-3 py-2 text-xs font-semibold hover:bg-[#c02a10] focus-visible:outline-2 focus-visible:outline-[#ec3013] focus-visible:outline-offset-2"
          style={{ padding: '9px 13px', fontSize: 12 }}
        >
          New invoice
        </button>
        {session?.user ? (
          <>
            <div className="hidden sm:block text-right leading-[1.2]">
              <div className="text-xs font-semibold text-[#201e1d]">{userName}</div>
              <div className="text-[10px] tracking-[0.1em] text-[#5c5755]">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                void authClient.signOut().then(() => navigate({ to: '/auth/login' }))
              }}
              className="border border-[#201e1d] bg-white px-2.5 py-2 text-xs font-semibold text-[#201e1d] hover:bg-[#f0dcd8] focus-visible:outline-2 focus-visible:outline-[#ec3013] focus-visible:outline-offset-2"
              style={{ padding: '8px 11px', fontSize: 12 }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/auth/login" className="border border-[#201e1d] bg-white px-2.5 py-2 text-xs font-semibold text-[#201e1d] hover:bg-[#f0dcd8]" style={{ padding: '8px 11px', fontSize: 12 }}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
