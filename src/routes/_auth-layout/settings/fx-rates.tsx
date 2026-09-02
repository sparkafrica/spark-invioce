import { createFileRoute, redirect } from '@tanstack/react-router';
import { SettingsLayout } from '#/components/settings/SettingsLayout';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth-layout/settings/fx-rates')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session)
			throw redirect({
				to: '/auth/login',
				search: { redirect: '/settings/fx-rates' },
			});
		return { user: session.user };
	},
	component: () => <SettingsLayout />,
});
