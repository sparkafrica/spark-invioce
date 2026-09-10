import { config } from "dotenv"
config({ path: ".env.local" })

const { seedDb } = await import("../src/lib/seed")

async function main() {
	console.log("Seeding database...")

	await seedDb()

	console.log("Database seeding completed successfully!")
}

main()
	.catch((e: unknown) => {
		console.error("Seeding failed:", e)
		process.exit(1)
	})