import { createFileRoute, redirect } from '@tanstack/react-router';
import { SettingsLayout } from '#/components/settings/SettingsLayout';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/settings/companies')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session)
			throw redirect({
				to: '/auth/login',
				search: { redirect: '/settings/companies' },
			});
		return { user: session.user };
	},
	component: () => <SettingsLayout />,
});
