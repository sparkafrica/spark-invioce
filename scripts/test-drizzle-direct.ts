import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "#/db/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle({ client: pool, schema });

import { organization } from "#/db/schema"

async function test() {
  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    const result = await db.select().from(organization).limit(1)
    console.log("Connection test successful:", result)
  } catch (error) {
    console.error("Connection test failed:", error);
    console.error("Error cause:", error instanceof Error ? error.cause : undefined);
  }
}

test()
