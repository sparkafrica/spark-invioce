import { createFileRoute, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';
import { SettingsLayout } from '#/components/settings/SettingsLayout';

export const Route = createFileRoute('/settings/fx-rates')({
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
