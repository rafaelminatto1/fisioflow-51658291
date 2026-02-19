export function ExerciseListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading exercise list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 bg-muted rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-16 bg-muted rounded" />
                <div className="h-6 w-16 bg-muted rounded" />
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
