'use client';

import {
	type ColumnFiltersState,
	columnFilteringFeature,
	createColumnHelper,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	flexRender,
	globalFilteringFeature,
	type PaginationState,
	rowPaginationFeature,
	rowSortingFeature,
	type SortingState,
	sortFn_alphanumeric,
	sortFn_text,
	tableFeatures,
	useTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table';
import { cn } from '#/lib/utils';

export interface Invoice {
	id: string;
	number: string;
	client: string;
	business: string;
	issued: string;
	due: string;
	type: 'full' | 'tranche';
	total: string;
	status: 'draft' | 'sent' | 'paid' | 'part_paid' | 'overdue' | 'voided';
	commentCount: number;
	onEdit?: (invoice: Invoice) => void;
	onView?: (invoice: Invoice) => void;
}

interface InvoiceTableProps {
	data: Invoice[];
	onView: (invoice: Invoice) => void;
	onEdit?: (invoice: Invoice) => void;
	onDelete?: (invoice: Invoice) => void;
	onDuplicate?: (invoice: Invoice) => void;
}

const features = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	rowSortingFeature,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
	sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type Features = typeof features;

export function InvoiceTable({ data, onView, onEdit }: InvoiceTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns = useMemo(() => {
		const h = createColumnHelper<Features, Invoice>();

		return [
			h.accessor('number', {
				header: 'NUMBER',
				cell: (info) => (
					<span className="font-semibold whitespace-nowrap text-[13px]">
						{info.getValue()}
					</span>
				),
			}),
			h.accessor('client', {
				header: 'CLIENT',
				cell: (info) => <span className="text-[13px]">{info.getValue()}</span>,
			}),
			h.accessor('business', {
				header: 'BUSINESS',
				cell: (info) => <span className="text-xs">{info.getValue()}</span>,
			}),
			h.accessor('issued', {
				header: 'ISSUED',
				cell: (info) => (
					<span className="whitespace-nowrap text-xs">{info.getValue()}</span>
				),
			}),
			h.accessor('due', {
				header: 'DUE',
				cell: (info) => (
					<span className="whitespace-nowrap text-xs">{info.getValue()}</span>
				),
			}),
			h.accessor('type', {
				header: 'TYPE',
				cell: (info) => (
					<span className="whitespace-nowrap text-xs capitalize">
						{info.getValue()}
					</span>
				),
			}),
			h.accessor('total', {
				header: 'TOTAL',
				cell: (info) => (
					<span className="tabular-nums text-right block font-semibold text-[13px]">
						{info.getValue()}
					</span>
				),
			}),
			h.accessor('status', {
				header: 'STATUS',
				cell: (info) => {
					const s = info.getValue();
					const chip =
						'inline-block whitespace-nowrap px-2 py-1 text-[11px] font-semibold';
					const style =
						s === 'paid'
							? `${chip} bg-[#201e1d] text-white`
							: s === 'part_paid'
								? `${chip} bg-[#f7d9d3] text-[#8d1f0c]`
								: s === 'voided'
									? `${chip} border border-[#201e1d] text-[#5c5755] line-through`
									: s === 'overdue'
										? `${chip} bg-[#ec3013] text-white`
										: `${chip} border border-[#201e1d] text-[#201e1d]`;
					return <span className={style}>{s.replace('_', ' ')}</span>;
				},
			}),
			h.accessor('commentCount', {
				header: 'NOTES',
				cell: (info) => (
					<span className="text-[11px] text-[#5c5755] whitespace-nowrap">
						{info.getValue()}
					</span>
				),
			}),
			h.display({
				id: 'actions',
				header: '',
				cell: (info) => {
					const invoice = info.row.original;
					return (
						<div className="flex items-center justify-end gap-1">
							{onEdit && (
								<Button
									variant="outline"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onEdit(invoice);
									}}
									className="border border-[#201e1d] bg-white px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8] focus-visible:outline-2 focus-visible:outline-[#ec3013] rounded-none h-auto"
								>
									Edit
								</Button>
							)}
							<Button
								variant="default"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									onView(invoice);
								}}
								className="bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#c02a10] hover:border-[#c02a10] focus-visible:outline-2 focus-visible:outline-[#ec3013] rounded-none h-auto"
							>
								Open
							</Button>
						</div>
					);
				},
			}),
		];
	}, [onView, onEdit]);

	const table = useTable({
		features,
		// biome-ignore lint/suspicious/noExplicitAny: cast column to any
		columns: columns as unknown as any,
		data,
		state: { sorting, columnFilters, globalFilter, pagination },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
	} as const);

	return (
		<div className="flex flex-col gap-5">
			{/* Toolbar — search */}
			<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
				<Input
					type="text"
					placeholder="Search invoices…"
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					aria-label="Search invoices"
					className="w-full max-w-sm border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] placeholder:text-[#9b9797] focus-visible:outline-2 focus-visible:outline-[#ec3013] rounded-none"
				/>
				<div className="text-xs text-[#5c5755]">
					{table.getFilteredRowModel().rows.length} total
				</div>
			</div>

			{/* Table */}
			<div className="overflow-auto bg-white border-2 border-[#201e1d]">
				<Table className="w-full bg-white">
					<TableHeader>
						{table.getHeaderGroups().map((hg) => (
							<TableRow
								key={hg.id}
								className="border-b-2 border-[#201e1d] bg-white hover:bg-transparent"
							>
								{hg.headers.map((header) => (
									<TableHead
										key={header.id}
										className={cn(
											'px-2.5 py-2.5 text-left text-[10px] tracking-[0.1em] font-semibold text-[#201e1d] whitespace-nowrap h-auto',
											header.column.getCanSort() &&
												'cursor-pointer select-none hover:bg-[#f0dcd8]',
										)}
										onClick={header.column.getToggleSortingHandler()}
									>
										<span className="inline-flex items-center gap-1">
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
											{header.column.getIsSorted() === 'asc'
												? ' ▲'
												: header.column.getIsSorted() === 'desc'
													? ' ▼'
													: null}
										</span>
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length === 0 ? (
							<TableRow className="hover:bg-transparent">
								<TableCell
									colSpan={columns.length}
									className="px-4 py-12 text-center text-sm text-[#5c5755]"
								>
									No invoices found
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									onClick={() => onView(row.original)}
									className={cn(
										'border-b border-[#d6d3d1] bg-white hover:bg-[#f0dcd8] cursor-pointer',
										row.original.status === 'voided' && 'opacity-60',
									)}
								>
									{row.getAllCells().map((cell) => (
										<TableCell key={cell.id} className="px-2.5 py-3.5">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination — sharp, template hover */}
			<div className="flex items-center justify-between">
				<div className="text-xs text-[#5c5755]">
					Showing{' '}
					{table.state.pagination.pageIndex * table.state.pagination.pageSize +
						1}{' '}
					to{' '}
					{Math.min(
						(table.state.pagination.pageIndex + 1) *
							table.state.pagination.pageSize,
						table.getFilteredRowModel().rows.length,
					)}{' '}
					of {table.getFilteredRowModel().rows.length}
				</div>
				<div className="flex gap-1">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="border border-[#201e1d] bg-white px-3 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8] disabled:opacity-40 disabled:pointer-events-none rounded-none"
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="border border-[#201e1d] bg-white px-3 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8] disabled:opacity-40 disabled:pointer-events-none rounded-none"
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
