import { relations } from 'drizzle-orm';
import { account, session, user } from './auth-schema';
import {
	activityLog,
	banks,
	businesses,
	clients,
	comments,
	companies,
	invoiceHistory,
	invoiceItems,
	invoices,
	invoiceTranches,
	memos,
	payments,
	products,
	settings,
} from './schema';

// ============================================
// RELATIONS
// ============================================

// Businesses
export const businessesRelations = relations(businesses, ({ many }) => ({
	invoices: many(invoices),
}));

// Companies
export const companiesRelations = relations(companies, ({ many }) => ({
	invoices: many(invoices),
	memos: many(memos),
}));

// Banks
export const banksRelations = relations(banks, ({ many }) => ({
	invoices: many(invoices),
}));

// Clients
export const clientsRelations = relations(clients, ({ many }) => ({
	invoices: many(invoices),
}));

// Products
export const productsRelations = relations(products, () => ({}));

// Invoices
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
	business: one(businesses, {
		fields: [invoices.businessId],
		references: [businesses.id],
	}),
	company: one(companies, {
		fields: [invoices.companyId],
		references: [companies.id],
	}),
	client: one(clients, {
		fields: [invoices.clientId],
		references: [clients.id],
	}),
	bank: one(banks, { fields: [invoices.bankId], references: [banks.id] }),
	items: many(invoiceItems),
	tranches: many(invoiceTranches),
	payments: many(payments),
	comments: many(comments),
	history: many(invoiceHistory),
}));

// Invoice Items
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
	invoice: one(invoices, {
		fields: [invoiceItems.invoiceId],
		references: [invoices.id],
	}),
}));

// Invoice Tranches
export const invoiceTranchesRelations = relations(
	invoiceTranches,
	({ one }) => ({
		invoice: one(invoices, {
			fields: [invoiceTranches.invoiceId],
			references: [invoices.id],
		}),
	}),
);

// Payments
export const paymentsRelations = relations(payments, ({ one }) => ({
	invoice: one(invoices, {
		fields: [payments.invoiceId],
		references: [invoices.id],
	}),
}));

// Comments
export const commentsRelations = relations(comments, ({ one }) => ({
	invoice: one(invoices, {
		fields: [comments.invoiceId],
		references: [invoices.id],
	}),
	user: one(user, { fields: [comments.userId], references: [user.id] }),
}));

// Memos
export const memosRelations = relations(memos, ({ one }) => ({
	business: one(businesses, {
		fields: [memos.businessId],
		references: [businesses.id],
	}),
	company: one(companies, {
		fields: [memos.companyId],
		references: [companies.id],
	}),
}));

// Settings
export const settingsRelations = relations(settings, () => ({}));

// Activity Log
export const activityLogRelations = relations(activityLog, () => ({}));

// Invoice History
export const invoiceHistoryRelations = relations(invoiceHistory, ({ one }) => ({
	invoice: one(invoices, {
		fields: [invoiceHistory.invoiceId],
		references: [invoices.id],
	}),
}));

// User
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	comments: many(comments),
}));

export { accountRelations, sessionRelations } from './auth-schema';
