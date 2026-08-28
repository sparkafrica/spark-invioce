import { createFileRoute, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';
import { InvoiceForm } from '#/components/forms/InvoiceForm';

export const Route = createFileRoute('/invoices/new')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({
				to: '/auth/login',
				search: { redirect: '/invoices/new' },
			});
		}
		return { user: session.user, session: session.session };
	},
	component: NewInvoicePage,
});

function NewInvoicePage() {
	return (
		<div className="space-y-6">
			<InvoiceForm />
		</div>
	);
}
