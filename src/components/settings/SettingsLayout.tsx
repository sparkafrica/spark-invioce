"use client"

import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'

export function SettingsLayout() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState((location.search as { tab?: string }).tab || 'team')
  const { data: session } = authClient.useSession()

  const isAdmin = (session?.user as any)?.role === 'admin' || (session as any)?.session?.userRole === 'admin' // fallback
  // For demo, treat clinton as admin
  const isAdminDemo = session?.user?.email === 'clinton@sparkafrica.co' || session?.user?.email === 'admin@spark.com'

  const tabs = [
    { id: 'team', label: 'Team' },
    { id: 'profile', label: 'Profile' },
    { id: 'organization', label: 'Organization' },
  ]

  const btnActive = 'bg-[#201e1d] text-white border border-[#201e1d] px-3 py-1.5 text-xs font-semibold'
  const btnIdle = 'bg-white text-[#201e1d] border border-[#201e1d] px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]'

  return (
    <div className="flex flex-col gap-6 py-7" style={{ paddingInline: 24, paddingBottom: 56 }}>
      <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] leading-none">Settings</h1>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={activeTab === t.id ? btnActive : btnIdle}>{t.label}</button>
          ))}
        </div>
      </div>

      {activeTab === 'team' && <TeamPanel isAdmin={isAdmin || isAdminDemo} />}
      {activeTab === 'profile' && <ProfilePanel />}
      {activeTab === 'organization' && <OrganizationPanel />}
    </div>
  )
}

function TeamPanel({ isAdmin }: { isAdmin: boolean }) {
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'admin'>('editor')
  const [msg, setMsg] = useState('')

  // Mock team rows like template v2 lines 370-382 + real session user
  const { data: session } = authClient.useSession()
  const teamRows = [
    { name: 'Nnaemeka Clinton', email: 'clinton@sparkafrica.co', role: 'Admin', status: 'Active', canManage: isAdmin },
    { name: 'Ada Okonkwo', email: 'ada@sparkafrica.co', role: 'Editor', status: 'Active', canManage: isAdmin },
    ...(session?.user && !['clinton@sparkafrica.co','ada@sparkafrica.co'].includes(session.user.email) ? [{ name: session.user.name || 'You', email: session.user.email, role: 'Editor', status: 'Active', canManage: isAdmin }] : []),
  ]

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setMsg('Email required'); return }
    try {
      // Use better-auth organization invite if available, else mock
      const res: any = await (authClient as any).organization?.inviteMember?.({ email: inviteEmail, role: inviteRole })
      if (res?.error) throw new Error(res.error.message)
      setMsg(`Invite sent to ${inviteEmail} as ${inviteRole}`)
      setInviteName(''); setInviteEmail('')
    } catch (e: any) {
      setMsg(e.message || 'Failed to invite')
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-9 items-start">
      <div>
        <div className="border-b-2 border-[#201e1d] pb-3.5 mb-5 text-[32px] font-bold tracking-[-0.02em] leading-none">Team</div>
        <table className="w-full bg-white">
          <thead>
            <tr className="border-b-2 border-[#201e1d]">
              <th className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold">NAME</th>
              <th className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold">EMAIL</th>
              <th className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold">ROLE</th>
              <th className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] font-semibold">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {teamRows.map((m) => (
              <tr key={m.email} className="border-b border-[#d6d3d1]">
                <td className="py-3 px-3 text-[13px] font-semibold">{m.name}</td>
                <td className="py-3 px-3 text-[13px]">{m.email}</td>
                <td className="py-3 px-3 text-[13px]">
                  {m.canManage ? (
                    <button className="border border-[#201e1d] bg-white px-2.5 py-1 text-[11px] font-semibold hover:bg-[#f0dcd8]">{m.role}</button>
                  ) : (
                    <span>{m.role}</span>
                  )}
                </td>
                <td className="py-3 px-3 text-[13px] text-[#5c5755]">{m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-l-2 border-[#201e1d] pl-7">
        <div className="text-[10px] tracking-[0.12em] font-semibold mb-3">INVITE A TEAM MEMBER</div>
        {isAdmin ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold">Name</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Ada Okonkwo" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-[#ec3013]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold">Email</label>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="ada@sparkafrica.co" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-[#ec3013]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-[#ec3013]">
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button onClick={handleInvite} className="bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-2.5 text-xs font-semibold hover:bg-[#c02a10] text-left">Send invite</button>
            {msg && <div className="text-xs text-[#5c5755] border border-[#d6d3d1] p-2 bg-[#f3f2f2]">{msg}</div>}
          </div>
        ) : (
          <div className="text-xs text-[#5c5755]">Only admins can invite people or change roles.</div>
        )}
      </div>
    </div>
  )
}

function ProfilePanel() {
  const { data: session } = authClient.useSession()
  return (
    <div className="border-2 border-[#201e1d] bg-white p-6 max-w-[860px]">
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">PROFILE</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold">Full Name</label>
          <input defaultValue={session?.user?.name || ''} placeholder="Ada Okonkwo" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold">Email</label>
          <input defaultValue={session?.user?.email || ''} placeholder="ada@sparkafrica.co" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button className="bg-[#ec3013] text-white border border-[#ec3013] px-4 py-2 text-xs font-semibold hover:bg-[#c02a10]">Save Changes</button>
      </div>
    </div>
  )
}

function OrganizationPanel() {
  return (
    <div className="border-2 border-[#201e1d] bg-white p-6 max-w-[860px] flex flex-col gap-4">
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">ORGANIZATION — SPARK INVOICE SYSTEM</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold">Organization Name</label>
          <input defaultValue="Spark Invoice System" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold">Slug</label>
          <input defaultValue="spark-invoice-system" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
        </div>
      </div>
      <div className="text-xs text-[#5c5755]">Businesses: New Business (NB), ASF, ATE — Companies: Nigeria (NGN), Kenya (KES), Rwanda (RWF)</div>
      <div className="flex justify-end">
        <button className="bg-[#ec3013] text-white border border-[#ec3013] px-4 py-2 text-xs font-semibold hover:bg-[#c02a10]">Save Organization</button>
      </div>
    </div>
  )
}
