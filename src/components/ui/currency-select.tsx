"use client"

import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '#/components/ui/command'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { CURRENCIES, type Currency } from '#/lib/currencies'
import { cn } from '#/lib/utils'

type Props = {
  value?: string
  onValueChange: (v: Currency) => void
  placeholder?: string
  label?: string
  error?: any[]
  disabled?: boolean
  className?: string
}

export function CurrencySelect({ value, onValueChange, placeholder = 'Select currency', label, error, disabled, className }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Field className={cn(className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="w-full justify-between rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] font-normal h-9"
            >
              {value || placeholder}
              <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[280px] p-0 rounded-none border border-[#201e1d] bg-white">
          <Command>
            <CommandInput placeholder="Search currency…" className="h-9" />
            <CommandList>
              <CommandEmpty>No currency found.</CommandEmpty>
              <CommandGroup>
                {CURRENCIES.map((c) => (
                  <CommandItem
                    key={c}
                    value={c}
                    onSelect={() => {
                      onValueChange(c)
                      setOpen(false)
                    }}
                    className="rounded-none"
                  >
                    {c}
                    {value === c && <CheckIcon className="ml-auto h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <FieldError errors={error} />}
    </Field>
  )
}

export function CurrencyField({
  field,
  label = 'Currency',
  placeholder,
}: {
  field: { state: { value: string; meta: { errors: any[] } }; handleChange: (v: string) => void; handleBlur: () => void; name: string }
  label?: string
  placeholder?: string
}) {
  return (
    <CurrencySelect
      value={field.state.value}
      onValueChange={(v) => field.handleChange(v)}
      label={label}
      placeholder={placeholder}
      error={field.state.meta.errors}
    />
  )
}
