import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth-layout')({
  loader: async () => {
    const session = await getSession();

    if (!(session?.session && session?.user)) {
      // Not signed in → send to login
      throw redirect({
        to: '/auth/login',
      });
    }

    return { session: session?.session, user: session?.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <Outlet />
  );
}
