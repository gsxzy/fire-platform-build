import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden hover:-translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-500/15 hover:shadow-md hover:shadow-blue-500/25",
        secondary:
          "border-transparent bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-200",
        destructive:
          "border-transparent bg-gradient-to-br from-red-600 to-red-500 text-white shadow-sm shadow-red-500/15 hover:shadow-md hover:shadow-red-500/25 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/40",
        outline:
          "text-slate-300 border-slate-600/30 bg-transparent hover:bg-blue-500/8 hover:text-blue-300 hover:border-blue-500/20",
        success:
          "border-transparent bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-500/15 hover:shadow-md hover:shadow-emerald-500/25",
        warning:
          "border-transparent bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-sm shadow-amber-500/15 hover:shadow-md hover:shadow-amber-500/25",
        info:
          "border-transparent bg-gradient-to-br from-cyan-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/15 hover:shadow-md hover:shadow-cyan-500/25",
        ghost:
          "border-transparent text-slate-400 bg-transparent hover:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
