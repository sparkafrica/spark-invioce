import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#/db';
import { banks, businesses, clients, companies } from '#/db/schema';

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
			.from(businesses)
			.where(eq(businesses.organizationId, 'default-org'));

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
				logo: companies.logo,
			})
			.from(companies)
			.where(eq(companies.organizationId, 'default-org'));

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
			.from(clients)
			.where(eq(clients.organizationId, 'default-org'));

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

		const whereConditions = [eq(banks.organizationId, 'default-org')];
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
					? eq(banks.organizationId, 'default-org')
					: eq(banks.organizationId, 'default-org'),
			);

		return { banks: results };
	});
