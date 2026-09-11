import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "secondary"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-ops-blue-600 text-white": variant === "default",
          "bg-green-600 text-white": variant === "success",
          "bg-yellow-600 text-white": variant === "warning",
          "bg-red-600 text-white": variant === "danger",
          "bg-slate-700 text-white": variant === "secondary",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
