"use client"

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Textarea } from '#/components/ui/textarea'
import { toast } from '#/components/ui/toast'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '#/components/ui/dialog'

import { getBusinesses } from '#/lib/server-fns/references'
import { getCompanies } from '#/lib/server-fns/references'
import { getClients } from '#/lib/server-fns/references'
import { getBanks } from '#/lib/server-fns/references'
import { createInvoice } from '#/lib/server-fns/invoice-create'
import { updateInvoice } from '#/lib/server-fns/invoice-create'

import { BusinessEntitySection } from './InvoiceFormSections'
import { InvoiceSection } from './InvoiceFormSections'
import { ClientSection } from './InvoiceFormSections'
import { LineItemsSection } from './InvoiceFormSections'
import { TranchesSection } from './InvoiceFormSections'
import { PaymentDestinationSection } from './InvoiceFormSections'

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

export const invoiceSchema = v.object({
  businessId: v.pipe(v.string(), v.minLength(1, 'Business is required')),
  companyId: v.pipe(v.string(), v.minLength(1, 'Company is required')),
  clientId: v.pipe(v.string(), v.minLength(1, 'Client is required')),
  issueDate: v.pipe(v.string(), v.minLength(1, 'Issue date is required')),
  dueDate: v.pipe(v.string(), v.minLength(1, 'Due date is required')),
  currency: v.pipe(v.string(), v.minLength(1, 'Currency is required')),
  taxName: v.pipe(v.string(), v.minLength(1, 'Tax name is required')),
  taxRate: numberStringSchema,
  number: v.optional(v.string()),
  description: v.optional(v.string()),
  memo: v.optional(v.string()),
  bankId: v.optional(v.string()),
  paymentType: v.union([v.literal('full'), v.literal('tranche')]),
  paymentMethod: v.union([v.literal('bank'), v.literal('link')]),
  payLink: v.optional(v.string()),
  payLinkLabel: v.optional(v.string()),
  payLinkCurrency: v.optional(v.string()),
  items: v.pipe(v.array(itemSchema), v.minLength(1, 'At least one item is required')),
  tranches: v.optional(v.array(trancheSchema)),
})
export type InvoiceFormValues = v.InferOutput<typeof invoiceSchema>
// Use any for form Api to keep Field access simple while preserving values type via inference
export type InvoiceFormApi = any

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
    number?: string
    description?: string
    memo?: string
    bankId?: string
    paymentType?: 'full' | 'tranche'
    paymentMethod?: 'bank' | 'link'
    payLink?: string
    payLinkLabel?: string
    payLinkCurrency?: string
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

  const { data: _banksData } = useQuery({
    queryKey: ['banks'],
    queryFn: () => getBanks({ data: {} }),
  })

  const [_showTranches, _setShowTranches] = useState(initialData?.paymentType === 'tranche')
  const [saveNote, setSaveNote] = useState('')
  const [collisionOpen, setCollisionOpen] = useState(false)
  const [suggestedNumber, setSuggestedNumber] = useState('')

  const parseSuggestedNumber = (message: string): string | null => {
    const m = message.match(/proceed with\s+(.+?)\?/i)
    return m ? m[1].trim() : null
  }

  const defaultItems: ItemValue[] = [
    { name: '', description: '', qty: '1', cost: '0', discountName: '', discountPct: '0', discountAmt: '0', sortOrder: 0 }
  ]

  const defaultTranches: TrancheValue[] = [
    { name: '', deliverables: '', dueDate: '', amount: '0', paid: false, sortOrder: 0 }
  ]

  const form = useForm({
    defaultValues: {
      number: (initialData as any)?.number || '',
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
      payLinkCurrency: (initialData as any)?.payLinkCurrency || '',
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
        const payload = { ...value, saveNote: saveNote || undefined }
        if (isEditing && invoiceId) {
          await updateInvoice({ data: { ...payload, id: invoiceId } })
          toast.add({ title: 'Invoice updated successfully', type: 'success' })
          navigate({ to: `/invoices/${invoiceId}` })
        } else {
          const result = await createInvoice({ data: payload })
          toast.add({ title: 'Invoice created successfully', type: 'success' })
          navigate({ to: `/invoices/${result.invoiceId}` })
        }
      } catch (error) {
        const msg = (error as Error).message || ''
        const suggested = parseSuggestedNumber(msg)
        if (msg.includes('Number already exists') && suggested) {
          setSuggestedNumber(suggested)
          setCollisionOpen(true)
          return
        }
        toast.add({ description: msg || 'Failed to save invoice', type: 'error' })
      }
    },
  })

  // const items = form.getFieldValue('items') as ItemValue[]
  // const tranches = form.getFieldValue('tranches') as TrancheValue[]

  // const calculateItemTotal = (item: ItemValue) => {
  //   const qty = Number(item.qty || 0)
  //   const cost = Number(item.cost || 0)
  //   const discountPct = Number(item.discountPct || 0)
  //   const discountAmt = Number(item.discountAmt || 0)
  //   const lineTotal = qty * cost
  //   const discountAmount = discountAmt + (lineTotal * discountPct / 100)
  //   return lineTotal - discountAmount
  // }

  // const calculateSubtotal = () => {
  //   return items.reduce((sum: number, item: ItemValue) => sum + calculateItemTotal(item), 0)
  // }

  // const calculateTax = () => {
  //   const subtotal = calculateSubtotal()
  //   const taxRate = Number(form.getFieldValue('taxRate') || 0)
  //   return subtotal * (taxRate / 100)
  // }

  if (!businessesData || !companiesData || !clientsData) {
    return (
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-8 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-40 rounded-none" />
          <Skeleton className="h-20 w-full rounded-none" />
          <Skeleton className="h-20 w-full rounded-none" />
          <Skeleton className="h-32 w-full rounded-none" />
        </div>
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
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
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#201e1d] pb-3">
          <h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none">{editTitle}</h1>

          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => navigate({ to: '/invoices' })} className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Cancel</Button>
            <Button type="submit" size="sm" variant="default" className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 px-6 text-xs font-semibold hover:bg-[#c02a10] rounded-none">{isEditing ? 'Save changes' : 'Create invoice'}</Button>
          </div>
        </div>

        <BusinessEntitySection form={form} />
        <InvoiceSection form={form} />
        <ClientSection form={form} />
        <LineItemsSection form={form} />
        <TranchesSection form={form} />
        <PaymentDestinationSection form={form} />
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
      </div>

      {/* dailog to resolve invioce id collision */}
      <Dialog open={collisionOpen} onOpenChange={setCollisionOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Number already exists</DialogTitle>
            <DialogDescription>Number already exists — proceed with {suggestedNumber}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCollisionOpen(false)} className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Cancel</Button>
            <Button
              type="button"
              variant="default"
              onClick={() => {
                ; (form as any).setFieldValue('number', suggestedNumber)
                setCollisionOpen(false)
                setTimeout(() => form.handleSubmit(), 0)
              }}
              className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-2 text-xs font-semibold hover:bg-[#c02a10] rounded-none"
            >
              Proceed with {suggestedNumber}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
