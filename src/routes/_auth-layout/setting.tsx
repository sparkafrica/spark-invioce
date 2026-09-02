import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth-layout/setting')({
	loader: () => redirect({ to: '/settings/profile' }),
});
