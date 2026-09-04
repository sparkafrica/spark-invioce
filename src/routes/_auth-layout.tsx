import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Header } from '#/components/layout';
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
    <>
      <Header />
      <div className="flex-1 px-6 py-7 lg:px-7 flex flex-col" id="main-content">
        <Outlet />
      </div>
    </>
  );
}
