import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '#/db';
import { organization } from '#/db/auth-schema';
import { activityLog } from '#/db/schema';

export type ActivityType =
	| 'Created'
	| 'Edited'
	| 'Deleted'
	| 'Invited'
	| 'SignedIn'
	| 'Voided'
	| 'PaymentRecorded'
	| 'SettingsChanged';

export type ActivityEntity =
	| 'Invoice'
	| 'Client'
	| 'Product'
	| 'Memo'
	| 'User'
	| 'Business'
	| 'Company'
	| 'Bank'
	| 'Settings';

export type UserRole = 'owner' | 'admin' | 'member';

export interface FieldChange {
	field: string;
	from: string;
	to: string;
}

export interface LogActivityParams {
	organizationId?: string;
	userId: string;
	userName: string;
	userRole: UserRole;
	type: ActivityType;
	entity: ActivityEntity;
	label: string;
	detail: string;
	changes?: FieldChange[];
	metadata?: Record<string, unknown>;
}

async function resolveActivityOrgId(explicit?: string): Promise<string> {
	if (explicit) return explicit;
	if (process.env.ORGANIZATION_ID) return process.env.ORGANIZATION_ID!;
	const rows = await db
		.select({ id: organization.id, slug: organization.slug })
		.from(organization)
		.limit(10);
	const bySlug = rows.find((r) => r.slug === 'spark-invoice-system');
	if (bySlug) return bySlug.id;
	if (rows[0]) return rows[0].id;
	throw new Error('No organization found. Run seed.');
}

export async function logActivity(params: LogActivityParams): Promise<void> {
	const orgId = await resolveActivityOrgId(params.organizationId);
	await db.insert(activityLog).values({
		organizationId: orgId,
		userId: params.userId,
		userName: params.userName,
		type: params.type,
		entity: params.entity,
		label: params.label,
		detail: params.detail,
		metadata: {
			changes: params.changes || [],
			...params.metadata,
		},
	});
}

export function diffObjects<T extends Record<string, any>>(
	oldObj: T,
	newObj: T,
): FieldChange[] {
	const changes: FieldChange[] = [];
	const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

	for (const key of allKeys) {
		const oldVal = oldObj[key];
		const newVal = newObj[key];

		if (oldVal === newVal) continue;
		if (oldVal === undefined && newVal === undefined) continue;
		if (oldVal === null && newVal === null) continue;

		const oldStr =
			oldVal === undefined || oldVal === null ? '' : String(oldVal);
		const newStr =
			newVal === undefined || newVal === null ? '' : String(newVal);

		if (oldStr !== newStr) {
			changes.push({ field: key, from: oldStr, to: newStr });
		}
	}

	return changes;
}

export interface WithActivityMeta {
	entity: ActivityEntity;
	getLabel: (args: any, result: any) => string;
	getDetail: (args: any, result: any, changes?: FieldChange[]) => string;
}

export function withActivity<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	meta: WithActivityMeta,
): T {
	return (async (...args: any[]) => {
		const result = await fn(...args);

		const userId = args.find((a) => a?.context?.session?.user?.id)?.context
			?.session?.user?.id;
		const userName = args.find((a) => a?.context?.session?.user?.name)?.context
			?.session?.user?.name;
		const userRole =
			(args.find((a) => a?.context?.session?.user?.role)?.context?.session?.user
				?.role as UserRole) || 'member';

		if (userId && userName) {
			const label = meta.getLabel(args[0], result);
			const changes = diffObjects(args[0] || {}, result || {});
			const detail = meta.getDetail(args[0], result, changes);

			await logActivity({
				userId,
				userName,
				userRole,
				type: 'Edited',
				entity: meta.entity,
				label,
				detail,
				changes,
			});
		}

		return result;
	}) as T;
}

export async function getActivityLog(params: {
	organizationId?: string;
	from?: Date;
	to?: Date;
	query?: string;
	page?: number;
	pageSize?: number;
	entity?: ActivityEntity;
	userId?: string;
}): Promise<{ activities: any[]; total: number }> {
	const orgId = params.organizationId || process.env.ORGANIZATION_ID!;
	const page = params.page || 1;
	const pageSize = params.pageSize || 25;
	const offset = (page - 1) * pageSize;

	const conditions = [eq(activityLog.organizationId, orgId)];

	if (params.from) {
		conditions.push(gte(activityLog.createdAt, params.from));
	}
	if (params.to) {
		const toDate = new Date(params.to);
		toDate.setHours(23, 59, 59, 999);
		conditions.push(lte(activityLog.createdAt, toDate));
	}
	if (params.entity) {
		conditions.push(eq(activityLog.entity, params.entity));
	}
	if (params.userId) {
		conditions.push(eq(activityLog.userId, params.userId));
	}

	const whereClause =
		conditions.length > 1 ? and(...conditions) : conditions[0];

	const [activities, totalResult] = await Promise.all([
		db
			.select()
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

	let filtered = activities;
	if (params.query) {
		const q = params.query.toLowerCase();
		filtered = activities.filter(
			(a) =>
				a.userName.toLowerCase().includes(q) ||
				a.label.toLowerCase().includes(q) ||
				(a.detail || '').toLowerCase().includes(q) ||
				a.entity.toLowerCase().includes(q),
		);
	}

	return {
		activities: filtered,
		total: Number(totalResult[0]?.count || 0),
	};
}
