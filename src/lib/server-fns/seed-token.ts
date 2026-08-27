import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { z } from 'zod';
import { db } from '#/db';
import { activityLog } from '#/db/schema';

const resend = new Resend(process.env.RESEND_API_KEY);

const SEED_TOKEN_TTL_MINUTES = 15;
const TOKEN_LENGTH = 6;

function generateToken(): string {
	const chars = '0123456789';
	let token = '';
	for (let i = 0; i < TOKEN_LENGTH; i++) {
		token += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return token;
}

function getSeedTokenEmail(): string {
	return process.env.SEED_TOKEN_EMAIL || 'clinton@sparkafrica.co';
}

export const sendSeedToken = createServerFn({ method: 'POST' }).handler(
	async (): Promise<{ sent: boolean }> => {
		const token = generateToken();
		const expiresAt = new Date(Date.now() + SEED_TOKEN_TTL_MINUTES * 60 * 1000);
		const orgId = process.env.ORGANIZATION_ID!;

		// Store token in activityLog with special type for verification
		await db.insert(activityLog).values({
			organizationId: orgId,
			userId: 'system',
			userName: 'System',
			type: 'SettingsChanged',
			entity: 'Settings',
			label: 'seed-token',
			detail: `Seed token generated: ${token}`,
			metadata: { token, expiresAt: expiresAt.toISOString() },
			createdAt: new Date(),
		});

		const ownerEmail = getSeedTokenEmail();
		await resend.emails.send({
			from: 'no-reply@sparkafrica.co',
			to: ownerEmail,
			subject: 'Spark Invoice — Seed Token',
			text: `Your seed token is: ${token}\n\nThis token expires in ${SEED_TOKEN_TTL_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`,
		});

		return { sent: true };
	},
);

export const verifySeedToken = createServerFn({ method: 'POST' })
	.validator(z.object({ token: z.string().length(TOKEN_LENGTH) }))
	.handler(
		async ({ data }): Promise<{ valid: boolean; organizationId?: string }> => {
			const orgId = process.env.ORGANIZATION_ID!;

			const [record] = await db
				.select()
				.from(activityLog)
				.where(
					and(
						eq(activityLog.organizationId, orgId),
						eq(activityLog.type, 'SettingsChanged'),
						eq(activityLog.entity, 'Settings'),
						eq(activityLog.label, 'seed-token'),
					),
				)
				.orderBy(activityLog.createdAt)
				.limit(1);

			if (!record) {
				return { valid: false };
			}

			const metadata = record.metadata as {
				token?: string;
				expiresAt?: string;
			} | null;
			if (!metadata?.token || metadata.token !== data.token) {
				return { valid: false };
			}

			if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
				return { valid: false };
			}

			// Mark token as used
			await db.delete(activityLog).where(eq(activityLog.id, record.id));

			return { valid: true, organizationId: orgId };
		},
	);
