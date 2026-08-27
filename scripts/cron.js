#!/usr/bin/env node
// FX Rates Cron — run with: node scripts/cron.js
// Also available as API: GET /api/cron/fx-rates (Bearer CRON_SECRET)
// Reads ORGANIZATION_ID, DATABASE_URL, EXCHANGERATE_API_KEY, CRON_SECRET from .env.local / env
// Updates settings.key='fx-rates' where mode === 'api'

import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: ['.env.local', '.env'] })

const { Pool } = pg
const TARGET_CURRENCIES = ['NGN', 'GBP', 'EUR', 'KES', 'GHS', 'ZAR']
const BASE_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL
  const ORGANIZATION_ID = process.env.ORGANIZATION_ID
  const API_KEY = process.env.EXCHANGERATE_API_KEY

  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  if (!ORGANIZATION_ID) {
    console.error('ORGANIZATION_ID not set. Seed first or set in .env.local')
    process.exit(1)
  }
  if (!API_KEY) {
    console.error('EXCHANGERATE_API_KEY not set. Skipping - requires FX API key.')
    process.exit(0)
  }

  const pool = new Pool({ connectionString: DATABASE_URL })
  try {
    const { rows } = await pool.query(`SELECT value FROM settings WHERE organization_id = $1 AND key = 'fx-rates' LIMIT 1`, [ORGANIZATION_ID])
    const fxData = rows[0]?.value
    if (!fxData || fxData.mode !== 'api') {
      console.log('FX rates not in api mode — skipped. Current mode:', fxData?.mode ?? 'none')
      return
    }

    console.log('Fetching rates from exchangerate-api.com...')
    const res = await fetch(`${BASE_URL}?api_key=${API_KEY}`)
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
    const apiData = await res.json()
    if (!apiData.rates) throw new Error('Invalid API response: missing rates')

    const rates = { USD: 1 }
    for (const code of TARGET_CURRENCIES) {
      if (apiData.rates[code] != null) rates[code] = apiData.rates[code]
      else if (fxData.rates?.[code] != null) rates[code] = fxData.rates[code]
    }

    const value = JSON.stringify({ mode: 'api', rates, lastFetched: new Date().toISOString() })
    await pool.query(
      `INSERT INTO settings (id, organization_id, key, value, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'fx-rates', $2::jsonb, now(), now())
       ON CONFLICT (organization_id, key) DO UPDATE SET value = $2::jsonb, updated_at = now()`,
      [ORGANIZATION_ID, value]
    )
    console.log('FX rates updated:', rates)
  } catch (e) {
    console.error('FX cron failed:', e)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
