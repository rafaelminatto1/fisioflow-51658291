export function HistoryTimelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading evolution history">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 bg-muted rounded-full" />
            {i < 3 && <div className="w-0.5 h-full bg-muted mt-2" />}
          </div>
          <div className="flex-1 pb-6">
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="border rounded-lg p-4 space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
              <div className="h-4 w-4/6 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
