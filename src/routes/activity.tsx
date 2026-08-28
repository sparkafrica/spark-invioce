import { createFileRoute, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';
import { useQuery } from '@tanstack/react-query';
import { getActivityLog } from '#/lib/server-fns/references';
import {
	DateRangePicker,
	type DateRange,
} from '#/components/ui/date-range-picker';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import { Skeleton } from '#/components/ui/skeleton';
import { Input } from '#/components/ui/input';
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from '#/components/ui/table';

export const Route = createFileRoute('/activity')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session)
			throw redirect({ to: '/auth/login', search: { redirect: '/activity' } });
		return { user: session.user, session: session.session };
	},
	component: ActivityPage,
});

function ActivityPage() {
	const [search, setSearch] = useState('');
	const [dateRange, setDateRange] = useState<DateRange>({
		from: undefined,
		to: undefined,
		preset: 'this_week',
	});
	const [page, setPage] = useState(1);
	const pageSize = 25;

	const { data, isLoading } = useQuery({
		queryKey: ['activity', dateRange, search, page],
		queryFn: () =>
			getActivityLog({
				data: {
					from: dateRange.from?.toISOString(),
					to: dateRange.to?.toISOString(),
					query: search,
					page,
					pageSize,
				},
			}),
	});

	const activities = data?.activities || [];
	const total = data?.total || 0;
	const totalPages = Math.ceil(total / pageSize);

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '???';
		const d = new Date(dateStr);
		return (
			d.toLocaleDateString('en-GB', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			}) +
			' ' +
			d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
		);
	};

	const getActionBadge = (type: string) => {
		const variants: Record<
			string,
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			Created: 'default',
			Edited: 'secondary',
			Deleted: 'destructive',
			Invited: 'default',
			SignedIn: 'outline',
			Voided: 'destructive',
			PaymentRecorded: 'default',
			SettingsChanged: 'outline',
		};
		return (
			<Badge variant={variants[type] || 'outline'} className="text-xs">
				{type}
			</Badge>
		);
	};

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
				<h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none">
					Activity
				</h1>
				<div className="flex items-center gap-4">
					<DateRangePicker
						value={dateRange}
						onChange={setDateRange}
						placeholder="Select date range"
						className="w-64"
					/>
					<div className="relative max-w-lg">
						<Input
							type="text"
							placeholder="Search person, invoice number, field..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full px-4 py-2 border border-[#201e1d] bg-white rounded-none"
						/>
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="bg-white border-2 border-[#201e1d] p-4 space-y-3">
					<Skeleton className="h-4 w-32 rounded-none" />
					<Skeleton className="h-10 w-full rounded-none" />
					<Skeleton className="h-10 w-full rounded-none" />
					<Skeleton className="h-10 w-full rounded-none" />
				</div>
			) : (
				<>
					<div className="bg-white border-2 border-[#201e1d]">
						<div className="border-b-2 border-[#201e1d] p-4 flex justify-between gap-4">
							<div className="text-xs text-[#5c5755]">
								{total} records found
							</div>
							<div className="text-xs text-[#5c5755]">
								Page {page} of {totalPages || 1}
							</div>
						</div>
						{activities.length === 0 ? (
							<div className="p-12 text-center text-xs text-[#5c5755]">
								No activity found for the selected filters.
							</div>
						) : (
							<Table className="bg-white">
								<TableHeader className="bg-[#f3f2f2]">
									<TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											WHEN
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											WHO
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											ACTION
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											RECORD
										</TableHead>
										<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
											DETAIL
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="divide-y divide-[#d6d3d1]">
									{activities.map((a: any) => (
										<TableRow key={a.id} className="hover:bg-[#f0dcd8]">
											<TableCell className="px-4 py-3 text-xs whitespace-nowrap">
												{formatDate(a.createdAt)}
											</TableCell>
											<TableCell className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
												{a.userName}
											</TableCell>
											<TableCell className="px-4 py-3">
												{getActionBadge(a.type)}
											</TableCell>
											<TableCell className="px-4 py-3 text-xs whitespace-nowrap">
												{a.entity} {a.label}
											</TableCell>
											<TableCell className="px-4 py-3 text-xs">
												{a.detail}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
					<div className="flex justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages}
						>
							Next
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
