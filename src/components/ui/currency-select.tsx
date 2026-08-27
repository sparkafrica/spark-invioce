"use client"

import { ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '#/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { CURRENCIES, type Currency } from '#/lib/currencies'
import { cn } from '#/lib/utils'

type Props = {
  value?: string
  onValueChange: (v: Currency) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CurrencySelect({ value, onValueChange, placeholder = 'Select currency', disabled, className }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] font-normal h-9", className)}
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
                  className="rounded-none flex justify-between"
                  data-checked={value === c}
                >
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


