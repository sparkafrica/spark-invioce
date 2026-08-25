import { config } from "dotenv";
config({ path: ".env.local" }); // Load environment variables from .env.local file

import { db } from "#/db/index"
import { organization } from "#/db/schema"

async function test() {
  try {
    const result = await db.select().from(organization).limit(1)
    console.log("Connection test successful:", result)
  } catch (error) {
    console.error("Connection test failed:", error)
  }
}

test()
