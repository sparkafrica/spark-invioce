# Template Gap Analysis — Invoice App v2.dc.html → spark-invioce

## Role & Context
You are an expert full-stack TypeScript engineer specializing in TanStack Start, shadcn/ui with Base UI, Better Auth, and TanStack Table/Form/Query. Follow Matt Pocock's AI Hero Skills: plan before code, grill ambiguities, break into tickets, implement in phases, review rigorously.

## Tech Stack (Non-Negotiable)
- Framework: TanStack Start (React 19, Vite + Nitro)
- Styling: Tailwind + shadcn/ui (Base UI, sharp 0 radius, Archivo, Modernist tokens)
- Auth: Better Auth + org plugin (single org `spark-invoice-system`)
- Data: TanStack Query (server fns), Table, Form + valibot
- DB: Drizzle + PostgreSQL
- PDF: @react-pdf/renderer (server-only)

## Source Material
- Template: `C:/Users/DELL/Downloads/Spark Invoice App (3)/Invoice App v2.dc.html` (13 screens via `data-screen-label`)
- Template: `Spark Invoice.dc.html` (single invoice sheet)
- Current Code: `C:/Users/DELL/Projects/Spark/spark-invioce` (master, 74ae591)
- Spec Reference: `INVOICE_MIGRATION_SPEC.md`

## Screen Inventory — Template vs Current

### 1. Sign in — `data-screen-label="Sign in"` (v2:25-63, two-col grid 1fr 1fr, left branding 190px logo + 42px headline `Invoices, memos…` + TIN, right 360px form `SIGN IN` kicker #c02a10, email/password 12px 600, input border #201e1d, primary #ec3013, `Forgot password — reset it` secondary, demo `clinton/ada / spark`)
**Current:** `src/routes/auth/login.tsx` now matches (tanstack form + Field, split grid, demo text) ✓
**Gap:** Heading was 44px → reduced 32px; demo `Any password` now `spark` seeded; forgot link now `authClient.requestPasswordReset` with mock `sendResetPassword`
**Fix:** Done. Keep.

### 2. Overview — `data-screen-label="Overview"` (v2:81-311, filters Business/Currency/Period, 5 KPIs, Revenue & collections trend SVG, Invoice status donut, Revenue by business bars, Receivables aging, Business×currency matrix, Top outstanding, Upcoming & overdue, Recent activity)
**Current:** `src/routes/dashboard.tsx` rebuilt with filters (business/currency/period) and 5 KPIs, revenue panels, matrix — but filters were static until last fix, now wired to `getInvoices` + `filtered` memo; trend SVG is placeholder div not real path; donut is div not SVG; aging bars simplified.
**Gap:** — Trend `invoicedArea/invoiced/collected` SVG paths not implemented (template lines 130-145). — Donut `statusDonut` dasharray not computed from real status counts (uses count only). — Period filters "Last 90 days/This month" logic approximates issued date string compare, not robust date. — Recent activity reads "No activity yet" not from `activityLog`.
**Fix:** Phase 7 — implement real SVG trend with `d3` or inline path from filtered invoices grouped by month; donut dash from `statusCounts`; wire `activityLog` server fn.

### 3. Invoices — `data-screen-label="Invoices"` (v2:314-360, Business filter All/NB/ASF/ATE, filtered banner #f0dcd8, table NUMBER/CLIENT/BUSINESS/ISSUED/DUE/TYPE/TOTAL/STATUS/NOTES with Edit border #201e1d / Open bg #201e1d, row hover #f0dcd8, `confirmOpen` modal)
**Current:** `src/routes/invoices/index.tsx` + `InvoiceTable.tsx` rebuilt with Business filter, banner, 10-col table, status chips, Edit/Open, pagination — but missing `NOTES` sorting? Actually NOTES is commentCount.
**Gap:** — Table should support `confirmOpen` modal for delete (template 362-373) — currently no modal, `onDelete` just logs. — Business filter in template filters via dashboard drill (`listFilterLabel`), our filter is local state not URL-synced. — No `TYPE` full/tranche distinction in row? We have.
**Fix:** Add delete confirm modal (reuse `Dialog` sharp), URL-sync filters via `validateSearch` + `retainSearchParams`.

### 4. Invoice editor — `data-screen-label="Invoice editor"` (v2:375-604, grid 1.55fr 1fr gap32, left: BUSINESS & INVOICING ENTITY (2-col select), INVOICE (number Auto + date + currency search + tax), CLIENT (select + new client panel border2), PRODUCTS & SERVICES (catalog + items grid 1.4fr 0.5fr 1fr 1fr 0.6fr 0.8fr auto), PAYMENT TERMS (full/tranche + Add tranche/Split evenly + tranches grid + warning), PAYMENT DESTINATION & MEMO (bank/link + memo), right: SAVE NOTE + COMMENTARY + EDIT HISTORY)
**Current:** `src/components/forms/InvoiceForm.tsx` rethemed to grid 1.55fr 1fr, has BUSINESS & ENTITY, INVOICE, CLIENT, PRODUCTS, PAYMENT TERMS, MEMO + right SAVE NOTE/COMMENTARY/HISTORY — but number field hidden bug, currency duplicate removed, still uses `form.getFieldValue` for items/tranches not `form.Field` array, missing Split evenly, catalogue `+` buttons, `+ New client` panel is simple navigate not inline panel, `Save note` not persisted to `invoiceHistory`.
**Gap:** — Missing `Split subtotal evenly` (line 503). — Missing `catalogue` products `+` quick-add (line 461). — Missing inline `+ New client` border2 panel (line 429-442) — we navigate to `/clients/new` instead. — Missing `Edit History` real data from `invoiceHistory` table (we show placeholder). — Missing `Commentary` post (requires saved invoice, we show placeholder). — `Invoice number Auto` not implemented (we hide).
**Fix:** Implement `Split evenly` (divide subtotal / tranches.length), inline client panel (use `ClientForm` inline), catalogue `useQuery getProducts` + `+` buttons, wire `saveNote` to `activityLog`, fetch history.

### 5. Invoice document — `data-screen-label="Invoice document"` (v2:606-..., plus `Spark Invoice.dc.html` single sheet: logo 210px, INVOICE 30px, No./Date, 2px divider, FROM/BILL TO grid, Re: line, table MILESTONE/DELIVERABLES/DUE/AMOUNT/TAX/TOTAL, totals grid 1fr 320px + DUE NOW banner #ec3013, payment info, note, Back/Edit/Download PDF chrome)
**Current:** `src/components/invoice/InvoiceDetail.tsx` rewritten to sheet `max-w-860 p-54 shadow` with chrome, but still shows Items when should show Tranches as milestones, totals use `invoice.subtotal` etc. which may not match tranche sum when tranche mode. Also missing `voided` handling, `payLink` display.
**Gap:** — Sheet should hide sidebar `Actions` Cards (we removed) ✓ but need `Back/Edit` vs `Edit Invoice` duplicate? — `DUE NOW` should be next unpaid tranche + tax, we do but not handling full type. — `Bank` fields should show `fields` array as in template, we do. — Missing `WHT` note handling for NG.
**Fix:** Already close; verify `paymentType` switch and `voided` banner.

### 6. Memos — `data-screen-label="Memos"` (v2: similar to Invoices but for memos, table)
**Current:** No route `src/routes/memos/*` — missing entirely.
**Gap:** CRITICAL — Template has Memos list, Memos editor (1.6fr 1fr), Memo document. Our `memos` table exists in `schema.ts` but no UI/server fns/routes. Users cannot create memos.
**Fix:** Phase 6.5 — Add `src/lib/server-fns/memos.ts` (CRUD), `src/routes/memos/index.tsx`, `new.tsx`, `$id.tsx`, `$id.edit.tsx`, reuse editor grid.

### 7. Memo editor — `data-screen-label="Memo editor"`
**Current:** Missing.
**Gap:** Same as above.
**Fix:** Create `MemoForm.tsx` similar to Invoice editor but with To/From/Date/Subject/Body (schema `memos`).

### 8. Memo document — `data-screen-label="Memo document"`
**Current:** Missing.
**Gap:** Same.
**Fix:** Create `MemoDetail.tsx` sheet.

### 9. Products — `data-screen-label="Products"` (v2: grid 1.5fr 1fr gap32, left catalogue table NAME/COST/CURRENCY, right new product form)
**Current:** `src/routes/products/index.tsx` separate list + `new.tsx` separate page, not 1.5fr 1fr combined. `ProductForm.tsx` is full page, not right panel.
**Gap:** — Layout should be combined `Products` screen as in template (left table + right form inline), not separate routes. — Cost should be tabular-nums, currency badge, hover #f0dcd8.
**Fix:** Merge `products/index.tsx` to grid 1.5fr 1fr with `ProductForm` inline, or keep routes but retheme list to template table (currently still gray).

### 10. Clients — `data-screen-label="Clients"` (v2: similar 1.5fr 1fr, table NAME/CONTACT/EMAIL/REG)
**Current:** `src/routes/clients/index.tsx` separate list + `ClientForm` full page, not combined.
**Gap:** Same as Products — should be combined grid when on `/clients` (left table + right form) vs separate. Currently separate.
**Fix:** Same — combine or retheme list to template.

### 11. Team — `data-screen-label="Team"` (v2:356-404, grid 1.4fr 1fr gap36, left 32px Team header + table NAME/EMAIL/ROLE/STATUS with role button, right INVITE A TEAM MEMBER form border-l 2px, only admins)
**Current:** `src/components/settings/SettingsLayout.tsx` now replicates Team as `team` tab, but `src/routes/settings/index.tsx` is `/settings` not `/team`. No dedicated `/team` route. Also no `/activity` etc. Team table is mock not real `member` query.
**Gap:** — No `/team` route (header nav has Settings not Team). — Invite uses `authClient.organization.inviteMember` but template role change is `toggleRole` button per row (line 376). — Not fetching real `member` + `user` join.
**Fix:** Add `src/routes/team.tsx` or keep under `settings?tab=team` but add nav link, wire `getTeamMembers` server fn.

### 12. Settings — `data-screen-label="Settings"` (v2: header + toggles)
**Current:** `SettingsLayout` has Profile/Organization/Team but template Settings is simple toggles (maybe appearance?). Our Team now inside Settings, but template has separate Settings screen with different content (maybe toggles). Our current Settings header `32px` now `24px` after reduction, but still tabbed.
**Gap:** — Settings should be as template `Settings` (22 lines: toggles for notifications etc.) — we have extra Profile/Organization/Billing/Preferences which may be beyond template. Billing is not in template at all.
**Fix:** Keep but retheme to sharp, or hide Billing if not needed.

### 12b. Settings — Invoicing Companies / Bank Accounts / Businesses & Logos (template `Invoice App v2` Settings + DB `schema.ts:120-164`)
**Template:** `v2` Settings + `Invoice editor` `Business & Invoicing Entity` expects persisted `businesses` (3: NB/ASF/ATE with `name`, `prefix`, `logo` — template shows logo in invoice header `assets/spark-logo.png` 118-210px, and Businesses & logos editor in Settings), `companies` (invoicing entities per region with `name`, `reg`, `address`, `email`, `phone`, `tin`, `defaultCurrency`, `logo` — template `Spark Nigeria Ltd` etc.), `banks` (per `organizationId` + `currency` + `label` + `fields` JSON `[string,string][]` — template `Bank account on the invoice` select + `fields` like Account Number/Bank Code, and `PAYMENT INFORMATION — BANK TRANSFER` footer). All three are **static in seed** (`scripts/seed.ts` 3 each) but **not editable** in MVP `SettingsLayout.tsx` — `BusinessesList`/`CompaniesList` are hardcoded `Acme` arrays, not DB; no `Bank accounts` tab at all; no `logo` upload/display; invoice editor selects from DB but settings cannot persist changes.
**Current:** `src/db/schema.ts:140-164` **already persisted** (`businesses` `logo TEXT`, `companies` `logo` + `defaultCurrency`, `banks` `fields JSONB`) and `src/lib/server-fns/references.ts`/`settings.ts` have `getBusinesses`/`getCompanies`/`getBanks` queries, but `SettingsLayout.tsx:115-245` `OrganizationSettings` only shows `orgName/slug/logo` + `defaultCurrency/timezone` inputs, `BusinessesList`/`CompaniesList` are mock `useState` not `useQuery`, no `Bank accounts` (`banks` table) UI, no `logo` file input, no `updateBusiness`/`updateCompany`/`createBank` mutations.
**Gap:** CRITICAL for 100% match — Template requires **editable** `Businesses & logos`, `Invoicing companies`, `Bank accounts` all persisted to DB (`organizationId` scoped). MVP shows static `Acme Inc.` not `Spark` org, cannot change logo/prefix, cannot add Bank `fields`, cannot set `defaultCurrency` per company, breaks invoice header logo and bank footer.
**Fix (P0 — 100% match, DB already ready):** No new migration (columns exist) — just UI persistence. Add `SettingsLayout` tabs `Invoicing companies` / `Bank accounts` / `Businesses & logos` (keep `Profile/Team` as in template, hide `Billing/Preferences` or keep collapsed). Each tab: `border-2 #201e1d bg-white p-4` `10px 0.12em #c02a10` kicker, `Label 11px 600` + `Input`/`Select`/`Combobox` searchable (follow design system), `logo` as `Input type="url"` + preview `img` 118px (or `Input type="file"` → upload to `logo` URL), `fields` dynamic `grid 1fr 1fr` + `+ Add field`/`✕` (reuse `InvoiceForm` tranche pattern). Wire to `updateBusiness` (`name`, `prefix`, `logo`), `updateCompany` (`name`, `reg`, `address`, `email`, `phone`, `tin`, `defaultCurrency`, `logo`), `createBank`/`updateBank` (`currency` `Select` 61, `label`, `fields`). `useQuery` refetch + `toast` + `activityLog`. Verify `businesses.logo` appears in `Header.tsx` `img` and `InvoiceDetail.tsx`/`InvoicePDF.tsx` header; `companies` appears in `InvoiceForm` Business & Entity selects; `banks` appears in `InvoiceForm` Bank select and invoice footer.

### 13. Activity — `data-screen-label="Activity"` (v2: activity feed with `activityLog` table, filter by type)
**Current:** No route `/activity`. Dashboard shows `Recent activity` placeholder "No activity yet" but not real. No dedicated page.
**Gap:** CRITICAL — Template has full Activity screen with `activityLog` (user, type, entity, label, detail, metadata, createdAt). Our `activityLog` table exists but no UI.
**Fix:** Add `src/routes/activity.tsx` + server fn `getActivityLog`.

## Component Gaps

- **Header:** Fixed to v2 `12px 24px border-b-2 gap-20` but nav should include `Team`/`Activity`/`Memos` as per template, not just `Overview/Invoices/Clients/Products/Settings`.
- **Button:** Fixed to `border #201e1d / bg #ec3013` rounded-none, but some still `rounded-lg` (PaymentModal) needs update.
- **Table:** `InvoiceTable` fixed, but `Clients`/`Products`/`Team` tables still `bg-gray-50` in some routes (we fixed bulk but need verify).
- **Card:** Rethemed to `border #d6d3d1 bg-white` but template cards are `gap 2px bg #201e1d` panels.
- **Select:** Fixed to `border #201e1d bg-white`, but `InvoiceForm` business/company now `Popover+Command` searchable ✓
- **Heading sizes:** Reduced `42→28`, `32→24`, `30→22` as requested.

## Feature Gaps

- **Payment link (manual) — CLARIFIED:** Admin inputs `payLink` manually per invoice (template `v2:538-546` `payViaLink` with `payLink` `https://checkout.korapay.com/pay/…`, `payLinkLabel`, `linkCurCurrent` search). Previous `paymentMethod` toggle existed but `payLink` was optional and not wired to doc; `payLinkCurrency` missing. **Updated DB** `src/db/schema.ts:214` added `payLinkCurrency currencyEnum("pay_link_currency")` (manual, separate from `currency`), both `bank` and `link` enabled (either `bankId` or `payLink`/`payLinkLabel`/`payLinkCurrency` persisted). Template allows `Bank` vs `Link` toggle — now exact. **Doc** `InvoiceDetail.tsx` must show `Pay online` button when `paymentMethod==='link'` else bank table. **Form** `InvoiceForm.tsx:437` now shows `Bank` select vs `Link` grid `2fr 1fr` + currency search for link (template `linkCurQuery`/`linkCurResults`).
- **Search combobox:** Done for business/company/client in `InvoiceForm.tsx:283-389` via `Popover+Command` (shadcn combobox) with `CheckIcon`.
- **Currency:** `ProductForm.tsx:18` now `Select` (was Input) ✓ — also `InvoiceForm` currency is `Select` (was duplicate Input), `payLinkCurrency` also `Select` search.
- **Split evenly / catalogue + / inline new client:** Missing in `InvoiceForm` (see #4).
- **Save note / Commentary / History:** Right sidebar exists but not wired to DB.
- **Confirm modal:** `Invoice App v2:362` `confirmOpen` not implemented for delete.
- **PDF:** `InvoicePDF.tsx` exists but uses `Font.register` with Google fonts, not `Archivo` as template? Should be `Archivo`.
- **Dark mode:** Removed `.dark` as template is light-only ✓
- **Forms:** Converted `login/register/forgot/reset` to tanstack `useForm` + `Field` + `FieldLabel/FieldError` + `Input/Button` reusable, `ProductForm`/`ClientForm` also converted, but `InvoiceForm` still uses `form.getFieldValue` for items/tranches not `form.Field` array.

## Action Plan (Priority)

1. **P0 — Auth + Header + Dashboard filters:** Done, verify.
2. **P0 — Invoice editor gap:** Implement `Split evenly`, inline `New client` panel, catalogue, wire history/commentary.
3. **P0 — Memos & Activity routes:** Create missing routes + server fns + nav.
4. **P1 — Team/Activity nav:** Add `/team`, `/activity`, `/memos` to `Header.tsx` nav, create routes.
5. **P1 — Confirm modal & delete flows.**
6. **P2 — Polish tables for Clients/Products to combined 1.5fr 1fr as template.**
