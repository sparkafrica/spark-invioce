import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { Loader2 } from 'lucide-react'
import { InvoiceForm } from '#/components/forms/InvoiceForm'
import { Button } from '#/components/ui/button'
import { getInvoiceDetail } from '#/lib/server-fns/invoice-detail'

export const Route = createFileRoute('/invoices/$id/edit')({
  beforeLoad: async ({ params }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: `/invoices/${params.id}/edit` } })
    }
    return { user: session.user, session: session.session, invoiceId: params.id }
  },
  component: EditInvoicePage,
})

function EditInvoicePage() {
  const match = Route.useMatch()
  const invoiceId = (match?.loaderData as { invoiceId: string } | undefined)?.invoiceId || ''
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', { id: invoiceId }],
    queryFn: () => getInvoiceDetail({ data: { id: invoiceId } }),
    enabled: !!invoiceId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Edit Invoice</h1>
          <Button variant="ghost">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        </div>
        <div className="rounded-none border bg-white p-12  text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-[#5c5755]">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Edit Invoice</h1>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
        <div className="rounded-none border bg-red-50 p-6  dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">Failed to load invoice: {(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!data?.invoice) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none text-[#201e1d]">Edit Invoice</h1>
        </div>
        <div className="rounded-none border bg-red-50 p-6  dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">Invoice not found</p>
        </div>
      </div>
    )
  }

  const invoice = data.invoice

  // Transform invoice data to form initial values
  const initialData = {
    businessId: invoice.businessId,
    companyId: invoice.companyId,
    clientId: invoice.clientId,
    issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : '',
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
    currency: invoice.currency,
    taxName: invoice.taxName,
    taxRate: invoice.taxRate,
    description: invoice.description,
    memo: invoice.memo,
    bankId: invoice.bankId,
    paymentType: invoice.paymentType,
    paymentMethod: invoice.paymentMethod,
    payLink: invoice.payLink,
    payLinkLabel: invoice.payLinkLabel,
    items: invoice.items.map((item: { id: string; name: string; description: string | null; qty: string; cost: string; discountName: string | null; discountPct: string; discountAmt: string; sortOrder: number }) => ({
      name: item.name,
      description: item.description || '',
      qty: item.qty,
      cost: item.cost,
      discountName: item.discountName || '',
      discountPct: item.discountPct,
      discountAmt: item.discountAmt,
    })),
    tranches: invoice.tranches.map((t: { id: string; name: string; deliverables: string | null; dueDate: string | null; amount: string; paid: boolean; sortOrder: number }) => ({
      name: t.name,
      deliverables: t.deliverables || '',
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
      amount: t.amount,
      paid: t.paid,
    })),
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <InvoiceForm initialData={initialData} isEditing={true} invoiceId={invoiceId} />
    </div>
  )
}
