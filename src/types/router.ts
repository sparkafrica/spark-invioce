import type { QueryClient } from '@tanstack/react-query';
import type { Session } from 'better-auth';

export interface RouterContext {
	queryClient: QueryClient;
	session: Session | null;
}

declare module '@tanstack/react-router' {
	interface MyRouterContext extends RouterContext {}
}
