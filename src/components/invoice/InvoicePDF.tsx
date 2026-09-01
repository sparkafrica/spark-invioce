import '@tanstack/react-start/server-only';

import {
	Document,
	Font,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from '@react-pdf/renderer';
import type { Currency } from '#/lib/currencies';
import { formatCurrency as formatCurrencyLib } from '#/lib/currencies';

Font.register({
	family: 'Archivo',
	fonts: [
		{
			src: `${process.env.BETTER_AUTH_URL}/fonts/Archivo-Regular.ttf`,
			fontWeight: 400,
		},
		{
			src: `${process.env.BETTER_AUTH_URL}/fonts/Archivo-Regular.ttf`,
			fontWeight: 500,
		},
		{
			src: `${process.env.BETTER_AUTH_URL}/fonts/Archivo-Bold.ttf`,
			fontWeight: 600,
		},
		{
			src: `${process.env.BETTER_AUTH_URL}/fonts/Archivo-Bold.ttf`,
			fontWeight: 700,
		},
		{
			src: `${process.env.BETTER_AUTH_URL}/fonts/Archivo-Bold.ttf`,
			fontWeight: 800,
		},
	],
});

export interface InvoicePDFData {
	invoice: {
		number: string;
		issueDate: string;
		dueDate: string;
		currency: string;
		taxName: string;
		taxRate: string;
		description: string | null;
		memo: string | null;
		paymentType: 'full' | 'tranche';
		paymentMethod: 'bank' | 'link';
		payLink: string | null;
		payLinkLabel: string | null;
		status: string;
	};
	client: {
		name: string;
		email: string | null;
		contact: string | null;
		address: string | null;
		reg: string | null;
	};
	company: {
		name: string;
		address: string | null;
		email: string | null;
		phone: string | null;
		tin: string | null;
		reg: string | null;
	};
	business: {
		name: string;
		prefix: string;
		logo: string | null;
	};
	bank: {
		label: string | null;
		fields: Array<[string, string]>;
	} | null;
	items: Array<{
		name: string;
		description: string | null;
		qty: string;
		cost: string;
		discountName: string | null;
		discountPct: string;
		discountAmt: string;
	}>;
	tranches: Array<{
		name: string;
		deliverables: string | null;
		dueDate: string | null;
		amount: string;
		paid: boolean;
	}>;
	payments: Array<{
		amount: string;
		note: string | null;
		recordedBy: string;
		recordedAt: string;
	}>;
	subtotal: number;
	taxAmount: number;
	total: number;
}

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		padding: '0.6in 0.6in 0.5in',
		gap: 20,
		color: '#201e1d',
		fontSize: 9.5,
		lineHeight: 1.45,
		fontFamily: 'Archivo',
		backgroundColor: '#fff',
		position: 'relative',
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 32,
	},
	logo: {
		width: 210,
		height: 'auto',
	},
	logoPlaceholder: {
		width: 210,
		height: 40,
	},
	invoiceMeta: {
		textAlign: 'left',
	},
	invoiceTitle: {
		fontSize: 26,
		fontWeight: 700,
		letterSpacing: -0.52,
		lineHeight: 1,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	invoiceNumber: {
		marginTop: 8,
		fontSize: 9,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	invoiceDate: {
		fontSize: 9,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	divider: {
		height: 2,
		backgroundColor: '#201e1d',
	},
	grid2: {
		flexDirection: 'row',
		gap: 32,
	},
	grid2Col: {
		flex: 1,
	},
	kicker: {
		fontSize: 7.5,
		fontWeight: 600,
		letterSpacing: 0.9,
		color: '#c02a10',
		marginBottom: 8,
		textTransform: 'uppercase',
		fontFamily: 'Archivo',
	},
	fromName: {
		fontSize: 9.5,
		fontWeight: 700,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	normalText: {
		fontSize: 9.5,
		color: '#201e1d',
		lineHeight: 1.45,
		fontFamily: 'Archivo',
	},
	reBar: {
		borderTopWidth: 1,
		borderTopColor: '#d6d3d1',
		borderBottomWidth: 1,
		borderBottomColor: '#d6d3d1',
		paddingVertical: 12,
		flexDirection: 'row',
		gap: 4,
	},
	reLabel: {
		fontWeight: 700,
		fontSize: 9.5,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	reText: {
		fontSize: 9.5,
		color: '#201e1d',
		flex: 1,
		fontFamily: 'Archivo',
	},
	table: {
		width: '100%',
	},
	tableHeaderRow: {
		flexDirection: 'row',
		borderBottomWidth: 2,
		borderBottomColor: '#201e1d',
		paddingBottom: 8,
	},
	th: {
		fontSize: 7.5,
		letterSpacing: 0.75,
		fontWeight: 600,
		color: '#201e1d',
		textTransform: 'uppercase',
		fontFamily: 'Archivo',
		paddingRight: 10,
	},
	thRight: {
		textAlign: 'right',
	},
	colMilestone: { width: '17%' },
	colDeliverables: { width: '33%' },
	colDue: { width: '12%' },
	colAmount: { width: '12.66%', textAlign: 'right' },
	colTax: { width: '12.66%', textAlign: 'right' },
	colTotal: { width: '12.66%', textAlign: 'right' },
	tdRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#d6d3d1',
		paddingVertical: 12,
	},
	tdRowLast: {
		borderBottomWidth: 2,
		borderBottomColor: '#201e1d',
	},
	td: {
		fontSize: 9,
		color: '#201e1d',
		fontFamily: 'Archivo',
		paddingRight: 10,
	},
	tdBold: {
		fontWeight: 700,
		fontFamily: 'Archivo',
	},
	tdTabular: {
		fontVariant: 'tabular-nums',
		textAlign: 'right',
		fontFamily: 'Archivo',
	},
	dueAccent: {
		fontWeight: 700,
		color: '#c02a10',
		fontFamily: 'Archivo',
	},
	totalsGrid: {
		flexDirection: 'row',
		gap: 32,
		alignItems: 'flex-start',
	},
	totalsSpacer: {
		flex: 1,
	},
	totalsBlock: {
		width: 300,
		flexDirection: 'column',
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 7,
		borderBottomWidth: 1,
		borderBottomColor: '#d6d3d1',
	},
	totalLabel: {
		fontSize: 9,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	totalValue: {
		fontSize: 9,
		fontWeight: 600,
		color: '#201e1d',
		fontFamily: 'Archivo',
		fontVariant: 'tabular-nums',
	},
	grandTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 9,
		borderBottomWidth: 2,
		borderBottomColor: '#201e1d',
	},
	grandLabel: {
		fontSize: 10.5,
		fontWeight: 700,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	grandValue: {
		fontSize: 10.5,
		fontWeight: 700,
		color: '#201e1d',
		fontFamily: 'Archivo',
		fontVariant: 'tabular-nums',
	},
	dueNowBlock: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		padding: 12,
		marginTop: 12,
		backgroundColor: '#ec3013',
	},
	dueNowLabel: {
		fontSize: 7.5,
		letterSpacing: 0.75,
		fontWeight: 600,
		color: '#fff',
		textTransform: 'uppercase',
		fontFamily: 'Archivo',
	},
	dueNowValue: {
		fontSize: 11,
		fontWeight: 700,
		color: '#fff',
		fontFamily: 'Archivo',
		fontVariant: 'tabular-nums',
	},
	paymentGrid: {
		flexDirection: 'row',
		gap: 32,
		paddingTop: 4,
	},
	paymentCol: {
		flex: 1,
		gap: 2,
	},
	paymentKicker: {
		fontSize: 7.5,
		fontWeight: 600,
		letterSpacing: 0.9,
		color: '#c02a10',
		marginBottom: 8,
		textTransform: 'uppercase',
		fontFamily: 'Archivo',
	},
	paymentText: {
		fontSize: 9.5,
		color: '#201e1d',
		lineHeight: 1.45,
		fontFamily: 'Archivo',
	},
	memoText: {
		color: '#605d5d',
		fontSize: 8.5,
		lineHeight: 1.4,
		fontFamily: 'Archivo',
	},
	thanksText: {
		fontWeight: 700,
		fontSize: 11,
		color: '#201e1d',
		fontFamily: 'Archivo',
	},
	memoThanksGap: {
		gap: 12,
		justifyContent: 'space-between',
	},
	paymentsSection: {
		borderTopWidth: 1,
		borderTopColor: '#d6d3d1',
		paddingTop: 12,
		gap: 8,
	},
	paymentsKicker: {
		fontSize: 7.5,
		letterSpacing: 0.9,
		fontWeight: 600,
		color: '#c02a10',
		textTransform: 'uppercase',
		fontFamily: 'Archivo',
		marginBottom: 8,
	},
	paymentRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#d6d3d1',
		paddingVertical: 8,
	},
	paymentRowText: {
		fontSize: 9,
		color: '#201e1d',
		fontFamily: 'Archivo',
		flex: 1,
	},
	paymentAmount: {
		fontSize: 9,
		fontWeight: 700,
		color: '#201e1d',
		fontFamily: 'Archivo',
		fontVariant: 'tabular-nums',
		textAlign: 'right',
	},
	payLinkBlock: {
		borderTopWidth: 1,
		borderTopColor: '#d6d3d1',
		paddingTop: 12,
		gap: 4,
	},
	voidWatermark: {
		position: 'absolute',
		top: '40%',
		left: 0,
		right: 0,
		textAlign: 'center',
		fontSize: 72,
		fontWeight: 700,
		color: '#ec3013',
		opacity: 0.12,
		fontFamily: 'Archivo',
		letterSpacing: 8,
	},
	footerNote: {
		fontSize: 7.5,
		color: '#c02a10',
		textAlign: 'center',
		fontFamily: 'Archivo',
	},
});

function fmt(amount: number, currency: string) {
	try {
		return formatCurrencyLib(amount, currency as Currency);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
	const taxRate = Number(data.invoice.taxRate || 0);

	const lines =
		data.invoice.paymentType === 'tranche' && data.tranches.length > 0
			? data.tranches.map((t) => {
					const amt = Number(t.amount || 0);
					const tax = amt * (taxRate / 100);
					return {
						name: t.name,
						deliverables: t.deliverables || '—',
						due: t.dueDate || '—',
						amount: fmt(amt, data.invoice.currency),
						tax: fmt(tax, data.invoice.currency),
						total: fmt(amt + tax, data.invoice.currency),
					};
				})
			: data.items.map((it) => {
					const qty = Number(it.qty || 0);
					const cost = Number(it.cost || 0);
					const amt = qty * cost;
					const disc =
						Number(it.discountAmt || 0) +
						(amt * Number(it.discountPct || 0)) / 100;
					const net = amt - disc;
					const tax = net * (taxRate / 100);
					return {
						name: it.name,
						deliverables: it.description || '—',
						due: data.invoice.dueDate || '—',
						amount: fmt(net, data.invoice.currency),
						tax: fmt(tax, data.invoice.currency),
						total: fmt(net + tax, data.invoice.currency),
					};
				});

	const nextUnpaid = data.tranches.find((t) => !t.paid);
	const dueNowAmount = nextUnpaid
		? Number(nextUnpaid.amount) * (1 + taxRate / 100)
		: data.invoice.paymentType === 'tranche' && data.tranches.length > 0
			? 0
			: data.total;
	const dueNow = fmt(dueNowAmount, data.invoice.currency);

	const isVoided = data.invoice.status === 'voided';

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{isVoided && (
					<View style={styles.voidWatermark} fixed>
						<Text>VOID</Text>
					</View>
				)}

				{/* Header */}
				<View style={styles.headerRow}>
					{data.business.logo ? (
						<Image src={data.business.logo} style={styles.logo} />
					) : (
						<View style={styles.logoPlaceholder} />
					)}
					<View style={styles.invoiceMeta}>
						<Text style={styles.invoiceTitle}>INVOICE</Text>
						<Text style={styles.invoiceNumber}>No. {data.invoice.number}</Text>
						<Text style={styles.invoiceDate}>
							Date: {data.invoice.issueDate}
						</Text>
					</View>
				</View>

				<View style={styles.divider} />

				{/* FROM / BILL TO */}
				<View style={styles.grid2}>
					<View style={styles.grid2Col}>
						<Text style={styles.kicker}>FROM</Text>
						<Text style={styles.fromName}>{data.company.name}</Text>
						{data.company.reg && (
							<Text style={styles.normalText}>{data.company.reg}</Text>
						)}
						{data.company.address && (
							<Text style={styles.normalText}>{data.company.address}</Text>
						)}
						{data.company.tin && (
							<Text style={styles.normalText}>TIN: {data.company.tin}</Text>
						)}
					</View>
					<View style={styles.grid2Col}>
						<Text style={styles.kicker}>BILL TO</Text>
						<Text style={styles.fromName}>{data.client.name}</Text>
						{data.client.reg && (
							<Text style={styles.normalText}>{data.client.reg}</Text>
						)}
						{data.client.address && (
							<Text style={styles.normalText}>{data.client.address}</Text>
						)}
						{data.client.email && (
							<Text style={styles.normalText}>{data.client.email}</Text>
						)}
					</View>
				</View>

				{/* Re: */}
				<View style={styles.reBar}>
					<Text style={styles.reLabel}>Re:</Text>
					<Text style={styles.reText}>{data.invoice.description || '—'}</Text>
				</View>

				{/* Milestone Table - unified tranches xor items */}
				<View style={styles.table}>
					<View style={styles.tableHeaderRow}>
						<Text style={[styles.th, styles.colMilestone]}>MILESTONE</Text>
						<Text style={[styles.th, styles.colDeliverables]}>
							DELIVERABLES
						</Text>
						<Text style={[styles.th, styles.colDue]}>DUE</Text>
						<Text style={[styles.th, styles.colAmount, styles.thRight]}>
							AMOUNT ({data.invoice.currency})
						</Text>
						<Text style={[styles.th, styles.colTax, styles.thRight]}>
							{data.invoice.taxName} {taxRate ? `${taxRate}%` : ''}
						</Text>
						<Text style={[styles.th, styles.colTotal, styles.thRight]}>
							TOTAL ({data.invoice.currency})
						</Text>
					</View>
					{lines.map((l, i) => {
						const isLast = i === lines.length - 1;
						return (
							<View
								key={i}
								style={[styles.tdRow, isLast ? styles.tdRowLast : {}]}
							>
								<Text style={[styles.td, styles.tdBold, styles.colMilestone]}>
									{l.name}
								</Text>
								<Text style={[styles.td, styles.colDeliverables]}>
									{l.deliverables}
								</Text>
								<Text style={[styles.td, styles.colDue]}>{l.due}</Text>
								<Text style={[styles.td, styles.tdTabular, styles.colAmount]}>
									{l.amount}
								</Text>
								<Text style={[styles.td, styles.tdTabular, styles.colTax]}>
									{l.tax}
								</Text>
								<Text
									style={[
										styles.td,
										styles.tdBold,
										styles.tdTabular,
										styles.colTotal,
									]}
								>
									{l.total}
								</Text>
							</View>
						);
					})}
				</View>

				{/* Totals 1fr 300px */}
				<View style={styles.totalsGrid}>
					<View style={styles.totalsSpacer} />
					<View style={styles.totalsBlock}>
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>Subtotal</Text>
							<Text style={styles.totalValue}>
								{fmt(data.subtotal, data.invoice.currency)}
							</Text>
						</View>
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>
								{data.invoice.taxName} ({data.invoice.taxRate}%)
							</Text>
							<Text style={styles.totalValue}>
								{fmt(data.taxAmount, data.invoice.currency)}
							</Text>
						</View>
						<View style={styles.grandTotalRow}>
							<Text style={styles.grandLabel}>Total due</Text>
							<Text style={styles.grandValue}>
								{fmt(data.total, data.invoice.currency)}
							</Text>
						</View>
						<View style={styles.dueNowBlock}>
							<Text style={styles.dueNowLabel}>DUE TODAY</Text>
							<Text style={styles.dueNowValue}>{dueNow}</Text>
						</View>
					</View>
				</View>

				<View style={styles.divider} />

				{/* Payment 1fr 1fr gap32 */}
				<View style={styles.paymentGrid}>
					<View style={styles.paymentCol}>
						<Text style={styles.paymentKicker}>
							PAYMENT INFORMATION — BANK TRANSFER
						</Text>
						<Text style={styles.paymentText}>
							Bank: {data.bank?.label || '—'}
						</Text>
						{data.bank?.fields.map(([k, v]) => (
							<Text key={k} style={styles.paymentText}>
								{k}: {v}
							</Text>
						))}
						{data.company.tin && (
							<Text style={styles.paymentText}>TIN: {data.company.tin}</Text>
						)}
						{data.invoice.paymentMethod === 'link' && data.invoice.payLink && (
							<Text style={styles.paymentText}>
								{data.invoice.payLinkLabel || 'Pay link'}:{' '}
								{data.invoice.payLink}
							</Text>
						)}
					</View>
					<View style={[styles.paymentCol, styles.memoThanksGap]}>
						<Text style={styles.memoText}>
							{data.invoice.memo ||
								'Withholding tax of 5% applies per clause 5.5 of the Statement of Work; please remit the WHT credit note with payment.'}
						</Text>
						<Text style={styles.thanksText}>Thanks for your business.</Text>
					</View>
				</View>

				{/* Payments Received */}
				{data.payments.length > 0 && (
					<View style={styles.paymentsSection}>
						<Text style={styles.paymentsKicker}>PAYMENTS RECEIVED</Text>
						{data.payments.map((p, idx) => (
							<View key={idx} style={styles.paymentRow}>
								<Text style={styles.paymentRowText}>
									<Text style={styles.tdBold}>{p.recordedAt}</Text>
									{p.note ? <Text> · {p.note}</Text> : null}
									<Text> · {p.recordedBy}</Text>
								</Text>
								<Text style={styles.paymentAmount}>
									{fmt(Number(p.amount), data.invoice.currency)}
								</Text>
							</View>
						))}
					</View>
				)}

				{/* Footer subtle? keep minimal to match template - no extra footer needed, but keep thin note if voided */}
				{isVoided && (
					<View style={{ marginTop: 12, alignItems: 'center' }}>
						<Text style={[styles.memoText, { color: '#c02a10', fontSize: 9 }]}>
							This invoice has been voided.
						</Text>
					</View>
				)}
			</Page>
		</Document>
	);
}
