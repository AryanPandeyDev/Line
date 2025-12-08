"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const neonButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:scale-105",
        secondary:
          "bg-gradient-to-r from-neon-magenta to-neon-purple text-foreground hover:shadow-[0_0_30px_rgba(255,0,255,0.5)] hover:scale-105",
        outline:
          "border border-neon-cyan/50 bg-transparent text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]",
        ghost: "bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        glow: "bg-neon-cyan text-background shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_40px_rgba(0,255,255,0.6)] hover:scale-105",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
)

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonButtonVariants> {
  asChild?: boolean
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(neonButtonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
NeonButton.displayName = "NeonButton"

export { NeonButton, neonButtonVariants }
