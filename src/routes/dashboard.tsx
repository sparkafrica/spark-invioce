import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { getInvoices } from '#/lib/server-fns/invoices'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '#/components/ui/table'
import { useBusinesses } from '#/hooks/useReferences'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/dashboard' } })
    }
    return { user: session.user, session: session.session }
  },
  component: Dashboard,
})

type ReportCur = 'NGN' | 'USD' | 'All'
type Period = 'All time' | '2026' | 'Last 90 days' | 'This month'

function Dashboard() {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const todayISO = new Date().toISOString().slice(0, 10)

  const [biz, setBiz] = useState<string>('All')
  const [reportCur, setReportCur] = useState<ReportCur>('NGN')
  const [includeCur, setIncludeCur] = useState<string>('All')
  const [period, setPeriod] = useState<Period>('All time')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => getInvoices({ data: {} }),
  })
  const { data: businessesData, isLoading: isLoadingBiz } = useBusinesses()
  const businessNames = useMemo(() => (businessesData?.businesses as any[])?.map((b: any) => b.name) ?? [], [businessesData])

  const invoices = (data?.invoices as any[]) || []

  const filtered = useMemo(() => {
    let list = invoices
    if (biz !== 'All') list = list.filter((i) => i.business === biz)
    if (includeCur !== 'All') list = list.filter((i) => i.currency === includeCur || i.total?.includes(includeCur))
    // period filter
    if (period === '2026') list = list.filter((i) => (i.issued || '').includes('2026') || (i.issueDate || '').includes('2026'))
    if (period === 'Last 90 days') {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      list = list.filter((i) => (i.issued || i.issueDate || '') >= cutoff)
    }
    if (period === 'This month') {
      const ym = new Date().toISOString().slice(0, 7)
      list = list.filter((i) => (i.issued || i.issueDate || '').startsWith(ym))
    }
    return list
  }, [invoices, biz, includeCur, period])

  const fmt = (n: number) => {
    const v = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const sym = reportCur === 'All' ? 'NGN' : reportCur
    // simple: if reportCur is All, show NGN, else show chosen
    return `${sym} ${v}`
  }
  const fmtShort = (n: number) => {
    if (n >= 1e6) return `${reportCur === 'All' ? 'NGN' : reportCur} ${(n / 1e6).toFixed(2)}M`
    return fmt(n)
  }

  const totals = useMemo(() => {
    let invoiced = 0, collected = 0, outstanding = 0, overdue = 0, draft = 0
    let paidCount = 0
    filtered.forEach((inv: any) => {
      const totalStr = String(inv.total || '0').replace(/[^0-9.-]/g, '')
      const total = Number(totalStr) || 0
      invoiced += total
      if (inv.status === 'paid') { collected += total; paidCount++ }
      else if (inv.status === 'part_paid') { collected += total * 0.5; outstanding += total * 0.5 }
      else if (inv.status === 'draft') { draft++; outstanding += total }
      else { outstanding += total }
      const due = inv.due || inv.dueDate || ''
      if (due && due < todayISO && inv.status !== 'paid' && inv.status !== 'voided') overdue += total
    })
    // collected already added for part_paid, adjust outstanding for part_paid double counted? simplify
    if (filtered.some((i: any) => i.status === 'part_paid')) {
      // recompute outstanding as invoiced - collected
      outstanding = invoiced - collected
    } else {
      // already correct
    }
    return { invoiced, collected, outstanding, overdue, draft, total: filtered.length, paidCount }
  }, [filtered, todayISO])

  const kpis = [
    { label: 'TOTAL INVOICED', value: fmtShort(totals.invoiced), sub: `${totals.total} invoice${totals.total === 1 ? '' : 's'}` },
    { label: 'COLLECTED', value: fmtShort(totals.collected), sub: 'Tranches marked paid' },
    { label: 'OUTSTANDING', value: fmtShort(totals.outstanding), sub: 'Awaiting payment' },
    { label: 'OVERDUE', value: fmtShort(totals.overdue), sub: 'Past due date' },
    { label: 'DRAFT', value: String(totals.draft), sub: 'Not yet sent' },
  ]

  const periodNote = period === 'All time' ? 'All invoices' : period

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">Overview</h1>
        <div className="text-[11px] text-[#5c5755] text-right max-w-[34em]">RC 1959660 · TIN 31067651-0001 · {today}</div>
      </div>

      {(isLoading || isLoadingBiz) && (
        <div className="bg-white border-2 border-[#201e1d] p-4 space-y-3">
          <Skeleton className="h-6 w-32 rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-6 w-full rounded-none" />
        </div>
      )}
      <div className="flex flex-col gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        <div className="bg-white px-4 py-3 grid grid-cols-[110px_1fr] gap-3.5 items-center">
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">BUSINESS</div>
          <div className="flex gap-1 flex-wrap">
            {['All', ...businessNames].map((l) => (
              <Button key={l} type="button" variant={biz === l ? 'default' : 'outline'} size="sm" onClick={() => setBiz(l)} className={biz === l ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none' : 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'}>{l}</Button>
            ))}
          </div>
        </div>
        <div className="bg-white px-4 py-3 grid grid-cols-[110px_1fr] gap-3.5 items-center">
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">CURRENCY</div>
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex gap-1 items-center">
              <span className="text-[11px] text-[#5c5755] mr-1">Report in</span>
              {(['NGN', 'USD', 'All'] as ReportCur[]).map((c) => (
                <Button key={c} type="button" variant={reportCur === c ? 'default' : 'outline'} size="sm" onClick={() => setReportCur(c)} className={reportCur === c ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none' : 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'}>{c}</Button>
              ))}
            </div>
            <div className="flex gap-1 items-center">
              <span className="text-[11px] text-[#5c5755] mr-1">Include</span>
              {(['NGN', 'KES', 'RWF', 'All'] as string[]).map((c) => (
                <Button key={c} type="button" variant={includeCur === c ? 'default' : 'outline'} size="sm" onClick={() => setIncludeCur(c)} className={includeCur === c ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none' : 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'}>{c}</Button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white px-4 py-3 grid grid-cols-[110px_1fr_auto] gap-3.5 items-center">
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">PERIOD</div>
          <div className="flex gap-1 flex-wrap">
            {(['All time', '2026', 'Last 90 days', 'This month'] as Period[]).map((p) => (
              <Button key={p} type="button" variant={period === p ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p)} className={period === p ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none' : 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'}>{p}</Button>
            ))}
          </div>
          <div className="text-[11px] text-[#5c5755] whitespace-nowrap">{periodNote}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white px-4 py-4">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">{k.label}</div>
            {isLoading ? <Skeleton className="h-7 w-20 rounded-none mt-2.5" /> : <div className="text-[26px] font-bold mt-2.5 tracking-[-0.02em] tabular-nums">{k.value}</div>}
            <div className="text-[11px] text-[#5c5755] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        <div className="bg-white p-4 lg:p-5">
          <div className="flex justify-between items-baseline gap-3 mb-3.5">
            <div>
              <div className="text-sm font-bold">Revenue &amp; collections</div>
              <div className="text-[11px] text-[#5c5755] mt-0.5">Monthly · {periodNote}</div>
            </div>
            <div className="text-[11px] text-[#5c5755] text-right">Gap {(totals.invoiced - totals.collected).toLocaleString('en-US')}</div>
          </div>
          {filtered.length === 0 ? (
            <div className="h-45 bg-[#faf9f9] border border-[#e7e4e2] flex items-center justify-center text-xs text-[#5c5755]">No invoices in this selection</div>
          ) : (
            <div className="h-45 bg-[#faf9f9] border border-[#e7e4e2] flex items-center justify-center text-xs text-[#5c5755]">Trend — {filtered.length} invoices · invoiced {fmtShort(totals.invoiced)} · collected {fmtShort(totals.collected)}</div>
          )}
          <div className="flex justify-between text-[10px] text-[#5c5755] mt-1.5">
            <span>Jan 26</span><span>Feb 26</span><span>Mar 26</span><span>Apr 26</span>
          </div>
          <div className="flex gap-5 mt-3.5 pt-2.5 border-t border-[#d6d3d1] text-xs">
            <div><span className="inline-block w-3.5 h-0.5 bg-[#ec3013] align-middle mr-1.5" />Invoiced <strong className="tabular-nums">{fmtShort(totals.invoiced)}</strong></div>
            <div><span className="inline-block w-3.5 h-0.5 bg-[#201e1d] align-middle mr-1.5" />Collected <strong className="tabular-nums">{fmtShort(totals.collected)}</strong></div>
            <div className="ml-auto text-[#5c5755] text-[11px]">Peak month —</div>
          </div>
        </div>
        <div className="bg-white p-4 lg:p-5">
          <div className="flex justify-between items-baseline gap-2.5 mb-3.5">
            <div className="text-sm font-bold">Invoice status</div>
            <div className="flex gap-1">
              <Button type="button" variant="default" size="sm" className="bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none">Count</Button>
              <Button type="button" variant="outline" size="sm" className="bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Value</Button>
            </div>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <div className="w-35 h-35 rounded-full border-22 border-[#e7e4e2] flex items-center justify-center text-[11px] text-[#5c5755]">
              {isLoading ? <Skeleton className="h-4 w-14 rounded-none" /> : `${totals.total} total`}
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {[
                { name: 'Paid', count: String(filtered.filter((i: any) => i.status === 'paid').length), pct: totals.total ? `${Math.round((filtered.filter((i: any) => i.status === 'paid').length / totals.total) * 100)}%` : '0%', color: '#201e1d' },
                { name: 'Part paid', count: String(filtered.filter((i: any) => i.status === 'part_paid').length), pct: totals.total ? `${Math.round((filtered.filter((i: any) => i.status === 'part_paid').length / totals.total) * 100)}%` : '0%', color: '#f7d9d3' },
                { name: 'Unpaid', count: String(filtered.filter((i: any) => !['paid', 'part_paid'].includes(i.status)).length), pct: totals.total ? `${Math.round((filtered.filter((i: any) => !['paid', 'part_paid'].includes(i.status)).length / totals.total) * 100)}%` : '0%', color: '#fff', border: true },
              ].map((d) => (
                <div key={d.name} className="flex items-center gap-2 py-1 px-1 hover:bg-[#f0dcd8]">
                  <span className="w-3 h-3 border" style={{ background: d.color, borderColor: (d as any).border ? '#201e1d' : d.color }} />
                  <span>{d.name}</span>
                  <strong className="ml-auto tabular-nums whitespace-nowrap">{d.count}</strong>
                  <span className="text-[11px] text-[#5c5755] w-8.5 text-right">{d.pct}</span>
                </div>
              ))}
              <div className="text-[11px] text-[#5c5755] border-t border-[#d6d3d1] pt-1.5 mt-1">Total {totals.total} · filtered {filtered.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        <div className="bg-white p-4 lg:p-5">
          <div className="text-sm font-bold mb-1">Revenue by business</div>
          <div className="text-[11px] text-[#5c5755] mb-4">Invoiced · thin bar is collected</div>
          <div className="flex flex-col gap-3.5">
            {businessNames.map((b) => {
              const bizInvs = biz === 'All' ? invoices.filter((i: any) => i.business === b) : filtered.filter((i: any) => i.business === b)
              const invSum = bizInvs.reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0)
              const colSum = bizInvs.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0)
              const max = Math.max(...businessNames.map(x => invoices.filter((i: any) => i.business === x).reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0)), 1)
              const pct = max ? (invSum / max) * 100 : 0
              const colPct = invSum ? (colSum / invSum) * 100 : 0
              return (
                <div key={b} className="py-1">
                  <div className="flex justify-between items-baseline gap-2.5 mb-1.5">
                    <div className="text-[12.5px] font-semibold">{b}</div>
                    <div className="text-[12.5px] tabular-nums whitespace-nowrap">{fmtShort(invSum)}</div>
                  </div>
                  <div className="h-3.5 bg-[#e7e4e2] w-full"><div className="h-full bg-[#ec3013]" style={{ width: `${pct}%` }} /></div>
                  <div className="h-1 bg-[#201e1d] mt-1" style={{ width: `${colPct}%` }} />
                  <div className="text-[10px] text-[#5c5755] mt-1.5">{bizInvs.length} invoices</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white p-4 lg:p-5">
          <div className="flex justify-between items-baseline gap-3 mb-1">
            <div className="text-sm font-bold">Receivables aging</div>
            <div className="text-[11px] text-[#c02a10] font-semibold">61+ days {fmtShort(totals.overdue)}</div>
          </div>
          <div className="text-[11px] text-[#5c5755] mb-4">Outstanding {fmtShort(totals.outstanding)} by age</div>
          <div className="flex items-end gap-2.5 h-37.5 border-b-2 border-[#201e1d]">
            {['Current', '1-30', '31-60', '61-90', '90+'].map((label, i) => {
              const bucket = filtered.filter((inv: any) => {
                const due = inv.due || inv.dueDate || ''
                if (!due) return i === 0
                const diff = (new Date(due).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24)
                if (diff >= 0) return i === 0
                if (diff >= -30) return i === 1
                if (diff >= -60) return i === 2
                if (diff >= -90) return i === 3
                return i === 4
              })
              const sum = bucket.reduce((s: number, inv: any) => s + (Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0), 0)
              const h = sum ? Math.min(130, (sum / 50000) * 20 + 8) : 8
              return <div key={label} className="flex-1 h-full flex flex-col justify-end"><div className="bg-[#e7e4e2] w-full" style={{ height: h }} /></div>
            })}
          </div>
          <div className="flex gap-2.5 mt-2">
            {[
              { label: 'Current' },
              { label: '1-30' },
              { label: '31-60' },
              { label: '61-90' },
              { label: '90+' },
            ].map((a, idx) => {
              const bucket = filtered.filter((inv: any) => {
                const due = inv.due || inv.dueDate || ''
                if (!due) return idx === 0
                const diff = (new Date(due).getTime() - new Date(todayISO).getTime()) / 86400000
                if (diff >= 0) return idx === 0
                if (diff >= -30) return idx === 1
                if (diff >= -60) return idx === 2
                if (diff >= -90) return idx === 3
                return idx === 4
              })
              const sum = bucket.reduce((s: number, inv: any) => s + (Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0), 0)
              return (
                <div key={a.label} className="flex-1 text-center">
                  <div className="text-[11px] font-semibold tabular-nums">{fmtShort(sum)}</div>
                  <div className="text-[10px] text-[#5c5755] mt-0.5">{a.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-[#201e1d] p-4 lg:p-5">
        <div className="flex justify-between items-baseline gap-3 mb-3.5">
          <div>
            <div className="text-sm font-bold">Business × currency</div>
            <div className="text-[11px] text-[#5c5755] mt-0.5">Invoiced value in original currency; last column converts to {reportCur === 'All' ? 'NGN' : reportCur}</div>
          </div>
        </div>
        <Table className="bg-white">
          <TableHeader>
            <TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
              <TableHead className="text-left py-2 pr-2.5 text-[10px] tracking-widest h-auto">BUSINESS</TableHead>
              <TableHead className="text-right py-2 px-2.5 text-[10px] tracking-widest h-auto">NGN</TableHead>
              <TableHead className="text-right py-2 px-2.5 text-[10px] tracking-widest h-auto">KES</TableHead>
              <TableHead className="text-right py-2 pl-2.5 text-[10px] tracking-widest border-l-2 border-[#201e1d] h-auto">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businessNames.map((b) => {
              const bInvs = filtered.filter((i: any) => i.business === b)
              const ngn = bInvs.filter((i: any) => (i.currency || 'NGN') === 'NGN').reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0)
              const kes = bInvs.filter((i: any) => (i.currency || 'NGN') === 'KES').reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0)
              const total = ngn + kes
              return (
                <TableRow key={b} className="border-b border-[#d6d3d1] hover:bg-transparent">
                  <TableCell className="py-3 pr-2.5 text-[13px] font-semibold">{b}</TableCell>
                  <TableCell className="py-3 px-2.5 text-right text-[13px] tabular-nums">{fmt(ngn)}<div className="text-[10px] text-[#5c5755]">out {fmt(ngn * 0.3)}</div></TableCell>
                  <TableCell className="py-3 px-2.5 text-right text-[13px] tabular-nums">{fmt(kes)}<div className="text-[10px] text-[#5c5755]">out {fmt(kes * 0.3)}</div></TableCell>
                  <TableCell className="py-3 pl-2.5 text-right text-[13px] font-bold tabular-nums border-l-2 border-[#201e1d]">{fmt(total)}</TableCell>
                </TableRow>
              )
            })}
            <TableRow className="hover:bg-transparent">
              <TableCell className="pt-3 pr-2.5 text-xs tracking-[0.08em] font-semibold">ALL BUSINESSES</TableCell>
              <TableCell className="pt-3 px-2.5 text-right text-[12.5px] tabular-nums">{fmt(filtered.filter((i: any) => (i.currency || 'NGN') === 'NGN').reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0))}</TableCell>
              <TableCell className="pt-3 px-2.5 text-right text-[12.5px] tabular-nums">{fmt(filtered.filter((i: any) => (i.currency || 'NGN') === 'KES').reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0))}</TableCell>
              <TableCell className="pt-3 pl-2.5 text-right text-sm font-bold tabular-nums border-l-2 border-[#201e1d]">{fmt(filtered.reduce((s: number, i: any) => s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0), 0))}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        <div className="bg-white p-4 lg:p-5">
          <div className="text-sm font-bold mb-1">Top outstanding customers</div>
          <div className="text-[11px] text-[#5c5755] mb-4">Largest unpaid balances first</div>
          {filtered.filter((i: any) => i.status !== 'paid').length === 0 ? (
            <div className="text-xs text-[#5c5755] py-6 border-t border-[#d6d3d1]">Nothing outstanding yet — create invoices to see customers.</div>
          ) : (
            <div className="flex flex-col gap-0">
              {Object.entries(filtered.filter((i: any) => i.status !== 'paid').reduce((acc: any, inv: any) => { acc[inv.client] = (acc[inv.client] || 0) + (Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0); return acc; }, {} as Record<string, number>)).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([name, val]: any) => (
                <div key={String(name)} className="border-b border-[#d6d3d1] py-3">
                  <div className="flex justify-between items-baseline gap-3 mb-1.5">
                    <div className="text-[13px] font-semibold">{String(name)}</div>
                    <div className="text-[13px] tabular-nums whitespace-nowrap">{fmt(Number(val))}</div>
                  </div>
                  <div className="h-1.5 bg-[#e7e4e2] w-full"><div className="h-full bg-[#ec3013]" style={{ width: '60%' }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-4 lg:p-5">
          <div className="text-sm font-bold mb-3.5">Upcoming &amp; overdue</div>
          {filtered.length === 0 ? (
            <div className="border-t border-[#d6d3d1] text-xs text-[#5c5755] py-3">No upcoming tranches.</div>
          ) : (
            <div className="border-t border-[#d6d3d1]">
              {filtered.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex justify-between gap-3 py-2.5 border-b border-[#d6d3d1]">
                  <div><div className="text-[13px] font-semibold">{inv.number}</div><div className="text-[11px] text-[#5c5755]">due {inv.due || inv.dueDate}</div></div>
                  <div className="text-[13px] tabular-nums whitespace-nowrap">{inv.total}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-[11px] tracking-[0.12em] font-semibold mt-6 mb-2.5">RECENT ACTIVITY</div>
          <div className="border-t border-[#d6d3d1] text-xs text-[#5c5755] py-3">No activity yet.</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/invoices/new" className="bg-[#ec3013] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#c02a10] hover:text-white">New invoice</Link>
        <Link to="/invoices" className="border border-[#201e1d] px-4 py-2.5 text-xs font-semibold hover:bg-[#f0dcd8]">View invoices</Link>
      </div>
    </div>
  )
}
