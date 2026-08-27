// FX Rates Cron — TS version for `pnpm dlx tsx scripts/cron.ts`
// Thin wrapper around scripts/cron.js logic using drizzle for type safety
import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
import { db } from '#/db'
import { settings } from '#/db/schema'
import { eq, and } from 'drizzle-orm'

const TARGET_CURRENCIES = ['NGN', 'GBP', 'EUR', 'KES', 'GHS', 'ZAR'] as const
const BASE_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

async function run() {
  const orgId = process.env.ORGANIZATION_ID!
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!orgId) throw new Error('ORGANIZATION_ID missing')
  if (!apiKey) { console.log('EXCHANGERATE_API_KEY missing — skipping'); return }
  const [row] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.organizationId, orgId), eq(settings.key, 'fx-rates'))).limit(1)
  const fxData = row?.value as any
  if (!fxData || fxData.mode !== 'api') { console.log('FX not in api mode — skipped', fxData?.mode); return }
  const res = await fetch(`${BASE_URL}?api_key=${apiKey}`)
  if (!res.ok) throw new Error(`API ${res.status}`)
  const apiData: any = await res.json()
  const rates: Record<string, number> = { USD: 1 }
  for (const code of TARGET_CURRENCIES) rates[code] = apiData.rates?.[code] ?? fxData.rates?.[code]
  const value = { mode: 'api' as const, rates, lastFetched: new Date().toISOString() }
  await db.insert(settings).values({ organizationId: orgId, key: 'fx-rates', value: value as any }).onConflictDoUpdate({ target: [settings.organizationId, settings.key], set: { value: value as any, updatedAt: new Date() } })
  console.log('FX rates updated', rates)
}
run().catch((e) => { console.error(e); process.exit(1) })
