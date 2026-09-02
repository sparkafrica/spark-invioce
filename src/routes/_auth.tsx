import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '#/lib/auth';

export const Route = createFileRoute('/_auth')({
  loader: async () => {
    const req = getRequest();
    const session = await auth.api.getSession({ headers: req.headers });

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
