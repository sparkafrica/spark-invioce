import { createFileRoute, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth-layout/settings/')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session)
			throw redirect({ to: '/auth/login', search: { redirect: '/settings' } });
		throw redirect({ to: '/settings/profile' });
	},
});
