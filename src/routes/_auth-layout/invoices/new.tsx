import { createFileRoute } from '@tanstack/react-router';
import { InvoiceForm } from '#/components/forms/InvoiceForm';

export const Route = createFileRoute('/_auth-layout/invoices/new')({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  return <InvoiceForm />;
}
