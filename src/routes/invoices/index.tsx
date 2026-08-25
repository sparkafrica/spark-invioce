import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { InvoiceTable } from '#/components/table/InvoiceTable'
import { getInvoices } from '#/lib/server-fns/invoices'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export const Route = createFileRoute('/invoices/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/invoices' } })
    }
    return { user: session.user, session: session.session }
  },
  component: InvoicesPage,
})

function InvoicesPage() {
  const navigate = useNavigate()
  const [bizFilter, setBizFilter] = useState<'All' | 'New Business' | 'ASF' | 'ATE'>('All')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => getInvoices({ data: {} }),
  })

  const btnActive = 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold'
  const btnIdle = 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]'

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 py-7" style={{ paddingInline: 24, paddingBottom: 56 }}>
        <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
          <h1 className="text-[32px] font-bold tracking-[-0.02em] leading-none">Invoices</h1>
          <div className="text-xs text-[#5c5755]">Loading…</div>
        </div>
        <div className="bg-white border border-[#d6d3d1] p-12 text-center text-sm text-[#5c5755]">Loading invoices…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5 py-7" style={{ paddingInline: 24, paddingBottom: 56 }}>
        <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
          <h1 className="text-[32px] font-bold tracking-[-0.02em] leading-none">Invoices</h1>
          <Link to="/invoices/new" className="bg-[#ec3013] text-white px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10]">New invoice</Link>
        </div>
        <div className="bg-[#f0dcd8] border border-[#201e1d] p-4 text-sm">
          <p className="text-[#8d1f0c]">Failed to load invoices: {(error as Error).message}</p>
          <button onClick={() => refetch()} className="mt-3 border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]">Retry</button>
        </div>
      </div>
    )
  }

  const invoices = data?.invoices || []
  const filtered = bizFilter === 'All' ? invoices : invoices.filter((i) => i.business === bizFilter)

  return (
    <div className="flex flex-col gap-5 py-7" style={{ paddingInline: 24, paddingBottom: 56 }}>
      <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] leading-none">Invoices</h1>
        <div className="flex gap-1">
          {(['All', 'New Business', 'ASF', 'ATE'] as const).map((b) => (
            <button key={b} onClick={() => setBizFilter(b)} className={bizFilter === b ? btnActive : btnIdle}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {bizFilter !== 'All' && (
        <div className="flex items-center justify-between gap-3 bg-[#f0dcd8] border border-[#201e1d] px-3.5 py-2.5">
          <div className="text-xs font-semibold">Filtered from dashboard — {bizFilter}</div>
          <button onClick={() => setBizFilter('All')} className="border border-[#201e1d] bg-white px-3 py-1.5 text-[11px] font-semibold hover:bg-white">
            Clear filter
          </button>
        </div>
      )}

      <InvoiceTable
        data={filtered}
        onView={(invoice) => navigate({ to: '/invoices/$id', params: { id: invoice.id } })}
        onEdit={(invoice) => navigate({ to: '/invoices/$id/edit', params: { id: invoice.id } })}
      />

      <div className="flex gap-2">
        <Link to="/invoices/new" className="bg-[#ec3013] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#c02a10]">New invoice</Link>
      </div>
    </div>
  )
}
