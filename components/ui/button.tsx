import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-blue-500",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-ops-blue-600 text-white hover:bg-ops-blue-700": variant === "default",
            "bg-slate-800 text-white hover:bg-slate-700": variant === "secondary",
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
            "border border-slate-700 bg-transparent hover:bg-slate-800": variant === "outline",
            "hover:bg-slate-800": variant === "ghost",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-8": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
