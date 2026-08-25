import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, primaryKey, index, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ============================================
// ENUMS
// ============================================
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "editor"])
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "editor"])
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "part_paid", "overdue", "voided"])
export const paymentTypeEnum = pgEnum("payment_type", ["full", "tranche"])
export const paymentMethodEnum = pgEnum("payment_method", ["bank", "link"])
export const currencyEnum = pgEnum("currency", [
  "NGN", "USD", "GBP", "EUR", "KES", "GHS", "ZAR", "EGP", "RWF", "TZS", "UGX", "XOF", "XAF", 
  "MAD", "ETB", "ZMW", "BWP", "MUR", "CAD", "AUD", "NZD", "CHF", "SEK", "NOK", "DKK", "PLN", 
  "CZK", "TRY", "AED", "SAR", "QAR", "ILS", "INR", "PKR", "BDT", "LKR", "CNY", "JPY", "KRW", 
  "HKD", "SGD", "MYR", "THB", "IDR", "PHP", "VND", "BRL", "MXN", "ARS", "CLP", "COP", "PEN", 
  "RUB", "UAH", "RON", "HUF", "ISK", "JOD", "KWD", "BHD", "OMR", "TND", "DZD", "MZN"
])

// ============================================
// BETTER AUTH TABLES
// ============================================
export const user = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("userAgent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  issuer: text("issuer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Organization tables (from org plugin)
export const organization = pgTable("organization", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
})

export const member = pgTable("member", {
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.userId] }),
])

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const team = pgTable("team", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const teamMember = pgTable("team_member", {
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.teamId, t.userId] }),
])

// ============================================
// INVOICE DOMAIN TABLES
// ============================================

// Companies (Invoicing Entities) - one per region
export const companies = pgTable("companies", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  region: text("region").notNull(),
  name: text("name").notNull(),
  reg: text("reg"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  tin: text("tin"),
  defaultCurrency: currencyEnum("default_currency").notNull().default("NGN"),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("companies_org_idx").on(t.organizationId),
])

// Businesses (Business Units) - New Business, ASF, ATE
export const businesses = pgTable("businesses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("businesses_org_idx").on(t.organizationId),
])

// Banks / Payment Accounts
export const banks = pgTable("banks", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  currency: currencyEnum("currency").notNull(),
  label: text("label").notNull(),
  fields: jsonb("fields").$type<Array<[string, string]>>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("banks_org_idx").on(t.organizationId),
  index("banks_currency_idx").on(t.currency),
])

// Products / Services Catalogue
export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  cost: decimal("cost", { precision: 14, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("products_org_idx").on(t.organizationId),
])

// Clients
export const clients = pgTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  reg: text("reg"),
  address: text("address"),
  email: text("email"),
  contact: text("contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("clients_org_idx").on(t.organizationId),
])

// Invoices
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  companyId: text("company_id").notNull().references(() => companies.id),
  clientId: text("client_id").notNull().references(() => clients.id),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  currency: currencyEnum("currency").notNull().default("NGN"),
  taxName: text("tax_name").default("VAT"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("7.50"),
  description: text("description"),
  memo: text("memo"),
  bankId: text("bank_id").references(() => banks.id),
  paymentType: paymentTypeEnum("payment_type").notNull().default("full"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("bank"),
  payLink: text("pay_link"),
  payLinkLabel: text("pay_link_label").default("Pay online"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  voided: boolean("voided").notNull().default(false),
  voidedAt: timestamp("voided_at"),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("invoices_org_idx").on(t.organizationId),
  index("invoices_client_idx").on(t.clientId),
  index("invoices_status_idx").on(t.status),
  index("invoices_due_date_idx").on(t.dueDate),
  uniqueIndex("invoices_number_org_unique").on(t.number, t.organizationId),
])

// Invoice Line Items
export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  qty: decimal("qty", { precision: 10, scale: 2 }).notNull().default("1"),
  cost: decimal("cost", { precision: 14, scale: 2 }).notNull(),
  discountName: text("discount_name"),
  discountPct: decimal("discount_pct", { precision: 5, scale: 2 }).default("0"),
  discountAmt: decimal("discount_amt", { precision: 14, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("invoice_items_invoice_idx").on(t.invoiceId),
])

// Invoice Tranches (Milestone Payments)
export const invoiceTranches = pgTable("invoice_tranches", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  deliverables: text("deliverables"),
  dueDate: timestamp("due_date"),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("invoice_tranches_invoice_idx").on(t.invoiceId),
])

// Payments (Recorded payments for full payment type)
export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  recordedBy: text("recorded_by").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (t) => [
  index("payments_invoice_idx").on(t.invoiceId),
])

// Comments on Invoices
export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userRole: memberRoleEnum("user_role").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("comments_invoice_idx").on(t.invoiceId),
])

// Activity Log (Audit Trail)
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  type: text("type").notNull(),
  entity: text("entity").notNull(),
  label: text("label").notNull(),
  detail: text("detail"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("activity_log_org_idx").on(t.organizationId),
  index("activity_log_created_idx").on(t.createdAt),
  index("activity_log_entity_label_idx").on(t.entity, t.label),
])

// Memos
export const memos = pgTable("memos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  companyId: text("company_id").notNull().references(() => companies.id),
  to: text("to").notNull(),
  from: text("from").notNull(),
  date: timestamp("date").notNull(),
  subject: text("subject").notNull(),
  body: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("memos_org_idx").on(t.organizationId),
])

// Settings (FX Rates, etc.)
export const settings = pgTable("settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("settings_org_key_unique").on(t.organizationId, t.key),
])

// Invoice History (Audit snapshots per save)
export const invoiceHistory = pgTable("invoice_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  note: text("note"),
  changes: jsonb("changes").$type<Array<{ field: string; from: string; to: string }>>().default([]),
  snapshot: jsonb("snapshot").$type<{
    items: Array<{ name: string; qty: number; cost: number; discountName: string; discountPct: number }>
    tranches: Array<{ name: string; deliverables: string; due: string; amount: number; paid: boolean }>
    currency: string
    taxName: string
    taxRate: number
    dueDate: string
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("invoice_history_invoice_idx").on(t.invoiceId),
])