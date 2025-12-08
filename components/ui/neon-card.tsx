import * as React from "react"
import { cn } from "@/lib/utils"

interface NeonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "cyan" | "magenta" | "purple"
  hover?: boolean
}

const NeonCard = React.forwardRef<HTMLDivElement, NeonCardProps>(
  ({ className, glowColor = "cyan", hover = true, children, ...props }, ref) => {
    const glowClasses = {
      cyan: "hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] border-neon-cyan/20 hover:border-neon-cyan/50",
      magenta: "hover:shadow-[0_0_30px_rgba(255,0,255,0.2)] border-neon-magenta/20 hover:border-neon-magenta/50",
      purple: "hover:shadow-[0_0_30px_rgba(138,43,226,0.2)] border-neon-purple/20 hover:border-neon-purple/50",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl bg-card/50 backdrop-blur-sm border transition-all duration-300",
          hover && glowClasses[glowColor],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)
NeonCard.displayName = "NeonCard"

export { NeonCard }
