import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-3 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary transition-all duration-300"
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
