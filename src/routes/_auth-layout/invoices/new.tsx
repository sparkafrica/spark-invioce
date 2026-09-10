import { createFileRoute, redirect } from '@tanstack/react-router';
import { InvoiceForm } from '#/components/forms/InvoiceForm';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth-layout/invoices/new')({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: '/invoices/new' } });
    }
    const role = (session.user as unknown as { role?: string | null })?.role;
    if (role !== 'admin' && role !== 'owner') {
      throw redirect({ to: '/invoices' });
    }
    return { user: session.user };
  },
  component: NewInvoicePage,
});

function NewInvoicePage() {
  return <InvoiceForm />;
}
