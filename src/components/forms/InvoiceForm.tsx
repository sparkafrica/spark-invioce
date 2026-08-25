"use client"

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { toast } from '#/components/ui/toast'
import { getBusinesses } from '#/lib/server-fns/references'
import { getCompanies } from '#/lib/server-fns/references'
import { getClients } from '#/lib/server-fns/references'
import { getBanks } from '#/lib/server-fns/references'
import { useQuery } from '@tanstack/react-query'
import { createInvoice } from '#/lib/server-fns/invoice-create'
import { updateInvoice } from '#/lib/server-fns/invoice-create'
import { useNavigate } from '@tanstack/react-router'

const numberStringSchema = v.pipe(v.string(), v.regex(/^\d+(\.\d+)?$/, 'Must be a number'))

const itemSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  description: v.optional(v.string()),
  qty: numberStringSchema,
  cost: numberStringSchema,
  discountName: v.optional(v.string()),
  discountPct: v.optional(numberStringSchema),
  discountAmt: v.optional(numberStringSchema),
})

const trancheSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  deliverables: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  amount: numberStringSchema,
  paid: v.optional(v.boolean()),
})

const invoiceSchema = v.object({
  businessId: v.pipe(v.string(), v.minLength(1, 'Business is required')),
  companyId: v.pipe(v.string(), v.minLength(1, 'Company is required')),
  clientId: v.pipe(v.string(), v.minLength(1, 'Client is required')),
  issueDate: v.pipe(v.string(), v.minLength(1, 'Issue date is required')),
  dueDate: v.pipe(v.string(), v.minLength(1, 'Due date is required')),
  currency: v.pipe(v.string(), v.minLength(1, 'Currency is required')),
  taxName: v.pipe(v.string(), v.minLength(1, 'Tax name is required')),
  taxRate: numberStringSchema,
  description: v.optional(v.string()),
  memo: v.optional(v.string()),
  bankId: v.optional(v.string()),
  paymentType: v.union([v.literal('full'), v.literal('tranche')]),
  paymentMethod: v.union([v.literal('bank'), v.literal('link')]),
  payLink: v.optional(v.string()),
  payLinkLabel: v.pipe(v.string(), v.minLength(1, 'Pay link label is required')),
  items: v.pipe(v.array(itemSchema), v.minLength(1, 'At least one item is required')),
  tranches: v.optional(v.array(trancheSchema)),
})

type ItemValue = {
  name: string
  description: string
  qty: string
  cost: string
  discountName: string
  discountPct: string
  discountAmt: string
  sortOrder: number
}

type TrancheValue = {
  name: string
  deliverables: string
  dueDate: string
  amount: string
  paid: boolean
  sortOrder: number
}

interface InvoiceFormProps {
  initialData?: {
    businessId?: string
    companyId?: string
    clientId?: string
    issueDate?: string
    dueDate?: string
    currency?: string
    taxName?: string
    taxRate?: string
    description?: string
    memo?: string
    bankId?: string
    paymentType?: 'full' | 'tranche'
    paymentMethod?: 'bank' | 'link'
    payLink?: string
    payLinkLabel?: string
    items?: ItemValue[]
    tranches?: TrancheValue[]
  }
  isEditing?: boolean
  invoiceId?: string
}

export function InvoiceForm({ initialData, isEditing = false, invoiceId }: InvoiceFormProps) {
  const navigate = useNavigate()
  const { data: businessesData } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => getBusinesses({ data: {} }),
  })

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies({ data: {} }),
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients({ data: {} }),
  })

  const { data: banksData } = useQuery({
    queryKey: ['banks'],
    queryFn: () => getBanks({ data: {} }),
  })

  const [showTranches, setShowTranches] = useState(initialData?.paymentType === 'tranche')
  const [saveNote, setSaveNote] = useState('')

  const defaultItems: ItemValue[] = [
    { name: '', description: '', qty: '1', cost: '0', discountName: '', discountPct: '0', discountAmt: '0', sortOrder: 0 }
  ]

  const defaultTranches: TrancheValue[] = [
    { name: '', deliverables: '', dueDate: '', amount: '0', paid: false, sortOrder: 0 }
  ]

  const form = useForm({
    defaultValues: {
      businessId: '',
      companyId: '',
      clientId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'NGN',
      taxName: 'VAT',
      taxRate: '7.50',
      description: '',
      memo: '',
      bankId: '',
      paymentType: 'full' as 'full' | 'tranche',
      paymentMethod: 'bank' as 'bank' | 'link',
      payLink: '',
      payLinkLabel: 'Pay online',
      items: defaultItems,
      tranches: defaultTranches,
      ...initialData,
    },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, invoiceSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, invoiceSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEditing && invoiceId) {
          await updateInvoice({ data: { ...value, id: invoiceId } })
          toast.add({ title: 'Invoice updated successfully', type: 'success' })
          navigate({ to: `/invoices/${invoiceId}` })
        } else {
          const result = await createInvoice({ data: value })
          toast.add({ title: 'Invoice created successfully', type: 'success' })
          navigate({ to: `/invoices/${result.invoiceId}` })
        }
      } catch (error) {
        toast.add({ title: 'Error', description: (error as Error).message, type: 'error' })
      }
    },
  })

  const items = form.getFieldValue('items') as ItemValue[]
  const tranches = form.getFieldValue('tranches') as TrancheValue[]

  const handlePaymentTypeChange = (value: string | null) => {
    const v = value ?? ''
    form.setFieldValue('paymentType', v as 'full' | 'tranche')
    setShowTranches(v === 'tranche')
  }

  const addItem = () => {
    const newItems = [...items, { name: '', description: '', qty: '1', cost: '0', discountName: '', discountPct: '0', discountAmt: '0', sortOrder: items.length }]
    form.setFieldValue('items', newItems)
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i }))
    form.setFieldValue('items', newItems)
  }

  const updateItem = (index: number, field: keyof ItemValue, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    form.setFieldValue('items', newItems)
  }

  const addTranche = () => {
    const newTranches = [...tranches, { name: '', deliverables: '', dueDate: '', amount: '0', paid: false, sortOrder: tranches.length }]
    form.setFieldValue('tranches', newTranches)
  }

  const removeTranche = (index: number) => {
    const newTranches = tranches.filter((_, i) => i !== index)
    form.setFieldValue('tranches', newTranches)
  }

  const updateTranche = (index: number, field: keyof TrancheValue, value: string | boolean) => {
    const newTranches = [...tranches]
    newTranches[index] = { ...newTranches[index], [field]: value }
    form.setFieldValue('tranches', newTranches)
  }

  const calculateItemTotal = (item: ItemValue) => {
    const qty = Number(item.qty || 0)
    const cost = Number(item.cost || 0)
    const discountPct = Number(item.discountPct || 0)
    const discountAmt = Number(item.discountAmt || 0)
    const lineTotal = qty * cost
    const discountAmount = discountAmt + (lineTotal * discountPct / 100)
    return lineTotal - discountAmount
  }

  const calculateSubtotal = () => {
    return items.reduce((sum: number, item: ItemValue) => sum + calculateItemTotal(item), 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    const taxRate = Number(form.getFieldValue('taxRate') || 0)
    return subtotal * (taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }

  if (!businessesData || !companiesData || !clientsData) {
    return (
      <div className="py-12 text-center text-sm text-[#5c5755]">Loading…</div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    form.handleSubmit()
  }

  const editTitle = isEditing ? `Edit ${initialData?.businessId || 'Invoice'}` : 'New invoice'

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1.55fr_1fr] gap-8 items-start py-6" style={{ padding: '28px 24px 56px', gap: 32 }}>
      {/* Left */}
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#201e1d] pb-3">
          <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none">{editTitle}</h1>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate({ to: '/invoices' })} className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8]">Cancel</button>
            <button type="submit" className="bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10]">{isEditing ? 'Save invoice' : 'Save invoice'}</button>
          </div>
        </div>

        {/* BUSINESS & INVOICING ENTITY */}
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">BUSINESS & INVOICING ENTITY</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Business / event</Label>
              <Select value={form.getFieldValue('businessId')} onValueChange={(v) => form.setFieldValue('businessId', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businessesData.businesses?.map((b: { id: string; name: string }) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Invoicing company</Label>
              <Select value={form.getFieldValue('companyId')} onValueChange={(v) => form.setFieldValue('companyId', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companiesData.companies?.map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* INVOICE */}
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">INVOICE</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Date of issue *</Label>
              <Input type="date" value={form.getFieldValue('issueDate')} onChange={(e) => form.setFieldValue('issueDate', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Due date *</Label>
              <Input type="date" value={form.getFieldValue('dueDate')} onChange={(e) => form.setFieldValue('dueDate', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Currency *</Label>
              <Select value={form.getFieldValue('currency')} onValueChange={(v) => form.setFieldValue('currency', v ?? 'NGN')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NGN','USD','EUR','GBP','KES','GHS','ZAR','RWF','UGX','XOF'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <Label>Invoice description</Label>
            <Textarea value={form.getFieldValue('description') || ''} onChange={(e) => form.setFieldValue('description', e.target.value)} placeholder="What this invoice is for — appears under Re: on the document" rows={2} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Tax / fee name</Label>
              <Input value={form.getFieldValue('taxName')} onChange={(e) => form.setFieldValue('taxName', e.target.value)} placeholder="VAT" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Rate (%)</Label>
              <Input type="number" step="0.01" value={form.getFieldValue('taxRate')} onChange={(e) => form.setFieldValue('taxRate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* CLIENT */}
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">CLIENT</div>
          <div className="grid grid-cols-[1fr_1.4fr] gap-4 items-start">
            <div className="flex flex-col gap-2">
              <Select value={form.getFieldValue('clientId')} onValueChange={(v) => form.setFieldValue('clientId', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clientsData.clients?.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <button type="button" onClick={() => navigate({ to: '/clients/new' })} className="self-start border border-[#201e1d] bg-white px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8]">+ New client</button>
            </div>
            <div className="border-l-2 border-[#201e1d] pl-3.5 text-xs leading-5">
              <div className="font-semibold">{clientsData.clients?.find((c: any) => c.id === form.getFieldValue('clientId'))?.name || '—'}</div>
              <div className="text-[#5c5755]">{clientsData.clients?.find((c: any) => c.id === form.getFieldValue('clientId'))?.email || '—'}</div>
              <div className="text-[#5c5755]">{clientsData.clients?.find((c: any) => c.id === form.getFieldValue('clientId'))?.contact || ''}</div>
            </div>
          </div>
        </div>

        {/* PRODUCTS & SERVICES */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">PRODUCTS & SERVICES</div>
            <button type="button" onClick={addItem} className="border border-[#201e1d] bg-white px-2.5 py-1 text-[11px] font-semibold hover:bg-[#f0dcd8]">Add blank line</button>
          </div>
          <div className="flex flex-col gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
            {items.map((item, index) => (
              <div key={index} className="bg-white p-3 flex flex-col gap-2.5">
                <div className="grid grid-cols-[1.4fr_0.5fr_1fr_1fr_0.6fr_0.8fr_auto] gap-2.5 items-end">
                  <div className="flex flex-col gap-1"><Label>Product / service</Label><Input value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="e.g. Mobilisation" /></div>
                  <div className="flex flex-col gap-1"><Label>Qty</Label><Input type="number" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} /></div>
                  <div className="flex flex-col gap-1"><Label>Unit cost</Label><Input type="number" value={item.cost} onChange={(e) => updateItem(index, 'cost', e.target.value)} /></div>
                  <div className="flex flex-col gap-1"><Label>Discount name</Label><Input value={item.discountName} onChange={(e) => updateItem(index, 'discountName', e.target.value)} placeholder="Early Bird" /></div>
                  <div className="flex flex-col gap-1"><Label>Disc %</Label><Input type="number" value={item.discountPct} onChange={(e) => updateItem(index, 'discountPct', e.target.value)} /></div>
                  <div className="flex flex-col gap-1"><Label>Disc amount</Label><Input type="number" value={item.discountAmt} onChange={(e) => updateItem(index, 'discountAmt', e.target.value)} /></div>
                  <button type="button" onClick={() => removeItem(index)} className="border border-[#201e1d] bg-white px-2 py-2 text-[11px] font-semibold hover:bg-[#f0dcd8] mb-0.5">✕</button>
                </div>
                <div className="grid grid-cols-[1fr_140px] gap-2.5 items-end">
                  <div className="flex flex-col gap-1"><Label>Line description</Label><Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Deliverables, notes…" /></div>
                  <div className="text-right text-[13px] font-semibold tabular-nums">{formatCurrency(calculateItemTotal(item))} {form.getFieldValue('currency')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAYMENT TERMS */}
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">PAYMENT TERMS</div>
          <div className="flex gap-1 flex-wrap">
            {(['full','tranche'] as const).map((v) => (
              <button key={v} type="button" onClick={() => handlePaymentTypeChange(v)} className={form.getFieldValue('paymentType') === v ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold' : 'bg-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]'}>{v === 'full' ? 'Full' : 'Tranche'}</button>
            ))}
          </div>
          {showTranches && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <button type="button" onClick={addTranche} className="border border-[#201e1d] bg-white px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8]">Add tranche</button>
              </div>
              <div className="flex flex-col gap-0.5 bg-[#201e1d] border-2 border-[#201e1d]">
                {tranches.map((t, i) => (
                  <div key={i} className="bg-white p-3 grid grid-cols-[1fr_1.8fr_1fr_1fr_auto] gap-2.5 items-end">
                    <div className="flex flex-col gap-1"><Label>Milestone</Label><Input value={t.name} onChange={(e) => updateTranche(i, 'name', e.target.value)} /></div>
                    <div className="flex flex-col gap-1"><Label>Deliverables</Label><Input value={t.deliverables} onChange={(e) => updateTranche(i, 'deliverables', e.target.value)} /></div>
                    <div className="flex flex-col gap-1"><Label>Due date</Label><Input type="date" value={t.dueDate} onChange={(e) => updateTranche(i, 'dueDate', e.target.value)} /></div>
                    <div className="flex flex-col gap-1"><Label>Amount</Label><Input type="number" value={t.amount} onChange={(e) => updateTranche(i, 'amount', e.target.value)} /></div>
                    <div className="flex gap-1 items-center pb-0.5">
                      <button type="button" onClick={() => updateTranche(i, 'paid', !t.paid)} className={t.paid ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2 py-1.5 text-[11px] font-semibold' : 'border border-[#201e1d] bg-white px-2 py-1.5 text-[11px] font-semibold'}>{t.paid ? 'Paid' : 'Unpaid'}</button>
                      <button type="button" onClick={() => removeTranche(i)} className="border border-[#201e1d] bg-white px-2 py-1.5 text-[11px] font-semibold">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-6 mt-4 pt-3 border-t-2 border-[#201e1d] text-[13px]">
            <div>Subtotal <strong className="tabular-nums">{formatCurrency(calculateSubtotal())}</strong></div>
            <div>{form.getFieldValue('taxName')} <strong className="tabular-nums">{formatCurrency(calculateTax())}</strong></div>
            <div>Total <strong className="tabular-nums">{formatCurrency(calculateTotal())}</strong></div>
          </div>
        </div>

        {/* PAYMENT DESTINATION & MEMO */}
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">PAYMENT DESTINATION & MEMO</div>
          <div className="flex gap-1 mb-3">
            {(['bank','link'] as const).map((v) => (
              <button key={v} type="button" onClick={() => form.setFieldValue('paymentMethod', v)} className={form.getFieldValue('paymentMethod') === v ? 'bg-[#201e1d] text-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold' : 'bg-white border border-[#201e1d] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]'}>{v === 'bank' ? 'Bank' : 'Link'}</button>
            ))}
          </div>
          {form.getFieldValue('paymentMethod') === 'bank' ? (
            <div className="flex flex-col gap-1">
              <Label>Bank account on the invoice</Label>
              <Select value={form.getFieldValue('bankId') || ''} onValueChange={(v) => form.setFieldValue('bankId', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {banksData?.banks?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1"><Label>Payment link</Label><Input value={form.getFieldValue('payLink') || ''} onChange={(e) => form.setFieldValue('payLink', e.target.value)} placeholder="https://checkout.korapay.com/pay/…" /></div>
              <div className="flex flex-col gap-1"><Label>Button label</Label><Input value={form.getFieldValue('payLinkLabel')} onChange={(e) => form.setFieldValue('payLinkLabel', e.target.value)} /></div>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-1">
            <Label>Memo on the invoice</Label>
            <Textarea value={form.getFieldValue('memo') || ''} onChange={(e) => form.setFieldValue('memo', e.target.value)} placeholder="Editable note printed at the foot of the invoice" rows={3} />
          </div>
        </div>
      </div>

      {/* Right sidebar — SAVE NOTE + COMMENTARY + HISTORY like template */}
      <div className="border-l-2 border-[#201e1d] pl-6 flex flex-col gap-5 lg:sticky lg:top-[72px] self-start">
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold mb-2.5">SAVE NOTE</div>
          <Textarea value={saveNote} onChange={(e) => setSaveNote(e.target.value)} placeholder="What changed and why — kept on the record" rows={3} />
          <div className="text-[11px] text-[#5c5755] mt-2">Every save records who, when, each field changed (old → new), your note and a full snapshot.</div>
        </div>
        <div className="border-t-2 border-[#201e1d] pt-3.5">
          <div className="flex items-baseline justify-between gap-2.5 mb-2.5">
            <div className="text-[10px] tracking-[0.12em] font-semibold">COMMENTARY</div>
            <div className="text-[11px] text-[#5c5755]">0 comments</div>
          </div>
          <div className="text-xs text-[#5c5755]">Save the invoice first, then the team can comment on it.</div>
        </div>
        <div className="border-t-2 border-[#201e1d] pt-3.5">
          <div className="text-[10px] tracking-[0.12em] font-semibold mb-2.5">EDIT HISTORY</div>
          <div className="text-xs text-[#5c5755]">No history yet — first save will create an entry.</div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => navigate({ to: '/invoices' })} className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8]">Cancel</button>
          <button type="submit" className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 text-xs font-semibold hover:bg-[#c02a10]">{isEditing ? 'Save changes' : 'Create invoice'}</button>
        </div>
      </div>
    </form>
  )
}
