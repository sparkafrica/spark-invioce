import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { EditIcon, FileTextIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card, CardContent } from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Skeleton } from '#/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table';
import { toast } from '#/components/ui/toast';
import { getSession } from '#/lib/auth.functions';
import { deleteMemo, getMemos } from '#/lib/server-fns/memos';

export const Route = createFileRoute('/_auth-layout/memos/')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: '/auth/login', search: { redirect: '/memos' } });
		}
		return { user: session.user, session: session.session };
	},
	component: MemosPage,
});

function MemosPage() {
	const navigate = useNavigate();
	const [search, setSearch] = useState('');
	const { data, isLoading } = useQuery({
		queryKey: ['memos'],
		queryFn: () => getMemos({ data: {} }),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteMemo({ data: { id } }),
		onSuccess: () => {
			toast.add({ title: 'Memo deleted', type: 'success' });
		},
		onError: (err) => {
			toast.add({ description: (err as Error).message, type: 'error' });
		},
	});

	const memos = data?.memos || [];

	const handleAddNew = () => {
		// @ts-expect-error - route tree not yet updated
		navigate({ to: '/memos/new' });
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
					<h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
						Memos
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

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-[32px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
						Memos
					</h1>
					<p className="text-[#5c5755]">{memos.length} memo(s)</p>
				</div>
				<Button onClick={handleAddNew}>New memo</Button>
			</div>

			<Card>
				<CardContent className="p-0">
					<div className="p-4 border-b-2 border-[#201e1d]">
						<div className="relative max-w-md">
							<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5c5755]" />
							<Input
								type="text"
								placeholder="Search memos..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-[#201e1d] bg-white rounded-none"
							/>
						</div>
					</div>

					{memos.length === 0 ? (
						<div className="p-12 text-center">
							<p className="text-[#5c5755]">
								No memos found. Create your first memo to get started.
							</p>
							<Button onClick={handleAddNew} className="mt-4">
								New memo
							</Button>
						</div>
					) : (
						<Table className="bg-white">
							<TableHeader className="bg-[#f3f2f2]">
								<TableRow className="border-b-2 border-[#201e1d] hover:bg-transparent">
									<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
										NUMBER
									</TableHead>
									<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
										SUBJECT
									</TableHead>
									<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
										TO
									</TableHead>
									<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
										BUSINESS
									</TableHead>
									<TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
										DATE
									</TableHead>
									<TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#c02a10] h-auto">
										ACTIONS
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className="divide-y divide-[#d6d3d1]">
								{memos
									.filter(
										(m) =>
											m.number.toLowerCase().includes(search.toLowerCase()) ||
											m.subject.toLowerCase().includes(search.toLowerCase()) ||
											m.to?.toLowerCase().includes(search.toLowerCase()) ||
											m.businessId
												?.toLowerCase()
												.includes(search.toLowerCase()),
									)
									.map((memo) => (
										<TableRow key={memo.id} className="hover:bg-[#f0dcd8]">
											<TableCell className="px-4 py-3 font-medium">
												{memo.number}
											</TableCell>
											<TableCell className="px-4 py-3">
												{memo.subject}
											</TableCell>
											<TableCell className="px-4 py-3 text-[#5c5755]">
												{memo.to}
											</TableCell>
											<TableCell className="px-4 py-3 text-[#5c5755]">
												{memo.businessId}
											</TableCell>
											<TableCell className="px-4 py-3 whitespace-nowrap">
												{memo.date instanceof Date
													? memo.date.toLocaleDateString('en-GB', {
															day: 'numeric',
															month: 'short',
															year: 'numeric',
														})
													: memo.date}
											</TableCell>
											<TableCell className="px-4 py-3 text-right">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															navigate({ to: `/memos/${memo.id}/edit` })
														}
													>
														<EditIcon className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															navigate({ to: `/memos/${memo.id}` })
														}
													>
														<FileTextIcon className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-[#c02a10]"
														onClick={() => deleteMutation.mutate(memo.id)}
														disabled={deleteMutation.isPending}
													>
														<Trash2Icon className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
