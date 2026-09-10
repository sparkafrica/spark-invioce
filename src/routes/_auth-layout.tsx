import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Header } from '#/components/layout';
import { Skeleton } from '#/components/ui/skeleton';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth-layout')({
	loader: async ({ location }) => {
		const session = await getSession();

		if (!(session?.session && session?.user)) {
			// Not signed in → send to login (preserve attempted URL for post-login redirect)
			throw redirect({
				to: '/auth/login',
				search: { redirect: location.pathname } as never,
			});
		}

		return { session: session?.session, user: session?.user };
	},
	pendingComponent: () => (
		<div className="flex flex-col gap-4 p-6 animate-pulse">
			<div className="flex items-end justify-between gap-5 border-b-2 border-[#201e1d] pb-3">
				<Skeleton className="h-8 w-40 rounded-none" />
				<Skeleton className="h-6 w-24 rounded-none" />
			</div>
			<div className="grid gap-3">
				<Skeleton className="h-10 w-full rounded-none" />
				<Skeleton className="h-32 w-full rounded-none" />
				<Skeleton className="h-20 w-full rounded-none" />
			</div>
		</div>
	),
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<>
			<Header />
			<div className="flex-1 px-6 py-7 lg:px-7 flex flex-col" id="main-content">
				<Outlet />
			</div>
		</>
	);
}
