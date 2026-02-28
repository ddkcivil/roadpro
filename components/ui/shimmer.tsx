import { cn } from "~/lib/utils"

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * A component that adds a shimmer effect to its children or acts as a placeholder.
 * Similar to Skeleton but with a sliding highlight animation.
 */
export function Shimmer({ className, ...props }: ShimmerProps) {
  return (
    <div
      data-testid="shimmer"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/50 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent dark:before:via-white/5",
        className
      )}
      {...props}
    />
  )
}
