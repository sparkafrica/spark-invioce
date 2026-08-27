# Spark Invoice — Complete Template Alignment Specification

## Overview

Transform the current Spark Invoice app to **100% match** the `Invoice App v2.dc.html` template (13 screens) with full feature parity. This specification consolidates all decisions from the planning phase into a single executable document.

**Source Template:** `C:/Users/DELL/Downloads/Spark Invoice App (3)/Invoice App v2.dc.html` (13 screens via `data-screen-label`)
**Reference Invoice:** `C:/Users/DELL/Downloads/Spark Invoice App (3)/Spark Invoice.dc.html`

---

## Tech Stack (Locked)

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | TanStack Start | Latest 2026 |
| Styling | Tailwind CSS + shadcn/ui (Base UI primitives) | — |
| Auth | Better Auth + `organization` plugin | — |
| Database | Drizzle ORM + PostgreSQL | — |
| Forms | TanStack Form + `Field`/`FieldLabel`/`FieldError` | — |
| Tables | TanStack Table v9 | — |
| Queries | TanStack Query | — |
| PDF | `@react-pdf/renderer` (server-only) | — |
| Email | Resend (`no-reply@sparkafrica.co` verified) | — |
| Deployment | Coolify | — |

---

## Design System (Modernist — Non-Negotiable)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f3f2f2` | Page background |
| `--color-surface` | `#eae9e9` | Cards, inputs |
| `--color-text` | `#201e1d` | Primary text |
| `--color-accent` | `#ec3013` | Primary buttons, links |
| `--color-accent-600` | `#c02a10` | Hover states |
| `--color-divider` | `color-mix(in srgb, #201e1d 40%, transparent)` | Borders |
| `--font-heading` | `Archivo 400/500/600/700/800` | All headings |
| `--font-body` | `Archivo 400/500/600/700/800` | Body text |
| `rounded-*` | `0px` | **No radius anywhere** |
| `border-*` | `2px solid #201e1d` | Primary borders |
| `tabular-nums` | Enabled | All numeric display |

**Heading Sizes (Template Exact):**
- h1: 42px
- h2: 32px
- h3: 25px
- h4: 20px

**Page Titles:** Overview = 32px, Editor = 30px
**Toast Title Only:** `text-[13px] font-semibold text-[#201e1d]`

---

## Architecture Decisions

### Organization Structure
- **Single organization:** `spark-invoice-system` (Better Auth org plugin)
- **Roles:** `owner` (clinton@sparkafrica.co), `admin` (kingsonseang@gmail.com), `editor` (ada@sparkafrica.co), `invited` (tolu@sparkafrica.co)
- **ORGANIZATION_ID** written to `.env.local` by seed script
- All data scoped to `organizationId`

### Business vs Company (Template Distinction)
| Concept | Template Name | Purpose | Logo |
|---------|--------------|---------|------|
| **Business** | New Business (SPK), Africa Startup Festival (ASF), Africa Technology Expo (ATE) | Event/brand — carries logo, prefix | Yes (base64) |
| **Company** | The Spark Africa Technologies Limited (NG), Spark (UK) | Legal invoicing entity per region | **No** (dropped) |

### Logo Strategy
- **Business logos:** Base64 in `businesses.logo` (editable via Settings → Businesses & logos)
- **Header logo:** Static `/assets/spark-logo.png` (never changes)
- **Invoice/Memo documents:** Business logo (base64) at 210px width
- **ATE logo:** `null` (template has empty)
- **ASF logo:** `asf-logo-web.png` (259KB web-optimized)
- **NB logo:** `spark-logo.png` (44KB)
- **Upload limit:** 500KB, `image/png|jpeg`

### Bank Accounts
- Dynamic key-value rows (JSONB `fields: Array<[string, string]>`)
- One per currency (NGN, GBP, USD seeded)
- Used on Invoice document + PDF

---

## 13-Screen Template Map

| # | Screen (`data-screen-label`) | Route | Status |
|---|------------------------------|-------|--------|
| 1 | Sign in | `/auth/login` | ✅ Done |
| 2 | Overview | `/dashboard` | ✅ Done |
| 3 | Invoices | `/invoices` | ✅ Done |
| 4 | Invoice editor | `/invoices/new`, `/invoices/$id.edit` | ⚠️ Split needed |
| 5 | Invoice document | `/invoices/$id` | ✅ Done |
| 6 | Memos | `/memos` | ❌ New |
| 7 | Memo editor | `/memos/new`, `/memos/$id.edit` | ❌ New |
| 8 | Memo document | `/memos/$id` | ❌ New |
| 9 | Products | `/products` | ⚠️ Restructure |
| 10 | Clients | `/clients` | ⚠️ Restructure |
| 11 | Team | `/team` | ✅ Exists |
| 12 | Settings | `/settings` | ⚠️ Overhaul |
| 13 | Activity | `/activity` | ⚠️ Wire up |

---

## Phase 1: Foundation & Core Infrastructure

### 1.1 Database Migration
```sql
-- Drop companies.logo (template doesn't use company logos)
ALTER TABLE companies DROP COLUMN logo;

-- Add activityLog indexes
CREATE INDEX activity_log_user_created_idx ON activity_log (user_id, created_at);
CREATE INDEX activity_log_entity_label_idx ON activity_log (entity, label);
```

### 1.2 Activity System (`src/lib/activity.ts`)
**Core Functions:**
```typescript
// Log any action with generated summary
export async function logActivity(params: {
  userId: string
  userName: string
  userRole: 'owner' | 'admin' | 'editor'
  type: 'Created' | 'Edited' | 'Deleted' | 'Invited' | 'SignedIn' 
       | 'Voided' | 'PaymentRecorded' | 'SettingsChanged'
  entity: 'Invoice' | 'Client' | 'Product' | 'Memo' | 'User' 
        | 'Business' | 'Company' | 'Bank' | 'Settings'
  label: string        // "SPK-2026-0812"
  detail: string       // Generated summary per template rules
  changes?: FieldChange[]  // For Edited: [{ field, from, to }]
})

// Wrapper for server functions
export function withActivity<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  meta: { 
    entity: string; 
    getLabel: (args: any, result: any) => string; 
    getDetail: (args: any, result: any) => string 
  }
): T

// Field diff helper
export function diffObjects<T extends Record<string, any>>(old: T, new: T): FieldChange[]
```

**Generated Summary Rules (from template):**
| Action | Detail Format |
|--------|---------------|
| Invoice created | `"Created from Schedule A/B of the signed SOW"` |
| Tranche status change | `"Tranche 1 status: Unpaid → Paid"` |
| Invoice edited | `"Saved changes"` + field diffs |
| Payment recorded | `"Recorded payment of NGN 7,200,000.00"` |
| User invited | `"Invited ada@sparkafrica.co as Editor"` |
| Role changed | `"Changed role: Editor → Admin"` |
| Client/Product/Business/Company/Bank created/edited/deleted | `"Created Client: B4B Partners Limited"` |
| Memo created/edited | `"Created memo MEMO-2026-004"` |
| Sign in | `"Signed in"` |
| Settings changed | `"Updated FX rates to API mode"` |

### 1.3 Date Range Picker (`src/components/ui/date-range-picker.tsx`)
- `Popover` + `Calendar` (react-day-picker)
- **Presets:** Today, Yesterday, This Week, This Month, Last 4 Months, Custom
- Returns `{ from: Date | undefined, to: Date | undefined, preset: string }`
- Used in `/activity` route

### 1.4 Dependencies
```bash
pnpm add date-fns react-day-picker
```

---

## Phase 2: Seed System with Security

### 2.1 Seed Data (`src/lib/seed.ts`) — Template-Aligned
Complete data for all 10 entity types:

| Entity | Count | Source |
|--------|-------|--------|
| Organization | 1 | `spark-invoice-system` |
| Users | 4 | clinton (owner), ada (editor), kingsonseang (admin), tolu (invited) |
| Businesses | 3 | NB/ASF/ATE with base64 logos |
| Companies | 2 | Nigeria, UK (template only) |
| Banks | 3 | Zenith NGN, Wise GBP, Wise USD (dynamic fields) |
| Products | 6 | Template catalogue |
| Clients | 9 | B4B Partners + 8 ASF Kenya |
| Invoices | 9+ | SPK-2026-0812 tranche + 8 ASF |
| Memos | 1 | MEMO-2026-004 |
| Activity | 2+ | Template seed |
| FX Rates | 7 | USD:1, NGN:1530, GBP:0.74, EUR:0.86, KES:129.45, GHS:12.4, ZAR:18.1 |

**Idempotent:** Upsert by `organizationId + uniqueKey`

### 2.2 Seed Script (`scripts/seed.ts`)
- Calls `seedDb()`
- Writes `ORGANIZATION_ID=<id>` to `.env.local`

### 2.3 Seed Server Functions (`src/lib/server-fns/seed.ts`)
```typescript
// getSeedStatus → { empty: boolean, counts: {...} }
// seedDb → full transaction (org → users → companies → businesses → banks → products → clients → invoices → memos → activity → settings)
// clearDb → TRUNCATE ... CASCADE all app tables
```

### 2.4 Seed Token Email (`src/lib/server-fns/seed-token.ts`)
```typescript
// sendSeedToken → 6-digit token, 15min expiry, Resend to owner (or SEED_TOKEN_EMAIL)
// verifySeedToken → validates, marks used
// Owner email: process.env.SEED_TOKEN_EMAIL || 'clinton@sparkafrica.co'
// Plain text email (no HTML template needed)
```

### 2.5 Seed Page (`src/routes/seed.tsx`) — 2-Stage, No Auth
**Stage 1: Org Check**
- `beforeLoad` calls `getSeedStatus`
- If `!empty` → `redirect('/auth/login')`
- If `empty` but `ORGANIZATION_ID` missing in env → Show: "Add `ORGANIZATION_ID` to `.env.local` and redeploy" with copy button, **block Stage 2**

**Stage 2: Seed/Clear (only if org exists)**
- UI: Centered card `max-w-560 p-6 border-2 #201e1d`
- Disclaimer: "Creates demo org, 3 businesses, 2 companies, banks, products, clients, invoices, memos, activity. Owner: clinton@sparkafrica.co. Admins: kingsonseang@gmail.com. Password for all: `spark`."
- **Seed button** → calls `sendSeedToken` → emails token → shows "Token sent to clinton@sparkafrica.co (or SEED_TOKEN_EMAIL). Check email and enter token."
- **Token input** → calls `verifySeedToken` → if valid, calls `seedDb` → toast → `navigate('/auth/login')`
- **Clear DB button** → calls `clearDb` → reload

---

## Phase 3: Settings Overhaul

### 3.1 Settings Tabs (6 tabs — Team removed, FX Rates added)
| Tab ID | Label | Template Section |
|--------|-------|------------------|
| `profile` | Profile | My Profile (from Team screen) |
| `organization` | Organization | Org name/slug |
| `companies` | Invoicing companies | `isSetCompany` |
| `banks` | Bank accounts | `isSetBanks` |
| `businesses` | Businesses & logos | `isSetBrands` |
| `fx-rates` | Exchange Rates | **New** |

### 3.2 BanksPanel — Dynamic Key-Value Rows (Template Match)
```tsx
// Per bank card:
{fields.map(([k, v], i) => (
  <div className="grid grid-cols-[180px_1fr_auto] gap-8">
    <Input value={k} onChange={...} placeholder="Key (e.g. Account Number)" />
    <Input value={v} onChange={...} placeholder="Value" />
    <Button variant="ghost" size="icon" onClick={() => removeField(i)}><TrashIcon /></Button>
  </div>
))}
<Button variant="outline" size="sm" onClick={addField}>Add field</Button>
<Button variant="ghost" size="sm" onClick={removeBank}>Remove account</Button>
```

**Seed 3 banks with exact template fields:**
- Zenith NGN: Bank, Account name, Account no., TIN
- Wise GBP: Bank, Account name, Account no., Sort code, IBAN, SWIFT/BIC, Bank address
- Wise USD: Same as GBP

### 3.3 FX Rates Tab (`fx-rates`)
```tsx
// Toggle: Manual ↔ API (exchangerate-api.com)
// Manual: editable currency→rate grid (seeded with 7 currencies)
// API mode disclaimer: "Rates fetched daily via exchangerate-api.com. Requires valid EXCHANGERATE_API_KEY. Only available if API is accessible."
// Store in settings: { mode: 'manual'|'api', rates: {...}, lastFetched: iso }
```

### 3.4 FX Rates Server Functions (`src/lib/server-fns/references.ts`)
- `getFXRates` → returns `{ mode, rates, lastFetched }`
- `updateFXRates` → updates settings, triggers activity log

### 3.5 Cron API Route (`src/routes/api/cron/fx-rates.ts`)
```typescript
// GET /api/cron/fx-rates
// Checks settings: if mode === 'api' and EXCHANGERATE_API_KEY exists
// Fetches rates for seeded currencies (USD base)
// Updates settings with new rates + lastFetched
// Logs activity: "FX rates updated via API"
```

### 3.6 Coolify Config (`coolify.yml`)
```yaml
services:
  - name: fx-rates-cron
    type: cron
    schedule: "0 6 * * *"
    command: curl -X GET https://${DOMAIN}/api/cron/fx-rates
    environment:
      - EXCHANGERATE_API_KEY=${EXCHANGERATE_API_KEY}
```

### 3.7 Activity Triggers on Settings Mutations
Wrap all mutations with `withActivity()`:
- `createBusiness`/`updateBusiness`/`deleteBusiness`
- `createCompany`/`updateCompany`/`deleteCompany`
- `createBank`/`updateBank`/`deleteBank`
- `updateFXRates`

---

## Phase 4: Route Restructure

### 4.1 Products — Combined Layout (`1.5fr 1fr`)
**`src/routes/products/index.tsx`** — Rewrite
```tsx
<div className="grid lg:grid-cols-[1.5fr_1fr] gap-9 items-start">
  <div> 
    {/* Left: Table with inline Edit/Remove, Catalogue + buttons per template */}
    {/* Catalogue: "+ Product Name" buttons that add to line items */}
  </div>
  <div className="border-l-2 border-[#201e1d] pl-7"> 
    {/* Right: Add/Edit form (TanStack Form) */}
    {/* "ADD A PRODUCT OR SERVICE" panel per template */}
  </div>
</div>
```
**Delete:** `products/new.tsx`, `products/$id.edit.tsx`

### 4.2 Clients — Combined Layout (`1.5fr 1fr`)
**`src/routes/clients/index.tsx`** — Rewrite (same pattern)
```tsx
<div className="grid lg:grid-cols-[1.5fr_1fr] gap-9 items-start">
  <div> 
    {/* Left: Table with inline Edit/Remove per template */}
  </div>
  <div className="border-l-2 border-[#201e1d] pl-7"> 
    {/* Right: "ADD A CLIENT" form per template */}
  </div>
</div>
```
**Delete:** `clients/new.tsx`, `clients/$id.edit.tsx`

### 4.3 Memos — 4 Routes (Template Layouts)
| Route | Layout | Template Screen |
|-------|--------|-----------------|
| `memos/index.tsx` | Full-width table | Memos list |
| `memos/new.tsx` | `grid lg:grid-cols-[1.6fr_1fr]` | Memo editor |
| `memos/$id.edit.tsx` | `grid lg:grid-cols-[1.6fr_1fr]` | Memo editor |
| `memos/$id.tsx` | Full-width sheet + chrome | Memo document |

**Memo Editor (Template):**
- Left (1.6fr): Memo number, Date, Business, To, From, Company, Subject, Body (plain textarea, "one paragraph per line")
- Right (1fr): Memo History panel
- Body: Plain text for now (can upgrade to editor later)
- DB: `body` as `text("body")` — handles volume

**Memo Document:**
- Business logo (base64) at top left
- "MEMO" heading
- TO/FROM/DATE/REFERENCE grid
- Subject
- Body paragraphs
- Company footer

### 4.4 Activity — Admin/Owner Only (`src/routes/activity.tsx`)
```tsx
// beforeLoad: check session.user.role === 'owner' || 'admin' (via Better Auth org)
// DateRangePicker with presets (Today, Yesterday, This Week, This Month, Last 4 Months, Custom)
// Search input (person, invoice number, field)
// Paginated table: WHEN | WHO | ACTION (badge) | RECORD | DETAIL
// Server fn: getActivity({ from, to, query, page, pageSize })
// Page size: 25
```

### 4.5 Team — Real Org Members (`src/routes/team.tsx`)
- Fetch Better Auth org members via `authClient.organization.listMembers()`
- Table: NAME | EMAIL | ROLE | STATUS
- Invite panel (admin/owner only): Name, Email, Role (editor/admin) → `authClient.organization.inviteMember()` → Resend email → activity log
- Role toggle (admin/owner only): `authClient.organization.updateMemberRole()`
- My Profile section: Name, Title, Email (disabled), Password change

---

## Phase 5: Component Updates

### 5.1 InvoiceForm — Split + New Client Dialog
**Split InvoiceForm** into logical sections (per template editor layout):
1. **Business & Invoicing Entity** — Business select, Company select
2. **Invoice** — Number (with Auto), Issue Date, Due Date, Currency (searchable), Description, Tax
3. **Client** — Client select + **+ New client** → **Dialog** (TanStack Form)
4. **Products & Services** — Line items + Catalogue `+` buttons + **Split evenly** button (tranches)
5. **Payment Terms** — Full vs Tranche toggle, Tranche rows (Milestone, Deliverables, Due, Amount, Paid toggle)
6. **Payment Destination & Memo** — Bank select OR Payment Link (URL, Label, Currency searchable)
7. **Right Panel (1fr)** — Save Note + Commentary + Edit History

**New Client Dialog:**
- `+ New client` button → `Dialog` (shadcn Dialog)
- Form: Name, Email, Contact, Reg, Address, Notes (TanStack Form)
- `Save and use` → creates client via server fn, selects it in combobox
- `Cancel` → closes dialog

### 5.2 InvoiceDetail / InvoicePDF — Business Logo (base64)
- Verify `business.logo` base64 renders in both HTML (`InvoiceDetail`) and PDF (`InvoicePDF`)
- Fallback: `/assets/spark-logo.png`

### 5.3 BusinessesPanel — File Upload → Base64
- `<input type="file" accept="image/*" onChange={toBase64} />`
- Validate: `< 500KB`, `image/png|jpeg`
- Preview `h-16`
- `Clear logo` button → sets `null`

### 5.4 Header — 8 Nav Items (Template Chrome)
```tsx
// data-chrome="1" sticky top-0 z-[5]
// Logo: /assets/spark-logo.png (118px)
// Nav: Overview / Invoices / Memos / Clients / Products / Team / Activity / Settings
// New Invoice: bg-[#ec3013]
// User: name (12px 600) + role (10px 0.1em #5c5755 uppercase)
// Sign out: border #201e1d bg-white
```

---

## Phase 6: Activity Triggers on All Mutations

Wrap **every** server function with `withActivity()`:

| Module | Functions |
|--------|-----------|
| `settings.ts` | Business, Company, Bank, FX Rates CRUD |
| `invoice-create.ts` | `createInvoice`, `updateInvoice` |
| `payments.ts` | `recordPayment` |
| `references.ts` | `updateFXRates` |
| `seed.ts` | `seedDb`, `clearDb` |
| `memos.ts` (new) | Memo CRUD |
| `products.ts` (combined) | Product CRUD |
| `clients.ts` (combined) | Client CRUD |

---

## Phase 7: InvoiceForm Split Details

### Current: Single large component
### Target: Split into composable sections (Vercel Composition Patterns)

**Sections as separate components:**
```
InvoiceForm (orchestrator)
├── BusinessEntitySection (Business + Company selects)
├── InvoiceSection (Number, Dates, Currency, Description, Tax)
├── ClientSection (Client select + New Client Dialog)
├── LineItemsSection (Items + Catalogue + Add blank line)
├── TranchesSection (Payment type toggle + Tranche rows + Split evenly)
├── PaymentDestinationSection (Bank select OR Link fields)
├── RightPanel (Save Note + Commentary + Edit History)
```

Each section:
- Receives `form` from parent `useForm`
- Uses `form.Field` for scoped fields
- Self-contained validation
- Testable in isolation

---

## File Touch List (Complete)

| File | Action |
|------|--------|
| `src/db/schema.ts` | Drop `companies.logo`; add `activityLog` indexes |
| `src/lib/activity.ts` | **New** — core activity system |
| `src/components/ui/date-range-picker.tsx` | **New** — Popover + Calendar with presets |
| `src/lib/seed.ts` | **New** — complete template seed |
| `scripts/seed.ts` | Refactor → call `seedDb`, write `.env.local` |
| `src/lib/server-fns/seed.ts` | **New** — seed server fns |
| `src/lib/server-fns/seed-token.ts` | **New** — token email flow |
| `src/routes/seed.tsx` | **New** — 2-stage seed page |
| `src/routes/team.tsx` | Real org members + invite + activity |
| `src/routes/products/index.tsx` | Rewrite combined `1.5fr 1fr` |
| `src/routes/products/new.tsx` | **Delete** |
| `src/routes/products/$id.edit.tsx` | **Delete** |
| `src/routes/clients/index.tsx` | Rewrite combined `1.5fr 1fr` |
| `src/routes/clients/new.tsx` | **Delete** |
| `src/routes/clients/$id.edit.tsx` | **Delete** |
| `src/routes/memos/index.tsx` | **New** — list |
| `src/routes/memos/new.tsx` | **New** — editor `1.6fr 1fr` |
| `src/routes/memos/$id.edit.tsx` | **New** — editor |
| `src/routes/memos/$id.tsx` | **New** — document |
| `src/routes/activity.tsx` | Admin-only, DateRangePicker, search, pagination |
| `src/routes/settings.tsx` | Update tab imports |
| `src/routes/api/cron/fx-rates.ts` | **New** — cron endpoint |
| `src/components/settings/SettingsLayout.tsx` | Fix Banks, remove Team, add FX Rates |
| `src/lib/server-fns/settings.ts` | Wrap mutations with activity |
| `src/lib/server-fns/invoice-create.ts` | Wrap with activity + split form |
| `src/lib/server-fns/payments.ts` | Wrap with activity |
| `src/lib/server-fns/references.ts` | Add FX rates fns |
| `src/lib/server-fns/memos.ts` | **New** — memo CRUD |
| `src/components/invoice/InvoiceForm.tsx` | Split sections + New Client Dialog |
| `src/components/settings/BusinessesPanel.tsx` | File upload → base64, 500KB |
| `src/components/layout/Header.tsx` | Verify 8 nav items |
| `coolify.yml` | **New** — cron service config |
| `.env.local` | Add `ORGANIZATION_ID`, `EXCHANGERATE_API_KEY`, `SEED_TOKEN_EMAIL` |

---

## Validation Checklist

- [ ] `pnpm build` passes
- [ ] `pnpm test -- --run` passes
- [ ] `tsc --noEmit` clean
- [ ] `/seed` Stage 1: blocks without `ORGANIZATION_ID`
- [ ] `/seed` Stage 2: emails token to clinton (or `SEED_TOKEN_EMAIL`)
- [ ] Token verify → seeds → `/dashboard` shows KPIs > 0
- [ ] InvoiceForm: Business/Company/Client selects populated, New Client Dialog works, Split evenly works
- [ ] Settings: 6 tabs, Banks dynamic rows, FX Rates toggle works
- [ ] Products/Clients: Combined `1.5fr 1fr` layout
- [ ] Memos: 4 routes working (list, new, edit, doc)
- [ ] Activity: Admin/Owner sees logs, DateRangePicker presets work, search works
- [ ] PDF: Bank fields render, business logo (base64) renders
- [ ] Cron: `curl /api/cron/fx-rates` updates rates in API mode
- [ ] Users: clinton=owner, kingsonseang=admin, ada=editor, tolu=invited
- [ ] Coolify: `coolify.yml` deploys cron service

---

## Implementation Order (Dependency-Aware)

```
Phase 1: Foundation
  1.1 DB migration (drop companies.logo, add indexes)
  1.2 Activity system (src/lib/activity.ts)
  1.3 DateRangePicker component
  1.4 pnpm add date-fns react-day-picker

Phase 2: Seed System
  2.1 src/lib/seed.ts (complete template data)
  2.2 scripts/seed.ts (refactor + .env.local write)
  2.3 src/lib/server-fns/seed.ts (getSeedStatus, seedDb, clearDb)
  2.4 src/lib/server-fns/seed-token.ts (send/verify token)
  2.5 src/routes/seed.tsx (2-stage page)

Phase 3: Settings Overhaul
  3.1 SettingsLayout.tsx (6 tabs, Banks dynamic, FX Rates)
  3.2 BusinessesPanel.tsx (file→base64)
  3.3 src/lib/server-fns/references.ts (FX rates fns)
  3.4 src/routes/api/cron/fx-rates.ts (cron endpoint)
  3.5 coolify.yml (cron service)
  3.6 Wrap settings mutations withActivity()

Phase 4: Route Restructure
  4.1 products/index.tsx (combined 1.5fr 1fr) + delete new/edit
  4.2 clients/index.tsx (combined 1.5fr 1fr) + delete new/edit
  4.3 memos/ (4 new routes)
  4.4 activity.tsx (admin/owner, DateRangePicker, search, pagination)
  4.5 team.tsx (real org members + invite)

Phase 5: Component Integration
  5.1 InvoiceForm.tsx (Split sections + New Client Dialog)
  5.2 InvoiceDetail/InvoicePDF (business logo base64)
  5.3 Header.tsx (verify 8 nav items)
  5.4 Wrap remaining mutations withActivity()

Phase 6: Validation
  - pnpm build, test, tsc
  - Full seed → dashboard → forms → settings → activity → PDF
```

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Better Auth roles | Use `owner`/`admin`/`editor` from `userRoleEnum` in schema |
| Org members API | Use `authClient.organization.listMembers()` + `inviteMember()`/`updateMemberRole()` |
| Activity `entity` storage | `text("entity")` with application-level validation (enum in code) |
| InvoiceForm "Split evenly" | Implement in TranchesSection |
| Memo editor | Plain textarea (`text("body")`) — upgrade later |
| Seed token email | Plain text via Resend |
| Currency search | Keep existing `curQuery`/`curResults` pattern |
| Companies count | 2 (NG, UK) per template |

---

## Better Auth Usage (Per Skills)

All auth/org/team operations use Better Auth plugins:
- **Server:** `auth.api.*` (createOrganization, addMember, updateMemberRole, etc.)
- **Client:** `authClient.organization.*` (listMembers, inviteMember, setActive, createTeam, etc.)
- **Hooks:** Organization plugin hooks for lifecycle (afterCreate → seed defaults)
- **No custom auth patterns** — follow Better Auth conventions exactly

---

## Next Step

**Confirm this specification** → Begin Phase 1 implementation with `/implement` skill.