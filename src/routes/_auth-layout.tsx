import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '#/lib/auth';

export const Route = createFileRoute('/_auth-layout')({
  loader: async () => {
    const req = getRequest();
    const session = await auth.api.getSession({ headers: req.headers });

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
