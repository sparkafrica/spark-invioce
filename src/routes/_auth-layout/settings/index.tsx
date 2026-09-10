import { createFileRoute, redirect } from '@tanstack/react-router';
export const Route = createFileRoute('/_auth-layout/settings/')({
	beforeLoad: async () => {
		throw redirect({ to: '/settings/profile' });
	},
});
