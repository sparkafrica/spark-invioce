import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { memos } from '#/db/schema';

export const getMemos = createServerFn({ method: 'GET' })
	.validator(z.object({}))
	.handler(async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const results = await db
			.select({
				id: memos.id,
				number: memos.number,
				businessId: memos.businessId,
				companyId: memos.companyId,
				to: memos.to,
				from: memos.from,
				date: memos.date,
				subject: memos.subject,
				body: memos.body,
				createdAt: memos.createdAt,
				updatedAt: memos.updatedAt,
			})
			.from(memos)
			.where(eq(memos.organizationId, process.env.ORGANIZATION_ID!));

		return { memos: results };
	});

export const createMemo = createServerFn({ method: 'POST' })
	.validator(
		z.object({
			number: z.string().min(1),
			businessId: z.string().min(1),
			companyId: z.string().min(1),
			to: z.string().min(1),
			from: z.string().min(1),
			date: z.string().min(1),
			subject: z.string().min(1),
			body: z.string().min(1),
		}),
	)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const orgId = process.env.ORGANIZATION_ID!;
		const [result] = await db
			.insert(memos)
			.values({
				organizationId: orgId,
				number: data.number,
				businessId: data.businessId,
				companyId: data.companyId,
				to: data.to,
				from: data.from,
				date: new Date(data.date),
				subject: data.subject,
				body: data.body,
			})
			.returning({ id: memos.id });

		return { memoId: result.id };
	});

export const updateMemo = createServerFn({ method: 'POST' })
	.validator(
		z.object({
			id: z.string().min(1),
			number: z.string().min(1).optional(),
			businessId: z.string().min(1).optional(),
			companyId: z.string().min(1).optional(),
			to: z.string().min(1).optional(),
			from: z.string().min(1).optional(),
			date: z.string().min(1).optional(),
			subject: z.string().min(1).optional(),
			body: z.string().min(1).optional(),
		}),
	)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const { id, ...updates } = data;

		const updateData: any = { ...updates, updatedAt: new Date() };
		if (updates.date) {
			updateData.date = new Date(updates.date);
		}

		await db.update(memos).set(updateData).where(eq(memos.id, id));

		return { success: true };
	});

export const deleteMemo = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		await db.delete(memos).where(eq(memos.id, data.id));

		return { success: true };
	});
