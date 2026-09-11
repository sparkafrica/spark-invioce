'use client';

import { standardSchemaValidators, useForm } from '@tanstack/react-form';
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import { useState } from 'react';
import * as v from 'valibot';
import { Button } from '#/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command';
import { CurrencySelect } from '#/components/ui/currency-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { DatePicker } from '#/components/ui/date-picker';
import { Field, FieldError, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { NumberInput } from '#/components/ui/number-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import {
  useBanks,
  useBusinesses,
  useClients,
  useCompanies,
  useProducts,
} from '#/hooks/useReferences';
import { getErrorMessage } from '#/lib/errors';
import { createClient } from '#/lib/server-fns/crm';
import { getLatestInvoiceNumber } from '#/lib/server-fns/invoice-create';
import { cn } from '#/lib/utils';
import type { InvoiceFormApi, ItemValue, TrancheValue } from './InvoiceForm';

export function BusinessEntitySection({ form }: { form: InvoiceFormApi }) {
  const { data: businessesData, isLoading: loadingBiz } = useBusinesses();
  const { data: companiesData, isLoading: loadingComp } = useCompanies();

  if (loadingBiz || loadingComp) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-40 rounded-none" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
        BUSINESS & INVOICING ENTITY
      </div>
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="businessId">
          {(field) => (
            <Field>
              <FieldLabel>Business / event</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal"
                    >
                      {businessesData?.businesses?.find(
                        (b: { id: string; name: string }) =>
                          b.id === field.state.value,
                      )?.name || 'Select business'}
                      <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  }
                ></PopoverTrigger>
                <PopoverContent className="w-75 p-0 rounded-none border border-[#201e1d] bg-white">
                  <Command>
                    <CommandInput
                      placeholder="Search business…"
                      className="h-9 border-b border-[#d6d3d1] rounded-none"
                    />
                    <CommandList>
                      <CommandEmpty>No business found.</CommandEmpty>
                      <CommandGroup>
                        {businessesData?.businesses?.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={b.name}
                            onSelect={() => field.handleChange(b.id)}
                            className="rounded-none"
                            data-checked={field.state.value === b.id}
                          >
                            {b.name}
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
          {(field) => (
            <Field>
              <FieldLabel>Invoicing company</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal"
                    >
                      {companiesData?.companies?.find(
                        (c: { id: string; name: string }) =>
                          c.id === field.state.value,
                      )?.name || 'Select company'}
                      <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  }
                ></PopoverTrigger>
                <PopoverContent className="w-75 p-0 rounded-none border border-[#201e1d] bg-white">
                  <Command>
                    <CommandInput
                      placeholder="Search company…"
                      className="h-9 border-b border-[#d6d3d1] rounded-none"
                    />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {companiesData?.companies?.map(
                          (c: { id: string; name: string }) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => field.handleChange(c.id)}
                              className="rounded-none"
                              data-checked={field.state.value === c.id}
                            >
                              {c.name}
                            </CommandItem>
                          ),
                        )}
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
  );
}

export function InvoiceSection({ form }: { form: InvoiceFormApi }) {
  const handleAutoNumber = async () => {
    const businessId = form.getFieldValue('businessId') as string | undefined;
    if (!businessId) {
      toast.add({ description: 'Select a business first', type: 'error' });
      return;
    }
    try {
      const res = await getLatestInvoiceNumber({ data: { businessId } });
      form.setFieldValue('number', res.nextNumber);
    } catch (e: unknown) {
      toast.add({ description: getErrorMessage(e), type: 'error' });
    }
  };

  return (
    <div>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
        INVOICE
      </div>
      <div className="grid grid-cols-3 gap-3">
        <form.Field name="number">
          {(field) => (
            <Field>
              <FieldLabel>Invoice number</FieldLabel>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Input
                  value={(field.state.value as string) || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="SPK-2026-…"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoNumber}
                  className="border border-[#201e1d] bg-white px-2.5 py-2 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none"
                >
                  Auto
                </Button>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="issueDate">
          {(field) => (
            <Field>
              <FieldLabel>Date of issue *</FieldLabel>
              <DatePicker
                value={field.state.value as string}
                onChange={(v) => field.handleChange(v)}
                placeholder="Pick a date"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="dueDate">
          {(field) => (
            <Field>
              <FieldLabel>Due date *</FieldLabel>
              <DatePicker
                value={field.state.value as string}
                onChange={(v) => field.handleChange(v)}
                placeholder="Pick a date"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>
      <div className="mt-3 grid gap-3">
        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel>Invoice description</FieldLabel>
              <Textarea
                value={(field.state.value as string) || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="What this invoice is for — appears under Re: on the document"
                rows={2}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>
      <div className="mt-3 grid grid-cols-[1.6fr_1fr_0.8fr] gap-3 items-end">
        <form.Field name="currency">
          {(field) => (
            <Field>
              <FieldLabel>Currency *</FieldLabel>
              <CurrencySelect
                value={field.state.value as string}
                onValueChange={(v) => field.handleChange(v)}
                placeholder="Search currency..."
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="taxName">
          {(field) => (
            <Field>
              <FieldLabel>Tax / fee name</FieldLabel>
              <Input
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="VAT"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="taxRate">
          {(field) => (
            <Field>
              <FieldLabel>Rate (%)</FieldLabel>
              <NumberInput
                value={field.state.value as string ? Number(field.state.value as string) : 0}
                onValueChange={(next) => field.handleChange(next === null ? '' : next.toFixed(2))}
                onBlur={field.handleBlur}
                placeholder="7.50"
                min={0}
                max={100}
                step={0.5}
                className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>
    </div>
  );
}

export function ClientSection({ form }: { form: InvoiceFormApi }) {
  const { data: clientsData, isLoading } = useClients();
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-20 rounded-none" />
        <div className="grid grid-cols-[1fr_1.4fr] gap-4">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-24 rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
        CLIENT
      </div>
      <div className="grid grid-cols-[1fr_1.4fr] gap-4 items-start">
        <div className="space-y-2">
          <form.Field name="clientId">
            {(field) => (
              <Field>
                <FieldLabel>Client</FieldLabel>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="w-full justify-between border-[#201e1d] bg-white rounded-none h-9 px-2.5 text-[13px] font-normal"
                      >
                        {clientsData?.clients?.find(
                          (c: { id: string; name: string }) =>
                            c.id === field.state.value,
                        )?.name || 'Select client'}
                        <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    }
                  ></PopoverTrigger>
                  <PopoverContent className="w-75 p-0 rounded-none border border-[#201e1d] bg-white">
                    <Command>
                      <CommandInput
                        placeholder="Search client…"
                        className="h-9 border-b border-[#d6d3d1] rounded-none"
                      />
                      <CommandList>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>
                          {clientsData?.clients?.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => field.handleChange(c.id)}
                              className="rounded-none"
                            >
                              {c.name}
                              {field.state.value === c.id && (
                                <CheckIcon className="ml-auto h-4 w-4" />
                              )}
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
          <Button
            type="button"
            onClick={() => setShowNewClientDialog(true)}
            size="sm"
            className="self-start border border-[#201e1d] text-black bg-transparent w-min text-xs hover:bg-[#f0dcd8]"
          >
            + New client
          </Button>
        </div>
        <form.Field name="clientId">
          {(field) => {
            const selected = clientsData?.clients?.find(
              (c: { id: string; name: string; reg?: string | null; address?: string | null; contact?: string | null; email?: string | null; notes?: string | null }) => c.id === field.state.value,
            );
            if (!selected) {
              return (
                <div className="border-l-2 border-[#201e1d] pl-3.5 py-3 border-dashed text-xs leading-normal text-[#5c5755]">
                  Select a client to preview details
                </div>
              );
            }
            return (
              <div className="border-l-2 border-[#201e1d] pl-3.5 text-xs leading-normal">
                <div className="font-semibold text-[#201e1d]">{selected.name}</div>
                <div className="text-[#5c5755]">{selected.reg || '—'}</div>
                <div className="text-[#5c5755]">{selected.address || '—'}</div>
                <div className="text-[#5c5755]">
                  {[selected.contact, selected.email].filter(Boolean).join(' · ') || '—'}
                </div>
                {selected.notes ? (
                  <div className="mt-1.5 text-[#201e1d] leading-normal">{selected.notes}</div>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </div>
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-125">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
            <DialogDescription>
              Add a new client to use in this invoice
            </DialogDescription>
          </DialogHeader>
          <NewClientForm onSuccess={() => setShowNewClientDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

const NewClientForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const clientSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    email: v.optional(v.string()),
    contact: v.optional(v.string()),
    reg: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  });

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      contact: '',
      reg: '',
      address: '',
      notes: '',
    },
    validators: {
      onChange: ({ value }) =>
        standardSchemaValidators.validate(
          { value, validationSource: 'field' },
          clientSchema,
        ),
      onSubmit: ({ value }) =>
        standardSchemaValidators.validate(
          { value, validationSource: 'form' },
          clientSchema,
        ),
    },
    onSubmit: async ({ value }) => {
      try {
        await createClient({ data: value });
        toast.add({ title: 'Client created', type: 'success' });
        onSuccess();
      } catch (error) {
        toast.add({ description: (error as Error).message, type: 'error' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel>Name *</FieldLabel>
              <Input
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="B4B Partners Limited"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                value={(field.state.value as string) || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="you@client.co"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="contact">
          {(field) => (
            <Field>
              <FieldLabel>Contact person</FieldLabel>
              <Input
                value={(field.state.value as string) || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Chinapa Onwusah"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="reg">
          {(field) => (
            <Field>
              <FieldLabel>Registration no.</FieldLabel>
              <Input
                value={(field.state.value as string) || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="RC 7347187"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <div className="md:col-span-2">
          <form.Field name="address">
            {(field) => (
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Textarea
                  value={(field.state.value as string) || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Road 13, Ikota Villa Estate, Ajah…"
                  rows={2}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
        <div className="md:col-span-2">
          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel>About the client</FieldLabel>
                <Textarea
                  value={(field.state.value as string) || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Internal notes…"
                  rows={3}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSuccess}
          className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none"
        >
          Cancel
        </Button>
        <form.Subscribe
          selector={(s: any) => [s.canSubmit, s.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              variant="default"
              disabled={!canSubmit || isSubmitting}
              className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-2 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none"
            >
              {isSubmitting ? 'Saving…' : 'Save and use'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};

export function LineItemsSection({ form }: { form: InvoiceFormApi }) {
  const { data: productsData } = useProducts();

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">
          PRODUCTS & SERVICES
        </div>
        <form.Field name="items" mode="array">
          {(field) => (
            <Button
              type="button"
              onClick={() =>
                (field as any).pushValue({
                  name: '',
                  description: '',
                  qty: '1',
                  cost: '0',
                  discountName: '',
                  discountPct: '0',
                  discountAmt: '0',
                  sortOrder: (field.state.value as ItemValue[]).length,
                })
              }
              size="sm"
              className="border border-[#201e1d] bg-white text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d]"
            >
              Add blank line
            </Button>
          )}
        </form.Field>
      </div>

      {productsData?.products && productsData.products.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {productsData.products
            .slice(0, 6)
            .map(
              (p: {
                id: string;
                name: string;
                description: string | null;
                cost: string;
              }) => (
                <form.Field key={p.id} name="items" mode="array">
                  {(field) => (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        (field as any).pushValue({
                          name: p.name,
                          description: p.description || '',
                          qty: '1',
                          cost: p.cost,
                          discountName: '',
                          discountPct: '0',
                          discountAmt: '0',
                          sortOrder: (field.state.value as ItemValue[]).length,
                        })
                      }
                      className="h-7 px-2 text-[11px] rounded-none border-[#201e1d] hover:bg-[#f0dcd8]"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      {p.name}
                    </Button>
                  )}
                </form.Field>
              ),
            )}
        </div>
      )}

      <form.Field name="items" mode="array">
        {(field) => (
          <div className="flex flex-col gap-0.5 bg-[#201e1d] border border-[#201e1d] p-0.5">
            {(field.state.value as any[]).map((_: any, index: number) => (
              <div
                key={index}
                className="bg-white p-[13px] flex flex-col gap-2.5"
              >
                <div className="grid grid-cols-[1.4fr_0.5fr_1fr_1fr_0.6fr_0.8fr_auto] gap-2.5 items-end">
                  <form.Field name={`items[${index}].name`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Product / service</FieldLabel>
                        <Input
                          value={sub.state.value as string}
                          onChange={(e) => sub.handleChange(e.target.value)}
                          onBlur={sub.handleBlur}
                          placeholder="Item name"
                          className="h-9 px-2.5 text-[13px]"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name={`items[${index}].qty`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Qty</FieldLabel>
                        <NumberInput
                          value={
                            (sub.state.value as string)
                              ? Number(sub.state.value as string)
                              : 0
                          }
                          onValueChange={(nextValue) => {
                            sub.handleChange(
                              nextValue === null ? '' : nextValue.toFixed(2),
                            );
                          }}
                          onBlur={sub.handleBlur}
                          placeholder="Qty"
                          className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name={`items[${index}].cost`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Unit cost</FieldLabel>
                        <NumberInput
                          value={
                            (sub.state.value as string)
                              ? Number(sub.state.value as string)
                              : 0
                          }
                          onValueChange={(nextValue) => {
                            sub.handleChange(
                              nextValue === null ? '' : nextValue.toFixed(2),
                            );
                          }}
                          onBlur={sub.handleBlur}
                          placeholder="Cost"
                          className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name={`items[${index}].discountName`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Discount name</FieldLabel>
                        <Input
                          value={(sub.state.value as string) || ''}
                          onChange={(e) => sub.handleChange(e.target.value)}
                          onBlur={sub.handleBlur}
                          placeholder="Early Bird"
                          className="h-9 px-2.5 text-[13px]"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name={`items[${index}].discountPct`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Disc %</FieldLabel>
                        <NumberInput
                          value={
                            (sub.state.value as string)
                              ? Number(sub.state.value as string)
                              : 0
                          }
                          onValueChange={(nextValue) => {
                            sub.handleChange(
                              nextValue === null ? '' : nextValue.toFixed(2),
                            );
                          }}
                          onBlur={sub.handleBlur}
                          placeholder="0"
                          className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name={`items[${index}].discountAmt`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Disc amount</FieldLabel>
                        <NumberInput
                          value={
                            (sub.state.value as string)
                              ? Number(sub.state.value as string)
                              : 0
                          }
                          onValueChange={(nextValue) => {
                            sub.handleChange(
                              nextValue === null ? '' : nextValue.toFixed(2),
                            );
                          }}
                          onBlur={sub.handleBlur}
                          placeholder="0.00"
                          className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <Button
                    type="button"
                    onClick={() => field.removeValue(index)}
                    disabled={(field.state.value as ItemValue[]).length === 1}
                    className="h-9 w-9 p-0 rounded-none border border-[#201e1d] bg-white text-[#c02a10] hover:bg-[#fff2ef] disabled:opacity-30 self-end mb-0.5"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_140px] gap-2.5 items-end">
                  <form.Field name={`items[${index}].description`}>
                    {(sub) => (
                      <Field>
                        <FieldLabel>Line description</FieldLabel>
                        <Input
                          value={(sub.state.value as string) || ''}
                          onChange={(e) => sub.handleChange(e.target.value)}
                          onBlur={sub.handleBlur}
                          placeholder="Details for this line"
                          className="h-9 px-2.5 text-[13px]"
                        />
                        <FieldError errors={sub.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="text-[13px] font-semibold tabular-nums">
                      {(() => {
                        const qty = Number((form.getFieldValue(`items[${index}].qty`) as string) || 0);
                        const cost = Number((form.getFieldValue(`items[${index}].cost`) as string) || 0);
                        const pct = Number((form.getFieldValue(`items[${index}].discountPct`) as string) || 0);
                        const amt = Number((form.getFieldValue(`items[${index}].discountAmt`) as string) || 0);
                        const line = qty * cost;
                        const disc = amt + (line * pct) / 100;
                        const net = line - disc;
                        const cur = (form.getFieldValue('currency') as string) || 'NGN';
                        try {
                          return new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur }).format(net);
                        } catch {
                          return `${cur} ${net.toFixed(2)}`;
                        }
                      })()}
                    </div>
                    <form.Field name={`items[${index}].name`}>
                      {(nameField) => {
                        const name = nameField.state.value as string;
                        const exists = productsData?.products?.some((p: any) => p.name === name);
                        if (exists || !name) return null;
                        return (
                          <Button
                            type="button"
                            onClick={() => {
                              toast.add({ description: 'Save to products — coming soon', type: 'info' } as any);
                            }}
                            className="h-6 px-2 text-[10px] rounded-none border border-[#201e1d] bg-white hover:bg-[#f0dcd8]"
                          >
                            Save to products
                          </Button>
                        );
                      }}
                    </form.Field>
                  </div>
                </div>
              </div>
            ))}
            {field.state.meta.errors ? (
              <FieldError errors={field.state.meta.errors} />
            ) : null}
          </div>
        )}
      </form.Field>
    </div>
  );
}

export function TranchesSection({ form }: { form: InvoiceFormApi }) {
  return (
    <form.Field name="paymentType">
      {(pTypeField) => (
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
            PAYMENT TERMS
          </div>
          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant={
                pTypeField.state.value !== 'tranche' ? 'default' : 'outline'
              }
              onClick={() => pTypeField.handleChange('full')}
              className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pTypeField.state.value !== 'tranche' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
            >
              Full payment
            </Button>
            <Button
              type="button"
              variant={
                pTypeField.state.value === 'tranche' ? 'default' : 'outline'
              }
              onClick={() => {
                pTypeField.handleChange('tranche');
                const cur = form.getFieldValue('tranches') as unknown as TrancheValue[] | undefined;
                if (!cur || cur.length === 0) {
                  (form as unknown as { setFieldValue: (n: string, v: unknown) => void }).setFieldValue('tranches', [
                    { name: '', deliverables: '', dueDate: '', amount: '0', paid: false, sortOrder: 0 },
                  ]);
                }
              }}
              className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pTypeField.state.value === 'tranche' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
            >
              Tranches / milestones
            </Button>
          </div>
          {pTypeField.state.value !== 'tranche' ? (
            <div className="text-xs text-[#5c5755]">
              One payment, due on the due date above. Record what has been
              received on the invoice itself, under Payment status.
            </div>
          ) : (
            <form.Field name="tranches" mode="array">
              {(field) => (
                <div>
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      onClick={() =>
                        (field as any).pushValue({
                          name: `M${(field.state.value as ItemValue[]).length + 1} — `,
                          deliverables: '',
                          dueDate:
                            (form.getFieldValue('dueDate') as string) || '',
                          amount: '0',
                          paid: false,
                          sortOrder: (field.state.value as ItemValue[]).length,
                        })
                      }
                      className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d] h-9"
                    >
                      Add tranche
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const items =
                          (form.getFieldValue('items') as ItemValue[]) || [];
                        const subtotal = items.reduce(
                          (s: number, it: any) =>
                            s + Number(it.qty || 0) * Number(it.cost || 0),
                          0,
                        );
                        const n =
                          (field.state.value as TrancheValue[]).length || 1;
                        const each = Math.round((subtotal / n) * 100) / 100;
                        const newTranches = (
                          field.state.value as TrancheValue[]
                        ).map((t: TrancheValue, i: number) => ({
                          ...t,
                          amount:
                            i === n - 1
                              ? (
                                Math.round(
                                  (subtotal - each * (n - 1)) * 100,
                                ) / 100
                              ).toFixed(2)
                              : each.toFixed(2),
                        }));
                        field.handleChange(newTranches);
                      }}
                      className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none text-[#201e1d] h-9"
                    >
                      Split subtotal evenly
                    </Button>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-[#201e1d] border-2 border-[#201e1d] p-0.5">
                    {((field.state.value as TrancheValue[]) || []).map(
                      (_: any, index: any) => (
                        <div
                          key={index}
                          className="bg-white p-[13px] grid grid-cols-[1fr_1.8fr_1fr_1fr_auto] gap-2.5 items-end"
                        >
                          <form.Field name={`tranches[${index}].name`}>
                            {(sub) => (
                              <Field>
                                <FieldLabel>Milestone</FieldLabel>
                                <Input
                                  value={sub.state.value as string}
                                  onChange={(e) =>
                                    sub.handleChange(e.target.value)
                                  }
                                  onBlur={sub.handleBlur}
                                  placeholder="M1 — Mobilisation"
                                  className="h-9 px-2.5 text-[13px]"
                                />
                                <FieldError errors={sub.state.meta.errors} />
                              </Field>
                            )}
                          </form.Field>
                          <form.Field name={`tranches[${index}].deliverables`}>
                            {(sub) => (
                              <Field>
                                <FieldLabel>Deliverables</FieldLabel>
                                <Input
                                  value={(sub.state.value as string) || ''}
                                  onChange={(e) =>
                                    sub.handleChange(e.target.value)
                                  }
                                  onBlur={sub.handleBlur}
                                  placeholder="SOW signature, PO"
                                  className="h-9 px-2.5 text-[13px]"
                                />
                                <FieldError errors={sub.state.meta.errors} />
                              </Field>
                            )}
                          </form.Field>
                          <form.Field name={`tranches[${index}].dueDate`}>
                            {(sub) => (
                              <Field>
                                <FieldLabel>Due date</FieldLabel>
                                <DatePicker
                                  value={(sub.state.value as string) || ''}
                                  onChange={(v) => sub.handleChange(v)}
                                  placeholder="Pick a date"
                                />
                                <FieldError errors={sub.state.meta.errors} />
                              </Field>
                            )}
                          </form.Field>
                          <form.Field name={`tranches[${index}].amount`}>
                            {(sub) => (
                              <Field>
                                <FieldLabel>Amount</FieldLabel>
                                <NumberInput
                                  value={(sub.state.value as string) ? Number(sub.state.value as string) : 0}
                                  onValueChange={(next) => sub.handleChange(next === null ? '' : next.toFixed(2))}
                                  onBlur={sub.handleBlur}
                                  placeholder="0.00"
                                  className="h-9 px-2.5 text-[13px] text-right font-mono tabular-nums"
                                />
                                <FieldError errors={sub.state.meta.errors} />
                              </Field>
                            )}
                          </form.Field>
                          <div className="flex gap-1 self-end">
                            <form.Field name={`tranches[${index}].paid`}>
                              {(paidField) => (
                                <Button
                                  type="button"
                                  onClick={() =>
                                    paidField.handleChange(
                                      !paidField.state.value,
                                    )
                                  }
                                  className={`h-9 px-3 text-xs font-semibold rounded-none border-2 ${paidField.state.value ? 'bg-[#ec3013] text-white border-[#ec3013]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
                                >
                                  {paidField.state.value ? 'Paid' : 'Unpaid'}
                                </Button>
                              )}
                            </form.Field>
                            <Button
                              type="button"
                              onClick={() => (field as any).removeValue(index)}
                              className="h-9 w-9 p-0 rounded-none border border-[#201e1d] bg-white text-[#c02a10] hover:bg-[#fff2ef]"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </form.Field>
          )}
          <TrancheSummary form={form} />
        </div>
      )}
    </form.Field>
  );
}

function TrancheSummary({ form }: { form: InvoiceFormApi }) {
  return (
    <form.Subscribe
      selector={(s: any) =>
        [
          (s.values as any).items,
          (s.values as any).currency,
          (s.values as any).taxName,
          (s.values as any).taxRate,
          (s.values as any).tranches,
        ] as const
      }
    >
      {([items, currency, taxName, taxRate, tranches]) => {
        const subtotal = (items as ItemValue[]).reduce(
          (s: number, it: any) =>
            s + Number(it.qty || 0) * Number(it.cost || 0),
          0,
        );
        const rate = Number(taxRate || 0);
        const tax = subtotal * (rate / 100);
        const total = subtotal + tax;
        const trSum =
          (tranches as TrancheValue[] | undefined)?.reduce(
            (s: number, t: TrancheValue) => s + Number(t.amount || 0),
            0,
          ) ?? 0;
        const hasWarn =
          Math.abs(trSum - subtotal) > 0.5 &&
          (tranches as TrancheValue[])?.length > 0;
        const fmt = (n: number) => {
          try {
            return new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: (currency as string) || 'NGN',
              minimumFractionDigits: 2,
            }).format(n);
          } catch {
            return `${currency || 'NGN'} ${n.toFixed(2)}`;
          }
        };
        return (
          <div>
            {hasWarn && (
              <div className="mt-2 text-xs font-semibold text-[#c02a10]">
                Tranches total {fmt(trSum)} — subtotal is {fmt(subtotal)}
              </div>
            )}
            <div className="flex justify-end gap-6 mt-4 pt-3 border-t-2 border-[#201e1d] text-[13px]">
              <div>
                Subtotal{' '}
                <strong className="tabular-nums">{fmt(subtotal)}</strong>
              </div>
              <div>
                {(taxName as string) || 'VAT'} ({rate}%){' '}
                <strong className="tabular-nums">{fmt(tax)}</strong>
              </div>
              <div>
                Total <strong className="tabular-nums">{fmt(total)}</strong>
              </div>
            </div>
          </div>
        );
      }}
    </form.Subscribe>
  );
}

export function PaymentDestinationSection({ form }: { form: InvoiceFormApi }) {
  return (
    <form.Field name="paymentMethod">
      {(pmField) => (
        <div>
          <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
            PAYMENT DESTINATION & MEMO
          </div>
          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant={pmField.state.value === 'bank' ? 'default' : 'outline'}
              onClick={() => pmField.handleChange('bank')}
              className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pmField.state.value === 'bank' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
            >
              Bank account on the invoice
            </Button>
            <Button
              type="button"
              variant={pmField.state.value === 'link' ? 'default' : 'outline'}
              onClick={() => pmField.handleChange('link')}
              className={`rounded-none border-2 px-4 py-1.5 text-xs font-semibold ${pmField.state.value === 'link' ? 'bg-[#201e1d] text-white border-[#201e1d]' : 'bg-white text-[#201e1d] border-[#201e1d] hover:bg-[#f0dcd8]'}`}
            >
              Payment link
            </Button>
          </div>

          {pmField.state.value === 'bank' ? (
            <form.Field name="bankId">
              {(bankField) => (
                <Field>
                  <FieldLabel>Bank account on the invoice</FieldLabel>
                  <BankSelect
                    value={(bankField.state.value as string) || ''}
                    onValueChange={bankField.handleChange}
                  />
                  <FieldError errors={bankField.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <form.Field name="payLink">
                  {(field) => (
                    <Field>
                      <FieldLabel>Payment link</FieldLabel>
                      <Input
                        value={(field.state.value as string) || ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="https://checkout.korapay.com/pay/..."
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="payLinkLabel">
                  {(field) => (
                    <Field>
                      <FieldLabel>Button label</FieldLabel>
                      <Input
                        value={(field.state.value as string) || ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Pay online"
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              </div>
              <form.Field name="payLinkCurrency">
                {(field) => (
                  <Field>
                    <FieldLabel>Pay link currency — searchable</FieldLabel>
                    <CurrencySelect
                      value={(field.state.value as string) || ''}
                      onValueChange={(v) => field.handleChange(v)}
                      placeholder="Search currency..."
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            </div>
          )}
          <div className="mt-4">
            <form.Field name="memo">
              {(field) => (
                <Field>
                  <FieldLabel>
                    Editable note printed at the foot of the invoice
                  </FieldLabel>
                  <Textarea
                    value={(field.state.value as string) || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Withholding tax of 5% applies per clause 5.5 ..."
                    rows={3}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>
        </div>
      )}
    </form.Field>
  );
}

export function StatusSection({ form }: { form: InvoiceFormApi }) {
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'paid', label: 'Paid' },
    { value: 'part_paid', label: 'Partially paid' },
    { value: 'due', label: 'Due' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'voided', label: 'Voided' },
  ] as const;

  return (
    <div>
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-3">
        STATUS
      </div>
      <div className="grid gap-3">
        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel>Invoice status</FieldLabel>
              <Select
                value={field.state.value ?? 'draft'}
                onValueChange={(v) =>
                  field.handleChange(v as typeof field.state.value)
                }
              >
                <SelectTrigger className="w-full h-9 border border-[#201e1d] bg-white rounded-none capitalize">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-[#201e1d]">
                  <SelectGroup>
                    {statusOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-[13px]"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
              <p className="text-[11px] text-[#5c5755] mt-1">
                Changing status on edit is saved with the invoice. Paid is
                normally set by payments, but you can override here.
              </p>
            </Field>
          )}
        </form.Field>

        <form.Field name="status">
          {(statusField) =>
            statusField.state.value === 'voided' ? (
              <form.Field name="voidReason">
                {(field) => (
                  <Field>
                    <FieldLabel>Void reason</FieldLabel>
                    <Textarea
                      value={(field.state.value as string) ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Why voided — shown on record"
                      rows={2}
                      className="rounded-none border-[#201e1d] bg-white"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Field>
      </div>
    </div>
  );
}

type BankSelectProps = {
  value?: string;
  onValueChange: (v: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function BankSelect({
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
}: BankSelectProps) {
  const { data: banksData, isLoading } = useBanks();

  if (isLoading) return <Skeleton className="h-9 w-full rounded-none" />;

  return (
    <Select
      value={value ?? ''}
      onValueChange={onValueChange}
      disabled={disabled}
      items={(banksData?.banks ?? []).map((bank) => ({ value: bank.id, label: `${bank.label}` }))}
    >
      <SelectTrigger
        className={cn(
          'w-full h-9 border border-[#201e1d] bg-white rounded-none',
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? 'Select bank account'} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <Skeleton className="h-9 w-full rounded-none" />
        ) : (
          <SelectGroup>
            {banksData?.banks?.map(
              (b: {
                id: string;
                label: string;
                currency: string;
                fields: Array<[string, string]>;
              }) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="grid">
                    <span className="font-medium">{b.label}</span>
                    <span className="text-xs text-[#5c5755]">
                      {b.currency} •{' '}
                      {b.fields
                        .map(([k, v]: [string, string]) => `${k}: ${v}`)
                        .join(' • ')}
                    </span>
                  </div>
                </SelectItem>
              ),
            )}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
