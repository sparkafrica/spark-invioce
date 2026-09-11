import { randomBytes } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { createServerFn } from '@tanstack/react-start';
import { Resend } from 'resend';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db } from '#/db';
import { account, user } from '#/db/auth-schema';
import { auth } from '#/lib/auth';
import { getRequestHeaders } from '@tanstack/react-start/server';

const RESEND_FROM =
	process.env.RESEND_FROM ?? 'Spark Invoice <no-reply@sparkafrica.co>';

function getBaseUrl() {
	const raw =
		process.env.BETTER_AUTH_URL ??
		process.env.DOMAIN ??
		'http://localhost:3000';
	return raw.replace(/\/$/, '');
}

const inviteMemberSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
	email: v.pipe(v.string(), v.email('Invalid email address')),
	role: v.picklist(['admin', 'member']),
});

export type InviteMemberInput = v.InferOutput<typeof inviteMemberSchema>;

export const inviteMember = createServerFn({ method: 'POST' })
	.validator((data) => v.parse(inviteMemberSchema, data))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		const sessionUser = session?.user as unknown as { id: string; name: string; email: string; role?: string | null } | null;
		if (!sessionUser?.id) {
			throw new Error('Unauthorized');
		}
		const roleFromSession = sessionUser.role;
		if (roleFromSession !== 'owner' && roleFromSession !== 'admin') {
			const rows = await db.select({ role: user.role }).from(user).where(eq(user.id, sessionUser.id)).limit(1);
			const r = rows[0]?.role;
			if (r !== 'owner' && r !== 'admin') throw new Error('Forbidden: owner or admin only');
		}

		const existing = await db.query.user.findFirst({
			where: (u, { eq: eqFn }) => eqFn(u.email, data.email),
		});
		if (existing) {
			return {
				success: false as const,
				message: 'User already exists',
				error: 'User already exists',
			};
		}

		const tempPassword = randomBytes(12).toString('base64url');
		const ctxAuth = await auth.$context;
		const hashed = await ctxAuth.password.hash(tempPassword);
		const now = new Date();
		const userId = createId();

		const userInsert: typeof user.$inferInsert = {
			id: userId,
			name: data.name,
			email: data.email,
			role: data.role,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		};

		const accountInsert: typeof account.$inferInsert = {
			id: createId(),
			accountId: data.email,
			providerId: 'credential',
			userId,
			password: hashed,
			createdAt: now,
			updatedAt: now,
			issuer: 'local:credential',
		};

		try {
			await db.insert(user).values(userInsert);
			await db.insert(account).values(accountInsert);
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: 'Failed to create user';
			return {
				success: false as const,
				message,
				error: message,
			};
		}

		const baseUrl = getBaseUrl();
		const loginUrl = `${baseUrl}/auth/login`;
		const inviterName = sessionUser.name ?? sessionUser.email ?? 'Spark team';

		if (!process.env.RESEND_API_KEY) {
			console.log(
				`[Invite] ${data.email} role=${data.role} tempPassword=${tempPassword} login=${loginUrl} invited by ${inviterName}`,
			);
		} else {
			try {
				const resend = new Resend(process.env.RESEND_API_KEY);
				const subject = `${inviterName} invited you to Spark — ${data.role}`;
				const text = `Hi ${data.name},\n\n${inviterName} invited you to join Spark Invoice as ${data.role}.\n\nEmail: ${data.email}\nTemporary password: ${tempPassword}\n\nSign in here: ${loginUrl}\n\nPlease change your password after first login.\n\n— Spark Invoice`;
				const html = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 560px; margin: 0 auto; background:#f3f2f2; padding:24px;">
  <div style="background:#fff; border:2px solid #201e1d; padding:24px;">
    <div style="font-size:10px; letter-spacing:0.12em; font-weight:700; color:#c02a10; margin-bottom:12px;">SPARK INVOICE — INVITATION</div>
    <h1 style="margin:0 0 8px; font-size:22px; color:#201e1d; letter-spacing:-0.02em;">You're invited to Spark</h1>
    <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#5c5755;"><strong style="color:#201e1d;">${inviterName}</strong> invited you as <strong style="color:#201e1d;">${data.role}</strong>.</p>
    <div style="background:#f3f2f2; border:1px solid #d6d3d1; padding:12px; font-size:13px; line-height:1.6; color:#201e1d; margin:0 0 16px;">
      <div>Email: <strong>${data.email}</strong></div>
      <div>Temporary password: <strong style="font-family: ui-monospace, monospace;">${tempPassword}</strong></div>
    </div>
    <a href="${loginUrl}" style="display:inline-block; background:#ec3013; color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding:12px 18px; border:1px solid #ec3013;">Sign in to Spark</a>
    <p style="margin:16px 0 0; font-size:11px; line-height:1.5; color:#8a8684;">Please change your password after first login. If you didn't expect this, ignore this email.</p>
  </div>
  <div style="text-align:center; margin-top:12px; font-size:10px; letter-spacing:0.12em; color:#8a8684;">SPARK — NIGERIA · UNITED KINGDOM</div>
</div>`;
				const { error } = await resend.emails.send({
					from: RESEND_FROM,
					to: data.email,
					subject,
					text,
					html,
				});
				if (error) {
					console.error('[Resend] inviteMember failed:', error);
					throw error;
				}
			} catch (error) {
				console.error('[Resend] inviteMember exception:', error);
				// User already created, but email failed — return partial success with password for admin to share
				return {
					success: true as const,
					message: 'User created but email failed — share password manually',
					tempPassword,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		return {
			success: true as const,
			message: 'User created and invitation sent',
			tempPassword,
		};
	});

export const listUsers = createServerFn({ method: 'GET' }).handler(async () => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		const sessionUser = session?.user as unknown as { id: string } | null;
		if (!sessionUser?.id) {
			throw new Error('Unauthorized');
		}
		const users = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt,
			})
			.from(user)
			.orderBy(user.createdAt);
		return { users };
	},
);
