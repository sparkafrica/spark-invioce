import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import * as v from 'valibot';
import { auth } from '#/lib/auth';

const signInSchema = v.object({
	email: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1)),
});

export const signInEmail = createServerFn({ method: 'POST' })
	.validator((d) => v.parse(signInSchema, d))
	.handler(async ({ data }) => {
		const request = getRequest();
		const headers = request.headers;
		try {
			const res = await auth.api.signInEmail({
				body: {
					email: data.email,
					password: data.password,
					callbackURL: process.env.BETTER_AUTH_URL,
				},
				headers,
				// asResponse: false,
			});

			return { success: true as const, res };
		} catch (error) {
			const err =
				error instanceof Error && error.message
					? error.message
					: 'Failed to sign in';
			return {
				success: false as const,
				error: err,
			};
		}
	});

const requestResetSchema = v.object({
	email: v.pipe(v.string(), v.email('Invalid email')),
	redirectTo: v.optional(v.string()),
});

export const requestPasswordReset = createServerFn({ method: 'POST' })
	.validator((d) => v.parse(requestResetSchema, d))
	.handler(async ({ data }) => {
		const request = getRequest();
		const headers = request.headers;
		try {
			await auth.api.requestPasswordReset({
				body: { email: data.email, redirectTo: data.redirectTo },
				headers,
			});
			return { success: true as const };
		} catch (error) {
			const err =
				error instanceof Error && error.message
					? error.message
					: 'Failed to send reset email';
			return {
				success: false as const,
				error: err,
			};
		}
	});

const resetSchema = v.object({
	token: v.pipe(v.string(), v.minLength(1)),
	newPassword: v.pipe(v.string(), v.minLength(5)),
});

export const resetPassword = createServerFn({ method: 'POST' })
	.validator((d) => v.parse(resetSchema, d))
	.handler(async ({ data }) => {
		const request = getRequest();
		const headers = request.headers;
		try {
			await auth.api.resetPassword({
				body: { token: data.token, newPassword: data.newPassword },
				headers,
			});
			return { success: true as const };
		} catch (error) {
			const err =
				error instanceof Error && error.message
					? error.message
					: 'Failed to reset password';
			return {
				success: false as const,
				error: err,
			};
		}
	});

const updateUserSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1)),
	title: v.optional(v.string()),
	image: v.optional(v.string()),
});

export const updateUser = createServerFn({ method: 'POST' })
	.validator((d) => v.parse(updateUserSchema, d))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};

		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const request = getRequest();
		const headers = request.headers;

		try {
			const res = await auth.api.updateUser({
				body: { name: data.name, title: data.title, image: data.image },
				headers,
				asResponse: false,
			});
			return { success: true as const, res };
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: 'Failed to update profile';
			return {
				success: false as const,
				message,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

export const signOut = createServerFn({ method: 'POST' }).handler(
	async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};

		// Allow sign-out even if context session is null — still clear cookies server-side
		// but keep check for consistency; don't throw if already signed out
		void ctx.session;

		const request = getRequest();
		const headers = request.headers;

		try {
			await auth.api.signOut({
				headers,
			});
			return { success: true as const };
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: 'Failed to sign out';
			return {
				success: false as const,
				message,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
);
