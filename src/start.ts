import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '#/lib/auth';

// CSRF protection for server functions (same-origin RPC)
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === 'serverFn',
});

// Server-only middleware - runs on ALL server requests (SSR, routes, server functions)
const authMiddleware = createMiddleware().server(async ({ next }) => {
	const request = getRequest();
	const data = await auth.api.getSession({ headers: request.headers });
	return next({
		context: { session: data?.session ?? null, user: data?.user ?? null },
	});
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware, authMiddleware],
	functionMiddleware: [],
}));
