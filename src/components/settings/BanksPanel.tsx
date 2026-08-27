"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBanks } from '#/lib/server-fns/references'
import { createBank, updateBank, deleteBank } from '#/lib/server-fns/settings'
import { toast } from '#/components/ui/toast'
import { Trash2Icon } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { CurrencySelect } from '#/components/ui/currency-select'
import { qk } from '#/hooks/useReferences'

export function BanksPanel() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: qk.banks(), queryFn: () => getBanks({ data: {} }) })
  const [newBank, setNewBank] = useState({ label: '', currency: 'NGN', fields: [] as Array<{ key: string; value: string }> })
  const [editing, setEditing] = useState<Record<string, { label: string; fields: Array<{ key: string; value: string }> }>>({})
  const toTuples = (fields: Array<{ key: string; value: string }>) => fields.map((f) => [f.key, f.value] as [string, string])
  const toFormFields = (fields: Array<[string, string] | { key: string; value: string }>) =>
    (fields as any[]).map((f: any) => Array.isArray(f) ? { key: f[0], value: f[1] } : f)

  const create = useMutation({
    mutationFn: (b: any) => createBank({ data: { label: b.label, currency: b.currency, fields: toTuples(b.fields) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.banks() }); setNewBank({ label: '', currency: 'NGN', fields: [] }); toast.add({ title: 'Bank created', type: 'success' }) },
    onError: (e: any) => toast.add({ description: e.message, type: 'error' }),
  })
  const upd = useMutation({
    mutationFn: (b: any) => updateBank({ data: { id: b.id, label: b.label, fields: toTuples(b.fields) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.banks() }); toast.add({ title: 'Bank updated', type: 'success' }) },
    onError: (e: any) => toast.add({ description: e.message, type: 'error' }),
  })
  const del = useMutation({
    mutationFn: (id: string) => deleteBank({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.banks() }); toast.add({ title: 'Bank deleted', type: 'success' }) },
  })

  if (isLoading) return <BanksPanelSkeleton />
  const banks = (data as any)?.banks || []

  const addField = (arr: Array<{ key: string; value: string }>) => [...arr, { key: '', value: '' }]
  const removeField = (arr: Array<{ key: string; value: string }>, idx: number) => arr.filter((_, i) => i !== idx)
  const updateField = (arr: Array<{ key: string; value: string }>, idx: number, field: 'key' | 'value', val: string) =>
    arr.map((f, i) => i === idx ? { ...f, [field]: val } : f)

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">BANK ACCOUNTS — {banks.length} total</div>
      <div className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-3">
        <div className="text-[10px] tracking-[0.12em] font-semibold">NEW BANK ACCOUNT</div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1"><Label className="text-[11px] font-semibold">Label</Label><Input value={newBank.label} onChange={(e) => setNewBank({ ...newBank, label: e.target.value })} placeholder="GTBank - Corporate" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" /></div>
          <div className="flex flex-col gap-1"><Label className="text-[11px] font-semibold">Currency</Label><CurrencySelect value={newBank.currency} onValueChange={(v) => setNewBank({ ...newBank, currency: v as any })} /></div>
        </div>
        <div className="flex flex-col gap-2">
          {newBank.fields.map((f, idx) => (
            <div key={idx} className="grid grid-cols-[180px_1fr_auto] gap-3">
              <Input value={f.key} onChange={(e) => setNewBank({ ...newBank, fields: updateField(newBank.fields, idx, 'key', e.target.value) })} placeholder="Key (e.g. Account Number)" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
              <Input value={f.value} onChange={(e) => setNewBank({ ...newBank, fields: updateField(newBank.fields, idx, 'value', e.target.value) })} placeholder="Value" className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
              <Button type="button" variant="outline" size="sm" onClick={() => setNewBank({ ...newBank, fields: removeField(newBank.fields, idx) })} className="border border-[#201e1d] bg-white px-3 py-2 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none"><Trash2Icon className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setNewBank({ ...newBank, fields: addField(newBank.fields) })} className="self-start border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Add field</Button>
        </div>
        <Button type="button" variant="default" size="sm" onClick={() => create.mutate({ label: newBank.label, currency: newBank.currency, fields: newBank.fields })} disabled={create.isPending || !newBank.label} className="self-start bg-[#ec3013] text-white border border-[#ec3013] px-3 py-1.5 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none">Add bank</Button>
      </div>
      <div className="flex flex-col gap-2">
        {banks.map((b: any) => {
          const draftRaw = editing[b.id] || { label: b.label, fields: toFormFields(b.fields || []) }
          const draft = { label: draftRaw.label, fields: toFormFields(draftRaw.fields) }
          const setDraft = (k: string, v: any) => setEditing((s) => ({ ...s, [b.id]: { ...draft, [k]: v } }))
          return (
            <div key={b.id} className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex flex-col gap-1"><Label className="text-[11px] font-semibold">Label</Label><Input value={draft.label} onChange={(e) => setDraft('label', e.target.value)} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" /></div>
                <div className="flex flex-col gap-1"><Label className="text-[11px] font-semibold">Currency</Label><Input value={b.currency} disabled className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] bg-[#f3f2f2]" /></div>
              </div>
              <div className="flex flex-col gap-2">
                {draft.fields.map((f: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-[180px_1fr_auto] gap-3">
                    <Input value={f.key} onChange={(e) => setDraft('fields', updateField(draft.fields, idx, 'key', e.target.value))} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
                    <Input value={f.value} onChange={(e) => setDraft('fields', updateField(draft.fields, idx, 'value', e.target.value))} className="w-full border border-[#201e1d] bg-white px-2.5 py-2 text-[13px]" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setDraft('fields', removeField(draft.fields, idx))} className="border border-[#201e1d] bg-white px-3 py-2 text-[11px] font-semibold hover:bg-[#f0dcd8] rounded-none"><Trash2Icon className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setDraft('fields', addField(draft.fields))} className="self-start border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Add field</Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing((s) => { const n = { ...s }; delete n[b.id]; return n })} className="border border-[#201e1d] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#f0dcd8] rounded-none">Cancel</Button>
                <Button type="button" variant="default" size="sm" onClick={() => upd.mutate({ id: b.id, label: draft.label, fields: draft.fields })} disabled={upd.isPending} className="bg-[#ec3013] text-white border border-[#ec3013] px-3 py-1.5 text-xs font-semibold hover:bg-[#c02a10] disabled:opacity-50 rounded-none">Save</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => del.mutate(b.id)} className="border border-[#c02a10] bg-white px-3 py-1.5 text-xs font-semibold text-[#c02a10] hover:bg-[#fff2ef] rounded-none">Delete</Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BanksPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-3 w-32 rounded-none" />
      <div className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
        <Skeleton className="h-3 w-28 rounded-none" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-10 w-full rounded-none" />
          <Skeleton className="h-10 w-full rounded-none" />
        </div>
        <Skeleton className="h-10 w-full rounded-none" />
      </div>
    </div>
  )
}
