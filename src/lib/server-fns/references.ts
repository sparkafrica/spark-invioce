import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { activityLog, banks, businesses, clients, companies, settings } from '#/db/schema';

export const getBusinesses = createServerFn({ method: 'GET' })
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
				id: businesses.id,
				name: businesses.name,
				prefix: businesses.prefix,
				logo: businesses.logo,
			})
			.from(businesses);

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
			.from(companies);

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
			.from(clients);

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
		const whereConditions: ReturnType<typeof eq>[] = [];
		if (data.currency) {
			whereConditions.push(eq(banks.currency, data.currency as never));
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
				whereConditions.length > 0 ? and(...whereConditions) : undefined,
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
		const [result] = await db
			.select({ value: settings.value })
			.from(settings)
			.where(eq(settings.key, 'fx-rates'))
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
		const value = {
			mode: data.mode,
			rates: data.rates,
			lastFetched: data.mode === 'api' ? new Date().toISOString() : null,
		};
		await db
			.insert(settings)
			.values({ key: 'fx-rates', value })
			.onConflictDoUpdate({
				target: [settings.key],
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

		const conditions: ReturnType<typeof sql>[] = [];

		if (data.from) {
			conditions.push(gte(activityLog.createdAt, new Date(data.from)) as unknown as ReturnType<typeof sql>);
		}
		if (data.to) {
			const toDate = new Date(data.to);
			toDate.setHours(23, 59, 59, 999);
			conditions.push(lte(activityLog.createdAt, toDate) as unknown as ReturnType<typeof sql>);
		}
		if (data.query) {
			conditions.push(
				sql`(${activityLog.userName} ILIKE ${'%' + data.query + '%'} OR ${activityLog.label} ILIKE ${'%' + data.query + '%'} OR ${activityLog.detail} ILIKE ${'%' + data.query + '%'})`,
			);
		}

		const whereClause =
			conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined;

		const [activities, totalResult] = await Promise.all([
			db
				.select({
					id: activityLog.id,
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
