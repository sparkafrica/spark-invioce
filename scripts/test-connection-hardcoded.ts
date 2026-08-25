import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "#/db/schema";

// Try hardcoding the connection parameters
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "spark-invioce",
  user: "postgres",
  password: "postgres"
});

export const db = drizzle({ client: pool, schema });

import { organization } from "#/db/schema"

async function test() {
  try {
    const result = await db.select().from(organization).limit(1)
    console.log("Connection test successful:", result)
  } catch (error) {
    console.error("Connection test failed:", error)
    console.error("Error cause:", error instanceof Error ? error.cause : undefined)
  }
}

test()
