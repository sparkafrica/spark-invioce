import '@tanstack/react-start/server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { customSession, organization } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { Resend } from 'resend';
import { db } from '../db';
import * as schema from '../db/schema';

const RESEND_FROM =
	process.env.RESEND_FROM ?? 'Spark Invoice <no-reply@sparkafrica.co>';

function getBaseUrl() {
	const raw =
		process.env.BETTER_AUTH_URL ??
		process.env.DOMAIN ??
		'http://localhost:3000';
	// ensure no trailing slash
	return raw.replace(/\/$/, '');
}

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
			// Fallback to log when Resend is not configured (dev / CI)
			if (!process.env.RESEND_API_KEY) {
				console.log(`[Better Auth] Reset password for ${user.email}: ${url}`);
				return;
			}
			try {
				const resend = new Resend(process.env.RESEND_API_KEY);
				const subject = 'Reset your Spark password';
				const text = `Hi ${user.name ?? user.email},\n\nYou requested to reset your Spark password. Click the link below to set a new password:\n\n${url}\n\nThis link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.\n\n— Spark Invoice`;
				const html = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 560px; margin: 0 auto; background:#f3f2f2; padding:24px;">
  <div style="background:#fff; border:2px solid #201e1d; padding:24px;">
    <div style="font-size:10px; letter-spacing:0.12em; font-weight:700; color:#c02a10; margin-bottom:12px;">SPARK INVOICE — PASSWORD RESET</div>
    <h1 style="margin:0 0 8px; font-size:22px; color:#201e1d; letter-spacing:-0.02em;">Reset your password</h1>
    <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#5c5755;">Hi ${user.name ?? user.email},<br/>We received a request to reset your password. Click the button below to continue.</p>
    <a href="${url}" style="display:inline-block; background:#ec3013; color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding:12px 18px; border:1px solid #ec3013;">Reset password</a>
    <p style="margin:16px 0 0; font-size:12px; line-height:1.6; color:#5c5755; word-break:break-all;">Or copy this link:<br/><a href="${url}" style="color:#c02a10;">${url}</a></p>
    <p style="margin:16px 0 0; font-size:11px; line-height:1.5; color:#8a8684;">This link expires in 1 hour and is single-use. If you didn't request it, ignore this email.</p>
  </div>
  <div style="text-align:center; margin-top:12px; font-size:10px; letter-spacing:0.12em; color:#8a8684;">SPARK — NIGERIA · UNITED KINGDOM</div>
</div>`;
				const { error } = await resend.emails.send({
					from: RESEND_FROM,
					to: user.email,
					subject,
					text,
					html,
				});
				if (error) {
					console.error('[Resend] sendResetPassword failed:', error);
				}
			} catch (err) {
				console.error('[Resend] sendResetPassword exception:', err);
			}
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
						},
					},
				},
			},
			sendInvitationEmail: async (data) => {
				const { email, organization, invitation, inviter } = data as {
					email: string;
					organization: { name: string; slug?: string | null };
					invitation: { id: string; expiresAt?: Date | string };
					inviter?: {
						user?: { name?: string | null; email?: string | null };
					} | null;
				};

				const baseUrl = getBaseUrl();
				const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${encodeURIComponent(invitation.id)}`;
				const inviterName =
					(inviter as unknown as { user?: { name?: string } })?.user?.name ??
					(inviter as unknown as { inviter?: { name?: string } })?.inviter
						?.name ??
					'Spark team';
				const orgName = organization.name ?? 'Spark';

				if (!process.env.RESEND_API_KEY) {
					console.log(
						`[Better Auth] Invitation for ${email} to join ${orgName}: ${inviteUrl} (invited by ${inviterName})`,
					);
					return;
				}

				try {
					const resend = new Resend(process.env.RESEND_API_KEY);
					const subject = `${inviterName} invited you to join ${orgName} on Spark`;
					const text = `${inviterName} invited you to join ${orgName} on Spark Invoice.\n\nAccept your invitation:\n${inviteUrl}\n\nThis invitation expires in 48 hours. If you don't have an account yet, you'll set a password after accepting.\n\n— Spark Invoice`;
					const html = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 560px; margin: 0 auto; background:#f3f2f2; padding:24px;">
  <div style="background:#fff; border:2px solid #201e1d; padding:24px;">
    <div style="font-size:10px; letter-spacing:0.12em; font-weight:700; color:#c02a10; margin-bottom:12px;">SPARK INVOICE — INVITATION</div>
    <h1 style="margin:0 0 8px; font-size:22px; color:#201e1d; letter-spacing:-0.02em;">You're invited to ${orgName}</h1>
    <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#5c5755;"><strong style="color:#201e1d;">${inviterName}</strong> invited you to join <strong style="color:#201e1d;">${orgName}</strong> on Spark Invoice.</p>
    <a href="${inviteUrl}" style="display:inline-block; background:#ec3013; color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding:12px 18px; border:1px solid #ec3013;">Accept invitation</a>
    <p style="margin:16px 0 0; font-size:12px; line-height:1.6; color:#5c5755; word-break:break-all;">Or copy this link:<br/><a href="${inviteUrl}" style="color:#c02a10;">${inviteUrl}</a></p>
    <p style="margin:16px 0 0; font-size:11px; line-height:1.5; color:#8a8684;">This invitation expires in 48 hours and can only be used for ${email}. If you didn't expect this, you can ignore this email.</p>
  </div>
  <div style="text-align:center; margin-top:12px; font-size:10px; letter-spacing:0.12em; color:#8a8684;">SPARK — NIGERIA · UNITED KINGDOM</div>
</div>`;
					const { error } = await resend.emails.send({
						from: RESEND_FROM,
						to: email,
						subject,
						text,
						html,
					});
					if (error) {
						console.error('[Resend] sendInvitationEmail failed:', error);
					}
				} catch (err) {
					console.error('[Resend] sendInvitationEmail exception:', err);
				}
			},
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
