/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not all deps need to be included, only filtered and reportCur are relevant */
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '#/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table';
import { useBusinesses, useFXRates } from '#/hooks/useReferences';
import { convertCurrencyValue, DEFAULT_FX_RATES } from '#/lib/currencies';
import { getActivityLog } from '#/lib/server-fns/references';
import { getInvoices } from '#/lib/server-fns/invoices';

export const Route = createFileRoute('/_auth-layout/dashboard')({
  component: Dashboard,
});

type ReportCur = 'NGN' | 'USD' | 'GBP' | 'All';
type Period = 'All time' | '2026' | 'Last 90 days' | 'This month';

function Dashboard() {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const todayISO = new Date().toISOString().slice(0, 10);

  const [biz, setBiz] = useState<string>('All');
  const [reportCur, setReportCur] = useState<ReportCur>('USD');
  const [includeCur, setIncludeCur] = useState<string>('All');
  const [period, setPeriod] = useState<Period>('All time');
  const [statusMetric, setStatusMetric] = useState<'count' | 'value'>('count');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => getInvoices({ data: {} }),
  });
  const { data: fxData } = useFXRates();
  const { data: businessesData, isLoading: isLoadingBiz } = useBusinesses();
  const businessNames = useMemo(() => {
    const list = businessesData?.businesses as unknown as
      | Array<{ name: string }>
      | undefined;
    return list?.map((b) => b.name) ?? [];
  }, [businessesData]);

  type InvoiceRow = {
    id: string;
    business: string;
    currency: string;
    total: string;
    status: string;
    due?: string;
    dueDate?: string;
    issued?: string;
    issueDate?: string;
    client: string;
    number: string;
  };
  const invoices = (data?.invoices as unknown as InvoiceRow[]) || [];
  const fxRates = useMemo<Record<string, number>>(() => {
    const rawRates = ((
      fxData as { fxRates?: { rates?: Record<string, number> } } | undefined
    )?.fxRates?.rates ?? DEFAULT_FX_RATES) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(rawRates).map(([code, value]) => [
        code.toUpperCase(),
        Number(value) || 0,
      ]),
    );
  }, [fxData]);

  const convertToReportCurrency = (amount: number, fromCurrency?: string) =>
    convertCurrencyValue(
      amount,
      fromCurrency,
      reportCur === 'All' ? 'NGN' : reportCur,
      fxRates,
    );

  const filtered = useMemo(() => {
    let list = invoices;
    if (biz !== 'All') list = list.filter((i) => i.business === biz);
    if (includeCur !== 'All')
      list = list.filter(
        (i) => i.currency === includeCur || i.total?.includes(includeCur),
      );
    // period filter
    if (period === '2026')
      list = list.filter(
        (i) =>
          (i.issued || '').includes('2026') ||
          (i.issueDate || '').includes('2026'),
      );
    if (period === 'Last 90 days') {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      list = list.filter((i) => (i.issued || i.issueDate || '') >= cutoff);
    }
    if (period === 'This month') {
      const ym = new Date().toISOString().slice(0, 7);
      list = list.filter((i) => (i.issued || i.issueDate || '').startsWith(ym));
    }
    return list;
  }, [invoices, biz, includeCur, period]);

  const fmt = (n: number) => {
    const v = n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sym = reportCur === 'All' ? 'NGN' : reportCur;
    // simple: if reportCur is All, show NGN, else show chosen
    return `${sym} ${v}`;
  };
  const fmtShort = (n: number) => {
    if (n >= 1e6)
      return `${reportCur === 'All' ? 'NGN' : reportCur} ${(n / 1e6).toFixed(2)}M`;
    return fmt(n);
  };

  const totals = useMemo(() => {
    let invoiced = 0,
      collected = 0,
      outstanding = 0,
      overdue = 0,
      draft = 0;
    let invoicedCount = 0;
    let paidCount = 0;
    filtered.forEach((inv) => {
      if (inv.status === 'draft') {
        draft++;
        return;
      }
      const totalStr = String(inv.total || '0').replace(/[^0-9.-]/g, '');
      const total = convertToReportCurrency(
        Number(totalStr) || 0,
        inv.currency,
      );
      if (inv.status !== 'voided') {
        invoiced += total;
        invoicedCount++;
      }
      if (inv.status === 'paid') {
        collected += total;
        paidCount++;
      } else if (inv.status === 'part_paid') {
        collected += total * 0.5;
        outstanding += total * 0.5;
      } else if (inv.status !== 'voided') {
        outstanding += total;
      }
      const due = inv.due || inv.dueDate || '';
      if (
        due &&
        due < todayISO &&
        inv.status !== 'paid' &&
        inv.status !== 'voided' &&
        inv.status !== 'draft'
      )
        overdue += total;
    });
    if (filtered.some((i) => i.status === 'part_paid')) {
      outstanding = invoiced - collected;
    }
    return {
      invoiced,
      collected,
      outstanding,
      overdue,
      draft,
      total: invoicedCount,
      invoicedCount,
      paidCount,
    };
  }, [filtered, todayISO, reportCur, fxRates]);

  const kpis = [
    {
      label: 'TOTAL INVOICED',
      value: fmtShort(totals.invoiced),
      sub: `${totals.invoicedCount} invoice${totals.invoicedCount === 1 ? '' : 's'}`,
      draft: totals.draft,
    },
    {
      label: 'COLLECTED',
      value: fmtShort(totals.collected),
      sub: 'Tranches marked paid',
    },
    {
      label: 'OUTSTANDING',
      value: fmtShort(totals.outstanding),
      sub: 'Awaiting payment',
    },
    { label: 'OVERDUE', value: fmtShort(totals.overdue), sub: 'Past due date' },
  ];

  const periodNote = period === 'All time' ? 'All invoices' : period;

  const navigate = useNavigate();

  const handleSegmentClick = (key: string) => {
    const mapping: Record<string, string> = {
      paid: 'paid',
      part_paid: 'part_paid',
      overdue: 'overdue',
      due: 'due',
      draft: 'draft',
      voided: 'voided',
    };
    const status = mapping[key] ?? key;
    const search: Record<string, string | undefined> = {
      status,
      business: biz !== 'All' ? biz : undefined,
      currency: includeCur === 'All' ? undefined : includeCur,
    };
    navigate({ to: '/invoices', search });
  };

  const invoiceStatusData = useMemo(() => {
    const isOverdue = (i: InvoiceRow) => {
      const due = i.due || i.dueDate || '';
      return Boolean(due && due < todayISO && !['paid', 'voided'].includes(i.status));
    };
    const isDue = (i: InvoiceRow) => {
      const due = i.due || i.dueDate || '';
      return Boolean(
        due &&
        due >= todayISO &&
        !['paid', 'part_paid', 'voided'].includes(i.status) &&
        !isOverdue(i),
      );
    };
    // Ref: v2.dc.html statDef [['Paid','#201e1d'],['Part paid','#f0866f'],['Due','#c9c4c2'],['Overdue','#ec3013']]
    const statuses = [
      {
        name: 'Paid',
        key: 'paid',
        count: filtered.filter((i) => i.status === 'paid').length,
        value: filtered
          .filter((i) => i.status === 'paid')
          .reduce(
            (s, i) =>
              s +
              convertToReportCurrency(
                Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0,
                i.currency,
              ),
            0,
          ),
        color: '#201e1d',
      },
      {
        name: 'Part paid',
        key: 'part_paid',
        count: filtered.filter((i) => i.status === 'part_paid').length,
        value: filtered
          .filter((i) => i.status === 'part_paid')
          .reduce(
            (s, i) =>
              s +
              convertToReportCurrency(
                Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0,
                i.currency,
              ),
            0,
          ),
        color: '#f0866f',
      },
      {
        name: 'Due',
        key: 'due',
        count: filtered.filter(isDue).length,
        value: filtered
          .filter(isDue)
          .reduce(
            (s, i) =>
              s +
              convertToReportCurrency(
                Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0,
                i.currency,
              ),
            0,
          ),
        color: '#c9c4c2',
      },
      {
        name: 'Overdue',
        key: 'overdue',
        count: filtered.filter(isOverdue).length,
        value: filtered.filter(isOverdue).reduce(
          (s, i) =>
            s +
            convertToReportCurrency(
              Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0,
              i.currency,
            ),
          0,
        ),
        color: '#ec3013',
      },
    ];

    const totalMetric =
      statusMetric === 'count'
        ? statuses.reduce((s, item) => s + item.count, 0)
        : statuses.reduce((s, item) => s + item.value, 0);

    let cursor = 0;
    const ringBackground = statuses
      .map((item) => {
        const value = statusMetric === 'count' ? item.count : item.value;
        const segment = totalMetric > 0 ? (value / totalMetric) * 100 : 0;
        const start = cursor;
        const end = cursor + segment;
        cursor = end;
        return `${item.color} ${start}% ${end}%`;
      })
      .join(', ');

    return {
      statuses,
      totalMetric,
      ringBackground,
    };
  }, [filtered, statusMetric]);

  const trendData = useMemo(() => {
    // Ref: v2.dc.html 1888 — continuous months from issueDate, invoiced vs collected
    const shift = (m: string, n: number) => {
      const d0 = new Date(`${m}-01T00:00:00`);
      d0.setMonth(d0.getMonth() + n);
      return `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}`;
    };
    const mk: Record<string, 1> = {};
    filtered.forEach((inv: any) => {
      const issue = (inv.issued || inv.issueDate || '').slice(0, 7);
      if (issue && /^\d{4}-\d{2}$/.test(issue)) mk[issue] = 1;
      // collected month not separate in this dataset — use issue month for gap calc
    });
    const found = Object.keys(mk).sort();
    const months: string[] = [];
    if (found.length) {
      let c0 = found[0];
      const last = found[found.length - 1];
      while (c0 <= last) {
        months.push(c0);
        c0 = shift(c0, 1);
      }
    } else {
      // fallback to current month if no data
      const now = new Date().toISOString().slice(0, 7);
      months.push(now);
    }
    const buckets = new Map<string, { month: string; invoiced: number; collected: number }>();
    months.forEach((m) => {
      const label = new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
      });
      buckets.set(m, { month: label, invoiced: 0, collected: 0 });
    });

    filtered.forEach((inv) => {
      const m = (inv.issued || inv.issueDate || '').slice(0, 7);
      if (!m || !buckets.has(m)) return;
      const amount = convertToReportCurrency(
        Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0,
        inv.currency,
      );
      const bucket = buckets.get(m) ?? { month: m, invoiced: 0, collected: 0 };
      bucket.invoiced += amount;
      if (inv.status === 'paid') {
        bucket.collected += amount;
      } else if (inv.status === 'part_paid') {
        bucket.collected += amount * 0.5;
      }
      buckets.set(m, bucket);
    });

    return Array.from(buckets.values());
  }, [filtered, reportCur, fxRates]);

  const outstandingCustomers = useMemo<
    Array<{ name: string; out: number; over: number; pct: number; count: number }>
  >(() => {
    const map = new Map<string, { out: number; over: number; count: number }>();
    const today = todayISO;
    filtered
      .filter((i) => i.status !== 'paid' && i.status !== 'voided')
      .forEach((inv) => {
        const amt = convertToReportCurrency(
          Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0,
          inv.currency,
        );
        const cur = map.get(inv.client) ?? { out: 0, over: 0, count: 0 };
        cur.out += amt;
        cur.count += 1;
        const due = (inv as any).due || (inv as any).dueDate || '';
        const isOver = Boolean(due && due < today && !['paid', 'voided'].includes(inv.status));
        if (isOver) cur.over += amt;
        map.set(inv.client, cur);
      });
    const maxOut = Math.max(1, ...Array.from(map.values()).map((v) => v.out));
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        out: v.out,
        over: v.over,
        count: v.count,
        pct: Math.round((v.out / maxOut) * 100),
      }))
      .sort((a, b) => b.out - a.out)
      .slice(0, 4);
  }, [filtered, todayISO, reportCur, fxRates]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">
          Overview
        </h1>
        <div className="text-[11px] text-[#5c5755] text-right max-w-[34em]">
          RC 1959660 · TIN 31067651-0001 · {today}
        </div>
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
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
            BUSINESS
          </div>
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden">
            <Select value={biz} onValueChange={(v) => setBiz(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Businesses</SelectItem>
                {businessNames.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Desktop: Badge group */}
          <div className="hidden lg:flex gap-1 flex-wrap">
            {['All', ...businessNames].map((l) => (
              <Badge
                key={l}
                variant={biz === l ? 'default' : 'outline'}
                onClick={() => setBiz(l)}
                className={`cursor-pointer rounded-none px-2.5 py-1.5 text-xs font-semibold ${biz === l
                  ? 'bg-[#201e1d] text-white border-[#201e1d] hover:bg-[#201e1d] hover:text-white'
                  : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'
                  }`}
              >
                {l}
              </Badge>
            ))}
          </div>
        </div>
        <div className="bg-white px-4 py-3 grid grid-cols-[110px_1fr] gap-3.5 items-center">
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
            CURRENCY
          </div>
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex gap-1 items-center lg:hidden">
              <Select
                value={reportCur}
                onValueChange={(v) => setReportCur(v as ReportCur)}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Report in" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gap-1 items-center hidden lg:flex">
              <span className="text-[11px] text-[#5c5755] mr-1">Report in</span>
              {(['USD', 'NGN', 'GBP', 'All'] as ReportCur[]).map((c) => (
                <Badge
                  key={c}
                  variant={reportCur === c ? 'default' : 'outline'}
                  onClick={() => setReportCur(c)}
                  className={`cursor-pointer rounded-none px-2.5 py-1.5 text-xs font-semibold ${reportCur === c
                    ? 'bg-[#201e1d] text-white border-[#201e1d] hover:bg-[#201e1d] hover:text-white'
                    : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'
                    }`}
                >
                  {c}
                </Badge>
              ))}
            </div>
            <div className="flex gap-1 items-center lg:hidden">
              <Select
                value={includeCur}
                onValueChange={(v) => setIncludeCur(v as string)}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Include" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="gap-1 items-center hidden lg:flex">
              <span className="text-[11px] text-[#5c5755] mr-1">Include</span>
              {(['All', 'KES', 'NGN', 'USD'] as string[]).map((c) => (
                <Badge
                  key={c}
                  variant={includeCur === c ? 'default' : 'outline'}
                  onClick={() => setIncludeCur(c)}
                  className={`cursor-pointer rounded-none px-2.5 py-1.5 text-xs font-semibold ${includeCur === c
                    ? 'bg-[#201e1d] text-white border-[#201e1d] hover:bg-[#201e1d] hover:text-white'
                    : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'
                    }`}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white px-4 py-3 grid grid-cols-[110px_1fr_auto] gap-3.5 items-center">
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
            PERIOD
          </div>
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden">
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All time">All time</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="Last 90 days">Last 90 days</SelectItem>
                <SelectItem value="This month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Desktop: Button group */}
          <div className="hidden lg:flex gap-1 flex-wrap">
            {(
              ['All time', '2026', 'Last 90 days', 'This month'] as Period[]
            ).map((p) => (
              <Badge
                key={p}
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
                className={`cursor-pointer rounded-none px-2.5 py-1.5 text-xs font-semibold ${period === p
                  ? 'bg-[#201e1d] text-white border-[#201e1d] hover:bg-[#201e1d] hover:text-white'
                  : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'
                  }`}
              >
                {p}
              </Badge>
            ))}
          </div>
          <div className="text-[11px] text-[#5c5755] whitespace-nowrap">
            {periodNote}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white px-4 py-4">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
              {k.label}
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-20 rounded-none mt-2.5" />
            ) : (
              <div className="text-[26px] font-bold mt-2.5 tracking-[-0.02em] tabular-nums">
                {k.value}
              </div>
            )}
            <div className="text-[11px] text-[#5c5755] mt-1">{k.sub}</div>
            {k.label === 'TOTAL INVOICED' && (k as any).draft > 0 && (
              <div className="text-[11px] font-semibold text-[#c02a10] mt-1">
                + {(k as any).draft} draft not counted
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        {/* Revenue & Collections Chart matching image_f9a410.png */}
        <div className="bg-white p-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900 mb-1">
                Revenue &amp; collections
              </h2>
              <div className="text-[13px] text-gray-500">
                Monthly, {periodNote}
              </div>
            </div>
            <div className="text-[13px] text-gray-600">
              Gap <span className="font-medium">{fmtShort(totals.invoiced - totals.collected)}</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="h-62.5 bg-[#faf9f9] border border-[#e7e4e2] flex items-center justify-center text-xs text-[#5c5755]">
              No invoices in this selection
            </div>
          ) : (
            <>
              <div className="h-62.5 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      dy={10}
                    />
                    <YAxis hide domain={[0, 'dataMax + (dataMax * 0.1)']} />
                    <Tooltip
                      cursor={{ stroke: '#201e1d', strokeDasharray: '3 3' }}
                      formatter={(value) => {
                        const numericValue = Number(
                          Array.isArray(value) ? value[0] : (value ?? 0),
                        );
                        return [
                          `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numericValue)}`,
                          'Value',
                        ];
                      }}
                    />
                    <Area
                      type="linear"
                      dataKey="invoiced"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="#fee2e2"
                      fillOpacity={0.6}
                      dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="linear"
                      dataKey="collected"
                      stroke="#111827"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#111827', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2 text-[13px]">
                    <div className="w-4 h-0.5 bg-[#ef4444]"></div>
                    <span className="text-gray-600">Invoiced</span>
                    <span className="font-bold text-gray-900">{fmtShort(totals.invoiced)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <div className="w-4 border-t-2 border-dashed border-[#111827]"></div>
                    <span className="text-gray-600">Collected</span>
                    <span className="font-bold text-gray-900">{fmtShort(totals.collected)}</span>
                  </div>
                </div>
                <div className="text-[13px] text-gray-500">
                  Peak month {fmtShort(Math.max(...trendData.map(d => d.invoiced), 0))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Invoice Status Pie Chart matching image_f9ab8b.png */}
        <div className="bg-white p-6">
          <div className="flex justify-between items-start gap-2.5 mb-8">
            <div className="text-[15px] font-bold text-gray-900">Invoice status</div>
            <div className="flex border border-[#201e1d] rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setStatusMetric('value')}
                className={`px-3 py-1 text-[13px] font-semibold transition-colors ${statusMetric === 'value'
                  ? 'bg-[#201e1d] text-white'
                  : 'bg-white text-[#201e1d] hover:bg-gray-50'
                  }`}
              >
                By value
              </button>
              <button
                type="button"
                onClick={() => setStatusMetric('count')}
                className={`px-3 py-1 text-[13px] font-semibold border-l border-[#201e1d] transition-colors ${statusMetric === 'count'
                  ? 'bg-[#201e1d] text-white'
                  : 'bg-white text-[#201e1d] hover:bg-gray-50'
                  }`}
              >
                By count
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8">
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusData.statuses.filter(d => statusMetric === 'count' ? d.count > 0 : d.value > 0)}
                    dataKey={statusMetric === 'count' ? 'count' : 'value'}
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={70}
                    stroke="none"
                    isAnimationActive={false}
                    onClick={(data) => {
                      const payload = data?.payload as
                        | { key: string; count: number; value: number }
                        | undefined;
                      if (!payload?.key) return;
                      handleSegmentClick(payload.key);
                    }}
                  >
                    {invoiceStatusData.statuses
                      .filter(d => statusMetric === 'count' ? d.count > 0 : d.value > 0)
                      .map((item) => (
                        <Cell key={item.key} fill={item.color} />
                      ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 flex flex-col justify-center w-full">
              <div className="flex flex-col gap-4">
                {invoiceStatusData.statuses
                  .filter(d => (statusMetric === 'count' ? d.count : d.value) > 0)
                  .map((d) => {
                    const metric = statusMetric === 'count' ? d.count : d.value;
                    const total = invoiceStatusData.totalMetric || 1;
                    const pct = total > 0 ? `${Math.round((metric / total) * 100)}%` : '0%';

                    return (
                      // biome-ignore lint/a11y/noStaticElementInteractions: allow
                      // biome-ignore lint/a11y/useKeyWithClickEvents: allow
                      <div
                        key={d.name}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => handleSegmentClick(d.key)}
                      >
                        <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: d.color }} />
                        <span className="text-[13px] text-gray-700">{d.name}</span>
                        <span className="ml-auto text-[13px] font-bold tabular-nums">
                          {statusMetric === 'count' ? d.count : fmtShort(d.value)}
                        </span>
                        <span className="text-[13px] text-gray-400 w-10 text-right">
                          {pct}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="text-[12px] text-gray-500 border-t border-gray-200 pt-3 mt-5">
                Total {statusMetric === 'count' ? totals.total : fmtShort(invoiceStatusData.totalMetric)} &middot; click a segment to see the invoices
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        <div className="bg-white p-4 lg:p-5">
          <div className="text-sm font-bold mb-1">Revenue by business</div>
          <div className="text-[11px] text-[#5c5755] mb-4">
            Invoiced · thin bar is collected
          </div>
          <div className="flex flex-col gap-3.5">
            {businessNames.map((b) => {
              const bizInvs =
                biz === 'All'
                  ? invoices.filter((i) => i.business === b)
                  : filtered.filter((i) => i.business === b);
              const invSum = bizInvs.reduce(
                (s: number, i) =>
                  s +
                  convertToReportCurrency(
                    Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0,
                    i.currency,
                  ),
                0,
              );
              const colSum = bizInvs
                .filter((i) => i.status === 'paid')
                .reduce(
                  (s: number, i) =>
                    s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                  0,
                );
              const max = Math.max(
                ...businessNames.map((x) =>
                  invoices
                    .filter((i) => i.business === x)
                    .reduce(
                      (s: number, i) =>
                        s +
                        (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                      0,
                    ),
                ),
                1,
              );
              const pct = max ? (invSum / max) * 100 : 0;
              const colPct = invSum ? (colSum / invSum) * 100 : 0;
              return (
                <div key={b} className="py-1">
                  <div className="flex justify-between items-baseline gap-2.5 mb-1.5">
                    <div className="text-[12.5px] font-semibold">{b}</div>
                    <div className="text-[12.5px] tabular-nums whitespace-nowrap">
                      {fmtShort(invSum)}
                    </div>
                  </div>
                  <div className="h-3.5 bg-[#e7e4e2] w-full">
                    <div
                      className="h-full bg-[#ec3013]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div
                    className="h-1 bg-[#201e1d] mt-1"
                    style={{ width: `${colPct}%` }}
                  />
                  <div className="text-[10px] text-[#5c5755] mt-1.5">
                    {bizInvs.length} invoices
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white p-4 lg:p-5">
          <div className="flex justify-between items-baseline gap-3 mb-1">
            <div className="text-sm font-bold">Receivables aging</div>
            <div className="text-[11px] text-[#c02a10] font-semibold">
              61+ days {fmtShort(totals.overdue)}
            </div>
          </div>
          <div className="text-[11px] text-[#5c5755] mb-4">
            Outstanding {fmtShort(totals.outstanding)} by age
          </div>
          <div className="flex items-end gap-2.5 h-37.5 border-b-2 border-[#201e1d]">
            {(() => {
              const allSums = ['Current', '1-30', '31-60', '61-90', '90+'].map(
                (_, idx) => {
                  const b = filtered.filter((inv) => {
                    const due = inv.due || inv.dueDate || '';
                    if (!due) return idx === 0;
                    const diff =
                      (new Date(due).getTime() - new Date(todayISO).getTime()) /
                      (1000 * 60 * 60 * 24);
                    if (diff >= 0) return idx === 0;
                    if (diff >= -30) return idx === 1;
                    if (diff >= -60) return idx === 2;
                    if (diff >= -90) return idx === 3;
                    return idx === 4;
                  });
                  return b.reduce(
                    (s: number, inv: InvoiceRow) =>
                      s + (Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0),
                    0,
                  );
                },
              );
              const maxSum = Math.max(1, ...allSums);
              return ['Current', '1-30', '31-60', '61-90', '90+'].map((label, i) => {
                const sum = allSums[i];
                const h = sum ? Math.min(130, (sum / maxSum) * 120 + 8) : 8;
                const bg =
                  i === 0
                    ? 'bg-[#e7e4e2]'
                    : i === 1
                      ? 'bg-[#c9c4c2]'
                      : i === 2
                        ? 'bg-[#f0866f]'
                        : 'bg-[#ec3013]';
                return (
                  <div key={label} className="flex-1 h-full flex flex-col justify-end">
                    <div className={`${bg} w-full`} style={{ height: h }} title={`${label}: ${fmtShort(sum)}`} />
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex gap-2.5 mt-2">
            {[
              { label: 'Current' },
              { label: '1-30' },
              { label: '31-60' },
              { label: '61-90' },
              { label: '90+' },
            ].map((a, idx) => {
              const bucket = filtered.filter((inv) => {
                const due = inv.due || inv.dueDate || '';
                if (!due) return idx === 0;
                const diff =
                  (new Date(due).getTime() - new Date(todayISO).getTime()) /
                  86400000;
                if (diff >= 0) return idx === 0;
                if (diff >= -30) return idx === 1;
                if (diff >= -60) return idx === 2;
                if (diff >= -90) return idx === 3;
                return idx === 4;
              });
              const sum = bucket.reduce(
                (s: number, inv: InvoiceRow) =>
                  s + (Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0),
                0,
              );
              return (
                <div key={a.label} className="flex-1 text-center">
                  <div className="text-[11px] font-semibold tabular-nums">
                    {fmtShort(sum)}
                  </div>
                  <div className="text-[10px] text-[#5c5755] mt-0.5">
                    {a.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-[#201e1d] p-4 lg:p-5">
        <div className="flex justify-between items-baseline gap-3 mb-3.5">
          <div>
            <div className="text-sm font-bold">Business × currency</div>
            <div className="text-[11px] text-[#5c5755] mt-0.5">
              Invoiced value in original currency; last column converts to{' '}
              {reportCur === 'All' ? 'NGN' : reportCur}
            </div>
          </div>
        </div>
        <Table className="bg-white">
          <TableHeader>
            <TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
              <TableHead className="text-left py-2 pr-2.5 text-[10px] tracking-widest h-auto">
                BUSINESS
              </TableHead>
              <TableHead className="text-right py-2 px-2.5 text-[10px] tracking-widest h-auto">
                NGN
              </TableHead>
              <TableHead className="text-right py-2 px-2.5 text-[10px] tracking-widest h-auto">
                KES
              </TableHead>
              <TableHead className="text-right py-2 pl-2.5 text-[10px] tracking-widest border-l-2 border-[#201e1d] h-auto">
                TOTAL
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businessNames.map((b) => {
              const bInvs = filtered.filter((i) => i.business === b);
              const ngn = bInvs
                .filter((i) => (i.currency || 'NGN') === 'NGN')
                .reduce(
                  (s: number, i: InvoiceRow) =>
                    s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                  0,
                );
              const kes = bInvs
                .filter((i) => (i.currency || 'NGN') === 'KES')
                .reduce(
                  (s: number, i: InvoiceRow) =>
                    s + (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                  0,
                );
              const total = ngn + kes;
              return (
                <TableRow
                  key={b}
                  className="border-b border-[#d6d3d1] hover:bg-transparent"
                >
                  <TableCell className="py-3 pr-2.5 text-[13px] font-semibold">
                    {b}
                  </TableCell>
                  <TableCell className="py-3 px-2.5 text-right text-[13px] tabular-nums">
                    {fmt(ngn)}
                    <div className="text-[10px] text-[#5c5755]">
                      out {fmt(ngn * 0.3)}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-2.5 text-right text-[13px] tabular-nums">
                    {fmt(kes)}
                    <div className="text-[10px] text-[#5c5755]">
                      out {fmt(kes * 0.3)}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 pl-2.5 text-right text-[13px] font-bold tabular-nums border-l-2 border-[#201e1d]">
                    {fmt(total)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="hover:bg-transparent">
              <TableCell className="pt-3 pr-2.5 text-xs tracking-[0.08em] font-semibold">
                ALL BUSINESSES
              </TableCell>
              <TableCell className="pt-3 px-2.5 text-right text-[12.5px] tabular-nums">
                {fmt(
                  filtered
                    .filter((i) => (i.currency || 'NGN') === 'NGN')
                    .reduce(
                      (s: number, i: InvoiceRow) =>
                        s +
                        (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                      0,
                    ),
                )}
              </TableCell>
              <TableCell className="pt-3 px-2.5 text-right text-[12.5px] tabular-nums">
                {fmt(
                  filtered
                    .filter((i) => (i.currency || 'NGN') === 'KES')
                    .reduce(
                      (s: number, i: InvoiceRow) =>
                        s +
                        (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                      0,
                    ),
                )}
              </TableCell>
              <TableCell className="pt-3 pl-2.5 text-right text-sm font-bold tabular-nums border-l-2 border-[#201e1d]">
                {fmt(
                  filtered.reduce(
                    (s: number, i: InvoiceRow) =>
                      s +
                      (Number(String(i.total).replace(/[^0-9.-]/g, '')) || 0),
                    0,
                  ),
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
        <div className="bg-white p-4 lg:p-5">
          <div className="text-sm font-bold mb-1">
            Top outstanding customers
          </div>
          <div className="text-[11px] text-[#5c5755] mb-4">
            Largest unpaid balances first · click a customer for their invoices
          </div>
          {filtered.filter((i) => i.status !== 'paid').length === 0 ? (
            <div className="text-xs text-[#5c5755] py-6 border-t border-[#d6d3d1]">
              Nothing outstanding yet — create invoices to see customers.
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {outstandingCustomers.map((c) => (
                <div
                  key={c.name}
                  onClick={() =>
                    navigate({
                      to: '/invoices',
                      search: {
                        searchQuery: c.name,
                        business: biz !== 'All' ? biz : undefined,
                      } as any,
                    })
                  }
                  title={`${c.name} · ${c.count} invoice${c.count === 1 ? '' : 's'} · ${fmt(c.out)} outstanding${c.over ? ` (${fmt(c.over)} overdue)` : ''} — click to filter`}
                  className="border-b border-[#d6d3d1] py-3 cursor-pointer hover:bg-[#f0dcd8] px-1 -mx-1"
                >
                  <div className="flex justify-between items-baseline gap-3 mb-1.5">
                    <div>
                      <div className="text-[13px] font-semibold">{c.name}</div>
                      <div className="text-[11px] text-[#5c5755]">
                        {c.count} invoice{c.count === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="text-[13px] tabular-nums whitespace-nowrap">
                      {fmt(c.out)}
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#e7e4e2] w-full">
                    <div className="h-full bg-[#ec3013]" style={{ width: `${c.pct}%` }} />
                  </div>
                  {c.over > 0 ? (
                    <div className="text-[11px] font-semibold text-[#c02a10] text-right mt-1">
                      {fmt(c.over)} overdue
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-4 lg:p-5">
          <div className="text-sm font-bold mb-3.5">Upcoming &amp; overdue</div>
          {filtered.length === 0 ? (
            <div className="border-t border-[#d6d3d1] text-xs text-[#5c5755] py-3">
              No upcoming tranches.
            </div>
          ) : (
            <div className="border-t border-[#d6d3d1]">
              {filtered
                .filter((i) => i.status !== 'paid' && i.status !== 'voided')
                .sort((a: any, b: any) => {
                  const da = new Date(a.due || a.dueDate || 0).getTime();
                  const db = new Date(b.due || b.dueDate || 0).getTime();
                  return da - db;
                })
                .slice(0, 5)
                .map((inv: any) => {
                  const dueRaw = inv.due || inv.dueDate || '';
                  const isOver = Boolean(dueRaw && dueRaw < todayISO);
                  const dueLabel = dueRaw
                    ? new Date(dueRaw).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';
                  const meta = isOver ? `due ${dueLabel} · Overdue` : `due ${dueLabel}`;
                  return (
                    <div
                      key={inv.id}
                      onClick={() => navigate({ to: '/invoices/$id', params: { id: inv.id } })}
                      title={`${inv.number} — ${meta}`}
                      className="flex justify-between gap-3 py-2.5 border-b border-[#d6d3d1] cursor-pointer hover:bg-[#f0dcd8] px-1 -mx-1"
                    >
                      <div>
                        <div className="text-[13px] font-semibold">{inv.number}</div>
                        <div
                          className={`text-[11px] ${isOver ? 'text-[#c02a10] font-semibold' : 'text-[#5c5755]'}`}
                        >
                          {meta}
                        </div>
                      </div>
                      <div className="text-[13px] tabular-nums whitespace-nowrap">
                        {fmt(
                          convertToReportCurrency(
                            Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0,
                            inv.currency,
                          ),
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="text-[11px] tracking-[0.12em] font-semibold mt-6 mb-2.5">
            RECENT ACTIVITY
          </div>
          <RecentActivityList />
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to="/invoices/new"
          className="bg-[#ec3013] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#c02a10] hover:text-white"
        >
          New invoice
        </Link>
        <Link
          to="/invoices"
          className="border border-[#201e1d] px-4 py-2.5 text-xs font-semibold hover:bg-[#f0dcd8]"
        >
          View invoices
        </Link>
      </div>
    </div>
  );
}

function RecentActivityList() {
  const { data, isLoading } = useQuery({
    queryKey: ['activityLog', { page: 1, pageSize: 5 }],
    queryFn: () => getActivityLog({ data: { page: 1, pageSize: 5 } }),
  });

  if (isLoading) {
    return (
      <div className="border-t border-[#d6d3d1] py-3 space-y-2">
        <div className="h-3 w-24 bg-[#e7e4e2] animate-pulse" />
        <div className="h-3 w-full bg-[#e7e4e2] animate-pulse" />
      </div>
    );
  }

  const items = (data as any)?.activities ?? [];
  if (!items.length) {
    return (
      <div className="border-t border-[#d6d3d1] text-xs text-[#5c5755] py-3">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="border-t border-[#d6d3d1]">
      {items.slice(0, 5).map((a: any) => (
        <div key={a.id} className="py-2.5 border-b border-[#d6d3d1]">
          <div className="flex justify-between gap-2">
            <div className="text-xs font-semibold">{a.userName}</div>
            <div className="text-[11px] text-[#5c5755] whitespace-nowrap">
              {new Date(a.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div className="text-xs mt-1">
            {a.type} {a.entity} {a.label}
            {a.detail ? `: ${a.detail}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
