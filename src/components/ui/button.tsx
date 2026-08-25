import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils.ts"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border font-semibold whitespace-nowrap outline-none select-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--color-accent)] aria-invalid:outline-[var(--color-accent)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent)] text-white border-transparent hover:bg-[var(--color-accent-600)] active:bg-[var(--color-accent-700)]",
        outline: "border-[#201e1d] bg-transparent text-[#201e1d] hover:bg-[#f0dcd8] active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
        secondary: "border-[#201e1d] bg-white text-[#201e1d] hover:bg-[#f0dcd8] active:bg-[#e7e4e2]",
        ghost: "border-transparent bg-transparent text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]",
        destructive: "bg-[var(--color-accent)] text-white border-transparent hover:bg-[var(--color-accent-600)]",
        link: "border-transparent bg-transparent text-[var(--color-accent)] underline underline-offset-4 hover:text-[var(--color-accent-600)]",
      },
      size: {
        default: "h-10 gap-1.5 px-4 text-[13px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-3.5 text-[13px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-11 gap-1.5 px-6 text-sm has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
