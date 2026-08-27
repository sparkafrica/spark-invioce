"use client"

import { useForm, standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCompanies } from '#/lib/server-fns/references'
import { updateCompany } from '#/lib/server-fns/settings'
import { toast } from '#/components/ui/toast'
import { Skeleton } from '#/components/ui/skeleton'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { CurrencyField } from '#/components/ui/currency-select'
import { qk } from '#/hooks/useReferences'

const companySchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  region: v.optional(v.string()),
  reg: v.optional(v.string()),
  address: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  tin: v.optional(v.string()),
  defaultCurrency: v.pipe(v.string(), v.minLength(1, 'Currency is required')),
})

function CompanyCard({ company }: { company: Record<string, unknown> & { id: string } }) {
  const qc = useQueryClient()
  const c = company as unknown as {
    id: string
    name: string
    region?: string
    reg?: string | null
    address?: string | null
    email?: string | null
    phone?: string | null
    tin?: string | null
    defaultCurrency?: string
  }

  const form = useForm({
    defaultValues: {
      name: c.name ?? '',
      region: c.region ?? '',
      reg: c.reg ?? '',
      address: c.address ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      tin: c.tin ?? '',
      defaultCurrency: c.defaultCurrency ?? 'NGN',
    },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, companySchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, companySchema),
    },
    onSubmit: async ({ value }) => {
      try {
        await updateCompany({
          data: {
            id: c.id,
            name: value.name,
            region: value.region || undefined,
            reg: value.reg || null,
            address: value.address || null,
            email: value.email || null,
            phone: value.phone || null,
            tin: value.tin || null,
            defaultCurrency: value.defaultCurrency as never,
          },
        })
        qc.invalidateQueries({ queryKey: qk.companies })
        toast.add({ title: 'Company updated', type: 'success' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update company'
        toast.add({ description: msg, type: 'error' })
      }
    },
  })

  const handleCancel = () => {
    form.reset({
      name: c.name ?? '',
      region: c.region ?? '',
      reg: c.reg ?? '',
      address: c.address ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      tin: c.tin ?? '',
      defaultCurrency: c.defaultCurrency ?? 'NGN',
    })
  }

  return (
    <div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="region">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Region</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="reg">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Reg</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="defaultCurrency">
            {(field) => (
              <CurrencyField field={field as unknown as never} label="Default currency" placeholder="NGN" />
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="tin">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>TIN</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="rounded-none border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8]"
          >
            Cancel
          </Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="bg-[#ec3013] text-white border border-[#ec3013] hover:bg-[#c02a10] rounded-none px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}

export function CompaniesPanel() {
  const { data, isLoading, isPending } = useQuery({
    queryKey: qk.companies,
    queryFn: () => getCompanies({ data: {} }),
  })

  if (isLoading || isPending) return <CompaniesPanelSkeleton />
  const companies = (data as unknown as { companies?: unknown[] } | undefined)?.companies ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">INVOICING COMPANIES — {companies.length} total</div>
      <div className="flex flex-col gap-3">
        {(companies as Array<Record<string, unknown> & { id: string }>).map((c) => (
          <CompanyCard key={c.id} company={c} />
        ))}
      </div>
    </div>
  )
}

export function CompaniesPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-3 w-40 rounded-none" />
      {[0, 1].map((i) => (
        <div key={i} className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-10 w-full rounded-none" />
            <Skeleton className="h-10 w-full rounded-none" />
            <Skeleton className="h-10 w-full rounded-none" />
            <Skeleton className="h-10 w-full rounded-none" />
          </div>
          <Skeleton className="h-9 w-24 rounded-none ml-auto" />
        </div>
      ))}
    </div>
  )
}
