import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_auth')({
  loader: async () => {
    const session = await getSession();

    if (session?.session && session?.user) {
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
  return (
    <Outlet />
  );
}
