import * as React from "react"

import { cn } from "#/lib/utils.ts"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-none border border-[#201e1d] bg-white px-2.5 py-2 text-[13px] text-[#201e1d] placeholder:text-[#9b9797] outline-none focus-visible:outline-2 focus-visible:outline-[#ec3013] focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#ec3013]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
