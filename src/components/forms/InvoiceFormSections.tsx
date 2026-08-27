"use client"

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from '#/components/ui/command'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog'
import { Textarea } from '#/components/ui/textarea'
import { createClient } from '#/lib/server-fns/crm'
import { toast } from '#/components/ui/toast'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { CurrencySelect } from '#/components/ui/currency-select'
import { Skeleton } from '#/components/ui/skeleton'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { useBusinesses, useCompanies, useClients, useBanks, useProducts } from '#/hooks/useReferences'
import { getLatestInvoiceNumber } from '#/lib/server-fns/invoice-create'

export function BusinessEntitySection({ form }: { form: any }) {
  const { data: businessesData, isLoading: loadingBiz } = useBusinesses()
  const { data: companiesData, isLoading: loadingComp } = useCompanies()

  if (loadingBiz || loadingComp) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-40 rounded-none" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">BUSINESS & INVOICING ENTITY</div>
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="businessId">
          {(field: any) => (
            <Field>
              <FieldLabel>Business / event</FieldLabel>
              <Popover>
                <PopoverTrigger render={<Button variant="outline" className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal">
                    {businessesData?.businesses?.find((b: any) => b.id === field.state.value)?.name || 'Select business'}
                    <ChevronsUpDownIcon className="h-4 w-4 opacity-50" /></Button>}>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-none border border-[#201e1d] bg-white">
                  <Command>
                    <CommandInput placeholder="Search business…" className="h-9 border-b border-[#d6d3d1] rounded-none" />
                    <CommandList>
                      <CommandEmpty>No business found.</CommandEmpty>
                      <CommandGroup>
                        {businessesData?.businesses?.map((b: any) => (
                          <CommandItem key={b.id} value={b.name} onSelect={() => field.handleChange(b.id)} className="rounded-none">
                            {b.name}
                            {field.state.value === b.id && <CheckIcon className="ml-auto h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="companyId">
          {(field: any) => (
            <Field>
              <FieldLabel>Invoicing company</FieldLabel>
              <Popover>
                <PopoverTrigger render={<Button variant="outline" className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal">
                    {companiesData?.companies?.find((c: any) => c.id === field.state.value)?.name || 'Select company'}
                    <ChevronsUpDownIcon className="h-4 w-4 opacity-50" /></Button>}>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-none border border-[#201e1d] bg-white">
                  <Command>
                    <CommandInput placeholder="Search company…" className="h-9 border-b border-[#d6d3d1] rounded-none" />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {companiesData?.companies?.map((c: any) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => field.handleChange(c.id)} className="rounded-none">
                            {c.name}
                            {field.state.value === c.id && <CheckIcon className="ml-auto h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>
    </div>
  )
}

export function InvoiceSection({ form }: { form: any }) {
  const handleAutoNumber = async () => {
    const businessId = (form as any).getFieldValue('businessId') as string | undefined
    if (!businessId) {
      toast.add({ description: 'Select a business first', type: 'error' })
      return
    }
    try {
      const res = await getLatestInvoiceNumber({ data: { businessId } })
      ;(form as any).setFieldValue('number', res.nextNumber)
    } catch (e) {
      toast.add({ description: (e as Error).message, type: 'error' })
    }
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">INVOICE</div>
      <div className="grid grid-cols-4 gap-3">
        <form.Field name="number">
          {(field: any) => (
            <Field>
              <FieldLabel>Invoice number</FieldLabel>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Input value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} placeholder="SPK-2026-…" />
                <Button type="button" variant="outline" size="sm" onClick={handleAutoNumber} className="border border-[#201e1d] bg-white px-2.5 py-2 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none">Auto</Button>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="issueDate">
          {(field: any) => (
            <Field>
              <FieldLabel>Date of issue *</FieldLabel>
              <Input type="date" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="dueDate">
          {(field: any) => (
            <Field>
              <FieldLabel>Due date *</FieldLabel>
              <Input type="date" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="currency">
          {(field: any) => (
            <CurrencySelect
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
              label="Currency *"
              placeholder="NGN"
              error={field.state.meta.errors as any}
            />
          )}
        </form.Field>
      </div>
      <div className="mt-3 grid gap-3">
        <form.Field name="description">
          {(field: any) => (
            <Field>
              <FieldLabel>Invoice description</FieldLabel>
              <Textarea value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="What this invoice is for — appears under Re: on the document" rows={2} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <form.Field name="taxName">
          {(field: any) => (
            <Field>
              <FieldLabel>Tax / fee name</FieldLabel>
              <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="VAT" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="taxRate">
          {(field: any) => (
            <Field>
              <FieldLabel>Rate (%)</FieldLabel>
              <Input type="text" inputMode="decimal" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>
    </div>
  )
}

export function ClientSection({ form }: { form: any }) {
  const { data: clientsData, isLoading } = useClients()
  const [showNewClientDialog, setShowNewClientDialog] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-20 rounded-none" />
        <div className="grid grid-cols-[1fr_1.4fr] gap-4">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-24 rounded-none" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">CLIENT</div>
      <div className="grid grid-cols-[1fr_1.4fr] gap-4 items-start">
        <form.Field name="clientId">
          {(field: any) => (
            <Field>
              <FieldLabel>Client</FieldLabel>
              <Popover>
                <PopoverTrigger render={<Button variant="outline" className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal">
                    {clientsData?.clients?.find((c: any) => c.id === field.state.value)?.name || 'Select client'}
                    <ChevronsUpDownIcon className="h-4 w-4 opacity-50" /></Button>}>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-none border border-[#201e1d] bg-white">
                  <Command>
                    <CommandInput placeholder="Search client…" className="h-9 border-b border-[#d6d3d1] rounded-none" />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        {clientsData?.clients?.map((c: any) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => field.handleChange(c.id)} className="rounded-none">
                            {c.name}
                            {field.state.value === c.id && <CheckIcon className="ml-auto h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <Button type="button" onClick={() => setShowNewClientDialog(true)} className="self-start border border-[#201e1d] bg-white px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#f0dcd8]">+ New client</Button>
      </div>
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
            <DialogDescription>Add a new client to use in this invoice</DialogDescription>
          </DialogHeader>
          <NewClientForm onSuccess={() => setShowNewClientDialog(false)} />
        </DialogContent>
      </Dialog>
      <form.Field name="clientId">
        {(field: any) => {
          const selected = clientsData?.clients?.find((c: any) => c.id === field.state.value)
          if (!selected) return null
          return (
            <div className="border-l-2 border-[#201e1d] pl-3.5 text-xs leading-5 mt-3">
              <div className="font-semibold">{selected.name}</div>
              <div className="text-[#5c5755]">{selected.email || '—'}</div>
              <div className="text-[#5c5755]">{selected.contact || ''}</div>
            </div>
          )
        }}
      </form.Field>
    </>
  )
}

const NewClientForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const clientSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    email: v.optional(v.string()),
    contact: v.optional(v.string()),
    reg: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  })

  const form = useForm({
    defaultValues: { name: '', email: '', contact: '', reg: '', address: '', notes: '' },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, clientSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, clientSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        await createClient({ data: value })
        toast.add({ title: 'Client created', type: 'success' })
        onSuccess()
      } catch (error) {
        toast.add({ description: (error as Error).message, type: 'error' })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    form.handleSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <form.Field name="name">
          {(field: any) => (
            <Field>
              <FieldLabel>Name *</FieldLabel>
              <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="B4B Partners Limited" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="email">
          {(field: any) => (
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="you@client.co" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="contact">
          {(field: any) => (
            <Field>
              <FieldLabel>Contact person</FieldLabel>
              <Input value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="Chinapa Onwusah" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="reg">
          {(field: any) => (
            <Field>
              <FieldLabel>Registration no.</FieldLabel>
              <Input value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="RC 7347187" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <div className="md:col-span-2">
          <form.Field name="address">
            {(field: any) => (
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Textarea value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="Road 13, Ikota Villa Estate, Ajah…" rows={2} />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
        <div className="md:col-span-2">
          <form.Field name="notes">
            {(field: any) => (
              <Field>
                <FieldLabel>About the client</FieldLabel>
                <Textarea value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="Internal notes…" rows={3} />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Cancel</Button>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" variant="default" disabled={!canSubmit || isSubmitting} className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-2 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none">
              {isSubmitting ? 'Saving…' : 'Save and use'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

export function LineItemsSection({ form }: { form: any }) {
  const { data: productsData } = useProducts()

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">LINE ITEMS</div>
        <form.Field name="items" mode="array">
          {(field: any) => (
            <div className="flex gap-2">
              <Button type="button" onClick={() => field.pushValue({ name: '', description: '', qty: '1', cost: '0', discountName: '', discountPct: '0', discountAmt: '0', sortOrder: field.state.value.length })} className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d]">+ Add line</Button>
              {field.state.value.length > 1 && (
                <Button type="button" onClick={() => {
                  const items = field.state.value as any[]
                  const total = items.reduce((sum: number, it: any) => sum + Number(it.qty || 0) * Number(it.cost || 0), 0)
                  const split = total / items.length
                  const newItems = items.map((it: any, i: number) => ({ ...it, cost: (split / Number(it.qty || 1)).toFixed(2), sortOrder: i }))
                  field.handleChange(newItems)
                }} className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d]">Split evenly</Button>
              )}
            </div>
          )}
        </form.Field>
      </div>

      {productsData?.products && productsData.products.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="text-[11px] font-semibold self-center">Catalogue:</span>
          {productsData.products.slice(0,6).map((p: any) => (
            <form.Field key={p.id} name="items" mode="array">
              {(field: any) => (
                <Button type="button" variant="outline" onClick={() => field.pushValue({ name: p.name, description: p.description || '', qty: '1', cost: p.cost, discountName: '', discountPct: '0', discountAmt: '0', sortOrder: field.state.value.length })} className="h-7 px-2 text-[11px] rounded-none border-[#201e1d] hover:bg-[#f0dcd8]">
                  <PlusIcon className="h-3 w-3 mr-1" />{p.name}
                </Button>
              )}
            </form.Field>
          ))}
        </div>
      )}

      <form.Field name="items" mode="array">
        {(field: any) => (
          <div className="space-y-2">
            {field.state.value.map((_: any, index: number) => (
              <div key={index} className="grid grid-cols-[1fr_80px_90px_80px_40px] gap-2 items-start p-2 border border-[#d6d3d1] bg-white">
                <form.Field name={`items[${index}].name`}>
                  {(sub: any) => (
                    <Field>
                      <Input value={sub.state.value} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Item name" className="h-9 px-2.5 text-[13px]" />
                      <FieldError errors={sub.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`items[${index}].qty`}>
                  {(sub: any) => (
                    <Field>
                      <Input type="text" inputMode="decimal" value={sub.state.value} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Qty" className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums" />
                      <FieldError errors={sub.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`items[${index}].cost`}>
                  {(sub: any) => (
                    <Field>
                      <Input type="text" inputMode="decimal" value={sub.state.value} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Cost" className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums" />
                      <FieldError errors={sub.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name={`items[${index}].discountPct`}>
                  {(sub: any) => (
                    <Field>
                      <Input type="text" inputMode="decimal" value={sub.state.value || ''} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Disc %" className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums" />
                      <FieldError errors={sub.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
                <Button type="button" onClick={() => field.removeValue(index)} disabled={field.state.value.length === 1} className="h-9 w-9 p-0 rounded-none border border-[#201e1d] bg-white text-[#c02a10] hover:bg-[#fff2ef] disabled:opacity-30">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {field.state.meta.errors ? <FieldError errors={field.state.meta.errors} /> : null}
          </div>
        )}
      </form.Field>
    </div>
  )
}

export function TranchesSection({ form }: { form: any }) {
  return (
    <form.Field name="paymentType">
      {(pTypeField: any) => (
        <div>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">TRANCHES</div>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={pTypeField.state.value === 'tranche'} onCheckedChange={(checked) => pTypeField.handleChange(checked ? 'tranche' : 'full')} className="w-4 h-4 border-2 border-[#201e1d] rounded-none data-[state=checked]:bg-[#ec3013] data-[state=checked]:border-[#ec3013]" />
              <span className="text-sm">Enable tranches</span>
            </Label>
          </div>
          {pTypeField.state.value !== 'tranche' ? (
            <div className="text-xs text-[#5c5755] py-4 border-2 border-dashed border-[#d6d3d1] rounded-none text-center">
              Enable tranches to split payments into milestones
            </div>
          ) : (
            <form.Field name="tranches" mode="array">
              {(field: any) => (
                <>
                  <div className="flex justify-end mb-2">
                    <Button type="button" onClick={() => field.pushValue({ name: '', deliverables: '', dueDate: '', amount: '0', paid: false, sortOrder: field.state.value.length })} className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d]">+ Add tranche</Button>
                  </div>
                  <div className="space-y-2">
                    {(field.state.value || []).map((_: any, index: number) => (
                      <div key={index} className="grid grid-cols-[1fr_120px_100px_60px_40px] gap-2 items-start p-2 border border-[#d6d3d1] bg-white">
                        <form.Field name={`tranches[${index}].name`}>
                          {(sub: any) => (
                            <Field>
                              <Input value={sub.state.value} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Tranche name (e.g. 50% Deposit)" className="h-9 px-2.5 text-[13px]" />
                              <FieldError errors={sub.state.meta.errors} />
                            </Field>
                          )}
                        </form.Field>
                        <form.Field name={`tranches[${index}].amount`}>
                          {(sub: any) => (
                            <Field>
                              <Input type="text" inputMode="decimal" value={sub.state.value} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Amount" className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums" />
                              <FieldError errors={sub.state.meta.errors} />
                            </Field>
                          )}
                        </form.Field>
                        <form.Field name={`tranches[${index}].dueDate`}>
                          {(sub: any) => (
                            <Field>
                              <Input type="date" value={sub.state.value || ''} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} className="h-9 px-2.5 text-[13px]" />
                              <FieldError errors={sub.state.meta.errors} />
                            </Field>
                          )}
                        </form.Field>
                        <form.Field name={`tranches[${index}].deliverables`}>
                          {(sub: any) => (
                            <Field>
                              <Input value={sub.state.value || ''} onChange={(e) => sub.handleChange(e.target.value)} onBlur={sub.handleBlur} placeholder="Deliverables" className="h-9 px-2.5 text-[13px]" />
                              <FieldError errors={sub.state.meta.errors} />
                            </Field>
                          )}
                        </form.Field>
                        <Button type="button" onClick={() => field.removeValue(index)} className="h-9 w-9 p-0 rounded-none border border-[#201e1d] bg-white text-[#c02a10] hover:bg-[#fff2ef]">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </form.Field>
          )}
        </div>
      )}
    </form.Field>
  )
}

export function PaymentDestinationSection({ form }: { form: any }) {
  return (
    <form.Field name="paymentMethod">
      {(pmField: any) => (
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">PAYMENT DESTINATION</div>
          <RadioGroup value={pmField.state.value} onValueChange={(val) => pmField.handleChange(val as 'bank' | 'link')} className="flex gap-4 mb-4">
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="bank" />
              <span className="text-sm">Bank transfer</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="link" />
              <span className="text-sm">Payment link</span>
            </Label>
          </RadioGroup>

          {pmField.state.value === 'bank' && (
            <form.Field name="bankId">
              {(bankField: any) => (
                <Field>
                  <FieldLabel>Bank account</FieldLabel>
                  <BankSelect field={bankField} />
                  <FieldError errors={bankField.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          )}

          {pmField.state.value === 'link' && (
            <div className="grid gap-3">
              <form.Field name="payLink">
                {(field: any) => (
                  <Field>
                    <FieldLabel>Pay link URL</FieldLabel>
                    <Input value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="https://checkout.korapay.com/pay/..." />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="payLinkCurrency">
                {(field: any) => (
                  <CurrencySelect value={field.state.value || ''} onValueChange={(v) => field.handleChange(v)} label="Pay link currency" placeholder="Select currency" error={field.state.meta.errors as any} />
                )}
              </form.Field>
            </div>
          )}
        </div>
      )}
    </form.Field>
  )
}

function BankSelect({ field }: { field: any }) {
  const { data: banksData, isLoading } = useBanks()

  if (isLoading) return <Skeleton className="h-9 w-full rounded-none" />

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal">
          {banksData?.banks?.find((b: any) => b.id === field.state.value)?.label || 'Select bank account'}
          <ChevronsUpDownIcon className="h-4 w-4 opacity-50" /></Button>}>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0 rounded-none border border-[#201e1d] bg-white">
        <Command>
          <CommandInput placeholder="Search bank…" className="h-9 border-b border-[#d6d3d1] rounded-none" />
          <CommandList>
            <CommandEmpty>No bank account found.</CommandEmpty>
            <CommandGroup>
              {banksData?.banks?.map((b: any) => (
                <CommandItem key={b.id} value={b.label} onSelect={() => field.handleChange(b.id)} className="rounded-none">
                  <div className="font-medium">{b.label}</div>
                  <div className="text-xs text-[#5c5755]">{b.currency} • {b.fields.map(([k, v]: [string, string]) => `${k}: ${v}`).join(' • ')}</div>
                  {field.state.value === b.id && <CheckIcon className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function RightPanelSection({ form: _form }: { form: any }) {
  return null
}
