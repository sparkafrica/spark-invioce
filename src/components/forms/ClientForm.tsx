"use client"

import { useForm } from '@tanstack/react-form'
import { standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useNavigate } from '@tanstack/react-router'
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
}

export function ClientForm({ initialData, isEditing = false, clientId }: ClientFormProps) {
  const navigate = useNavigate()

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
        navigate({ to: '/clients' })
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
        <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-none">{isEditing ? 'Edit Client' : 'New Client'}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate({ to: '/clients' })} className="border border-[#201e1d] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0dcd8]">Cancel</button>
          <button type="submit" className="bg-[#ec3013] text-white border border-[#ec3013] px-3.5 py-2 text-xs font-semibold hover:bg-[#c02a10]">{isEditing ? 'Save changes' : 'Create client'}</button>
        </div>
      </div>

      <div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-4">
        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">CLIENT — {isEditing ? 'EDIT' : 'NEW'}</div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Name *</Label>
            <Input value={form.getFieldValue('name')} onChange={(e) => form.setFieldValue('name', e.target.value)} placeholder="B4B Partners Limited" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Contact person</Label>
            <Input value={form.getFieldValue('contact') || ''} onChange={(e) => form.setFieldValue('contact', e.target.value)} placeholder="Ada Okonkwo" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label>Email</Label>
          <Input type="email" value={form.getFieldValue('email') || ''} onChange={(e) => form.setFieldValue('email', e.target.value)} placeholder="you@client.co" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Registration no.</Label>
            <Input value={form.getFieldValue('reg') || ''} onChange={(e) => form.setFieldValue('reg', e.target.value)} placeholder="RC 7347187" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Address</Label>
            <Input value={form.getFieldValue('address') || ''} onChange={(e) => form.setFieldValue('address', e.target.value)} placeholder="Road 13, Ikota Villa Estate, Ajah…" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label>About the client</Label>
          <Textarea value={form.getFieldValue('notes') || ''} onChange={(e) => form.setFieldValue('notes', e.target.value)} placeholder="Internal notes…" rows={3} />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => navigate({ to: '/clients' })} className="flex-1 border border-[#201e1d] bg-white py-2.5 text-xs font-semibold hover:bg-[#f0dcd8]">Cancel</button>
          <button type="submit" className="flex-1 bg-[#ec3013] text-white border border-[#ec3013] py-2.5 text-xs font-semibold hover:bg-[#c02a10]">{isEditing ? 'Save changes' : 'Create client'}</button>
        </div>
      </div>
    </form>
  )
}
