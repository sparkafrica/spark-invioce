import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Drop all tables in public schema, excluding Neon internal tables
  const tablesResult = await pool.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      AND tablename NOT LIKE 'neon_%'
    ORDER BY tablename;
  `);

  const tables = tablesResult.rows.map((r) => r.tablename);

  if (tables.length === 0) {
    console.log("No user tables found in public schema");
    await pool.end();
    return;
  }

  console.log("Dropping tables:", tables);

  for (const table of tables) {
    await pool.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
    console.log("Dropped:", table);
  }

  // Optionally drop all sequences in public schema
  const sequencesResult = await pool.query<{ sequencename: string }>(`
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename;
  `);

  for (const row of sequencesResult.rows) {
    await pool.query(`DROP SEQUENCE IF EXISTS public."${row.sequencename}" CASCADE`);
    console.log("Dropped sequence:", row.sequencename);
  }

  // Optionally drop all types in public schema
  const typesResult = await pool.query<{ typname: string }>(`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e' -- enum types
    ORDER BY t.typname;
  `);

  for (const row of typesResult.rows) {
    await pool.query(`DROP TYPE IF EXISTS public."${row.typname}" CASCADE`);
    console.log("Dropped type:", row.typname);
  }

  await pool.end();
  console.log("All tables, sequences, and enum types dropped");
}

main().catch(console.error);