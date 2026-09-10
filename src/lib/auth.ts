import '@tanstack/react-start/server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
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
	baseURL: getBaseUrl(),
	secret: process.env.BETTER_AUTH_SECRET,
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
			role: {
				type: 'string',
				required: false,
				defaultValue: 'member',
				input: false,
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		autoLogin: true,
		minPasswordLength: 5,
		resetPasswordTokenExpiresIn: 60 * 60,
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
					throw error;
				}
			} catch (err) {
				console.error('[Resend] sendResetPassword exception:', err);
				throw err;
			}
		},
	},
	social: {
		// Configure social providers later if needed
	},
	plugins: [tanstackStartCookies()],
});
