"use client"

import { useEffect, useState } from 'react'
import { useForm, standardSchemaValidators } from '@tanstack/react-form'
import * as v from 'valibot'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFXRates, updateFXRates } from '#/lib/server-fns/references'
import { toast } from '#/components/ui/toast'
import { Skeleton } from '#/components/ui/skeleton'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { qk } from '#/hooks/useReferences'

const defaultFx = {
  mode: 'manual' as const,
  rates: { USD: 1, NGN: 1530, GBP: 0.74, EUR: 0.86, KES: 129.45, GHS: 12.4, ZAR: 18.1 } as Record<string, number>,
  lastFetched: null as string | null,
}

const fxSchema = v.object({
  mode: v.picklist(['manual', 'api'], 'Mode is required'),
  rates: v.record(v.string(), v.pipe(v.number(), v.minValue(0, 'Rate must be >= 0'))),
})

export function FXRatesPanel({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient()
  const { data, isLoading, isPending } = useQuery({ queryKey: qk.fxRates, queryFn: () => getFXRates({ data: {} }) })
  const [isEditing, setIsEditing] = useState(false)

  const raw = (data as unknown as { fxRates?: typeof defaultFx } | undefined)?.fxRates
  const fxData = raw ?? defaultFx

  const form = useForm({
    defaultValues: {
      mode: defaultFx.mode as 'manual' | 'api',
      rates: defaultFx.rates,
    },
    validators: {
      onChange: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'field' }, fxSchema),
      onSubmit: ({ value }) => standardSchemaValidators.validate({ value, validationSource: 'form' }, fxSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        await updateFXRates({ data: { mode: value.mode, rates: value.rates } })
        qc.invalidateQueries({ queryKey: qk.fxRates })
        setIsEditing(false)
        toast.add({ title: 'FX rates updated', type: 'success' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update FX rates'
        toast.add({ description: msg, type: 'error' })
      }
    },
  })

  // sync form when server data arrives (only when not editing to avoid clobbering draft)
  useEffect(() => {
    if (raw && !isEditing) {
      form.reset({ mode: raw.mode as 'manual' | 'api', rates: raw.rates })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.mode, JSON.stringify(raw?.rates), isEditing])

  const handleEdit = () => {
    form.reset({ mode: fxData.mode as 'manual' | 'api', rates: fxData.rates })
    setIsEditing(true)
  }

  const handleCancel = () => {
    form.reset({ mode: fxData.mode as 'manual' | 'api', rates: fxData.rates })
    setIsEditing(false)
  }

  if (isLoading || isPending) return <FxRatesPanelSkeleton />
  const lastFetched = (fxData as { lastFetched?: string | null }).lastFetched

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10]">EXCHANGE RATES</div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="border-2 border-[#201e1d] bg-white p-4 flex flex-col gap-4"
      >
        <form.Field name="mode">
          {(field) => (
            <Field>
              <FieldLabel>Mode</FieldLabel>
              <RadioGroup
                value={field.state.value}
                onValueChange={(val) => {
                  if (isEditing && canManage) field.handleChange(val as 'manual' | 'api')
                }}
                className="flex gap-4"
              >
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="manual" disabled={!canManage || !isEditing} />
                  <span className="text-[13px]">Manual</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="api" disabled={!canManage || !isEditing} />
                  <span className="text-[13px]">API (exchangerate-api.com)</span>
                </Label>
              </RadioGroup>
              <FieldError errors={field.state.meta.errors} />
              {field.state.value === 'api' && (
                <div className="text-xs text-[#5c5755] bg-[#fff2ef] border border-[#ec3013] p-3">
                  Rates fetched daily via exchangerate-api.com. Requires valid <code className="font-mono">EXCHANGERATE_API_KEY</code> in environment. Only
                  available if API is accessible.
                </div>
              )}
            </Field>
          )}
        </form.Field>

        <div className="text-[10px] tracking-[0.12em] font-semibold text-[#c02a10] mb-2">RATES (per 1 USD)</div>

        <form.Subscribe selector={(s) => s.values.mode}>
          {(mode) => (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(form.getFieldValue('rates') as Record<string, number> ?? fxData.rates).map(([code]) => (
                <form.Field key={code} name={`rates.${code}` as never}>
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>{code}</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        step="0.0001"
                        value={String(field.state.value ?? 0)}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange((parseFloat(e.target.value) || 0) as never)}
                        disabled={!canManage || !isEditing || mode === 'api'}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              ))}
            </div>
          )}
        </form.Subscribe>

        {lastFetched && <div className="text-xs text-[#5c5755]">Last fetched: {new Date(lastFetched).toLocaleString()}</div>}

        <div className="flex justify-end gap-2 pt-2 border-t border-[#d6d3d1]">
          {isEditing ? (
            <>
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
                    disabled={!canSubmit || isSubmitting || !canManage}
                    className="bg-[#ec3013] text-white border border-[#ec3013] hover:bg-[#c02a10] rounded-none px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </form.Subscribe>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleEdit}
              disabled={!canManage}
              className="bg-[#ec3013] text-white border border-[#ec3013] hover:bg-[#c02a10] rounded-none px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Edit
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export function FxRatesPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-3 w-32 rounded-none" />
      <div className="border-2 border-[#201e1d] bg-white p-4 space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20 rounded-none" />
          <Skeleton className="h-4 w-20 rounded-none" />
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  )
}
