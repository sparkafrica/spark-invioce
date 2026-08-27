# Spark Invoice

Modernist invoicing for **The Spark Africa** — multi-business, multi-company, tranche-aware. 100% pixel-match to `Invoice App v2.dc.html` (13 screens). Built on **TanStack Start + Better Auth + Drizzle + shadcn (Base UI)**.

![Stack](https://img.shields.io/badge/TanStack-Start%20%7C%20Router%20%7C%20Query%20%7C%20Form%20%7C%20Table-ff4154) ![Auth](https://img.shields.io/badge/Better%20Auth-organization-000) ![DB](https://img.shields.io/badge/Drizzle-PG-0a0a0a) ![UI](https://img.shields.io/badge/shadcn-Base%20UI-000)

---

## Features

- **13 screens** — Overview · Invoices · Invoice editor/new · Invoice document · Memos list/editor/document · Products · Clients · Team · Activity · Settings (Profile, Organization, Companies, Banks, Businesses & Logos, FX Rates)
- **Invoice editor** — Business & entity, issue/due dates, searchable currency (60 `CURRENCIES`), line items `FieldArray` + catalogue `+ Product` + _Split evenly_, tranches toggle, bank vs link (`BankSelect` searchable + `CurrencySelect` searchable), memo + save note → `invoiceHistory`
- **Business-aware numbering** — `${prefix}-${padStart(4)}` per business (`SPK/ASF/ATE`), random generation removed; collision `23505` never overwrites, shows `Dialog` “proceed with {next}?” + toast
- **Document** — Business base64 logo (500KB limit), paylink/bank footer, void banner, payments + comments, `Record Payment` via `Dialog`
- **Settings** — File-split panels (`src/components/settings/*.tsx`) + route-split `settings/*` + alias `/setting` → profile. Roles `owner|admin|member` (display `Editor` for `member`) via Better Auth `organization()` defaults, never custom `ac`.
- **DB** — `organizationId`-scoped everywhere via `resolveOrgId()` fallback (`env ORGANIZATION_ID` → `slug spark-invoice-system` → first org). `relations.ts` full coverage, `comments.userId → user.id` (role via join, no denormalized enum).
- **FX Rates** — `settings.key='fx-rates'` manual vs api (`exchangerate-api.com`). Cron via API **or** `node scripts/cron.js`.
- **Loading** — Every `isPending/isLoading` → `Skeleton` (`src/components/ui/skeleton.tsx` `animate-pulse`), nav never flashes `Sign in`
- **Tables** — `shadcn Table` + `TanStack Table` state where filter/sort/pagination needed; `Search` via `Input`+`Field`, not raw; `Card` for settings/products/clients

Design: `#f3f2f2 bg`, `#201e1d` text/`border-2`, `#ec3013` accent, `Archivo`, `rounded-none`, `tabular-nums`, headings `19px/18px semibold` (40% down from 32/30).

---

## Stack

- **App:** TanStack Start (Vite + Nitro), React 19, React Router file-based, React Query, React Form + valibot, React Table v9
- **Auth:** Better Auth `drizzleAdapter` + `organization()` + `organizationClient()`, `customSession` for role, `tanstackStartCookies`
- **DB:** Postgres + Drizzle ORM + Kysely, `pg` Pool, `drizzle-kit`
- **UI:** Tailwind 4 + `@base-ui/react` shadcn (Button, Input, Textarea, Field, Select, Popover, Command, Dialog, Table, Card, Skeleton, Calendar, RadioGroup, Checkbox, CurrencySelect searchable)
- **Email/Cron:** Resend (`no-reply@sparkafrica.co`), exchangerate-api.com, Coolify cron

---

## Prerequisites

- Node 20+, pnpm 9+
- Postgres 15+ (local or Neon/Supabase)
- (Optional) Resend API key for seed token email; Exchangerate API key for FX auto

---

## Quickstart

```bash
# 1. Clone (new remote)
git clone git@github.com:sparkafrica/spark-invioce.git
cd spark-invioce
pnpm install

# 2. Env (see .env.example)
cp .env.example .env.local   # edit below
# DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, EXCHANGERATE_API_KEY, ORGANIZATION_ID (filled by seed), CRON_SECRET, DOMAIN, SEED_TOKEN_EMAIL

# 3. DB — push schema (no manual SQL)
pnpm db:push          # or pnpm db:generate && pnpm db:migrate

# 4. Seed (creates org, 3 businesses with base64 logos, 2 companies, 3 banks, 6 products, 9 clients, 9 invoices, 1 memo, FX rates, activity)
# Option A — CLI (writes ORGANIZATION_ID to .env.local)
pnpm exec tsx --env-file=.env.local scripts/seed.ts
# Option B — UI (2-stage, Resend 6-digit token 15 min TTL to owner override SEED_TOKEN_EMAIL)
pnpm dev # -> http://localhost:3000/seed (only when DB empty; else redirects to /auth/login)

# 5. Dev
pnpm dev --port 3000  # http://localhost:3000

# 6. Build / Preview
pnpm build && pnpm preview
# or Nitro self-contained:
pnpm build && node .output/server/index.mjs
```

### Env

Create `.env.local` from `.env.example`:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spark-invioce
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET= # pnpm dlx @better-auth/cli secret
RESEND_API_KEY=re_xxx              # Resend verified no-reply@sparkafrica.co
EXCHANGERATE_API_KEY=xxx           # exchangerate-api.com (only if FX mode api)
ORGANIZATION_ID=                   # filled by seed; or manual slug lookup
CRON_SECRET= # openssl rand -hex 32
DOMAIN=spark-invioce.example.com   # for Coolify cron curl
SEED_TOKEN_EMAIL= # optional override for seed token recipient (defaults to clinton@sparkafrica.co)
```

`ORGANIZATION_ID` is auto-written by `scripts/seed.ts` to `.env.local` (append). If you manually create org, set it to `organization.slug='spark-invoice-system'` row `id`.

> Never edit `src/db/auth-schema.ts` — it is generated (`npx @better-auth/cli generate --output src/db/auth-schema.ts`). Domain tables + `relations.ts` live in `src/db/schema.ts` + `src/db/relations.ts` and import `organization,user` from `auth-schema`.

---

## Scripts

| Script | What |
|---|---|
| `pnpm dev` | Vite dev |
| `pnpm build` | Vite + Nitro `preset: node-server` |
| `pnpm generate-routes` | `tsr generate` |
| `pnpm db:generate` | drizzle-kit generate |
| `pnpm db:push` | push schema (dev) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm cron` | `node scripts/cron.js` — FX `api` mode fetch (see Cron) |
| `pnpm cron:tsx` | `tsx --env-file=.env.local scripts/cron.ts` (drizzle typed) |
| `pnpm cron:api` | `curl` local cron API |
| `pnpm test` | vitest run |
| `pnpm lint / format / check` | Biome |

---

## Cron — FX Rates two ways

You asked for **both** API and standalone script:

**1. API cron (Coolify/Nitro) — `src/routes/api/cron/fx-rates.ts`**

```ts
GET /api/cron/fx-rates  // createServerFn, Bearer CRON_SECRET
// checks settings.key='fx-rates' mode === 'api', fetches TARGET_CURRENCIES [NGN,GBP,EUR,KES,GHS,ZAR] (+ USD:1) from https://api.exchangerate-api.com/v4/latest/USD?api_key=, onConflictDoUpdate value {mode,rates,lastFetched}
```

`coolify.yml` daily 6 AM:

```yaml
services:
  - name: fx-rates-cron
    type: cron
    schedule: "0 6 * * *"
    command: curl -X GET "https://${DOMAIN}/api/cron/fx-rates" -H "Authorization: Bearer ${CRON_SECRET}"
```

**2. Standalone script — `scripts/cron.js` (your request: `node scripts/cron.js`)**

```bash
# uses pg Pool + dotenv (.env.local + .env), no TS compilation needed
node scripts/cron.js
# or TS drizzle version:
pnpm cron:tsx
# or via pnpm script:
pnpm cron
# manual curl:
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fx-rates
```

Both read `DATABASE_URL`, `ORGANIZATION_ID`, `EXCHANGERATE_API_KEY` + skip if `mode !== api` (logs skipped). Script uses `gen_random_uuid()` + `ON CONFLICT (organization_id,key) DO UPDATE`.

To use cron api in Coolify, set `EXCHANGERATE_API_KEY`, `CRON_SECRET`, `DOMAIN` env. To use script on VPS, add crontab `0 6 * * * node /app/scripts/cron.js`.

---

## Routes & Roles

| Route | Guard | Notes |
|---|---|---|
| `/auth/*` login/register/forgot/reset | public | Better Auth email/password `minPasswordLength:5`, `requireEmailVerification:false` |
| `/seed` | `beforeLoad: getSeedStatus().empty` else `redirect /auth/login` | 2-stage Resend token to `clinton@sparkafrica.co` (override `SEED_TOKEN_EMAIL`), 15 min TTL, `Clear Database` + `Send Seed` |
| `/` → `/dashboard` | `getSession` | Overview filters `Business(useBusinesses())/Currency/Period` from DB not hardcode |
| `/invoices`, `/invoices/new`, `/invoices/$id`, `/invoices/$id/edit` | session | `invoice-detail` org-scoped `and(eq(id), eq(organizationId))` — no “not found” leak after re-seed |
| `/memos`, `/memos/new`, `/memos/$id`, `/memos/$id/edit` | session | list + editor + document (`MemoForm` TanStack Form) |
| `/products`, `/clients` | session | `1.5fr 1fr` grid: left `Table` + `Input` search + `Badge` cost, right **always-inline** `ProductForm`/`ClientForm` (no New button), edit via `Dialog` popup |
| `/team` | session | `Table` shadcn + `inviteSchema` `picklist(member,admin)` display `Editor` |
| `/activity` | session | `DateRangePicker` presets + `Badge` + pagination `25` + `getActivityLog` |
| `/settings`, `/settings/profile` … `/fx-rates` + alias `/setting` → `profile` | session | Split panels `src/components/settings/*Panel.tsx` each `useForm`+`Field`+`Skeleton`; Banks `fields` tuple mapper, Business logo `data:` allow, `canManage` via `authClient.useSession isPending` no flicker |
| `Header` | — | `isPending` → `Skeleton` not `Sign in` flash; `Sign out` via `authClient.signOut` |

Roles: `owner|admin|member` (DB `text` via `auth-schema` member, not enum, to avoid `better-auth generate` overwrite). UI displays `member` as `Editor` (`team.tsx:138`). `withActivity` + `diffObjects` logs every mutation.

---

## DB & Migrations

- `drizzle.config.ts` out `./drizzle`, schema `./src/db/schema.ts`, `postgresql`.
- `src/db/auth-schema.ts` **generated** — do not edit manually (header `AUTO-GENERATED`). Add `issuer` to `account` if Better Auth complains, `member.createdAt defaultNow`, `organization.createdAt defaultNow`.
- `src/db/schema.ts` imports `organization,user` from `auth-schema`, defines `companies/businesses/banks/products/clients/invoices/.../settings` `organizationId` FK cascade, unique `invoices_number_org_unique`.
- `src/db/relations.ts` full `relations()` coverage (`organizationRelations`, `invoicesRelations`, `commentsRelations` via `user`).
- `clearDb()` in `src/lib/seed.ts` deletes by `organizationId` `process.env.ORGANIZATION_ID!`; `scripts/clear2.ts` workflow `pnpm exec tsx --env-file=.env.local scripts/clear2.ts`.

If you changed `memberRoleEnum` before, drop it: current schema has **no** `user_role`/`member_role` enums (intentionally unused).

---

## Forms — One Pattern

All forms use **TanStack Form** `useForm({defaultValues, validators: standardSchemaValidators.validate(valibot), onSubmit: create/update serverFn})` + `form.Field name= → <Field><FieldLabel><Input|Textarea|Select|CurrencySelect|Checkbox|RadioGroup><FieldError>` + `form.Subscribe canSubmit/isSubmitting → Button`.

* `ClientForm`, `ProductForm`, `MemoForm` — gold standard
* `Settings` panels now same (`ProfilePanel` `authClient.updateUser`, `OrganizationPanel` `updateOrganization`, `Banks/Companies/Businesses/FxRates` each `useForm`)
* `InvoiceForm` `FieldArray mode="array"` for `items`/`tranches` (`field.pushValue/removeValue`), catalogue `useProducts` `+ Product`, `splitEvenly`, `NewClient Dialog` invalidates `qk.clients`, `saveNote` → `Field`+`invoiceHistory`
* `Currency` always `CurrencySelect` searchable `Popover+Command` (60 `CURRENCIES` from `src/lib/currencies.ts`, not hardcoded 13)

Shadcn primitives: `Button, Input, Textarea, Field, Label, Select, Popover, Command, Dialog, Table, Card, Skeleton, Calendar, Checkbox, RadioGroup` — no raw `<input>`/`<button>`/`<label>`/`<table>` left (grep clean). Layout `rounded-none border-[#201e1d]`, `tabular-nums` for money.

---

## Troubleshooting

- **0 companies/businesses in Settings** → `ORGANIZATION_ID` mismatch. Run `pnpm db:push && pnpm exec tsx --env-file=.env.local scripts/seed.ts` (writes new ID) or `SELECT id,slug FROM organization` and set `ORGANIZATION_ID` accordingly. `references.ts` now falls back to `slug spark-invoice-system` if env missing.
- **`Failed query insert into "settings"`** → was `default-org` FK. Now `resolveOrgId()`; ensure `EXCHANGERATE_API_KEY` set and `settings.mode='api'`.
- **`expected tuple, received object` on bank** → `BanksPanel` now `toTuples` mapper; ensure fields as `[[k,v]]`.
- **`Invoice not found`** → org-scoped detail. Re-seed after org change or run backfill `UPDATE invoices SET organization_id = $new WHERE ...`.
- **Auth `issuer does not exist`** → `account` now has `issuer text`; `pnpm db:push`.
- **Member `created_at violates not-null`** → `member.createdAt defaultNow` added; `pnpm db:push`.
- **Styles not loading** → `pnpm install` + ensure `src/styles.css` Archivo import.

---

## Deploy

```bash
pnpm build # Nitro .output
node .output/server/index.mjs # or preset vercel/netlify/cloudflare
# Coolify: set env DATABASE_URL, BETTER_AUTH_*, RESEND_API_KEY, EXCHANGERATE_API_KEY, CRON_SECRET, DOMAIN, SEED_TOKEN_EMAIL
```

---

## License

MIT — Sparkafrica
