import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "dark:bg-slate-900/50 border-slate-700/40 h-9 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 text-sm shadow-sm transition-all duration-200",
        "outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20 focus-visible:ring-[3px] focus-visible:bg-slate-900/70",
        "hover:border-slate-600/50",
        "aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
