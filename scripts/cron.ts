// scripts/cron.ts
import 'dotenv/config'

const TARGET = process.env.CRON_TARGET_URL || 'https://invoice.sparkafrica.co/api/cron/fx-rates'
const SECRET = process.env.CRON_SECRET!

async function run() {
  const res = await fetch(TARGET, {
    headers: { Authorization: `Bearer ${SECRET}` }
  })
  if (!res.ok) throw new Error(`Cron failed: ${res.status}`)
  const data = await res.json()
  console.log('Cron result:', data)
}

run().catch((e) => { console.error(e); process.exit(1) })