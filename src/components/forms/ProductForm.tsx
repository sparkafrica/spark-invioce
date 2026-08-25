"use client"

import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useNavigate } from '@tanstack/react-router'
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
}

export function ProductForm({ initialData, isEditing = false, productId }: ProductFormProps) {
  const navigate = useNavigate()
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
        navigate({ to: '/products' })
      } catch (error) {
        toast.add({ title: 'Error', description: (error as Error).message, type: 'error' })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    form.handleSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[860px] flex flex-col gap-6 py-6" style={{ padding: '28px 24px 56px' }}>
      <div className="flex items-end justify-between gap-4 border-b-2 border-[#201e1d] pb-3">
        <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none">{isEditing ? 'Edit Product' : 'New Product'}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate({ to: '/products' })} className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8]">Cancel</button>
          <button type="submit" className="bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10]">{isEditing ? 'Save changes' : 'Create product'}</button>
        </div>
      </div>

      <div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-4">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">PRODUCT — {isEditing ? 'EDIT' : 'NEW'}</div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Name *</Label>
            <Input value={form.getFieldValue('name')} onChange={(e) => form.setFieldValue('name', e.target.value)} placeholder="Professional Consulting Services" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Currency *</Label>
            <Input value={form.getFieldValue('currency')} onChange={(e) => form.setFieldValue('currency', e.target.value)} placeholder="NGN" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label>Cost *</Label>
          <Input type="number" step="0.01" value={form.getFieldValue('cost')} onChange={(e) => form.setFieldValue('cost', e.target.value)} placeholder="50000.00" />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Description</Label>
          <Textarea value={form.getFieldValue('description') || ''} onChange={(e) => form.setFieldValue('description', e.target.value)} placeholder="Hourly consulting, workshop, etc." rows={3} />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => navigate({ to: '/products' })} className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8]">Cancel</button>
          <button type="submit" className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 text-xs font-semibold hover:bg-[#c02a10]">{isEditing ? 'Save changes' : 'Create product'}</button>
        </div>
      </div>
    </form>
  )
}
