import { createServerFn } from '@tanstack/react-start';
import {
	clearDb as clearDbLib,
	getSeedStatus as getSeedStatusLib,
	seedDb as seedDbLib,
} from '#/lib/seed';

export const getSeedStatus = createServerFn({ method: 'GET' }).handler(
	async () => {
		return getSeedStatusLib();
	},
);

export const seedDb = createServerFn({ method: 'POST' }).handler(async () => {
	return seedDbLib();
});

export const clearDb = createServerFn({ method: 'POST' }).handler(async () => {
	await clearDbLib();
	return { success: true };
});
