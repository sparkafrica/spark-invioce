import '@tanstack/react-start/server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { db } from '#/db';
import * as schema from '#/db/schema';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		autoLogin: true,
		minPasswordLength: 5,
		sendResetPassword: async ({ user, url }) => {
			// Dev mock — log reset link (replace with Resend in prod)
			console.log(`[Better Auth] Reset password for ${user.email}: ${url}`)
		},
	},
	social: {
		// Configure social providers later if needed
	},
	plugins: [organization(), tanstackStartCookies()],
});
