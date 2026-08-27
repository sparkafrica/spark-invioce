"use client"

import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { CurrencyField } from '#/components/ui/currency-select'
import { Button } from '#/components/ui/button'

import { createProduct } from '#/lib/server-fns/crm'
import { updateProduct } from '#/lib/server-fns/crm'
import { toast } from '#/components/ui/toast'

const productSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  description: v.optional(v.string()),
  cost: v.pipe(v.string(), v.regex(/^\d+(\.\d+)?$/, 'Cost must be a number')),
  currency: v.pipe(v.string(), v.minLength(1, 'Currency is required')),
})

type ProductFormValues = v.InferOutput<typeof productSchema>

interface ProductFormProps {
  initialData?: Partial<ProductFormValues>
  isEditing?: boolean
  productId?: string
  onCancel?: () => void
  onSuccess?: () => void
}

export function ProductForm({ initialData, isEditing = false, productId, onCancel, onSuccess }: ProductFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      cost: '0',
      currency: 'NGN',
      ...initialData,
    },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, productSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, productSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEditing && productId) {
          await updateProduct({ data: { ...value, id: productId } })
          toast.add({ title: 'Product updated successfully', type: 'success' })
        } else {
          await createProduct({ data: value })
          toast.add({ title: 'Product created successfully', type: 'success' })
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
        <h1 className="text-[18px] font-semibold tracking-[-0.02em] leading-none">{isEditing ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-4">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">PRODUCT — {isEditing ? 'EDIT' : 'NEW'}</div>

        <div className="grid gap-3 md:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Name *</FieldLabel>
                <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Professional Consulting Services" />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="currency">
            {(field) => (
              <CurrencyField field={field as any} label="Currency *" placeholder="Select currency" />
            )}
          </form.Field>
        </div>

        <form.Field name="cost">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Cost *</FieldLabel>
              <Input id={field.name} name={field.name} type="text" inputMode="decimal" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="50000.00" />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Textarea id={field.name} name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Hourly consulting, workshop, etc." rows={3} />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Cancel</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="default" disabled={!canSubmit || isSubmitting} className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none">
                {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create product'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  )
}
