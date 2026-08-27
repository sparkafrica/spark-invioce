import { relations } from 'drizzle-orm';
import {
	account,
	invitation,
	member,
	organization,
	session,
	user,
} from './auth-schema';
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

// Organization
export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
	businesses: many(businesses),
	companies: many(companies),
	banks: many(banks),
	clients: many(clients),
	products: many(products),
	invoices: many(invoices),
	memos: many(memos),
	settings: many(settings),
	activityLogs: many(activityLog),
}));

// Businesses
export const businessesRelations = relations(businesses, ({ one, many }) => ({
	organization: one(organization, {
		fields: [businesses.organizationId],
		references: [organization.id],
	}),
	invoices: many(invoices),
}));

// Companies
export const companiesRelations = relations(companies, ({ one, many }) => ({
	organization: one(organization, {
		fields: [companies.organizationId],
		references: [organization.id],
	}),
	invoices: many(invoices),
	memos: many(memos),
}));

// Banks
export const banksRelations = relations(banks, ({ one, many }) => ({
	organization: one(organization, {
		fields: [banks.organizationId],
		references: [organization.id],
	}),
	invoices: many(invoices),
}));

// Clients
export const clientsRelations = relations(clients, ({ one, many }) => ({
	organization: one(organization, {
		fields: [clients.organizationId],
		references: [organization.id],
	}),
	invoices: many(invoices),
}));

// Products
export const productsRelations = relations(products, ({ one }) => ({
	organization: one(organization, {
		fields: [products.organizationId],
		references: [organization.id],
	}),
}));

// Invoices
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
	organization: one(organization, {
		fields: [invoices.organizationId],
		references: [organization.id],
	}),
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
	organization: one(organization, {
		fields: [memos.organizationId],
		references: [organization.id],
	}),
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
export const settingsRelations = relations(settings, ({ one }) => ({
	organization: one(organization, {
		fields: [settings.organizationId],
		references: [organization.id],
	}),
}));

// Activity Log
export const activityLogRelations = relations(activityLog, ({ one }) => ({
	organization: one(organization, {
		fields: [activityLog.organizationId],
		references: [organization.id],
	}),
}));

// Invoice History
export const invoiceHistoryRelations = relations(invoiceHistory, ({ one }) => ({
	invoice: one(invoices, {
		fields: [invoiceHistory.invoiceId],
		references: [invoices.id],
	}),
}));

// User / Member
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(member),
	invitations: many(invitation),
	comments: many(comments),
}));

export {
	accountRelations,
	invitationRelations,
	memberRelations,
	sessionRelations,
} from './auth-schema';
