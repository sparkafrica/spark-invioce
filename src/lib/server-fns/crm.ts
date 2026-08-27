import { createId } from '@paralleldrive/cuid2';
import { createServerFn } from '@tanstack/react-start';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { clients, products } from '#/db/schema';

// ============================================
// CLIENTS SERVER FUNCTIONS
// ============================================

const clientSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	reg: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	contact: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
});

export const createClient = createServerFn({ method: 'POST' })
	.validator(clientSchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const orgId = process.env.ORGANIZATION_ID!;

		const clientId = (
			await db
				.insert(clients)
				.values({
					id: createId(),
					organizationId: orgId,
					name: data.name,
					reg: data.reg,
					address: data.address,
					email: data.email,
					contact: data.contact,
					notes: data.notes,
				})
				.returning({ id: clients.id })
		)[0].id;

		return { clientId };
	});

export const updateClient = createServerFn({ method: 'POST' })
	.validator(clientSchema.extend({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const { id, ...updates } = data;

		await db
			.update(clients)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(clients.id, id));

		return { success: true };
	});

export const deleteClient = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		await db.delete(clients).where(eq(clients.id, data.id));

		return { success: true };
	});

// ============================================
// PRODUCTS SERVER FUNCTIONS
// ============================================

const productSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional().nullable(),
	cost: z.string().regex(/^\d+(\.\d+)?$/, 'Cost must be a number'),
	currency: z.string().min(1, 'Currency is required'),
});

export const createProduct = createServerFn({ method: 'POST' })
	.validator(productSchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const orgId = process.env.ORGANIZATION_ID!;

		const productId = (
			await db
				.insert(products)
				.values({
					id: createId(),
					organizationId: orgId,
					name: data.name,
					description: data.description,
					cost: data.cost,
					currency: data.currency as any,
				})
				.returning({ id: products.id })
		)[0].id;

		return { productId };
	});

export const updateProduct = createServerFn({ method: 'POST' })
	.validator(productSchema.extend({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const { id, ...updates } = data;

		await db
			.update(products)
			.set({
				...updates,
				cost: updates.cost ?? undefined,
				currency: updates.currency as any,
				updatedAt: new Date(),
			})
			.where(eq(products.id, id));

		return { success: true };
	});

export const deleteProduct = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		await db.delete(products).where(eq(products.id, data.id));

		return { success: true };
	});

export const getProducts = createServerFn({ method: 'GET' })
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
				id: products.id,
				name: products.name,
				description: products.description,
				cost: products.cost,
				currency: products.currency,
			})
			.from(products)
			.where(eq(products.organizationId, process.env.ORGANIZATION_ID!))
			.orderBy(desc(products.createdAt));

		return { products: results };
	});
