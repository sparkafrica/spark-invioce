"use client"

import { Link, useLocation } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { ProfilePanel } from './ProfilePanel'
import { OrganizationPanel } from './OrganizationPanel'
import { CompaniesPanel } from './CompaniesPanel'
import { BanksPanel } from './BanksPanel'
import { BusinessesPanel } from './BusinessesPanel'
import { FXRatesPanel } from './FxRatesPanel'

const TABS = [
  { id: 'profile', label: 'Profile', href: '/settings/profile' as const },
  { id: 'organization', label: 'Organization', href: '/settings/organization' as const },
  { id: 'companies', label: 'Invoicing companies', href: '/settings/companies' as const },
  { id: 'banks', label: 'Bank accounts', href: '/settings/banks' as const },
  { id: 'businesses', label: 'Businesses & logos', href: '/settings/businesses' as const },
  { id: 'fx-rates', label: 'Exchange Rates', href: '/settings/fx-rates' as const },
] as const

export function SettingsLayout() {
  const location = useLocation()
  const { data: session } = authClient.useSession()

  const isAdmin = (session?.user as any)?.role === 'admin' || (session as any)?.session?.userRole === 'admin'
  const isAdminDemo = session?.user?.email === 'clinton@sparkafrica.co' || session?.user?.email === 'admin@spark.com'
  const isOwner = session?.user?.email === 'clinton@sparkafrica.co'
  const canManage = isAdmin || isAdminDemo || isOwner

  const path = location.pathname.replace(/^\/setting\b/, '/settings')
  const activeId = TABS.find(t => path === t.href)?.id || (path === '/settings' || path === '/settings/' ? 'profile' : 'profile')

  const btnActive = 'bg-[#201e1d] text-white border border-[#201e1d] px-3 py-1.5 text-xs font-semibold'
  const btnIdle = 'bg-white text-[#201e1d] border border-[#201e1d] px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">Settings</h1>
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <Link key={t.id} to={t.href} className={activeId === t.id ? btnActive : btnIdle}>{t.label}</Link>
          ))}
        </div>
      </div>

      {activeId === 'profile' && <ProfilePanel />}
      {activeId === 'organization' && <OrganizationPanel />}
      {activeId === 'companies' && <CompaniesPanel />}
      {activeId === 'banks' && <BanksPanel />}
      {activeId === 'businesses' && <BusinessesPanel canManage={canManage} />}
      {activeId === 'fx-rates' && <FXRatesPanel canManage={canManage} />}
    </div>
  )
}
