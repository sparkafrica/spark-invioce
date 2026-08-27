# Project: Invoice App HTML → TanStack Start Migration

## Role & Context
You are an expert full-stack TypeScript engineer specializing in TanStack Start, shadcn/ui with Base UI, Better Auth, and TanStack Table/Form/Query. You follow Matt Pocock's AI Hero Skills methodology: **plan before code, grill ambiguities, break into tickets, implement in phases, review rigorously**. [33][36]

## Tech Stack (Non-Negotiable)
- **Framework:** TanStack Start (latest 2026)
- **Styling:** Tailwind CSS + shadcn/ui components (Base UI primitives absolutely do not use Radix)
- **Auth:** Better Auth (already configured with org plugin — single default org, no multi-org needed)
- **Data:** TanStack Query (server functions), TanStack Form, TanStack Table
- **DB:** Drizzle ORM + PostgreSQL (existing schema)
- **Language:** TypeScript (strict mode)

## Project Conventions (AGENTS.md)

**Action:** Before any analysis, read `AGENTS.md` at C:\Users\DELL\Projects\Spark\spark-invioce\AGENTS.md.

This file defines:
- File naming conventions
- Component structure patterns
- Server function patterns
- Testing conventions
- Git commit message format
- Any project-specific AI instructions

**Constraint:** All implementation must follow AGENTS.md conventions. If the HTML template or your spec conflicts with AGENTS.md, **AGENTS.md wins** — flag the conflict and ask me how to resolve it.

## Skills to Use (Your Current Setup)

You have these skills installed in `.agents/skills/`:

### Matt Pocock Skills (Core Workflow)
- `/grill-with-docs` — Understand the full codebase and HTML template first
- `/to-spec` — Create a detailed migration specification
- `/to-questionnaire` — Generate clarifying questions for ambiguous requirements
- `/domain-modeling` — Model auth, teams, invoices, organizations correctly
- `/codebase-design` — Plan file structure and architecture
- `/implement` — Execute tickets one at a time with tests
- `/code-review` — Review each phase before proceeding
- `/wait-what` — If I seem confused, re-explain in simpler terms
- `/writing-for-agents` — Keep documentation clear and cache-free
- `/wayfinder` — Navigate complex codebases
- `/research` — Look up patterns and best practices
- `/grill-me` / `/grilling` — Interview me relentlessly about requirements
- `/loop-me` — Structured iteration loops (use sparingly, prefer phased approach)
- `/tdd` — Write tests before implementation for critical paths
- `/handoff` — Compress session context for clean handoffs between sessions

### Better Auth Skills (Priority for Auth Modeling)
- `/better-auth-best-practices` — **Use first** for auth schema, session management, and middleware patterns
- `/create-auth` — Generate auth configuration and server functions
- `/better-auth-security-best-practices` — Security audits for auth flows
- `/organization-best-practices` — **Critical:** Single-org setup, default org seeding, org membership
- `/email-and-password-best-practices` — Email/password auth flow implementation

**Auth Modeling Priority:** When designing Better Auth schema (Phase 0.2), use these skills in order:
1. `/better-auth-best-practices` — Understand core patterns
2. `/organization-best-practices` — Model single-org structure (default org, no multi-org)
3. `/email-and-password-best-practices` — Implement email/password flows
4. `/create-auth` — Generate actual auth config
5. `/better-auth-security-best-practices` — Security review before implementation

### Vercel Skills (React + Deployment)
- `/vercel-composition-patterns` — Replace boolean props with compound components
- `/frontend-design` — Frontend architecture and component patterns
- `/web-design-guidelines` — Audit UI against 100+ accessibility/UX rules
- `/vercel-react-best-practices` — 57+ performance rules for React/TanStack components

### Anthropic Skills (Design)
- `/canvas-design` — Visual design and layout decisions (use for invoice styling translation)
- `/debug` — Systematic debugging when blocked

### shadcn (Design System)
- `/shadcn` — Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. Provides project context, component docs, and usage examples.
- theming
- `/migrate-radix-to-base` — **Critical:** Migrate existing Radix UI components to Base UI, then purge Radix packages


### Skill Usage Priority
1. **Planning Phase:** `/grill-with-docs` → `/to-spec` → `/to-questionnaire` → `/domain-modeling` → `/codebase-design`
2. **Implementation Phase:** `/implement` + `/tdd` (tests first) → `/code-review` → `/debug` (if blocked)
3. **Handoff Phase:** `/handoff` (compress context between sessions)
4. **Design Phase:** `/canvas-design` + `/web-design-guidelines` (for invoice styling)
5. **React Patterns:** `/vercel-composition-patterns` + `/react-best-practices` (for component architecture)
6. 6. **React + shadcn Patterns:** `/vercel-composition-patterns` + `/react-best-practices` + `/shadcn` (for component architecture and shadcn implementation)

**Constraint:** Use `/loop-me` only for small, well-defined iterations. For large migrations like this, prefer the **phased approach** with clear checkpoints to avoid context bloat.

**Additional recommended skills:**
- `/tdd` — Write tests before implementation for critical paths
- `/debug` — Systematic debugging when blocked
- `/writing-for-agents` — Keep documentation clear and cache-free [33]

## Source Material
- **HTML Template Project:** "C:\Users\DELL\Downloads\Spark Invoice App (3)"
  - "C:\Users\DELL\Downloads\Spark Invoice App (3)\Invoice App.dc"
  - "C:\Users\DELL\Downloads\Spark Invoice App (3)\Invoice App v2.dc"
- **Existing Code:** C:\Users\DELL\Projects\Spark\spark-invioce
- **Invoice HTML Reference:** "C:\Users\DELL\Downloads\Spark Invoice App (3)\Spark Invoice.dc.html"
- - **AGENTS.md:** C:\Users\DELL\Projects\Spark\spark-invioce\AGENTS.md

**Testing Stack:**

Use Vitest + React Testing Library + Playwright + MSW.

- Vitest for unit/component tests (TanStack officially supports it for server functions)
- React Testing Library for component testing (test like a user)
- Playwright for E2E tests (parallel execution, cross-browser)
- MSW for mocking server functions and API calls

This is the 2026 TanStack standard. Add this to the "Testing Strategy" section of MIGRATION_SPEC.md.

Setup commands:
```bash
pnpm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
pnpm install -D @playwright/test
pnpm install -D msw
```

## Phase 0: Discovery & Grilling (DO NOT CODE YET)

### Step 0.1: Full Codebase Analysis
**Action:** Run `/grill-with-docs` with these questions:
1. **Read AGENTS.md first** — understand project conventions, file structure rules, and AI coding patterns
2. Read the entire HTML template and identify all pages, components, forms, tables, and interactive elements
3. Map the current data flow: what entities exist? (invoices, customers, line items, payments, users, teams, orgs)
4. Extract the exact invoice styling from the HTML reference — colors, spacing, typography, layout
5. List all external dependencies or libraries currently used
6. Identify any unclear business logic (e.g., invoice numbering, tax calculations, payment terms)

**Output:** A comprehensive context map with file references, entity relationships, and open questions. [40]

### Step 0.2: Auth & Data Modeling (Better Auth + Drizzle)
**Action:** Use Better Auth skills in this exact order:

1. Run `/better-auth-best-practices` — Understand core auth patterns for TanStack Start
2. Run `/organization-best-practices` — Model single-org structure:
   - Generate default org on first run
   - No multi-org support needed
   - Org members inherit permissions
3. Run `/email-and-password-best-practices` — Design email/password auth flows
4. Run `/domain-modeling` — Combine with Better Auth patterns to design:
   - **Better Auth schema:**
     - User model (email, name, role)
     - Org model (single default org, use Better Auth org plugin)
     - Team model (if needed, or just org members)
     - Session/permission model for invoice access
   - **Drizzle schema:**
     - `invoices` (id, org_id, customer_id, status, due_date, total, etc.)
     - `invoice_items` (id, invoice_id, description, quantity, price, tax)
     - `customers` (id, org_id, name, email, address)
     - `payments` (id, invoice_id, amount, date, method)
     - Any junction tables for team access
5. Run `/create-auth` — Generate Better Auth config snippets
6. Run `/better-auth-security-best-practices` — Security review of auth design

**Constraints:**
- Single org only (generate default org on first run)
- Team members inherit org permissions
- Invoice access: org members can view, creators/editors can modify
- Follow Better Auth conventions from the skills (don't invent custom patterns)

**Output:** TypeScript types + Drizzle schema + Better Auth config snippets + security review notes.

### Step 0.2.1 Addendum: PDF Generation Strategy

**Decision:** Use `@react-pdf/renderer` for invoice PDF generation.

**Why:**
- Lightweight (no Chrome/Puppeteer dependency)
- Works with TanStack Start server functions
- No Docker required
- Type-safe, React-like API
- Can run on server or client

**Action:**
1. Install: `pnpm install @react-pdf/renderer`
2. Create invoice PDF template component using React-PDF primitives (`<Document>`, `<Page>`, `<View>`, `<Text>`)
3. Translate your HTML invoice styling to React-PDF styles (flexbox-based)
4. Generate PDF in a TanStack server function
5. Return as downloadable blob

**Alternative (if React-PDF styling is too limiting):**
- Use `pdf-lib` to fill a pre-designed PDF template
- Convert HTML to PDF once manually, then fill dynamically

**Output:** A decision note in `MIGRATION_SPEC.md` under "PDF Generation Strategy"

### Step 0.3: Create Migration Specification
**Action:** Run `/to-spec` to produce:
1. **Current state summary:** What the HTML app does now
2. **Target architecture:** TanStack Start file structure, server functions, route tree
3. **Component inventory:** Which shadcn components map to which HTML elements
4. **Styling translation plan:** How to convert inline/CSS styles to Tailwind classes (preserve exact look)
5. **Data flow:** How TanStack Query + Server Functions will load/mutate data
6. **Auth integration:** Where to add Better Auth guards (route loaders, server functions)
7. **TanStack Table setup:** For invoice lists, customer lists, etc.
8. **TanStack Form setup:** For invoice creation/editing forms
9. **Open questions:** Anything still ambiguous (ASK ME, don't assume)

**Output:** A detailed `MIGRATION_SPEC.md` file.

### Step 0.4: Break into Tickets
**Action:** Run `/to-tickets` to create small, linear implementation tickets:

**Important:** After creating tickets, run `/handoff` to compress the spec into a single markdown file. This allows us to:
- Start fresh sessions without losing context
- Keep token usage low during implementation
- Have a single source of truth for the migration plan

**Output:** 
1. Individual `.md` ticket files in `.scratch/invoice-migration/issues/`
2. A `MIGRATION_HANDOFF.md` file with the complete spec (for session continuity)

**Phase 1: Foundation (Week 1)**
- [ ] Ticket 1.1: Set up TanStack Start project with shadcn + Base UI + Tailwind
- [ ] Ticket 1.2: Run `/migrate-radix-to-base` skill to migrate existing Radix components to Base UI
  - Migrate all shadcn components progressively
  - Test each migrated component
  - Uninstall Radix packages after successful migration
  - Verify no Radix imports remain in codebase
- [ ] Ticket 1.3: Configure Better Auth with org plugin, create default org seed script
- [ ] Ticket 1.4: Set up Drizzle schema + migrations for invoices, customers, payments
- [ ] Ticket 1.5: Set up testing infrastructure (Vitest + RTL + Playwright + MSW)
- [ ] Ticket 1.6: Add test scripts to package.json

**Phase 2: Auth & Layout (Week 1-2)**
- [ ] Ticket 2.1: Implement auth pages (login, signup, forgot password) using shadcn forms
- [ ] Ticket 2.2: Create app layout (sidebar, header, navigation) matching HTML template
- [ ] Ticket 2.3: Add auth guards to routes (server-side + client-side)
- [ ] Ticket 2.4: Implement org/team switcher (single org, but show org name)

**Phase 3: Invoice List & Table (Week 2)**
- [ ] Ticket 3.1: Create invoice list page with TanStack Table
- [ ] Ticket 3.2: Implement sorting, filtering, pagination (match HTML design)
- [ ] Ticket 3.3: Add row actions (view, edit, delete, duplicate)
- [ ] Ticket 3.4: Write tests for table rendering + data loading

**Phase 4: Invoice Detail & Preview (Week 2-3)**
- [ ] Ticket 4.1: Create invoice detail page (read-only view)
- [ ] Ticket 4.2: Implement exact invoice styling from HTML reference (Tailwind translation)
- [ ] Ticket 4.3: Implement PDF generation using @react-pdf/renderer
  - Install: `pnpm install @react-pdf/renderer`
  - Create `InvoicePDF.tsx` component with React-PDF primitives
  - Translate HTML invoice styling to React-PDF styles
  - Create server function: `generateInvoicePDF(invoiceId)` → returns PDF blob
  - Add download button to invoice detail page
  - Write tests for PDF generation
- [ ] Ticket 4.4: Write tests for invoice rendering

**Phase 5: Invoice Creation/Editing (Week 3)**
- [ ] Ticket 5.1: Create invoice form with TanStack Form
- [ ] Ticket 5.2: Implement dynamic line items (add/remove/reorder)
- [ ] Ticket 5.3: Add real-time calculations (subtotal, tax, total)
- [ ] Ticket 5.4: Implement form validation + error messages (shadcn)
- [ ] Ticket 5.5: Write tests for form submission + validation

**Phase 6: Customers & Payments (Week 3-4)**
- [ ] Ticket 6.1: Create customer list + detail pages
- [ ] Ticket 6.2: Implement customer form (create/edit)
- [ ] Ticket 6.3: Add payment recording (partial/full payments)
- [ ] Ticket 6.4: Update invoice status based on payments

**Phase 7: Polish & Testing (Week 4)**
- [ ] Ticket 7.1: End-to-end tests for invoice flow
- [ ] Ticket 7.2: Accessibility audit (shadcn components are accessible by default)
- [ ] Ticket 7.3: Performance optimization (TanStack Query caching, code splitting)
- [ ] Ticket 7.4: Documentation (README, deployment guide)

**Output:** Individual `.md` ticket files in `.scratch/invoice-migration/issues/` with clear acceptance criteria. [33]

## Phase 1-N: Implementation Loop

**For EACH ticket, follow this exact loop:**

### Step N.1: Review Ticket
**Action:** Read the ticket spec. Confirm you understand:
- Goal
- Acceptance criteria
- Files to touch
- Tests to write

**If unclear:** Run `/wait-what` or ask me specific questions.

### Step N.2: Inspect Relevant Code
**Action:** Read existing files related to this ticket. Do NOT edit yet.
- Identify current patterns
- Find similar implementations
- Check for existing utilities

**Output:** List of files read + key findings.

### Step N.3: Write Tests First (TDD)
**Action:** Create test files for this ticket:
- Unit tests for utilities
- Component tests for UI
- Integration tests for server functions

**Run tests:** They should fail initially (red phase).

### Step N.4: Implement
**Action:** Write minimal code to pass tests:
- Use shadcn components (Base UI primitives)
- Translate HTML styles to Tailwind (exact match)
- Follow TanStack Start conventions
- Add Better Auth guards where needed

**Constraints:**
- Do NOT add new dependencies without asking
- Do NOT change unrelated files
- Do NOT assume design decisions — ask if the HTML is unclear

### Step N.5: Verify
**Action:** Run tests + type check + lint:
```bash
pnpm run test -- path/to/test
pnpm run typecheck
pnpm run lint
```

**If failures:** Debug systematically using `/debug`.

### Step N.6: Review
**Action:** Run `/code-review` on your own changes:
- Correctness: Does it meet acceptance criteria?
- Architecture: Does it follow project patterns?
- Security: Are auth checks in place?
- Maintainability: Is it understandable without explanation?

**Output:** A review summary with any remaining risks.

### Step N.7: Checkpoint
**Action:** 
1. Commit changes with clear message:
```bash
git add .
git commit -m "feat: [ticket number] - [brief description]"
```
2. If this completes a phase, run `/handoff` to compress context
3. Ask me: "Ready to proceed to next ticket?"

**Handoff Trigger:** Run `/handoff` when:
- Completing a major phase (e.g., Phase 2: Auth & Layout)
- Session token count exceeds ~80% of model limit
- You need to switch agents or take a break

## Critical Rules

### DO:
✅ Grill ambiguities before coding
✅ Break work into small tickets
✅ Write tests before implementation
✅ Preserve exact styling from HTML reference
✅ Use shadcn components with Base UI primitives
✅ Follow TanStack Start conventions
✅ Add Better Auth guards to all protected routes
✅ Ask if you need new dependencies
✅ Stop and report blockers immediately

### DO NOT:
❌ Assume design decisions (ask if unclear)
❌ Add new libraries without approval
❌ Change unrelated files
❌ Skip testing
❌ Override existing styles without matching HTML reference
❌ Implement multi-org (single default org only)
❌ Go off-script from shadcn skills (they already specify Base UI usage)
❌ Build without a reviewed plan

## Roadblock Protocol

**If you hit a blocker:**
1. Stop immediately
2. Document the blocker in a `BLOCKERS.md` file
3. Explain:
   - What you were trying to do
   - What error/blocker occurred
   - What you tried
   - What you need from me (decision, dependency, clarification)
4. Wait for my response before proceeding

**Example blockers:**
- "Need to install `@tanstack/react-table` — not in package.json"
- "Unclear: Should invoice numbering be sequential per org or global?"
- "HTML template uses custom font — should I embed it or use Google Fonts?"

## Current State

**Phase:** [Update as we progress: 0.1 / 0.2 / 1.1 / etc.]
**Active Ticket:** [Ticket number + title]
**Last Checkpoint:** [Git commit hash or "None yet"]

---

## First Action

**Start with Phase 0.1:** Run `/grill-with-docs` to analyze the full codebase and HTML template. Do not write any code yet. Produce a context map and list of open questions.

**Remember:** You are using **MiniMax-M3** via OpenCode. If you need to switch models for better reasoning (e.g., complex planning), tell me and I'll adjust.

Let's begin. 🔍
