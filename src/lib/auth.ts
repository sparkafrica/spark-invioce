import '@tanstack/react-start/server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { customSession, organization } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
	}),
	user: {
		additionalFields: {
			title: {
				type: 'string',
				required: false,
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		autoLogin: true,
		minPasswordLength: 5,
		sendResetPassword: async ({ user, url }) => {
			// Dev mock — log reset link (replace with Resend in prod)
			console.log(`[Better Auth] Reset password for ${user.email}: ${url}`);
		},
	},
	social: {
		// Configure social providers later if needed
	},
	plugins: [
		organization({
			schema: {
				invitation: {
					additionalFields: {
						name: {
							type: 'string',
							required: true,
						}
					}
				}
			},
			sendInvitationEmail: async ({ email, organization }) => {
				// Dev mock — log invitation link (replace with Resend in prod)
				console.log(
					`[Better Auth] Invitation for ${email} to join organization: ${organization.name}`,
				);
			}
		}),
		customSession(async ({ session, user }) => {
			const orgId = process.env.ORGANIZATION_ID;
			if (!orgId) {
				return {
					session,
					user: { ...user, role: null },
				};
			}

			const member = await db.query.member.findFirst({
				where: (m, { eq, and }) =>
					and(eq(m.userId, user.id), eq(m.organizationId, orgId)),
			});

			return {
				session,
				user: { ...user, role: member?.role ?? null },
			};
		}),
		tanstackStartCookies(),
	],
});
