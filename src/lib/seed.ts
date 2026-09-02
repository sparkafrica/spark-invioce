import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '#/db';
import {
	account,
	activityLog,
	banks,
	businesses,
	clients,
	companies,
	invoiceItems,
	invoices,
	invoiceTranches,
	member,
	memos,
	organization,
	payments,
	products,
	session as sessionTable,
	settings,
	user as userTable,
} from '#/db/schema';
import { auth } from '#/lib/auth';

// Remove unused currencyEnumValues - we'll use inline const assertions instead

function readLogoBase64(filename: string): string | null {
	try {
		const filepath = join(process.cwd(), 'seed', 'assets', filename);
		const buffer = readFileSync(filepath);
		return `data:image/png;base64,${buffer.toString('base64')}`;
	} catch {
		return null;
	}
}

export async function seedDb(): Promise<{ organizationId: string }> {
	console.log('Starting template-aligned seed...');

	// 1. Create/find organization
	let [org] = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, 'spark-invoice-system'))
		.limit(1);
	if (!org) {
		const [newOrg] = await db
			.insert(organization)
			.values({
				id: createId(),
				name: 'Spark Invoice System',
				slug: 'spark-invoice-system',
				createdAt: new Date(),
			})
			.returning();
		org = newOrg;
		console.log('Created organization:', org.id);
	} else {
		console.log('Organization already exists:', org.id);
	}

	// 2. Seed users with Better Auth
	const demoUsers: Array<{
		name: string;
		email: string;
		password: string;
		role: 'owner' | 'admin' | 'member';
		status?: 'Active' | 'Invited';
	}> = [
		{
			name: 'Nnaemeka Clinton',
			email: 'clinton@sparkafrica.co',
			password: 'spark',
			role: 'owner',
			status: 'Active',
		},
		{
			name: 'Ada Okonkwo',
			email: 'ada@sparkafrica.co',
			password: 'spark',
			role: 'member',
			status: 'Active',
		},
		{
			name: 'Tolu Bakare',
			email: 'tolu@sparkafrica.co',
			password: 'spark',
			role: 'member',
			status: 'Invited',
		},
	];

	for (const u of demoUsers) {
		let dbUser: any;
		const [existing] = await db
			.select()
			.from(userTable)
			.where(eq(userTable.email, u.email))
			.limit(1);
		if (!existing) {
			try {
				const res = await auth.api.signUpEmail({
					body: { name: u.name, email: u.email, password: u.password },
				});
				dbUser = res.user;
				console.log(`Created user ${u.email} via Better Auth:`, dbUser.id);
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : String(e);
				if (msg.includes('already exists') || msg.includes('exists')) {
					const [retry] = await db
						.select()
						.from(userTable)
						.where(eq(userTable.email, u.email))
						.limit(1);
					dbUser = retry;
					console.log(
						`User ${u.email} already existed (race), using existing:`,
						dbUser?.id,
					);
				} else throw e;
			}
		} else {
			dbUser = existing;
			console.log(`User ${u.email} already exists:`, dbUser.id);
			// Ensure password is 'spark'
			try {
				await auth.api.signInEmail({
					body: { email: u.email, password: u.password },
					headers: new Headers(),
					asResponse: false,
				});
				console.log(`Password for ${u.email} verified as '${u.password}'`);
			} catch {
				console.log(`Password for ${u.email} not '${u.password}', resetting…`);
				await db.delete(sessionTable).where(eq(sessionTable.userId, dbUser.id));
				await db.delete(account).where(eq(account.userId, dbUser.id));
				await db.delete(member).where(eq(member.userId, dbUser.id));
				await db.delete(userTable).where(eq(userTable.id, dbUser.id));
				const res = await auth.api.signUpEmail({
					body: { name: u.name, email: u.email, password: u.password },
				});
				dbUser = res.user;
				console.log(
					`Recreated ${u.email} with password '${u.password}':`,
					dbUser.id,
				);
			}
		}
		if (!dbUser) continue;
		await db
			.update(userTable)
			.set({ emailVerified: true })
			.where(eq(userTable.id, dbUser.id));
		const [existingMember] = await db
			.select()
			.from(member)
			.where(
				and(eq(member.organizationId, org.id), eq(member.userId, dbUser.id)),
			)
			.limit(1);
		if (!existingMember) {
			await db.insert(member).values({
				id: createId(),
				createdAt: new Date(),
				organizationId: org.id,
				userId: dbUser.id,
				role: u.role,
			});
			console.log(`Made ${u.email} member as ${u.role}`);
		} else if (existingMember.role !== u.role) {
			await db
				.update(member)
				.set({ role: u.role })
				.where(
					and(eq(member.organizationId, org.id), eq(member.userId, dbUser.id)),
				);
			console.log(`Updated ${u.email} role to ${u.role}`);
		}
	}

	// 3. Seed businesses with base64 logos
	const sparkLogo = readLogoBase64('spark-logo.png');
	const asfLogo = readLogoBase64('asf-logo-web.png');

	const businessData = [
		{ name: 'New Business', prefix: 'SPK', logo: sparkLogo },
		{ name: 'Africa Startup Festival', prefix: 'ASF', logo: asfLogo },
		{ name: 'Africa Technology Expo', prefix: 'ATE', logo: null },
	];

	const existingBusinesses = await db
		.select()
		.from(businesses)
		.where(eq(businesses.organizationId, org.id));
	if (existingBusinesses.length === 0) {
		const result = await db
			.insert(businesses)
			.values(businessData.map((b) => ({ ...b, organizationId: org.id })))
			.returning();
		console.log(`Created ${result.length} businesses`);
	} else {
		console.log(`Businesses already exist: ${existingBusinesses.length}`);
	}

	// 4. Seed companies (2 per template: Nigeria, UK)
	const companiesData = [
		{
			region: 'Nigeria',
			name: 'The Spark Africa Technologies Limited',
			reg: 'RC No. 1959660',
			address:
				'39, Ibrahim Jalo Waziri Street, Apo Legislative Quarters, Zone E, Abuja, FCT, Nigeria',
			email: 'info@sparkafrica.co',
			phone: '',
			tin: '31067651-0001',
			defaultCurrency: 'NGN' as const,
		},
		{
			region: 'United Kingdom',
			name: 'Spark',
			reg: '',
			address:
				'167-169 Great Portland Street, Westminster, W1W 5PF, United Kingdom',
			email: 'info@africastartupfestival.com',
			phone: '',
			tin: '',
			defaultCurrency: 'GBP' as const,
		},
	];

	const existingCompanies = await db
		.select()
		.from(companies)
		.where(eq(companies.organizationId, org.id));
	if (existingCompanies.length === 0) {
		const result = await db
			.insert(companies)
			.values(companiesData.map((c) => ({ ...c, organizationId: org.id })))
			.returning();
		console.log(`Created ${result.length} companies`);
	} else {
		console.log(`Companies already exist: ${existingCompanies.length}`);
	}

	// 5. Seed banks (3 per template: Zenith NGN, Wise GBP, Wise USD)
	const wiseFields: [string, string][] = [
		['Bank', 'Wise'],
		['Account name', 'Spark Africa Limited'],
		['Account no.', '82341044'],
		['Sort code', '23-08-01'],
		['IBAN', 'GB43 TRWI 2308 0182 3410 44'],
		['SWIFT/BIC', 'TRWIGB2LXXX'],
		[
			'Bank address',
			'Wise Payments Limited, 1st Floor, Worship Square, 65 Clifton Street, London, EC2A 4JE, UK',
		],
	];

	const banksData = [
		{
			currency: 'NGN' as const,
			label: 'Zenith Bank — NGN',
			fields: [
				['Bank', 'Zenith Bank'],
				['Account name', 'The Spark Africa Technologies Ltd'],
				['Account no.', '1225075419'],
				['TIN', '31067651-0001'],
			] as [string, string][],
		},
		{
			currency: 'GBP' as const,
			label: 'Wise — GBP (UK)',
			fields: wiseFields,
		},
		{
			currency: 'USD' as const,
			label: 'Wise — USD',
			fields: wiseFields,
		},
	];

	const existingBanks = await db
		.select()
		.from(banks)
		.where(eq(banks.organizationId, org.id));
	if (existingBanks.length === 0) {
		const result = await db
			.insert(banks)
			.values(banksData.map((b) => ({ ...b, organizationId: org.id })))
			.returning();
		console.log(`Created ${result.length} banks`);
	} else {
		console.log(`Banks already exist: ${existingBanks.length}`);
	}

	// 6. Seed products (6 from template)
	const productsData = [
		{
			name: 'Startup Stall',
			description: 'Exhibition stall, standard footprint',
			cost: '3000.00',
			currency: 'USD' as const,
		},
		{
			name: 'Exhibition Booth — Premium',
			description: 'Branded booth, 6sqm, two passes',
			cost: '7500.00',
			currency: 'USD' as const,
		},
		{
			name: 'Headline Sponsorship',
			description: 'Category-exclusive headline package',
			cost: '45000.00',
			currency: 'USD' as const,
		},
		{
			name: 'Roundtable delivery',
			description: 'Invite-only roundtable, venue, production, livestream',
			cost: '25500000.00',
			currency: 'NGN' as const,
		},
		{
			name: 'Speaking slot',
			description: 'Moderated panel seat with recording',
			cost: '5000.00',
			currency: 'USD' as const,
		},
		{
			name: 'ASF Kenya Exhibition Booth',
			description: 'Exhibition booth, ASF Kenya 2026',
			cost: '3001.50',
			currency: 'USD' as const,
		},
	];

	const existingProducts = await db
		.select()
		.from(products)
		.where(eq(products.organizationId, org.id));
	if (existingProducts.length === 0) {
		const result = await db
			.insert(products)
			.values(productsData.map((p) => ({ ...p, organizationId: org.id })))
			.returning();
		console.log(`Created ${result.length} products`);
	} else {
		console.log(`Products already exist: ${existingProducts.length}`);
	}

	// 7. Seed clients (9 from template: B4B Partners + 8 ASF Kenya clients)
	const clientsData = [
		{
			name: 'B4B Partners Limited',
			reg: 'RC 7347187',
			address: 'Road 13, Ikota Villa Estate, Ajah, Eti-Osa, Lagos, Nigeria',
			email: 'napa@b4b.partners',
			contact: 'Chinapa Onwusah',
			notes:
				'Managing Partner. Holds the client contract; Spark delivers alongside.',
		},
		{
			name: 'Nyamgondho Marine Works',
			reg: '',
			address: '',
			email: '',
			contact: '',
			notes: 'Exhibitor, ASF Kenya 2026.',
		},
		{
			name: 'Linguama',
			reg: '',
			address: '',
			email: 'support@naijateach.com',
			contact: '',
			notes: 'Startup Stall, ASF Kenya 2026.',
		},
		{
			name: 'Melian Dialogue Limited',
			reg: '',
			address: '',
			email: 'jim.coke@meliandialogue.com',
			contact: 'Jim Coke',
			notes:
				'Exhibition booth, ASF Kenya 2026. Booking held on 50% deposit terms.',
		},
		{
			name: 'Provecta Group',
			reg: '',
			address: '',
			email: 'hassan.qaseem@gc-usa.com',
			contact: 'Hassan Qaseem',
			notes: 'Exhibition booth, ASF Kenya 2026.',
		},
		{
			name: 'Exoduxz',
			reg: '',
			address: '',
			email: 'nubiandivine@protonmail.com',
			contact: '',
			notes:
				'Exhibition booth enquiry, ASF Kenya 2026. Invoice voided 3 August 2026.',
		},
		{
			name: 'Generous Circle Ltd',
			reg: '',
			address: '',
			email: 'finance@vettedai.app',
			contact: '',
			notes:
				'Startup Stall, ASF Kenya 2026. Invoiced with international transfer fees.',
		},
		{
			name: 'Alfajiri',
			reg: '',
			address: '',
			email: '',
			contact: '',
			notes:
				'Startup Stall, ASF Kenya 2026. Invoiced in Kenyan shillings, paying by payment link.',
		},
		{
			name: 'Itana',
			reg: '',
			address: '',
			email: '',
			contact: '',
			notes:
				'Partner — ten Startup Stalls at ASF Kenya 2026 on the PARTNER rate.',
		},
	];

	const existingClients = await db
		.select()
		.from(clients)
		.where(eq(clients.organizationId, org.id));
	if (existingClients.length === 0) {
		const result = await db
			.insert(clients)
			.values(clientsData.map((c) => ({ ...c, organizationId: org.id })))
			.returning();
		console.log(`Created ${result.length} clients`);
	} else {
		console.log(`Clients already exist: ${existingClients.length}`);
	}

	// 8. Seed invoices (9+ from template)
	// First get IDs for foreign keys
	const [bzNew] = await db
		.select({ id: businesses.id })
		.from(businesses)
		.where(
			and(
				eq(businesses.organizationId, org.id),
				eq(businesses.name, 'New Business'),
			),
		)
		.limit(1);
	const [bzAsf] = await db
		.select({ id: businesses.id })
		.from(businesses)
		.where(
			and(
				eq(businesses.organizationId, org.id),
				eq(businesses.name, 'Africa Startup Festival'),
			),
		)
		.limit(1);
	const [coNg] = await db
		.select({ id: companies.id })
		.from(companies)
		.where(
			and(
				eq(companies.organizationId, org.id),
				eq(companies.region, 'Nigeria'),
			),
		)
		.limit(1);
	const [coUk] = await db
		.select({ id: companies.id })
		.from(companies)
		.where(
			and(
				eq(companies.organizationId, org.id),
				eq(companies.region, 'United Kingdom'),
			),
		)
		.limit(1);
	const [bkNg] = await db
		.select({ id: banks.id })
		.from(banks)
		.where(and(eq(banks.organizationId, org.id), eq(banks.currency, 'NGN')))
		.limit(1);
	const [bkGbp] = await db
		.select({ id: banks.id })
		.from(banks)
		.where(and(eq(banks.organizationId, org.id), eq(banks.currency, 'GBP')))
		.limit(1);
	const [bkUsd] = await db
		.select({ id: banks.id })
		.from(banks)
		.where(and(eq(banks.organizationId, org.id), eq(banks.currency, 'USD')))
		.limit(1);
	const [cl1] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(
				eq(clients.organizationId, org.id),
				eq(clients.name, 'B4B Partners Limited'),
			),
		)
		.limit(1);
	const [cl2] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(
				eq(clients.organizationId, org.id),
				eq(clients.name, 'Nyamgondho Marine Works'),
			),
		)
		.limit(1);
	const [cl3] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(eq(clients.organizationId, org.id), eq(clients.name, 'Linguama')),
		)
		.limit(1);
	const [cl4] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(
				eq(clients.organizationId, org.id),
				eq(clients.name, 'Melian Dialogue Limited'),
			),
		)
		.limit(1);
	const [cl5] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(
				eq(clients.organizationId, org.id),
				eq(clients.name, 'Provecta Group'),
			),
		)
		.limit(1);
	const [cl6] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.organizationId, org.id), eq(clients.name, 'Exoduxz')))
		.limit(1);
	const [cl7] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(
				eq(clients.organizationId, org.id),
				eq(clients.name, 'Generous Circle Ltd'),
			),
		)
		.limit(1);
	const [cl8] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(
			and(eq(clients.organizationId, org.id), eq(clients.name, 'Alfajiri')),
		)
		.limit(1);
	const [cl9] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.organizationId, org.id), eq(clients.name, 'Itana')))
		.limit(1);

	if (
		!bzNew ||
		!bzAsf ||
		!coNg ||
		!coUk ||
		!bkNg ||
		!bkGbp ||
		!bkUsd ||
		!cl1 ||
		!cl2 ||
		!cl3 ||
		!cl4 ||
		!cl5 ||
		!cl6 ||
		!cl7 ||
		!cl8 ||
		!cl9
	) {
		console.log('Missing required foreign keys, skipping invoices');
	} else {
		const existingInvoices = await db
			.select()
			.from(invoices)
			.where(eq(invoices.organizationId, org.id));
		if (existingInvoices.length === 0) {
			// Invoice 1: SPK-2026-0812 (tranche, NGN)
			const inv1Result = await db
				.insert(invoices)
				.values({
					organizationId: org.id,
					number: 'SPK-2026-0812',
					businessId: bzNew.id,
					companyId: coNg.id,
					clientId: cl1.id,
					issueDate: new Date('2026-08-12'),
					dueDate: new Date('2026-09-27'),
					currency: 'NGN',
					taxName: 'VAT',
					taxRate: '7.50',
					description:
						'Statement of Work between B4B Partners Limited and The Spark Africa Technologies Limited, dated 4 August 2026, data localisation roundtable, Lagos, August 2026.',
					memo: 'Withholding tax of 5% applies per clause 5.5 of the Statement of Work; please remit the WHT credit note with payment.',
					bankId: bkNg.id,
					paymentType: 'tranche',
					paymentMethod: 'bank',
					payLink: '',
					payLinkLabel: 'Pay online',
					status: 'sent',
				})
				.returning({ id: invoices.id });
			const inv1Id = inv1Result[0].id;
			await db.insert(invoiceItems).values({
				id: createId(),
				invoiceId: inv1Id,
				name: 'Roundtable delivery',
				description:
					'Data localisation roundtable, Lagos — venue, production, livestream, leads',
				qty: '1',
				cost: '25500000.00',
				discountName: '',
				discountPct: '0',
				discountAmt: '0',
				sortOrder: 0,
			});
			await db.insert(invoiceTranches).values([
				{
					id: createId(),
					invoiceId: inv1Id,
					name: 'M1 — Mobilisation',
					deliverables:
						'SOW signature and PO confirmation received from client',
					dueDate: new Date('2026-08-12'),
					amount: '7200000.00',
					paid: true,
					paidAt: new Date('2026-08-12'),
					sortOrder: 0,
				},
				{
					id: createId(),
					invoiceId: inv1Id,
					name: 'M2 — Readiness',
					deliverables:
						'D5: Rehearsal sign-off, following successful livestream test',
					dueDate: new Date('2026-08-21'),
					amount: '7200000.00',
					paid: false,
					sortOrder: 1,
				},
				{
					id: createId(),
					invoiceId: inv1Id,
					name: 'M3 — Delivery',
					deliverables:
						'D6: Roundtable delivered — D7: Lead file within 48 hours',
					dueDate: new Date('2026-08-31'),
					amount: '6500000.00',
					paid: false,
					sortOrder: 2,
				},
				{
					id: createId(),
					invoiceId: inv1Id,
					name: 'M4 — Close-out',
					deliverables:
						'D10: Final report — D11: Case study — D12: Press coverage pack',
					dueDate: new Date('2026-09-27'),
					amount: '4600000.00',
					paid: false,
					sortOrder: 3,
				},
			]);
			await db.insert(activityLog).values([
				{
					organizationId: org.id,
					userId: 'u1',
					userName: 'Nnaemeka Clinton',
					type: 'Created',
					entity: 'Invoice',
					label: 'SPK-2026-0812',
					detail: 'Created from Schedule A/B of the signed SOW',
					createdAt: new Date('2026-08-12T09:14:00'),
				},
				{
					organizationId: org.id,
					userId: 'u2',
					userName: 'Ada Okonkwo',
					type: 'Edited',
					entity: 'Invoice',
					label: 'SPK-2026-0812',
					detail: 'Tranche 1 status: Unpaid → Paid',
					metadata: {
						changes: [
							{ field: 'Tranche 1 status', from: 'Unpaid', to: 'Paid' },
						],
					},
					createdAt: new Date('2026-08-12T16:02:00'),
				},
			]);
			console.log('Created invoice SPK-2026-0812 with tranches');

			// Invoice 2: ASF-2026-0114 (full, USD)
			const inv2Result = await db
				.insert(invoices)
				.values({
					organizationId: org.id,
					number: 'ASF-2026-0114',
					businessId: bzAsf.id,
					companyId: coUk.id,
					clientId: cl2.id,
					issueDate: new Date('2026-08-09'),
					dueDate: new Date('2026-08-16'),
					currency: 'USD',
					taxName: 'Transfer Fees',
					taxRate: '1.50',
					description: 'Exhibition at ASF Kenya 2026.',
					memo: 'Want to pay by bank transfer instead? Use the details below — SWIFT if you are sending from abroad.',
					bankId: bkUsd.id,
					paymentType: 'full',
					paymentMethod: 'bank',
					payLink: '',
					payLinkLabel: 'Pay online',
					status: 'sent',
				})
				.returning({ id: invoices.id });
			const inv2Id = inv2Result[0].id;
			await db.insert(invoiceItems).values({
				invoiceId: inv2Id,
				name: 'Startup Stall',
				description: 'Exhibition stall, standard footprint',
				qty: '1',
				cost: '3000.00',
				discountName: 'Early Bird',
				discountPct: '50.00',
				discountAmt: '0',
				sortOrder: 0,
			});
			await db.insert(activityLog).values({
				organizationId: org.id,
				userId: 'u2',
				userName: 'Ada Okonkwo',
				type: 'Created',
				entity: 'Invoice',
				label: 'ASF-2026-0114',
				detail: 'Invoice created',
				metadata: { changes: [] },
				createdAt: new Date('2026-08-09T11:20:00'),
			});
			console.log('Created invoice ASF-2026-0114');

			// ASF Terms invoices (5 more)
			const terms =
				'You may secure your booking by making a 50% payment now or by the due date of the invoice, with the outstanding balance due no later than October 1st.\n\nTerms & Conditions: A minimum 50% payment is required by July 31st to confirm your booking. The remaining 50% must be paid in full by October 1st. Failure to complete the balance payment by the due date may result in the release of your booking or applicable pricing benefits, at our discretion. All payments made are subject to the agreed payment terms and are non-refundable unless otherwise stated.';

			const asfInvoices = [
				{
					number: 'A853F6E1-0001',
					clientId: cl3.id,
					issueDate: '2026-07-28',
					dueDate: '2026-08-01',
					currency: 'USD' as const,
					taxName: '',
					taxRate: '0',
					description: 'Africa Startup Festival Kenya 2026.',
					memo: '',
					bankId: bkGbp.id,
					paymentType: 'full' as const,
					paymentMethod: 'bank' as const,
					status: 'sent' as const,
					items: [
						{
							name: 'Startup Stall',
							description: 'Exhibition stall, ASF Kenya 2026',
							qty: '1',
							cost: '1500.00',
							discountName: '$500.00 off',
							discountPct: '0',
							discountAmt: '500.00',
						},
					],
				},
				{
					number: 'A853F6E1-0002',
					clientId: cl4.id,
					issueDate: '2026-07-28',
					dueDate: '2026-07-31',
					currency: 'USD' as const,
					taxName: '',
					taxRate: '0',
					description: 'Africa Startup Festival Kenya 2026.',
					memo: terms,
					bankId: bkGbp.id,
					paymentType: 'full' as const,
					paymentMethod: 'bank' as const,
					status: 'sent' as const,
					items: [
						{
							name: 'ASF Kenya Exhibition Booth',
							description: 'Exhibition booth, ASF Kenya 2026',
							qty: '1',
							cost: '3001.50',
							discountName: '',
							discountPct: '0',
							discountAmt: '0',
						},
					],
				},
				{
					number: 'A853F6E1-0003',
					clientId: cl5.id,
					issueDate: '2026-07-28',
					dueDate: '2026-08-10',
					currency: 'USD' as const,
					taxName: '',
					taxRate: '0',
					description: 'Africa Startup Festival Kenya 2026.',
					memo: '',
					bankId: bkGbp.id,
					paymentType: 'full' as const,
					paymentMethod: 'bank' as const,
					status: 'sent' as const,
					items: [
						{
							name: 'ASF Kenya Exhibition Booth',
							description: 'Exhibition booth, ASF Kenya 2026',
							qty: '1',
							cost: '3001.50',
							discountName: '',
							discountPct: '0',
							discountAmt: '0',
						},
					],
				},
				{
					number: 'A853F6E1-0004',
					clientId: cl6.id,
					issueDate: '2026-07-28',
					dueDate: '2026-09-26',
					currency: 'USD' as const,
					taxName: '',
					taxRate: '0',
					description: 'Africa Startup Festival Kenya 2026.',
					memo: '',
					bankId: bkGbp.id,
					paymentType: 'full' as const,
					paymentMethod: 'bank' as const,
					status: 'voided' as const,
					items: [
						{
							name: 'ASF Kenya Exhibition Booth',
							description: 'Exhibition booth, ASF Kenya 2026',
							qty: '1',
							cost: '3001.50',
							discountName: '',
							discountPct: '0',
							discountAmt: '0',
						},
					],
				},
				{
					number: 'A853F6E1-0005',
					clientId: cl7.id,
					issueDate: '2026-08-04',
					dueDate: '2026-09-03',
					currency: 'USD' as const,
					taxName: "Int'l Transfer Fees",
					taxRate: '1',
					description: 'Africa Startup Festival Kenya 2026.',
					memo: terms,
					bankId: bkGbp.id,
					paymentType: 'full' as const,
					paymentMethod: 'bank' as const,
					status: 'sent' as const,
					items: [
						{
							name: 'Startup Stall',
							description: 'Exhibition stall, ASF Kenya 2026',
							qty: '1',
							cost: '1500.00',
							discountName: '',
							discountPct: '0',
							discountAmt: '0',
						},
					],
				},
			];

			for (const inv of asfInvoices) {
				const invResult = await db
					.insert(invoices)
					.values({
						organizationId: org.id,
						number: inv.number,
						businessId: bzAsf.id,
						companyId: coUk.id,
						clientId: inv.clientId,
						issueDate: new Date(inv.issueDate),
						dueDate: new Date(inv.dueDate),
						currency: inv.currency,
						taxName: inv.taxName,
						taxRate: inv.taxRate,
						description: inv.description,
						memo: inv.memo,
						bankId: inv.bankId,
						paymentType: inv.paymentType,
						paymentMethod: inv.paymentMethod,
						status: inv.status,
						voided: inv.status === 'voided',
						voidedAt: inv.status === 'voided' ? new Date('2026-08-03') : null,
					})
					.returning({ id: invoices.id });
				const invId = invResult[0].id;
				await db.insert(invoiceItems).values({
					invoiceId: invId,
					name: inv.items[0].name,
					description: inv.items[0].description,
					qty: inv.items[0].qty,
					cost: inv.items[0].cost,
					discountName: inv.items[0].discountName,
					discountPct: inv.items[0].discountPct,
					discountAmt: inv.items[0].discountAmt,
					sortOrder: 0,
				});
				await db.insert(activityLog).values({
					organizationId: org.id,
					userId: 'u2',
					userName: 'Ada Okonkwo',
					type: 'Created',
					entity: 'Invoice',
					label: inv.number,
					detail: 'Invoice created',
					metadata: { changes: [] },
					createdAt: new Date(`${inv.issueDate}T10:00:00`),
				});
			}
			console.log('Created 5 ASF terms invoices');

			// Additional invoices
			const invAsf6Result = await db
				.insert(invoices)
				.values({
					organizationId: org.id,
					number: 'ASF-2026-0006',
					businessId: bzAsf.id,
					companyId: coUk.id,
					clientId: cl8.id,
					issueDate: new Date('2026-08-21'),
					dueDate: new Date('2026-08-21'),
					currency: 'KES',
					taxName: '',
					taxRate: '0',
					description: 'Startup Stall, Africa Startup Festival Kenya 2026.',
					memo: 'Stall fee of USD 3,000.00 converted at USD 1 = KES 129.45 (mid-market, 21 August 2026), less a 50% discount. Payable today via the payment link above.',
					bankId: bkUsd.id,
					paymentType: 'full',
					paymentMethod: 'link',
					payLink: 'https://checkout.korapay.com/pay/asfstall',
					payLinkLabel: 'Pay with Korapay',
					status: 'sent',
				})
				.returning({ id: invoices.id });
			const invAsf6Id = invAsf6Result[0].id;
			await db.insert(invoiceItems).values({
				invoiceId: invAsf6Id,
				name: 'Startup Stall',
				description:
					'Exhibition stall, ASF Kenya 2026 — USD 3,000.00 at USD 1 = KES 129.45',
				qty: '1',
				cost: '388350.00',
				discountName: '50% discount',
				discountPct: '50.00',
				discountAmt: '0',
				sortOrder: 0,
			});
			await db.insert(activityLog).values({
				organizationId: org.id,
				userId: 'u1',
				userName: 'Nnaemeka Clinton',
				type: 'Created',
				entity: 'Invoice',
				label: 'ASF-2026-0006',
				detail: 'Invoice created',
				metadata: { changes: [] },
				createdAt: new Date('2026-08-21T09:00:00'),
			});
			console.log('Created invoice ASF-2026-0006');

			const invAsf7Result = await db
				.insert(invoices)
				.values({
					organizationId: org.id,
					number: 'ASF-2026-0115',
					businessId: bzAsf.id,
					companyId: coUk.id,
					clientId: cl9.id,
					issueDate: new Date('2026-08-20'),
					dueDate: new Date('2026-08-31'),
					currency: 'USD',
					taxName: 'Transfer Fees',
					taxRate: '1',
					description: '',
					memo: '',
					bankId: bkUsd.id,
					paymentType: 'full',
					paymentMethod: 'bank',
					status: 'sent',
				})
				.returning({ id: invoices.id });
			const invAsf7Id = invAsf7Result[0].id;
			await db.insert(invoiceItems).values({
				invoiceId: invAsf7Id,
				name: 'Startup Stall',
				description: 'Exhibition stall, standard footprint',
				qty: '10',
				cost: '3000.00',
				discountName: 'PARTNER',
				discountPct: '0',
				discountAmt: '20000.00',
				sortOrder: 0,
			});
			await db.insert(activityLog).values({
				organizationId: org.id,
				userId: 'u1',
				userName: 'Nnaemeka Clinton',
				type: 'Created',
				entity: 'Invoice',
				label: 'ASF-2026-0115',
				detail: 'Invoice created',
				metadata: { changes: [] },
				createdAt: new Date('2026-08-20T10:00:00'),
			});
			console.log('Created invoice ASF-2026-0115');
		}
	}

	// 9. Seed memos (1 from template)
	const existingMemos = await db
		.select()
		.from(memos)
		.where(eq(memos.organizationId, org.id));
	if (existingMemos.length === 0 && bzNew && coNg) {
		await db.insert(memos).values({
			organizationId: org.id,
			number: 'MEMO-2026-004',
			businessId: bzNew.id,
			companyId: coNg.id,
			to: 'B4B Partners Limited — Chinapa Onwusah',
			from: 'Nnaemeka Clinton, CEO',
			date: new Date('2026-08-12'),
			subject: 'Payment schedule and milestone acceptance',
			body: 'This memo accompanies invoice SPK-2026-0812.\n\nThe fee of N25,500,000.00 excluding VAT is payable across four milestones as set out in Schedule B of the Statement of Work dated 4 August 2026. Milestone one is due on signature and PO confirmation; the remaining three follow acceptance of the deliverables named against them.\n\nEach milestone is invoiced with VAT at 7.5%. Withholding tax of 5% applies per clause 5.5; please remit the credit note with payment.',
		});
		console.log('Created memo MEMO-2026-004');
	}

	// 10. Seed FX rates
	const existingFxRates = await db
		.select()
		.from(settings)
		.where(
			and(eq(settings.organizationId, org.id), eq(settings.key, 'fx-rates')),
		)
		.limit(1);

	if (existingFxRates.length === 0) {
		const fxRates = {
			mode: 'manual',
			rates: {
				USD: 1,
				NGN: 1530,
				GBP: 0.74,
				EUR: 0.86,
				KES: 129.45,
				GHS: 12.4,
				ZAR: 18.1,
			},
			lastFetched: new Date().toISOString(),
		};
		await db.insert(settings).values({
			organizationId: org.id,
			key: 'fx-rates',
			value: fxRates,
		});
		console.log('Created FX rates settings');
	} else {
		console.log('FX rates settings already exist');
	}

	console.log('Template-aligned seeding completed successfully!');
	return { organizationId: org.id };
}

export async function clearDb(): Promise<void> {
	const orgId = process.env.ORGANIZATION_ID!;

	// First delete all invoice-related data by finding invoice IDs for this org
	const orgInvoices = await db
		.select({ id: invoices.id })
		.from(invoices)
		.where(eq(invoices.organizationId, orgId));
	const invoiceIds = orgInvoices.map((i) => i.id);

	if (invoiceIds.length > 0) {
		await db.delete(activityLog).where(eq(activityLog.organizationId, orgId));
		await db
			.delete(payments)
			.where(sql`${payments.invoiceId} IN (${sql.join(invoiceIds, sql`, `)})`);
		await db
			.delete(invoiceTranches)
			.where(
				sql`${invoiceTranches.invoiceId} IN (${sql.join(invoiceIds, sql`, `)})`,
			);
		await db
			.delete(invoiceItems)
			.where(
				sql`${invoiceItems.invoiceId} IN (${sql.join(invoiceIds, sql`, `)})`,
			);
		await db.delete(invoices).where(eq(invoices.organizationId, orgId));
	} else {
		await db.delete(activityLog).where(eq(activityLog.organizationId, orgId));
		await db.delete(invoices).where(eq(invoices.organizationId, orgId));
	}

	await db.delete(memos).where(eq(memos.organizationId, orgId));
	await db.delete(clients).where(eq(clients.organizationId, orgId));
	await db.delete(products).where(eq(products.organizationId, orgId));
	await db.delete(banks).where(eq(banks.organizationId, orgId));
	await db.delete(companies).where(eq(companies.organizationId, orgId));
	await db.delete(businesses).where(eq(businesses.organizationId, orgId));
	await db.delete(settings).where(eq(settings.organizationId, orgId));
	await db.delete(member).where(eq(member.organizationId, orgId));

	console.log('Database cleared');
}

export async function getSeedStatus(): Promise<{
	empty: boolean;
	counts: Record<string, number>;
}> {
	const orgId = process.env.ORGANIZATION_ID!;

	const counts = {
		users: (await db.select().from(userTable).where(eq(userTable.id, 'u1')))
			.length, // placeholder
		invoices: (
			await db.select().from(invoices).where(eq(invoices.organizationId, orgId))
		).length,
		businesses: (
			await db
				.select()
				.from(businesses)
				.where(eq(businesses.organizationId, orgId))
		).length,
		companies: (
			await db
				.select()
				.from(companies)
				.where(eq(companies.organizationId, orgId))
		).length,
		clients: (
			await db.select().from(clients).where(eq(clients.organizationId, orgId))
		).length,
		products: (
			await db.select().from(products).where(eq(products.organizationId, orgId))
		).length,
		banks: (
			await db.select().from(banks).where(eq(banks.organizationId, orgId))
		).length,
		memos: (
			await db.select().from(memos).where(eq(memos.organizationId, orgId))
		).length,
	};

	const empty = Object.values(counts).every((c) => c === 0);
	return { empty, counts };
}
