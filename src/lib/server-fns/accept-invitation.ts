import { createId } from '@paralleldrive/cuid2';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db } from '#/db';
import { account, invitation, member, user } from '#/db/auth-schema';
import { auth } from '#/lib/auth';

const invitationMetaSchema = v.object({
	invitationId: v.pipe(v.string(), v.minLength(1)),
});

export const getInvitationMeta = createServerFn({ method: 'GET' })
	.validator((data: unknown) => v.parse(invitationMetaSchema, data))
	.handler(async ({ data }) => {
		const inv = await db.query.invitation.findFirst({
			where: (t, { eq }) => eq(t.id, data.invitationId),
		});
		if (!inv) throw new Error('INVITATION_INVALID');
		if (inv.status !== 'pending') throw new Error('INVITATION_INVALID');
		if (inv.expiresAt < new Date()) throw new Error('INVITATION_EXPIRED');
		return {
			email: inv.email,
			organizationId: inv.organizationId,
			role: inv.role,
			expiresAt: inv.expiresAt.toISOString(),
			status: inv.status,
		};
	});

const acceptSchema = v.object({
	invitationId: v.pipe(v.string(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(5)),
	name: v.optional(v.string()),
});

export const acceptInvitationAndCreateUser = createServerFn({ method: 'POST' })
	.validator((data: unknown) => v.parse(acceptSchema, data))
	.handler(async ({ data }) => {
		const inv = await db.query.invitation.findFirst({
			where: (t, { eq }) => eq(t.id, data.invitationId),
		});
		if (!inv) throw new Error('INVITATION_INVALID');
		if (inv.status !== 'pending') throw new Error('INVITATION_INVALID');
		if (inv.expiresAt < new Date()) throw new Error('INVITATION_EXPIRED');
		const existing = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.email, inv.email),
		});

		const name = data.name?.trim() || inv.name?.trim() || inv.email.split('@')[0]!;

		let userId: string;
		if (!existing) {
			const newUserId = createId();
			const ctx = await auth.$context;
			const hashed = await ctx.password.hash(data.password);
			const now = new Date();
			await db.insert(user).values({
				id: newUserId,
				name,
				email: inv.email,
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
			});
			await db.insert(account).values({
				id: createId(),
				accountId: inv.email,
				providerId: 'credential',
				userId: newUserId,
				password: hashed,
				createdAt: now,
				updatedAt: now,
				issuer: "local:credential"
			});
			userId = newUserId;
		} else {
			userId = existing.id;
			if (data.name?.trim() && existing.name !== data.name.trim()) {
				await db
					.update(user)
					.set({ name: data.name.trim(), updatedAt: new Date() })
					.where(eq(user.id, userId));
			}
		}

		const alreadyMember = await db.query.member.findFirst({
			where: (m, { and, eq }) =>
				and(eq(m.organizationId, inv.organizationId), eq(m.userId, userId)),
		});
		if (!alreadyMember) {
			await db.insert(member).values({
				id: createId(),
				organizationId: inv.organizationId,
				userId,
				role: inv.role ?? 'member',
				createdAt: new Date(),
			});
		}

		await db
			.update(invitation)
			.set({ status: 'accepted' })
			.where(eq(invitation.id, inv.id));

		const request = getRequest();
		try {
			await auth.api.signInEmail({
				body: { email: inv.email, password: data.password },
				headers: request.headers,
				asResponse: false,
			});
		} catch {
			// sign-in may fail if already signed in via context, ignore and still return success
		}

		return {
			success: true as const,
			userId,
			organizationId: inv.organizationId,
		};
	});
