import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Try to create a pool directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log("Pool created");

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Query error:", err);
  } else {
    console.log("Query result:", res.rows[0]);
  }
  pool.end();
});