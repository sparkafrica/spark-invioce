import '@tanstack/react-start/server-only'

import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.woff2', fontWeight: 700 },
  ],
})

export interface InvoicePDFData {
  invoice: {
    number: string
    issueDate: string
    dueDate: string
    currency: string
    taxName: string
    taxRate: string
    description: string | null
    memo: string | null
    paymentType: 'full' | 'tranche'
    paymentMethod: 'bank' | 'link'
    payLink: string | null
    payLinkLabel: string | null
    status: string
  }
  client: {
    name: string
    email: string | null
    contact: string | null
    address: string | null
    reg: string | null
  }
  company: {
    name: string
    address: string | null
    email: string | null
    phone: string | null
    tin: string | null
    reg: string | null
    logo: string | null
  }
  business: {
    name: string
    prefix: string
  }
  bank: {
    label: string | null
    fields: Array<[string, string]>
  } | null
  items: Array<{
    name: string
    description: string | null
    qty: string
    cost: string
    discountName: string | null
    discountPct: string
    discountAmt: string
  }>
  tranches: Array<{
    name: string
    deliverables: string | null
    dueDate: string | null
    amount: string
    paid: boolean
  }>
  payments: Array<{
    amount: string
    note: string | null
    recordedBy: string
    recordedAt: string
  }>
  subtotal: number
  taxAmount: number
  total: number
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
  },
  companyInfo: {
    width: '45%',
  },
  invoiceInfo: {
    width: '45%',
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
  },
  value: {
    fontSize: 9,
    color: '#1f2937',
    fontWeight: '500',
  },
  table: {
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: '8 12',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 12',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 9,
    color: '#1f2937',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colItem: { width: '35%' },
  colDesc: { width: '25%' },
  colQty: { width: '10%', textAlign: 'center' },
  colCost: { width: '15%', textAlign: 'right' },
  colDiscount: { width: '15%', textAlign: 'center' },
  colTotal: { width: '10%', textAlign: 'right' },
  totals: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '40%',
    padding: '6 0',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  grandTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  bankSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
  },
  trancheSection: {
    marginTop: 24,
  },
  trancheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '8 12',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginBottom: 8,
  },
  trancheName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trancheDetails: {
    fontSize: 8,
    color: '#6b7280',
  },
  trancheAmount: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trancheStatus: {
    fontSize: 8,
    padding: '2 6',
    borderRadius: 3,
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  trancheStatusPaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency
}

function calculateItemTotal(item: InvoicePDFData['items'][0]) {
  const qty = Number(item.qty || 0)
  const cost = Number(item.cost || 0)
  const discountPct = Number(item.discountPct || 0)
  const discountAmt = Number(item.discountAmt || 0)
  const lineTotal = qty * cost
  const discountAmount = discountAmt + (lineTotal * discountPct / 100)
  return lineTotal - discountAmount
}

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            {data.company.address && <Text style={styles.companyDetails}>{data.company.address}</Text>}
            {data.company.email && <Text style={styles.companyDetails}>{data.company.email}</Text>}
            {data.company.phone && <Text style={styles.companyDetails}>{data.company.phone}</Text>}
            {data.company.tin && <Text style={styles.companyDetails}>TIN: {data.company.tin}</Text>}
            {data.company.reg && <Text style={styles.companyDetails}>Reg: {data.company.reg}</Text>}
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoice.number}</Text>
            <View style={{ marginTop: 12, alignItems: 'flex-end', gap: 4 }}>
              <View style={styles.row}>
                <Text style={styles.label}>Issue Date:</Text>
                <Text style={styles.value}>{data.invoice.issueDate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Due Date:</Text>
                <Text style={styles.value}>{data.invoice.dueDate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Currency:</Text>
                <Text style={styles.value}>{data.invoice.currency}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <Text style={{ ...styles.value, color: data.invoice.status === 'paid' ? '#16a34a' : data.invoice.status === 'overdue' ? '#dc2626' : '#3b82f6' }}>
                  {data.invoice.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Client & Company Details */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.value}>{data.client.name}</Text>
            {data.client.contact && <Text style={styles.companyDetails}>Attn: {data.client.contact}</Text>}
            {data.client.email && <Text style={styles.companyDetails}>{data.client.email}</Text>}
            {data.client.address && <Text style={styles.companyDetails}>{data.client.address}</Text>}
            {data.client.reg && <Text style={styles.companyDetails}>Reg: {data.client.reg}</Text>}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From</Text>
            <Text style={styles.value}>{data.company.name}</Text>
            {data.company.address && <Text style={styles.companyDetails}>{data.company.address}</Text>}
            {data.company.email && <Text style={styles.companyDetails}>{data.company.email}</Text>}
            {data.company.phone && <Text style={styles.companyDetails}>{data.company.phone}</Text>}
            {data.company.tin && <Text style={styles.companyDetails}>TIN: {data.company.tin}</Text>}
            {data.company.reg && <Text style={styles.companyDetails}>Reg: {data.company.reg}</Text>}
          </View>
        </View>

        {/* Description */}
        {data.invoice.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.value}>{data.invoice.description}</Text>
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colItem }}>Item</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colDesc }}>Description</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colQty }}>Qty</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colCost }}>Unit Cost</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colDiscount }}>Discount</Text>
            <Text style={{ ...styles.tableHeaderCell, ...styles.colTotal }}>Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, ...styles.colItem }}>{item.name}</Text>
              <Text style={{ ...styles.tableCell, ...styles.colDesc }}>{item.description || '-'}</Text>
              <Text style={{ ...styles.tableCell, ...styles.colQty, textAlign: 'center' }}>{item.qty}</Text>
              <Text style={{ ...styles.tableCell, ...styles.colCost, textAlign: 'right' }}>
                {formatCurrency(Number(item.cost), data.invoice.currency)}
              </Text>
              <Text style={{ ...styles.tableCell, ...styles.colDiscount, textAlign: 'center' }}>
                {item.discountName && <Text>{item.discountName}</Text>}
                {item.discountPct && Number(item.discountPct) > 0 && <Text>{item.discountPct}%</Text>}
                {item.discountAmt && Number(item.discountAmt) > 0 && (
                  <Text>{formatCurrency(Number(item.discountAmt), data.invoice.currency)}</Text>
                )}
              </Text>
              <Text style={{ ...styles.tableCell, ...styles.colTotal, textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(calculateItemTotal(item), data.invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Tranches */}
        {data.invoice.paymentType === 'tranche' && data.tranches.length > 0 && (
          <View style={styles.trancheSection}>
            <Text style={styles.sectionTitle}>Payment Tranches</Text>
            {data.tranches.map((tranche, index) => (
              <View key={index} style={styles.trancheRow}>
                <View>
                  <Text style={styles.trancheName}>{tranche.name}</Text>
                  {tranche.deliverables && <Text style={styles.trancheDetails}>{tranche.deliverables}</Text>}
                  {tranche.dueDate && <Text style={styles.trancheDetails}>Due: {tranche.dueDate}</Text>}
                </View>
                <View>
                  <Text style={styles.trancheAmount}>{formatCurrency(Number(tranche.amount), data.invoice.currency)}</Text>
                  <Text style={{
                    ...styles.trancheStatus,
                    ...(tranche.paid ? styles.trancheStatusPaid : {}),
                  }}>
                    {tranche.paid ? 'PAID' : 'PENDING'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotal, data.invoice.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{data.invoice.taxName} ({data.invoice.taxRate}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.taxAmount, data.invoice.currency)}</Text>
          </View>
          <View style={{ ...styles.totalRow, ...styles.grandTotal }}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total, data.invoice.currency)}</Text>
          </View>
        </View>

        {/* Bank Details */}
        {data.bank?.label && (
          <View style={styles.bankSection}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>{data.bank.label}</Text>
            {data.bank.fields.map(([key, value], index) => (
              <View key={index} style={styles.row}>
                <Text style={styles.label}>{key}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payments */}
        {data.payments.length > 0 && (
          <View style={styles.bankSection}>
            <Text style={styles.sectionTitle}>Payments Received</Text>
            {data.payments.map((payment, index) => (
              <View key={index} style={styles.trancheRow}>
                <View>
                  <Text style={styles.trancheName}>{payment.recordedAt}</Text>
                  {payment.note && <Text style={styles.trancheDetails}>{payment.note}</Text>}
                  <Text style={styles.trancheDetails}>Recorded by: {payment.recordedBy}</Text>
                </View>
                <Text style={styles.trancheAmount}>{formatCurrency(Number(payment.amount), data.invoice.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by Spark Invoice System</Text>
          <Text>Invoice: {data.invoice.number} | Business: {data.business.name} ({data.business.prefix})</Text>
        </View>
      </Page>
    </Document>
  )
}
