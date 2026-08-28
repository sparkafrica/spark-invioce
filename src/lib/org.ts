import { db } from '#/db';
import { organization } from '#/db/auth-schema';

let cachedOrgId: string | null = null;

export async function getOrgId(): Promise<string> {
	if (process.env.ORGANIZATION_ID) return process.env.ORGANIZATION_ID!;
	if (cachedOrgId) return cachedOrgId;
	const rows = await db
		.select({ id: organization.id, slug: organization.slug })
		.from(organization)
		.limit(10);
	const bySpark = rows.find((r) => r.slug === 'spark-invoice-system');
	if (bySpark) {
		cachedOrgId = bySpark.id;
		return bySpark.id;
	}
	if (rows[0]) {
		cachedOrgId = rows[0].id;
		return rows[0].id;
	}
	throw new Error('No organization found. Run seed.');
}

export function getOrgIdSync(): string {
	if (process.env.ORGANIZATION_ID) return process.env.ORGANIZATION_ID!;
	if (cachedOrgId) return cachedOrgId;
	throw new Error(
		'ORGANIZATION_ID not set and no cached org. Call getOrgId() first.',
	);
}

export function setCachedOrgId(id: string) {
	cachedOrgId = id;
}
