export function MeasurementChartSkeleton() {
  return (
    <div className="border rounded-lg p-4 animate-pulse" role="status" aria-label="Loading measurement chart">
      <div className="h-5 w-48 bg-muted rounded mb-4" />
      <div className="flex items-end justify-between h-64 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted rounded flex-1"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-12 bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}
