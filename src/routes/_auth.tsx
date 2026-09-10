import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth')({
	loader: async ({ location }) => {
		const session = await getSession();

		if (session?.session && session?.user) {
			// Allow logged-in user to use reset-password link (token present)
			const pathname = location.pathname;
			const search = location.search as Record<string, unknown>;
			const hasToken =
				typeof search.token === 'string' && search.token.length > 0;
			const isReset = pathname === '/auth/reset-password' && hasToken;
			if (isReset) {
				return { session: session?.session, user: session?.user };
			}
			// Already signed in → send away from login/signup/invite
			throw redirect({
				to: '/dashboard',
			});
		}

		return { session: session?.session, user: session?.user };
	},
	component: AuthLayout,
});

function AuthLayout() {
	return <Outlet />;
}
