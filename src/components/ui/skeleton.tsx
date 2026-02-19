import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'chart' | 'form' | 'list'
  lines?: number
  height?: string
  animate?: boolean
}

function Skeleton({
  className,
  variant = 'text',
  lines = 1,
  height,
  animate = true,
  ...props
}: SkeletonProps) {
  const baseClasses = cn(
    "bg-muted rounded",
    animate && "animate-pulse",
    className
  )

  // Text variant - multiple lines
  if (variant === 'text') {
    if (lines === 1) {
      return (
        <div
          role="status"
          aria-label="Loading content"
          className={cn(baseClasses, height || "h-4")}
          {...props}
        />
      )
    }

    return (
      <div role="status" aria-label="Loading content" className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              height || "h-4",
              i === lines - 1 && "w-4/5" // Last line shorter
            )}
          />
        ))}
      </div>
    )
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div
        role="status"
        aria-label="Loading card"
        className={cn(
          "border rounded-lg p-4 space-y-3",
          animate && "animate-pulse"
        )}
        {...props}
      >
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    )
  }

  // Chart variant
  if (variant === 'chart') {
    return (
      <div
        role="status"
        aria-label="Loading chart"
        className={cn(
          "border rounded-lg p-4",
          animate && "animate-pulse"
        )}
        {...props}
      >
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="flex items-end justify-between h-48 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted rounded flex-1"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Form variant
  if (variant === 'form') {
    return (
      <div
        role="status"
        aria-label="Loading form"
        className={cn("space-y-4", animate && "animate-pulse")}
        {...props}
      >
        {Array.from({ length: lines || 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  // List variant
  if (variant === 'list') {
    return (
      <div
        role="status"
        aria-label="Loading list"
        className={cn("space-y-3", animate && "animate-pulse")}
        {...props}
      >
        {Array.from({ length: lines || 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={baseClasses}
      style={{ height }}
      {...props}
    />
  )
}

export { Skeleton }
