/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not all deps need to be included, only filtered and reportCur are relevant */
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
	Area,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Button } from '#/components/ui/button';
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
import { getSession } from '#/lib/auth.functions';
import { convertCurrencyValue, DEFAULT_FX_RATES } from '#/lib/currencies';
import { getInvoices } from '#/lib/server-fns/invoices';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/dashboard')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: '/auth/login', search: { redirect: '/dashboard' } });
		}
		return { user: session.user, session: session.session };
	},
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
	const [reportCur, setReportCur] = useState<ReportCur>('NGN');
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
		let paidCount = 0;
		filtered.forEach((inv) => {
			const totalStr = String(inv.total || '0').replace(/[^0-9.-]/g, '');
			const total = convertToReportCurrency(
				Number(totalStr) || 0,
				inv.currency,
			);
			invoiced += total;
			if (inv.status === 'paid') {
				collected += total;
				paidCount++;
			} else if (inv.status === 'part_paid') {
				collected += total * 0.5;
				outstanding += total * 0.5;
			} else if (inv.status === 'draft') {
				draft++;
				outstanding += total;
			} else {
				outstanding += total;
			}
			const due = inv.due || inv.dueDate || '';
			if (
				due &&
				due < todayISO &&
				inv.status !== 'paid' &&
				inv.status !== 'voided'
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
			total: filtered.length,
			paidCount,
		};
	}, [filtered, todayISO, reportCur, fxRates]);

	const kpis = [
		{
			label: 'TOTAL INVOICED',
			value: fmtShort(totals.invoiced),
			sub: `${totals.total} invoice${totals.total === 1 ? '' : 's'}`,
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
		{ label: 'DRAFT', value: String(totals.draft), sub: 'Not yet sent' },
	];

	const periodNote = period === 'All time' ? 'All invoices' : period;

	const navigate = useNavigate();

	const handleSegmentClick = (key: string) => {
		const mapping: Record<string, string> = {
			paid: 'paid',
			part_paid: 'part_paid',
			overdue: 'overdue',
		};
		const status = mapping[key] ?? key;
		const search: Record<string, string | undefined> = {
			status,
			currency: includeCur === 'All' ? undefined : includeCur,
			reportCur: reportCur === 'All' ? undefined : reportCur,
		};
		navigate({ to: '/invoices', search });
	};

	const invoiceStatusData = useMemo(() => {
		const overduePredicate = (i: InvoiceRow) => {
			const due = i.due || i.dueDate || '';
			return (
				due && due < todayISO && !['paid', 'voided'].includes(i.status)
			);
		};

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
				color: '#f7d9d3',
			},
			{
				name: 'Overdue',
				key: 'overdue',
				count: filtered.filter(overduePredicate).length,
				value: filtered
					.filter(overduePredicate)
					.reduce(
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
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		const buckets = new Map<
			string,
			{ month: string; invoiced: number; collected: number }
		>();

		monthNames.forEach((month) => {
			buckets.set(month, {
				month,
				invoiced: 0,
				collected: 0,
			});
		});

		filtered.forEach((inv) => {
			const date = inv.issued || inv.issueDate || '';
			const monthIndex = date
				? new Date(date).getMonth()
				: new Date().getMonth();
			const month = monthNames[monthIndex];
			const amount = convertToReportCurrency(
				Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0,
				inv.currency,
			);
			const bucket = buckets.get(month) ?? { month, invoiced: 0, collected: 0 };
			bucket.invoiced += amount;
			if (inv.status === 'paid') {
				bucket.collected += amount;
			}
			buckets.set(month, bucket);
		});

		return monthNames.map(
			(month) => buckets.get(month) ?? { month, invoiced: 0, collected: 0 },
		);
	}, [filtered]);

	const outstandingCustomers = useMemo<[string, number][]>(() => {
		const customerTotals = filtered
			.filter((i) => i.status !== 'paid')
			.reduce<Record<string, number>>((acc, inv) => {
				acc[inv.client] =
					(acc[inv.client] || 0) +
					convertToReportCurrency(
						Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0,
						inv.currency,
					);
				return acc;
			}, {});

		return Object.entries(customerTotals)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4);
	}, [filtered]);

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
					{/* Desktop: Button group */}
					<div className="hidden lg:flex gap-1 flex-wrap">
						{['All', ...businessNames].map((l) => (
							<Button
								key={l}
								type="button"
								variant={biz === l ? 'default' : 'outline'}
								size="sm"
								onClick={() => setBiz(l)}
								className={
									biz === l
										? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none'
										: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'
								}
							>
								{l}
							</Button>
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
								<Button
									key={c}
									type="button"
									variant={reportCur === c ? 'default' : 'outline'}
									size="sm"
									onClick={() => setReportCur(c)}
									className={
										reportCur === c
											? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none'
											: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'
									}
								>
									{c}
								</Button>
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
								<Button
									key={c}
									type="button"
									variant={includeCur === c ? 'default' : 'outline'}
									size="sm"
									onClick={() => setIncludeCur(c)}
									className={
										includeCur === c
											? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none'
											: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'
									}
								>
									{c}
								</Button>
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
							<Button
								key={p}
								type="button"
								variant={period === p ? 'default' : 'outline'}
								size="sm"
								onClick={() => setPeriod(p)}
								className={
									period === p
										? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none'
										: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'
								}
							>
								{p}
							</Button>
						))}
					</div>
					<div className="text-[11px] text-[#5c5755] whitespace-nowrap">
						{periodNote}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-5 gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
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
					</div>
				))}
			</div>

			<div className="grid lg:grid-cols-[1.45fr_1fr] gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
				<div className="bg-white p-4 lg:p-5">
					<div className="flex justify-between items-baseline gap-3 mb-3.5">
						<div>
							<div className="text-sm font-bold">Revenue &amp; collections</div>
							<div className="text-[11px] text-[#5c5755] mt-0.5">
								Monthly · {periodNote}
							</div>
						</div>
						<div className="text-[11px] text-[#5c5755] text-right">
							Gap {(totals.invoiced - totals.collected).toLocaleString('en-US')}
						</div>
					</div>
					{filtered.length === 0 ? (
						<div className="h-45 bg-[#faf9f9] border border-[#e7e4e2] flex items-center justify-center text-xs text-[#5c5755]">
							No invoices in this selection
						</div>
					) : (
						<div className="h-45 bg-[#faf9f9] border border-[#e7e4e2] p-2">
							<div style={{ width: '100%', height: '100%', minWidth: 160, minHeight: 160 }}>
								<ResponsiveContainer width="100%" height="100%">
								<LineChart
									data={trendData}
									margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										stroke="#e7e4e2"
									/>
									<XAxis
										dataKey="month"
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 10, fill: '#5c5755' }}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 10, fill: '#5c5755' }}
										tickFormatter={(value) =>
											`${value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${Math.round(value / 1000)}k`}`
										}
									/>
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
										type="monotone"
										dataKey="invoiced"
										stroke="#ec3013"
										fill="#f5d5ce"
										fillOpacity={0.6}
									/>
									<Line
										type="monotone"
										dataKey="invoiced"
										stroke="#ec3013"
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 5, fill: '#ec3013' }}
									/>
									<Line
										type="monotone"
										dataKey="collected"
										stroke="#201e1d"
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 5, fill: '#201e1d' }}
									/>
								</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}
					<div className="flex justify-between text-[10px] text-[#5c5755] mt-1.5">
						{trendData.slice(0, 4).map((item) => (
							<span key={item.month}>{item.month}</span>
						))}
					</div>
					<div className="flex gap-5 mt-3.5 pt-2.5 border-t border-[#d6d3d1] text-xs">
						<div>
							<span className="inline-block w-3.5 h-0.5 bg-[#ec3013] align-middle mr-1.5" />
							Invoiced{' '}
							<strong className="tabular-nums">
								{fmtShort(totals.invoiced)}
							</strong>
						</div>
						<div>
							<span className="inline-block w-3.5 h-0.5 bg-[#201e1d] align-middle mr-1.5" />
							Collected{' '}
							<strong className="tabular-nums">
								{fmtShort(totals.collected)}
							</strong>
						</div>
						<div className="ml-auto text-[#5c5755] text-[11px]">
							Peak month —
						</div>
					</div>
				</div>
				<div className="bg-white p-4 lg:p-5">
					<div className="flex justify-between items-baseline gap-2.5 mb-3.5">
						<div className="text-sm font-bold">Invoice status</div>
						<div className="flex gap-1">
							<Button
								type="button"
								variant="outline"
								size="xs"
								onClick={() => setStatusMetric('count')}
								className={cn(
									statusMetric === 'count'
										? 'bg-[#201e1d] text-white border-[#201e1d] hover:bg-[#201e1d] hover:text-white'
										: 'border-[#201e1d] bg-white text-[#201e1d] hover:bg-[#f0dcd8] hover:text-[#201e1d]',
								)}
							>
								Count
							</Button>
							<Button
								type="button"
								variant="outline"
								size="xs"
								onClick={() => setStatusMetric('value')}
								className={cn({
									'bg-[#201e1d] text-white border-[#201e1d] hover:bg-[#201e1d] hover:text-white':
										statusMetric === 'value',
									'border-[#201e1d] bg-white text-[#201e1d] hover:bg-[#f0dcd8] hover:text-[#201e1d]':
										statusMetric !== 'value',
								})}
							>
								Value
							</Button>
						</div>
					</div>
					<div className="grid grid-cols-[140px_1fr] gap-6 items-center">
						<div className="relative h-56 w-56">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={invoiceStatusData.statuses
											.filter((item) =>
												statusMetric === 'count'
													? item.count > 0
													: item.value > 0,
											)
											.map((item) => ({
												key: item.key,
												name: item.name,
												value:
													statusMetric === 'count' ? item.count : item.value,
												color: item.color,
											}))}
										dataKey="value"
										nameKey="name"
										innerRadius={50}
										outerRadius={100}
										paddingAngle={3}
										stroke="#f5f3f1"
										strokeWidth={2}
										startAngle={90}
										endAngle={-270}
										isAnimationActive={false}
										onClick={(data, index) => {
											const key = (data && (data.payload as any)?.key) || (data && (data as any).key) || (invoiceStatusData.statuses[index]?.key);
											handleSegmentClick(key);
										}}
									>
										{invoiceStatusData.statuses
											.filter((item) =>
												statusMetric === 'count'
													? item.count > 0
													: item.value > 0,
											)
											.map((item) => (
												<Cell key={item.name} fill={item.color} />
											))}
									</Pie>
								</PieChart>
							</ResponsiveContainer>
							<div className="pointer-events-none absolute inset-3.75 rounded-full bg-white border border-[#d6d3d1] flex items-center justify-center text-center px-2">
								{isLoading ? (
									<Skeleton className="h-4 w-14 rounded-none" />
								) : (
									<div className="text-[11px] text-[#5c5755] leading-tight">
										<div className="font-semibold text-[#201e1d] tabular-nums text-[13px]">
											{statusMetric === 'count'
												? totals.total
												: fmtShort(invoiceStatusData.totalMetric)}
										</div>
										<div>{statusMetric === 'count' ? 'total' : 'value'}</div>
									</div>
								)}
							</div>
						</div>
						<div className="flex flex-col gap-2 text-xs">
							{invoiceStatusData.statuses.map((d) => {
								const metric = statusMetric === 'count' ? d.count : d.value;
								const total = invoiceStatusData.totalMetric || 1;
								const pct =
									total > 0 ? `${Math.round((metric / total) * 100)}%` : '0%';

								return (
									<div
										key={d.name}
										className="flex items-center gap-2 py-1 px-1 hover:bg-[#f0dcd8]"
									>
										<span
											className="w-3 h-3"
											style={{
												background: d.color
											}}
										/>
										<span>{d.name}</span>
										<strong className="ml-auto tabular-nums whitespace-nowrap">
											{statusMetric === 'count' ? d.count : fmtShort(d.value)}
										</strong>
										<span className="text-[11px] text-[#5c5755] w-8.5 text-right">
											{pct}
										</span>
									</div>
								);
							})}
							<div className="text-[11px] text-[#5c5755] border-t border-[#d6d3d1] pt-1.5 mt-1">
								Total {totals.total} · filtered {filtered.length}
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
						{['Current', '1-30', '31-60', '61-90', '90+'].map((label, i) => {
							const bucket = filtered.filter((inv) => {
								const due = inv.due || inv.dueDate || '';
								if (!due) return i === 0;
								const diff =
									(new Date(due).getTime() - new Date(todayISO).getTime()) /
									(1000 * 60 * 60 * 24);
								if (diff >= 0) return i === 0;
								if (diff >= -30) return i === 1;
								if (diff >= -60) return i === 2;
								if (diff >= -90) return i === 3;
								return i === 4;
							});
							const sum = bucket.reduce(
								(s: number, inv: InvoiceRow) =>
									s + (Number(String(inv.total).replace(/[^0-9.-]/g, '')) || 0),
								0,
							);
							const h = sum ? Math.min(130, (sum / 50000) * 20 + 8) : 8;
							return (
								<div
									key={label}
									className="flex-1 h-full flex flex-col justify-end"
								>
									<div className="bg-[#e7e4e2] w-full" style={{ height: h }} />
								</div>
							);
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
						Largest unpaid balances first
					</div>
					{filtered.filter((i) => i.status !== 'paid').length === 0 ? (
						<div className="text-xs text-[#5c5755] py-6 border-t border-[#d6d3d1]">
							Nothing outstanding yet — create invoices to see customers.
						</div>
					) : (
						<div className="flex flex-col gap-0">
							{outstandingCustomers.map(([name, val]) => (
								<div
									key={String(name)}
									className="border-b border-[#d6d3d1] py-3"
								>
									<div className="flex justify-between items-baseline gap-3 mb-1.5">
										<div className="text-[13px] font-semibold">
											{String(name)}
										</div>
										<div className="text-[13px] tabular-nums whitespace-nowrap">
											{fmt(Number(val))}
										</div>
									</div>
									<div className="h-1.5 bg-[#e7e4e2] w-full">
										<div
											className="h-full bg-[#ec3013]"
											style={{ width: '60%' }}
										/>
									</div>
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
							{filtered.slice(0, 5).map((inv) => (
								<div
									key={inv.id}
									className="flex justify-between gap-3 py-2.5 border-b border-[#d6d3d1]"
								>
									<div>
										<div className="text-[13px] font-semibold">
											{inv.number}
										</div>
										<div className="text-[11px] text-[#5c5755]">
											due {inv.due || inv.dueDate}
										</div>
									</div>
									<div className="text-[13px] tabular-nums whitespace-nowrap">
										{inv.total}
									</div>
								</div>
							))}
						</div>
					)}
					<div className="text-[11px] tracking-[0.12em] font-semibold mt-6 mb-2.5">
						RECENT ACTIVITY
					</div>
					<div className="border-t border-[#d6d3d1] text-xs text-[#5c5755] py-3">
						No activity yet.
					</div>
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
