import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { InvoiceTable } from '#/components/table/InvoiceTable';
import { Button } from '#/components/ui/button';
import { DateRangePicker } from '#/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { useBusinesses } from '#/hooks/useReferences';
import { getInvoices } from '#/lib/server-fns/invoices';
import {
  createStandardSchemaV1,
  debounce,
  parseAsIndex,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

const statusValues = ['All', 'paid', 'part_paid', 'overdue', 'draft', 'voided', 'due'] as const;
const currencyValues = ['All', 'NGN', 'USD', 'KES', 'RWF', 'GBP', 'EUR'] as const;

const searchParams = {
  searchQuery: parseAsString.withDefault(''),
  pageIndex: parseAsIndex.withDefault(0),
  business: parseAsString.withDefault('All'),
  status: parseAsStringLiteral(statusValues).withDefault('All'),
  currency: parseAsStringLiteral(currencyValues).withDefault('All'),
  issuedFrom: parseAsString.withDefault(''),
  issuedTo: parseAsString.withDefault(''),
  dueFrom: parseAsString.withDefault(''),
  dueTo: parseAsString.withDefault(''),
  tz: parseAsString.withDefault('Africa/Lagos'),
};

export const Route = createFileRoute('/_auth-layout/invoices/')({
  component: InvoicesPage,
  validateSearch: createStandardSchemaV1(searchParams, {
    partialOutput: true
  })
});

function InvoicesPage() {
	const [
		{
			business: bizFilter,
			status: statusFilter,
			currency: currencyFilter,
			searchQuery,
			pageIndex,
			issuedFrom,
			issuedTo,
			dueFrom,
			dueTo,
			tz,
		},
		setQueryStates,
	] = useQueryStates(searchParams, {
		history: 'replace',
		clearOnDefault: true,
	});
	const setBizFilter = (v: string) => setQueryStates({ business: v });
	const setStatusFilter = (v: string) => setQueryStates({ status: v as typeof statusFilter });
	const setCurrencyFilter = (v: string) => setQueryStates({ currency: v as typeof currencyFilter });
	const setSearchQuery = (v: string) =>
		setQueryStates({ searchQuery: v }, { limitUrlUpdates: v === '' ? undefined : debounce(300) });
	const setPageIndex = (v: number) => setQueryStates({ pageIndex: v });
	const setTz = (v: string) => setQueryStates({ tz: v });
	const setIssuedRange = (r: { from?: string; to?: string }) => setQueryStates({ issuedFrom: r.from ?? '', issuedTo: r.to ?? '' });
	const setDueRange = (r: { from?: string; to?: string }) => setQueryStates({ dueFrom: r.from ?? '', dueTo: r.to ?? '' });
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
  const todayISO = new Date().toISOString().slice(0, 10);
  const filtered = invoices.filter((invoice: any) => {
    const matchesBusiness =
      bizFilter === 'All' || invoice.business === bizFilter;
    const dueRaw = (invoice as any).due || (invoice as any).dueDate || '';
    const issuedRaw = (invoice as any).issued || (invoice as any).issueDate || '';
    const issuedWall = issuedRaw.slice(0, 10);
    const dueWall = dueRaw.slice(0, 10);
    const matchesIssued =
      (!issuedFrom || issuedWall >= issuedFrom) && (!issuedTo || issuedWall <= issuedTo);
    const matchesDue =
      (!dueFrom || dueWall >= dueFrom) && (!dueTo || dueWall <= dueTo);
    const isOverdue = Boolean(
      dueRaw && dueRaw < todayISO && !['paid', 'voided'].includes(invoice.status),
    );
    const isDue = Boolean(
      dueRaw && dueRaw >= todayISO && invoice.status === 'draft',
    );
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'due'
          ? isDue
          : statusFilter === 'overdue'
            ? isOverdue || invoice.status === 'overdue'
            : invoice.status === statusFilter;
    const matchesCurrency =
      currencyFilter === 'All' || invoice.currency === currencyFilter;
    return matchesBusiness && matchesStatus && matchesCurrency && matchesIssued && matchesDue;
  });

  const statusOptions: Array<typeof statusFilter> = [
    'All',
    'paid',
    'part_paid',
    'overdue',
    'draft',
    'voided',
    'due',
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
      </div>

      <div className="flex flex-col gap-3 rounded-none border-2 border-[#201e1d] bg-white p-3">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
          FILTERS — SELECT TO REFINE
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#5c5755]">ISSUED</div>
            <DateRangePicker
              value={{ from: issuedFrom || undefined, to: issuedTo || undefined }}
              onChange={setIssuedRange}
              placeholder="Issued range"
              timeZone={tz}
              onTimeZoneChange={setTz}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#5c5755]">DUE</div>
            <DateRangePicker
              value={{ from: dueFrom || undefined, to: dueTo || undefined }}
              onChange={setDueRange}
              placeholder="Due range"
              timeZone={tz}
              onTimeZoneChange={setTz}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Select value={bizFilter} onValueChange={(v) => setBizFilter((v as string) ?? 'All')}>
            <SelectTrigger className="min-w-36 rounded-none border-[#201e1d] bg-white text-xs font-semibold">
              <SelectValue placeholder="Business" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[#201e1d]">
              <SelectGroup>
                {bizOptions.map((b) => (
                  <SelectItem key={b} value={b} className="text-xs">
                    {b === 'All' ? 'All businesses' : b}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v as typeof statusFilter) ?? 'All')}
          >
            <SelectTrigger className="min-w-32 rounded-none border-[#201e1d] bg-white text-xs font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[#201e1d]">
              <SelectGroup>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option === 'All' ? 'All statuses' : option.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={currencyFilter}
            onValueChange={(v) => setCurrencyFilter((v as typeof currencyFilter) ?? 'All')}
          >
            <SelectTrigger className="min-w-32 rounded-none border-[#201e1d] bg-white text-xs font-semibold">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[#201e1d]">
              <SelectGroup>
                {currencyOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option === 'All' ? 'All currencies' : option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
      {(issuedFrom || issuedTo || dueFrom || dueTo) && (
        <div className="flex items-center justify-between gap-3 bg-white border border-[#201e1d] px-3.5 py-2.5">
          <div className="text-xs">
            <span className="font-semibold">Date filters</span>
            <span className="text-[#5c5755] ml-2">
              {issuedFrom || issuedTo ? `Issued ${issuedFrom || '…'} → ${issuedTo || '…'} ` : ''}
              {dueFrom || dueTo ? `Due ${dueFrom || '…'} → ${dueTo || '…'} ` : ''}
              <span className="text-[11px]">({tz})</span>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQueryStates({ issuedFrom: '', issuedTo: '', dueFrom: '', dueTo: '' })}
            className="border border-[#201e1d] bg-white px-3 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none"
          >
            Clear dates
          </Button>
        </div>
      )}

      <InvoiceTable
        data={filtered}
        allowEdit
        globalFilter={searchQuery}
        onGlobalFilterChange={setSearchQuery}
        pagination={{ pageIndex, pageSize: 10 }}
        onPaginationChange={(updater) => {
          const next =
            typeof updater === 'function'
              ? (updater as (old: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number })({
                  pageIndex,
                  pageSize: 10,
                })
              : updater;
          setPageIndex(next.pageIndex);
        }}
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
