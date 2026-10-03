import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { InvoiceDetail } from '#/components/invoice/InvoiceDetail';
import { Button } from '#/components/ui/button';
import { Skeleton } from '#/components/ui/skeleton';
import { getInvoiceDetail } from '#/lib/server-fns/invoice-detail';
import { createStandardSchemaV1, parseAsString } from 'nuqs';

const detailSearchParams = {
  from: parseAsString.withDefault('invoices'),
};

export const Route = createFileRoute('/_auth-layout/invoices/$id/')({
  component: InvoiceDetailPage,
  validateSearch: createStandardSchemaV1(detailSearchParams, {
    partialOutput: true,
  }),
});

function InvoiceDetailPage() {
  const { id: invoiceId } = Route.useParams();
  const { from } = Route.useSearch();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', { id: invoiceId }],
    queryFn: () => getInvoiceDetail({ data: { id: invoiceId } }),
    enabled: !!invoiceId,
  });

  const backTo = from === 'dashboard' ? '/dashboard' : '/invoices';
  const backLabel = from === 'dashboard' ? 'Back to Dashboard' : 'Back to Invoices';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
            Invoice Detail
          </h1>
          <Button>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        </div>
        <div className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
          <Skeleton className="h-6 w-40 rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-32 w-full rounded-none" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
            Invoice Detail
          </h1>
          <Button>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        </div>
        <div className="rounded-none border bg-red-50 p-6  dark:bg-red-900/20">
          <p className="text-red-600">
            Failed to load invoice: {(error as Error).message}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none text-[#201e1d]">
            Invoice Detail
          </h1>
          <Button>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        </div>
        <div className="rounded-none border bg-red-50 p-6  dark:bg-red-900/20">
          <p className="text-red-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  return <InvoiceDetail invoice={data.invoice} from={from} />;
}
