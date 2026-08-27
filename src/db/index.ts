import '@tanstack/react-start/server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.ts';
import './relations';

const pool = new Pool({
	// biome-ignore lint/style/noNonNullAssertion: db url must always be defined
	connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle({ client: pool, schema });
