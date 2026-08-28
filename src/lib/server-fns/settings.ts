import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { banks, businesses, companies } from '#/db/schema';
import { diffObjects, withActivity } from '#/lib/activity';
import { CURRENCIES } from '#/lib/currencies';

const currencyEnumValues = CURRENCIES;

const logoSchema = z
	.string()
	.optional()
	.nullable()
	.refine((v) => !v || v.startsWith('data:') || v.startsWith('http'), {
		message: 'Logo must be URL or data URI',
	});

const createBusinessSchema = z.object({
	name: z.string().min(1),
	prefix: z.string().min(1).max(10),
	logo: logoSchema,
});

export const createBusiness = createServerFn({ method: 'POST' })
	.validator(createBusinessSchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				const orgId = process.env.ORGANIZATION_ID!;

				const existing = await db
					.select({ id: businesses.id })
					.from(businesses)
					.where(
						and(
							eq(businesses.organizationId, orgId),
							eq(businesses.prefix, data.prefix),
						),
					)
					.limit(1);

				if (existing[0]) {
					throw new Error('Prefix already exists');
				}

				const businessId = (
					await db
						.insert(businesses)
						.values({
							organizationId: orgId,
							name: data.name,
							prefix: data.prefix.toUpperCase(),
							logo: data.logo,
						})
						.returning({ id: businesses.id })
				)[0].id;

				return { businessId };
			},
			{
				entity: 'Business',
				getLabel: (_args, result) => result.businessId,
				getDetail: () => 'Created business',
			},
		),
	);

const updateBusinessSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).optional(),
	prefix: z.string().min(1).max(10).optional(),
	logo: logoSchema,
});

export const updateBusiness = createServerFn({ method: 'POST' })
	.validator(updateBusinessSchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				const { id, ...updates } = data;

				if (updates.prefix) {
					updates.prefix = updates.prefix.toUpperCase();
				}

				const [old] = await db
					.select()
					.from(businesses)
					.where(eq(businesses.id, id))
					.limit(1);
				await db
					.update(businesses)
					.set({
						...updates,
						updatedAt: new Date(),
					})
					.where(eq(businesses.id, id));

				return { success: true, id, old };
			},
			{
				entity: 'Business',
				getLabel: (args) => args.id,
				getDetail: (args, result) => {
					const changes = diffObjects(result.old || {}, args);
					return changes.length > 0
						? `Updated business: ${changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join('; ')}`
						: 'Updated business';
				},
			},
		),
	);

export const deleteBusiness = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				await db.delete(businesses).where(eq(businesses.id, data.id));

				return { success: true };
			},
			{
				entity: 'Business',
				getLabel: (args) => args.id,
				getDetail: () => 'Deleted business',
			},
		),
	);

const createCompanySchema = z.object({
	region: z.string().min(1),
	name: z.string().min(1),
	reg: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	tin: z.string().optional().nullable(),
	defaultCurrency: z.enum(currencyEnumValues),
});

export const createCompany = createServerFn({ method: 'POST' })
	.validator(createCompanySchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				const orgId = process.env.ORGANIZATION_ID!;

				const companyId = (
					await db
						.insert(companies)
						.values({
							organizationId: orgId,
							region: data.region,
							name: data.name,
							reg: data.reg,
							address: data.address,
							email: data.email,
							phone: data.phone,
							tin: data.tin,
							defaultCurrency: data.defaultCurrency,
						})
						.returning({ id: companies.id })
				)[0].id;

				return { companyId };
			},
			{
				entity: 'Company',
				getLabel: (_args, result) => result.companyId,
				getDetail: () => 'Created company',
			},
		),
	);

const updateCompanySchema = z.object({
	id: z.string().min(1),
	region: z.string().min(1).optional(),
	name: z.string().min(1).optional(),
	reg: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	tin: z.string().optional().nullable(),
	defaultCurrency: z.enum(currencyEnumValues).optional(),
});

export const updateCompany = createServerFn({ method: 'POST' })
	.validator(updateCompanySchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				const { id, ...updates } = data;

				const [old] = await db
					.select()
					.from(companies)
					.where(eq(companies.id, id))
					.limit(1);
				await db
					.update(companies)
					.set({
						...updates,
						updatedAt: new Date(),
					})
					.where(eq(companies.id, id));

				return { success: true, id, old };
			},
			{
				entity: 'Company',
				getLabel: (args) => args.id,
				getDetail: (args, result) => {
					const changes = diffObjects(result.old || {}, args);
					return changes.length > 0
						? `Updated company: ${changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join('; ')}`
						: 'Updated company';
				},
			},
		),
	);

export const deleteCompany = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) {
					throw new Error('Unauthorized');
				}

				await db.delete(companies).where(eq(companies.id, data.id));

				return { success: true };
			},
			{
				entity: 'Company',
				getLabel: (args) => args.id,
				getDetail: () => 'Deleted company',
			},
		),
	);

const createBankSchema = z.object({
	label: z.string().min(1),
	currency: z.enum(currencyEnumValues),
	fields: z.array(z.tuple([z.string(), z.string()])),
});

const updateBankSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1).optional(),
	currency: z.enum(currencyEnumValues).optional(),
	fields: z.array(z.tuple([z.string(), z.string()])).optional(),
});

export const createBank = createServerFn({ method: 'POST' })
	.validator(createBankSchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) throw new Error('Unauthorized');
				const orgId = process.env.ORGANIZATION_ID!;
				const bankId = (
					await db
						.insert(banks)
						.values({
							organizationId: orgId,
							label: data.label,
							currency: data.currency as any,
							fields: data.fields,
						})
						.returning({ id: banks.id })
				)[0].id;
				return { bankId };
			},
			{
				entity: 'Bank',
				getLabel: (_args, result) => result.bankId,
				getDetail: () => 'Created bank account',
			},
		),
	);

export const updateBank = createServerFn({ method: 'POST' })
	.validator(updateBankSchema)
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) throw new Error('Unauthorized');
				const { id, ...updates } = data;

				const [old] = await db
					.select()
					.from(banks)
					.where(eq(banks.id, id))
					.limit(1);
				await db
					.update(banks)
					.set({ ...updates, updatedAt: new Date() } as any)
					.where(eq(banks.id, id));

				return { success: true, id, old };
			},
			{
				entity: 'Bank',
				getLabel: (args) => args.id,
				getDetail: (args, result) => {
					const changes = diffObjects(result.old || {}, args);
					return changes.length > 0
						? `Updated bank: ${changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join('; ')}`
						: 'Updated bank';
				},
			},
		),
	);

export const deleteBank = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(
		withActivity(
			async ({ data, context }) => {
				const ctx = context as unknown as {
					session: { user: { id: string } } | null;
				};
				if (!ctx.session) throw new Error('Unauthorized');
				await db.delete(banks).where(eq(banks.id, data.id));
				return { success: true };
			},
			{
				entity: 'Bank',
				getLabel: (args) => args.id,
				getDetail: () => 'Deleted bank account',
			},
		),
	);
