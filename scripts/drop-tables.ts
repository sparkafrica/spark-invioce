import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  for (const row of result.rows) {
    await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
    console.log("Dropped:", row.tablename);
  }
  await pool.end();
  console.log("All tables dropped");
}

main().catch(console.error);