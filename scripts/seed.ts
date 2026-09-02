import { config } from "dotenv"
config({ path: ".env.local" })

const { seedDb } = await import("../src/lib/seed")
const { writeFileSync } = await import("node:fs")
const { join } = await import("node:path")

async function main() {
	console.log("Seeding database...")

	const result = await seedDb()

	// Write ORGANIZATION_ID to .env.local
	const envPath = join(process.cwd(), ".env.local")
	const envContent = `ORGANIZATION_ID=${result.organizationId}\n`
	try {
		writeFileSync(envPath, envContent, { flag: 'a' })
		console.log(`Written ORGANIZATION_ID=${result.organizationId} to .env.local`)
	} catch (e) {
		console.warn("Could not write to .env.local:", e)
	}

	console.log("Database seeding completed successfully!")
}

main()
	.catch((e: unknown) => {
		console.error("Seeding failed:", e)
		process.exit(1)
	})