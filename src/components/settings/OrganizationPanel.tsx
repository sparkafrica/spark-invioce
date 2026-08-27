"use client"

import { useEffect } from 'react'
import { useForm, standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '#/components/ui/toast'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { getOrganization, updateOrganization } from '#/lib/server-fns/references'
import { authClient } from '#/lib/auth-client'

const organizationSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Organization name is required')),
  slug: v.pipe(v.string(), v.minLength(1, 'Slug is required')),
})

export function OrganizationPanel() {
  const qc = useQueryClient()

  const { data: orgData, isPending: isOrgPending } = useQuery({
    queryKey: ['organization'],
    queryFn: () => getOrganization(),
  })

  const form = useForm({
    defaultValues: {
      name: (orgData?.organization?.name as string) ?? 'Spark Invoice System',
      slug: (orgData?.organization?.slug as string) ?? 'spark-invoice-system',
    },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, organizationSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, organizationSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        // Prefer server function; fallback to better-auth client
        try {
          await updateOrganization({ data: { name: value.name, slug: value.slug } })
        } catch {
          const orgId = orgData?.organizationId
          const orgApi = (authClient as unknown as { organization?: { update?: (a: unknown) => Promise<unknown> } }).organization
          if (orgId && orgApi?.update) {
            const res = (await orgApi.update({ organizationId: orgId, data: { name: value.name, slug: value.slug } } as unknown as never)) as { error?: { message?: string } }
            if (res?.error) throw new Error(res.error.message ?? 'Update failed')
          } else {
            throw new Error('Failed to update organization')
          }
        }
        await qc.invalidateQueries({ queryKey: ['organization'] })
        await qc.invalidateQueries({ queryKey: ['org-members'] })
        toast.add({ title: 'Organization updated', type: 'success' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update organization'
        toast.add({ description: msg, type: 'error' })
      }
    },
  })

  // Fix stale defaultValues: org arrives async after isPending -> sync into form
  useEffect(() => {
    const org = orgData?.organization as { name?: string; slug?: string } | undefined | null
    if (org?.name) form.setFieldValue('name', org.name)
    if (org?.slug) form.setFieldValue('slug', org.slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgData?.organization?.name, orgData?.organization?.slug])

  if (isOrgPending) {
    return (
      <div className="border-2 border-[#201e1d] bg-white p-6 max-w-[860px] flex flex-col gap-4">
        <Skeleton className="h-3 w-40 rounded-none" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
        </div>
        <Skeleton className="h-3 w-72 rounded-none" />
        <div className="flex justify-end">
          <Skeleton className="h-8 w-36 rounded-none" />
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-[#201e1d] bg-white p-6 max-w-[860px] flex flex-col gap-4">
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">ORGANIZATION — {(orgData?.organization?.name ?? 'Spark Invoice System').toUpperCase()}</div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Organization Name</FieldLabel>
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

          <form.Field name="slug">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
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
        </div>

        <div className="text-xs text-[#5c5755]">Businesses: New Business (NB), ASF, ATE — Companies: Nigeria (NGN), United Kingdom (GBP)</div>

        <div className="flex justify-end">
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="bg-[#ec3013] text-white border border-[#ec3013] hover:bg-[#c02a10] rounded-none px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save Organization'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}
