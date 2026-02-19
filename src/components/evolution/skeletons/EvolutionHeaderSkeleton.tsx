export function EvolutionHeaderSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading patient information">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-6 w-32 bg-muted rounded" />
      </div>
      <div className="h-px bg-border" />
    </div>
  )
}
