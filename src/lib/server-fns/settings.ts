import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { businesses, companies } from '#/db/schema';

const currencyEnumValues = [
	'NGN',
	'USD',
	'GBP',
	'EUR',
	'KES',
	'GHS',
	'ZAR',
	'EGP',
	'RWF',
	'TZS',
	'UGX',
	'XOF',
	'XAF',
	'MAD',
	'ETB',
	'ZMW',
	'BWP',
	'MUR',
	'CAD',
	'AUD',
	'NZD',
	'CHF',
	'SEK',
	'NOK',
	'DKK',
	'PLN',
	'CZK',
	'TRY',
	'AED',
	'SAR',
	'QAR',
	'ILS',
	'INR',
	'PKR',
	'BDT',
	'LKR',
	'CNY',
	'JPY',
	'KRW',
	'HKD',
	'SGD',
	'MYR',
	'THB',
	'IDR',
	'PHP',
	'VND',
	'BRL',
	'MXN',
	'ARS',
	'CLP',
	'COP',
	'PEN',
	'RUB',
	'UAH',
	'RON',
	'HUF',
	'ISK',
	'JOD',
	'KWD',
	'BHD',
	'OMR',
	'TND',
	'DZD',
	'MZN',
] as const;

const createBusinessSchema = z.object({
	name: z.string().min(1),
	prefix: z.string().min(1).max(10),
	logo: z.string().url().optional().nullable(),
});

export const createBusiness = createServerFn({ method: 'POST' })
	.validator(createBusinessSchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		// Get user's organization from Better Auth session
		// Note: In production, you'd get orgId from Better Auth's active organization
		const orgId = 'default-org';

		// Check prefix uniqueness within org
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
	});

const updateBusinessSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).optional(),
	prefix: z.string().min(1).max(10).optional(),
	logo: z.string().url().optional().nullable(),
});

export const updateBusiness = createServerFn({ method: 'POST' })
	.validator(updateBusinessSchema)
	.handler(async ({ data, context }) => {
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

		await db
			.update(businesses)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(businesses.id, id));

		return { success: true };
	});

export const deleteBusiness = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		await db.delete(businesses).where(eq(businesses.id, data.id));

		return { success: true };
	});

const createCompanySchema = z.object({
	region: z.string().min(1),
	name: z.string().min(1),
	reg: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	tin: z.string().optional().nullable(),
	defaultCurrency: z.enum(currencyEnumValues),
	logo: z.string().url().optional().nullable(),
});

export const createCompany = createServerFn({ method: 'POST' })
	.validator(createCompanySchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const orgId = 'default-org';

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
					logo: data.logo,
				})
				.returning({ id: companies.id })
		)[0].id;

		return { companyId };
	});

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
	logo: z.string().url().optional().nullable(),
});

export const updateCompany = createServerFn({ method: 'POST' })
	.validator(updateCompanySchema)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const { id, ...updates } = data;

		await db
			.update(companies)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(companies.id, id));

		return { success: true };
	});

export const deleteCompany = createServerFn({ method: 'POST' })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		await db.delete(companies).where(eq(companies.id, data.id));

		return { success: true };
	});
