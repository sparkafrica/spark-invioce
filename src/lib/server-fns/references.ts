import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import {
	activityLog,
	banks,
	businesses,
	clients,
	companies,
	settings,
} from '#/db/schema';
import { auth } from '#/lib/auth';

export const getBusinesses = createServerFn({ method: 'GET' })
	.validator(z.object({}))
	.handler(async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		const results = await db
			.select({
				id: businesses.id,
				name: businesses.name,
				prefix: businesses.prefix,
				logo: businesses.logo,
			})
			.from(businesses)
			.where(eq(businesses.organizationId, orgId));

		return { businesses: results };
	});

export const getCompanies = createServerFn({ method: 'GET' })
	.validator(z.object({}))
	.handler(async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		const results = await db
			.select({
				id: companies.id,
				name: companies.name,
				reg: companies.reg,
				address: companies.address,
				email: companies.email,
				phone: companies.phone,
				tin: companies.tin,
				defaultCurrency: companies.defaultCurrency,
			})
			.from(companies)
			.where(eq(companies.organizationId, orgId));

		return { companies: results };
	});

export const getClients = createServerFn({ method: 'GET' })
	.validator(z.object({}))
	.handler(async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		const results = await db
			.select({
				id: clients.id,
				name: clients.name,
				reg: clients.reg,
				address: clients.address,
				email: clients.email,
				contact: clients.contact,
				notes: clients.notes,
			})
			.from(clients)
			.where(eq(clients.organizationId, orgId));

		return { clients: results };
	});

export const getBanks = createServerFn({ method: 'GET' })
	.validator(z.object({ currency: z.string().optional() }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		const whereConditions = [eq(banks.organizationId, orgId)];
		if (data.currency) {
			whereConditions.push(eq(banks.currency, data.currency as any));
		}
		const results = await db
			.select({
				id: banks.id,
				label: banks.label,
				currency: banks.currency,
				fields: banks.fields,
			})
			.from(banks)
			.where(
				whereConditions.length > 1
					? and(...whereConditions)
					: whereConditions[0],
			);

		return { banks: results };
	});

export const getFXRates = createServerFn({ method: 'GET' })
	.validator(z.object({}))
	.handler(async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		const [result] = await db
			.select({ value: settings.value })
			.from(settings)
			.where(
				and(eq(settings.organizationId, orgId), eq(settings.key, 'fx-rates')),
			)
			.limit(1);

		const defaultRates = {
			mode: 'manual' as const,
			rates: {
				USD: 1,
				NGN: 1530,
				GBP: 0.74,
				EUR: 0.86,
				KES: 129.45,
				GHS: 12.4,
				ZAR: 18.1,
			},
			lastFetched: null,
		};

		return { fxRates: result?.value || defaultRates };
	});

export const updateFXRates = createServerFn({ method: 'POST' })
	.validator(
		z.object({
			mode: z.enum(['manual', 'api']),
			rates: z.record(z.string(), z.number()),
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
		const value = {
			mode: data.mode,
			rates: data.rates,
			lastFetched: data.mode === 'api' ? new Date().toISOString() : null,
		};
		await db
			.insert(settings)
			.values({ organizationId: orgId, key: 'fx-rates', value })
			.onConflictDoUpdate({
				target: [settings.organizationId, settings.key],
				set: { value, updatedAt: new Date() },
			});
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

export const getActivityLog = createServerFn({ method: 'GET' })
	.validator(
		z.object({
			from: z.string().optional(),
			to: z.string().optional(),
			query: z.string().optional(),
			page: z.number().default(1),
			pageSize: z.number().default(25),
		}),
	)
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const page = data.page || 1;
		const pageSize = data.pageSize || 25;
		const offset = (page - 1) * pageSize;

		const orgId = process.env.ORGANIZATION_ID!;
		const conditions = [eq(activityLog.organizationId, orgId)];

		if (data.from) {
			conditions.push(gte(activityLog.createdAt, new Date(data.from)));
		}
		if (data.to) {
			const toDate = new Date(data.to);
			toDate.setHours(23, 59, 59, 999);
			conditions.push(lte(activityLog.createdAt, toDate));
		}
		if (data.query) {
			conditions.push(
				sql`(${activityLog.userName} ILIKE ${'%' + data.query + '%'} OR ${activityLog.label} ILIKE ${'%' + data.query + '%'} OR ${activityLog.detail} ILIKE ${'%' + data.query + '%'})`,
			);
		}

		const whereClause =
			conditions.length > 1 ? and(...conditions) : conditions[0];

		const [activities, totalResult] = await Promise.all([
			db
				.select({
					id: activityLog.id,
					organizationId: activityLog.organizationId,
					userId: activityLog.userId,
					userName: activityLog.userName,
					type: activityLog.type,
					entity: activityLog.entity,
					label: activityLog.label,
					detail: activityLog.detail,
					metadata: activityLog.metadata,
					createdAt: activityLog.createdAt,
				})
				.from(activityLog)
				.where(whereClause)
				.orderBy(desc(activityLog.createdAt))
				.limit(pageSize)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)` })
				.from(activityLog)
				.where(whereClause),
		]);

		return {
			activities: activities.map((a) => ({
				...a,
				metadata: a.metadata ? JSON.parse(JSON.stringify(a.metadata)) : null,
				createdAt: a.createdAt.toISOString(),
			})),
			total: Number(totalResult[0]?.count || 0),
		};
	});

export const getOrgMembers = createServerFn({ method: 'GET' }).handler(
	async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}

		const headers = getRequestHeaders();
		const orgId = process.env.ORGANIZATION_ID!;
		const membersList = await auth.api.listMembers({
			headers,
			query: { organizationId: orgId },
		});
		return { organizationId: orgId, ...membersList };
	},
);

export const getOrganization = createServerFn({ method: 'GET' }).handler(
	async ({ context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		const [org] = await db
			.select({ id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo })
			.from(organization)
			.where(eq(organization.id, orgId))
			.limit(1);
		return { organization: org ?? null, organizationId: orgId };
	},
);

export const updateOrganization = createServerFn({ method: 'POST' })
	.validator(z.object({ name: z.string().min(1), slug: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const ctx = context as unknown as {
			session: { user: { id: string } } | null;
		};
		if (!ctx.session) {
			throw new Error('Unauthorized');
		}
		const orgId = process.env.ORGANIZATION_ID!;
		await db.update(organization).set({ name: data.name, slug: data.slug }).where(eq(organization.id, orgId));
		return { success: true };
	});
