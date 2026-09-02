import { useQuery } from '@tanstack/react-query';
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from '@tanstack/react-router';
import { useState } from 'react';
import { InvoiceTable } from '#/components/table/InvoiceTable';
import { Button } from '#/components/ui/button';
import { Skeleton } from '#/components/ui/skeleton';
import { useBusinesses } from '#/hooks/useReferences';
import { getSession } from '#/lib/auth.functions';
import { getInvoices } from '#/lib/server-fns/invoices';

export const Route = createFileRoute('/_auth-layout/invoices/')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: '/auth/login', search: { redirect: '/invoices' } });
		}
		return { user: session.user, session: session.session };
	},
	component: InvoicesPage,
});

function InvoicesPage() {
	const navigate = useNavigate();
	const [bizFilter, setBizFilter] = useState<string>('All');
	const [statusFilter, setStatusFilter] = useState<
		'All' | 'paid' | 'part_paid' | 'overdue' | 'draft' | 'sent' | 'voided'
	>('All');
	const [currencyFilter, setCurrencyFilter] = useState<
		'All' | 'NGN' | 'USD' | 'KES' | 'RWF' | 'GBP' | 'EUR'
	>('All');
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['invoices'],
		queryFn: () => getInvoices({ data: {} }),
	});
	const { data: businessesData } = useBusinesses();
	const bizOptions = [
		'All',
		...((businessesData?.businesses as unknown as Array<{ name: string }>)?.map(
			(b) => b.name,
		) ?? []),
	];

	if (isLoading) {
		return (
			<div className="flex flex-col gap-5">
				<div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
					<h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">
						Invoices
					</h1>
					<Skeleton className="h-6 w-24 rounded-none" />
				</div>
				<div className="bg-white border-2 border-[#201e1d] p-4 space-y-3">
					<Skeleton className="h-8 w-full rounded-none" />
					<Skeleton className="h-10 w-full rounded-none" />
					<Skeleton className="h-10 w-full rounded-none" />
					<Skeleton className="h-10 w-full rounded-none" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col gap-5">
				<div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
					<h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">
						Invoices
					</h1>
					<Link
						to="/invoices/new"
						className="bg-[#ec3013] text-white px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10]"
					>
						New invoice
					</Link>
				</div>
				<div className="bg-[#f0dcd8] border border-[#201e1d] p-4 text-sm">
					<p className="text-[#8d1f0c]">
						Failed to load invoices: {(error as Error).message}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						className="mt-3 border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
					>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	const invoices = data?.invoices || [];
	const filtered = invoices.filter((invoice) => {
		const matchesBusiness =
			bizFilter === 'All' || invoice.business === bizFilter;
		const matchesStatus =
			statusFilter === 'All' || invoice.status === statusFilter;
		const matchesCurrency =
			currencyFilter === 'All' || invoice.currency === currencyFilter;
		return matchesBusiness && matchesStatus && matchesCurrency;
	});

	const statusOptions: Array<typeof statusFilter> = [
		'All',
		'paid',
		'part_paid',
		'overdue',
		'draft',
		'sent',
		'voided',
	] as const;
	const currencyOptions: Array<typeof currencyFilter> = [
		'All',
		'NGN',
		'USD',
		'KES',
		'RWF',
		'GBP',
		'EUR',
	] as const;

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
				<h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">
					Invoices
				</h1>
				<div className="flex gap-1 flex-wrap justify-end">
					{bizOptions.map((b) => (
						<Button
							type="button"
							key={b}
							variant={bizFilter === b ? 'default' : 'outline'}
							size="sm"
							onClick={() => setBizFilter(b)}
							className={
								bizFilter === b
									? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold rounded-none'
									: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none'
							}
						>
							{b}
						</Button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-3 rounded-none border-2 border-[#201e1d] bg-white p-3">
				<div className="flex flex-wrap gap-1">
					{statusOptions.map((option) => (
						<Button
							type="button"
							key={option}
							variant={statusFilter === option ? 'default' : 'outline'}
							size="sm"
							onClick={() => setStatusFilter(option)}
							className={
								statusFilter === option
									? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-[11px] font-semibold rounded-none'
									: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none'
							}
						>
							{option === 'All' ? 'All statuses' : option.replace('_', ' ')}
						</Button>
					))}
				</div>
				<div className="flex flex-wrap gap-1">
					{currencyOptions.map((option) => (
						<Button
							type="button"
							key={option}
							variant={currencyFilter === option ? 'default' : 'outline'}
							size="sm"
							onClick={() => setCurrencyFilter(option)}
							className={
								currencyFilter === option
									? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-[11px] font-semibold rounded-none'
									: 'bg-white text-[#201e1d] border border-[#201e1d] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none'
							}
						>
							{option === 'All' ? 'All currencies' : option}
						</Button>
					))}
				</div>
			</div>

			{bizFilter !== 'All' && (
				<div className="flex items-center justify-between gap-3 bg-[#f0dcd8] border border-[#201e1d] px-3.5 py-2.5">
					<div className="text-xs font-semibold">
						Filtered from dashboard — {bizFilter}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setBizFilter('All')}
						className="border border-[#201e1d] bg-white px-3 py-1.5 text-[11px] font-semibold hover:bg-white rounded-none"
					>
						Clear filter
					</Button>
				</div>
			)}

			<InvoiceTable
				data={filtered}
				onView={(invoice) =>
					navigate({ to: '/invoices/$id', params: { id: invoice.id } })
				}
				onEdit={(invoice) =>
					navigate({ to: '/invoices/$id/edit', params: { id: invoice.id } })
				}
			/>

			<div className="flex gap-2">
				<Link
					to="/invoices/new"
					className="bg-[#ec3013] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#c02a10] hover:text-white"
				>
					New invoice
				</Link>
			</div>
		</div>
	);
}
