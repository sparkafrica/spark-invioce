import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/setting')({
	loader: () => redirect({ to: '/settings/profile' }),
});
