import * as React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The progress value from 0 to 100 */
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    // Ensure value stays between 0 and 100
    const safeValue = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        className={`relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className || ""}`}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-blue-600 transition-transform duration-500 ease-in-out dark:bg-blue-500"
          style={{ transform: `translateX(-${100 - safeValue}%)` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
