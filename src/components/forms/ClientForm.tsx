"use client"

import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Button } from '#/components/ui/button'
import { createClient } from '#/lib/server-fns/crm'
import { updateClient } from '#/lib/server-fns/crm'
import { toast } from '#/components/ui/toast'

const clientSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  reg: v.optional(v.string()),
  address: v.optional(v.string()),
  email: v.optional(v.string()),
  contact: v.optional(v.string()),
  notes: v.optional(v.string()),
})

type ClientFormValues = v.InferOutput<typeof clientSchema>

interface ClientFormProps {
  initialData?: Partial<ClientFormValues>
  isEditing?: boolean
  clientId?: string
  onCancel?: () => void
  onSuccess?: () => void
}

export function ClientForm({ initialData, isEditing = false, clientId, onCancel, onSuccess }: ClientFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      reg: '',
      address: '',
      email: '',
      contact: '',
      notes: '',
      ...initialData,
    },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, clientSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, clientSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEditing && clientId) {
          await updateClient({ data: { ...value, id: clientId } })
          toast.add({ title: 'Client updated successfully', type: 'success' })
        } else {
          await createClient({ data: value })
          toast.add({ title: 'Client created successfully', type: 'success' })
        }
        onSuccess?.()
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-215 flex flex-col gap-6 py-6" style={{ padding: '28px 24px 56px' }}>
      <div className="flex items-end gap-4 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[30px] font-medium tracking-[-0.02em] leading-none">{isEditing ? 'Edit Client' : 'New Client'}</h1>
      </div>

      <div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-4">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">CLIENT — {isEditing ? 'EDIT' : 'NEW'}</div>

        <div className="grid gap-3 md:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Name *</FieldLabel>
                <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="B4B Partners Limited" />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="contact">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Contact person</FieldLabel>
                <Input id={field.name} name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Ada Okonkwo" />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input id={field.name} name={field.name} type="email" autoComplete="email" spellCheck={false} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="you@client.co" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="reg">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Registration no.</FieldLabel>
              <Input id={field.name} name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="RC 7347187" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="address">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Address</FieldLabel>
              <Textarea id={field.name} name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Road 13, Ikota Villa Estate, Ajah…" rows={2} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>About the client</FieldLabel>
              <Textarea id={field.name} name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Internal notes…" rows={3} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Cancel</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="default" disabled={!canSubmit || isSubmitting} className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none">
                {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create client'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  )
}
