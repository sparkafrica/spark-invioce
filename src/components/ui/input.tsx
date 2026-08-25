import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "#/lib/utils.ts"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] text-[#201e1d] placeholder:text-[#9b9797] outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-accent)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
