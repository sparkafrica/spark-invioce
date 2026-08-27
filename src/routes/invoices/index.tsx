import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { InvoiceTable } from '#/components/table/InvoiceTable'
import { getInvoices } from '#/lib/server-fns/invoices'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { useBusinesses } from '#/hooks/useReferences'

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
  const [bizFilter, setBizFilter] = useState<string>('All')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => getInvoices({ data: {} }),
  })
  const { data: businessesData } = useBusinesses()
  const bizOptions = ['All', ...((businessesData?.businesses as any[])?.map((b: any) => b.name) ?? [])]

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] leading-none">Invoices</h1>
          <Skeleton className="h-6 w-24 rounded-none" />
        </div>
        <div className="bg-white border-2 border-[#201e1d] p-4 space-y-3">
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] leading-none">Invoices</h1>
          <Link to="/invoices/new" className="bg-[#ec3013] text-white px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10]">New invoice</Link>
        </div>
        <div className="bg-[#f0dcd8] border border-[#201e1d] p-4 text-sm">
          <p className="text-[#8d1f0c]">Failed to load invoices: {(error as Error).message}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="mt-3 border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Retry</Button>
        </div>
      </div>
    )
  }

  const invoices = data?.invoices || []
  const filtered = bizFilter === 'All' ? invoices : invoices.filter((i) => i.business === bizFilter)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em] leading-none">Invoices</h1>
        <div className="flex gap-1 flex-wrap">
          {bizOptions.map((b) => (
            <Button type="button" key={b} variant={bizFilter === b ? 'default' : 'outline'} size="sm" onClick={() => setBizFilter(b)} className={bizFilter === b ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none' : 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'}>
              {b}
            </Button>
          ))}
        </div>
      </div>

      {bizFilter !== 'All' && (
        <div className="flex items-center justify-between gap-3 bg-[#f0dcd8] border border-[#201e1d] px-3.5 py-2.5">
          <div className="text-xs font-semibold">Filtered from dashboard — {bizFilter}</div>
          <Button type="button" variant="outline" size="sm" onClick={() => setBizFilter('All')} className="border border-[#201e1d] bg-white px-3 py-1.5 text-[11px] font-semibold hover:bg-white rounded-none">
            Clear filter
          </Button>
        </div>
      )}

      <InvoiceTable
        data={filtered}
        onView={(invoice) => navigate({ to: '/invoices/$id', params: { id: invoice.id } })}
        onEdit={(invoice) => navigate({ to: '/invoices/$id/edit', params: { id: invoice.id } })}
      />

      <div className="flex gap-2">
        <Link to="/invoices/new" className="bg-[#ec3013] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#c02a10] hover:text-white">New invoice</Link>
      </div>
    </div>
  )
}
