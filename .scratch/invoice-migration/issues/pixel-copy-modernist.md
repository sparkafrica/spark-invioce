# Ticket: Pixel-Copy Modernist — Replace Sea/Lagoon, Retheme All Pages + Shadcn to Template

**Outcome:** Every route, layout, typography scale, table, form, and shadcn primitive matches `Spark Invoice.dc.html` + `_ds/modernist-e821effe.../styles.css` (Archivo, sharp 0px radius, red accent `#ec3013`, `tabular-nums`, 7.5pt kickers). Sea/lagoon tokens deleted.

## Decision: What was removed vs. mapped

- Deleted from `src/styles.css`: `--sea-ink`, `--sea-ink-soft`, `--lagoon`, `--lagoon-deep`, `--palm`, `--sand`, `--foam`, `--surface`, `--surface-strong`, `--line`, `--inset-glint`, `--kicker`, `--bg-base`, `--header-bg`, `--chip-bg`, etc., `Fraunces`+`Manrope`, `island-shell`, `feature-card`, `island-kicker`, `nav-link::after` lagoon gradient, `body::before/after` glows, grid glint.
- New `src/styles.css` (done): imports `Archivo 400;500;600;700;800`, maps `:root` to modernist tokens (`--color-bg #f3f2f2`, `--color-surface #eae9e9`, `--color-text #201e1d`, `--color-accent #ec3013`, `--color-accent-700 #ae1800`, neutral `100-900`, `radius 0`, `shadow-*`, `space-*`). Shadcn `--background/foreground/card/primary/border/input/ring` now alias those tokens. `h1 42px h2 32px h3 25px` heading `800`, `::selection` accent `30%`, `focus-visible` accent ring. Dark maps to `bg #201e1d / surface #2d2b2b`.

## Audits (frontend-design + web-interface-guidelines)

**Template invariants to copy verbatim:**
- Page `0.6in` padding, flex `gap 20px`, `9.5pt/1.45`, logo `210px`, `INVOICE 26pt weight 700 -0.02em`, `No.`/`Date` `9pt`, `2px` dividers `var(--color-text)`, `FROM/BILL TO` kicker `7.5pt 0.12em --color-accent-700`, grid `1fr 1fr gap 32px`, `Re:` bar `border-top/bottom --color-neutral-300`, table headers `7.5pt 0.1em 600`, rows `border-bottom --color-neutral-300`, `tabular-nums` on amounts, totals `25,500,000.00` block `300px`, `DUE TODAY` banner `bg --color-accent white text 7.5pt + 11pt 700`, footer `7.5pt accent-700`.

**Current app drift (must fix):**

### `src/styles.css:1` (was)
- `Fraunces/Manrope` → replace `Archivo` ✓ done, `__root.tsx:55` still `selection:bg-[rgba(79,184,178,0.24)]` → change to `selection:bg-[color-mix(in_srgb,var(--color-accent)_30%,transparent)]`.

### `src/components/layout/Header.tsx`
- `Header.tsx:31` `bg-white border-gray-200` → `bg-[var(--color-bg)] border-[var(--color-neutral-300)]`.
- `47-56` logo+brand: add `translate="no"` to brand, `width/height` on `<img>` (CLS), `loading="eager"` + `fetchpriority="high"` for above-fold.
- `58-79` nav: currently `rounded-md bg-gray-100` with `text-sm font-medium` gray — must be modernist `.btn` pattern: active `bg-[var(--color-accent)] text-[var(--color-bg)]`, inactive `text-[var(--color-text)] hover:bg-[var(--color-neutral-200)]`, `font-heading 800 14px`, no radius, `uppercase`? Keep labels but size `14px`.
- `37` icon-only `Toggle menu`: has `aria-label` ✓ pass, but `focus-visible:ring-*` missing on trigger; ensure `focus-visible:ring-2`.
- `83-126` dropdown: organization/team switcher uses `Building2Icon` without `aria-hidden`, items lack keyboard `Enter` handling visibility; add `aria-hidden="true"` to icons, ensure `DropdownMenuTrigger` uses `<button>` not div.
- Missing: `skip link` to `main-content`, `header` needs `color-scheme: light` body already, but ensure `header` sticky not covering focus (`scroll-margin-top` on headings).

### `src/components/layout/MainLayout.tsx`
- `14` `bg-gray-50 dark:bg-gray-900` → `bg-[var(--color-bg)] text-[var(--color-text)]`.
- Missing skip link: add `<a href="#main-content" class="skip-link">Skip to content</a>`.

### `src/routes/dashboard.tsx:18-46`
- Cards `rounded-lg border bg-white shadow-sm` + `text-gray-500` → Modernist `.card` + `.elev-sm`: `bg-[var(--color-surface)] p-[var(--space-3)] rounded-none`, kicker `10px 0.1em uppercase --color-accent`, title `17px 800`.
- Stats numbers `text-3xl font-bold gray-900` → `tabular-nums font-heading 800 32px`, `text-[var(--color-text)]`.
- No `aria-live` for async, but dashboard static. Add `h1` hierarchy (currently `h1 Dashboard` ✓) and ensure `page-wrap`.

### `src/components/table/InvoiceTable.tsx`
- `197-221` toolbar: search `placeholder` missing `…` (rule: `…` not `...`), needs `type="search"`, `autocomplete="off"`, `spellCheck=false`, label missing. Add `<Label htmlFor="invoice-search">Search invoices…</Label>` + `aria-label`.
- `207-219` Select page size: headless `Select` needs `aria-label` on trigger; add.
- `225` table wrap `rounded-lg border bg-white shadow-sm` → `bg-[var(--color-surface)] border border-[var(--color-neutral-300)]`.
- `227` `thead bg-muted/50` → `border-b-2 border-[var(--color-text)]`, `th 7.5pt 0.1em 600 uppercase tabular-nums`.
- `253-279` `tbody divide-y` → `border-b border-[var(--color-neutral-300)]`, `hover:bg-[var(--color-neutral-200)]`, `text-[var(--color-text)] 9pt`.
- Status pills `statusStyles` gray `rounded text-xs` → `tag` spec `11px` no radius? Keep but map to template: `draft` neutral, `paid green`? Modernist only has accent; map `paid` to `--color-accent` white text, `part_paid` to `--color-accent-300`, etc.
- Actions `Button variant=outline size=sm` four per row: need `aria-label` (`Open invoice SPK-…`, `Edit`, `Duplicate`, `Delete`), `Delete` destructive needs confirm modal (navigation&state rule).
- `239-246` sort arrows `▲/▼` missing `aria-hidden`, add `aria-sort` on `<th>`.
- Missing `min-w-0` on flex children with `truncate`; `287-315` pagination needs `URL reflects state` — pagination should sync to `?page=&size=` via `validateSearch`.

### `src/components/invoice/InvoiceDetail.tsx`
- `150-168` header `text-2xl font-bold text-gray-900` + `text-gray-500` → Modernist `INVOICE 26pt 700 -0.02em`, `No./Date 9pt`, `FROM/BILL TO 7.5pt 0.12em accent-700` (template `p 0.6in gap 20px 9.5pt`). Replace `space-y-6 gray cards` with template page: `bg-white p-[0.6in] flex flex-col gap-[20px]`.
- `174-251` `Card` `rounded-lg border bg-white` → flat sections, no shadcn rounded/shadow; use `border-y border-[var(--color-neutral-300)]` for `Re:` bar, dividers `2px var(--color-text)`.
- `259-308` line items table: header must be `MILESTONE / DELIVERABLES / DUE / AMOUNT / VAT / TOTAL` pattern from template, not `Product / Service / Description / Qty / Unit Cost / Discount / Total`; map `discount` column out, add `VAT 7.5%` calc per row, `tabular-nums`.
- `313-334` totals: `max-w-md border-t` → `grid 1fr 300px`, totals `Subtotal/VAT` `9pt border-b neutral-300`, `Total due 10.5pt 700 border-b-2 text`, banner `DUE TODAY 7.5pt + NGN amount 11pt 700 bg-accent text-white` (template `120`).
- `337-358` payments / `360-383` comments: `bg-gray-50 rounded` → `bg-[var(--color-neutral-100)]` `0 radius`, add empty state.
- `386-420` client/company cards `grid grid-cols-2 text-muted-foreground` → `grid 1fr 1fr gap-8`, labels `7.5pt 600 accent-700 uppercase`.
- `458-475` bank details `grid grid-cols-2` → template `PAYMENT INFORMATION — BANK TRANSFER 7.5pt accent-700`, values `9.5pt`, add `WHT 5%` note.
- All amounts need `Intl.NumberFormat` + `tabular-nums` already in PDF, add to detail.
- PDF download `handleDownloadPDF` missing loading `Saving…` label, `aria-live` for toast ✓ via `Toaster`, but button needs `hover:` state (utils already).

### `src/routes/invoices/index.tsx`, `src/routes/auth/*.tsx`
- `invoices/index.tsx:30-41` loading spinner needs `aria-live="polite"` + `role="status"`.
- `69` uses `<a href="/invoices/new">` → must be `<Link>` (navigation rule, Cmd+click).
- Auth forms `src/routes/auth/login.tsx:52-60` etc.: inputs miss `autocomplete` (`email`/`current-password`), `name`, `spellCheck={false}` on email, clickable labels ✓ present, submit stays enabled then spinner `Saving…` with `…`. Add `beforeunload` guard not needed (no unsaved). Ensure `Button type="submit"` show `Signing in…`.

### shadcn primitives (`src/components/ui/*`)
- `button.tsx:7` `rounded-none` ✓ matches modernist `radius 0`, but `transition-all` → violates `transition: all` rule; list properties explicitly (`background-color, border-color, color, opacity`).
- `card.tsx:15` `rounded-none` pass, but `ring-1 ring-foreground/5` adds unwanted soft ring vs modernist `shadow-sm` — replace with `shadow-sm` token.
- `input.tsx:12` `border-b-input bg-transparent` minimal line vs modernist `.input` `bg-surface border-divider 14px` — rework to `h-9 bg-[var(--color-surface)] border border-[var(--color-divider)] px-2.5 text-[14px]`.
- `badge.tsx:8` `text-[0.625rem] tracking-widest uppercase` size `10px` matches template kicker, but needs `tabular-nums` on numeric badges.
- `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `popover.tsx`: need `overscroll-behavior: contain`, `touch-action: manipulation`, `-webkit-tap-highlight-color`, `color-scheme` already set on html, `theme-color` meta in `__root.tsx:38` missing — add `<meta name="theme-color" content="#f3f2f2">`.

## Ticket acceptance (pixel-copy)

1. `src/styles.css` sea→modernist ✓ done (verify dark token contrast 4.5:1).
2. Update `__root.tsx:55` selection + add `theme-color`, `preconnect` for `fonts.googleapis.com`, `preload` for `Archivo` `font-display: swap`.
3. Rewrite `Header.tsx` + `MainLayout.tsx` to modernist `.btn` + skip link + `page-wrap`.
4. Retheme `dashboard.tsx`, `invoices/index.tsx`, `clients/*`, `products/*`, `settings/*` pages: `page-wrap`, `.card`, heading scales, `tabular-nums`, empty states.
5. Rebuild `InvoiceTable.tsx` header/row styles, search/select a11y, pagination URL sync, status tags, action `aria-label` + confirm.
6. Rebuild `InvoiceDetail.tsx` to template page layout (0.6in paper, milestone table, totals block, DUE TODAY banner, bank grid). Keep web preview + reuse `InvoicePDF.tsx` styles already matching (472 lines).
7. Retheme `src/components/ui/button|card|input|badge|dialog|dropdown-menu|select|table|tabs` to `radius 0`, `shadow-sm/md`, `border-divider`, `focus-visible:ring`, `transition: background-color, border-color` (no `all`).
8. Verify `pnpm build` + `vitest` + `biome check` + manual `vite dev` no `Buffer` (already fixed via `authClient` + `server-only`), no `Buffer` on login, no CLS (img `width/height`), lighthouse `color-contrast` pass accent `#ec3013` on `#f3f2f2`.

## Follow-ups (out of scope)
- Dark mode full palette refinement if requested (currently neutral-800 surface).
- Add `nuqs` for URL-synced filters if >1 table filter (already prepared).
- Add `ServerOnly` marker to `src/db/schema.ts` if imported isomorphically.

Refs: `C:\Users\DELL\Downloads\Spark Invoice App (3)\Spark Invoice.dc.html:24-138`, `_ds/styles.css:1-180`, `src/styles.css:1-120` (new), `AGENTS.md`.
