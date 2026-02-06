import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

// ============================================================================
// GENERIC SKELETON COMPONENTS
// ============================================================================

// Skeleton components for specific use cases
export function ScheduleGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AppointmentCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-6 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// ============================================================================
// PATIENT-RELATED SKELETONS
// ============================================================================

export function PatientListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border rounded-xl bg-card">
          {/* Avatar skeleton */}
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />

          {/* Patient info skeleton */}
          <div className="flex flex-col flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Actions skeleton */}
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}

export function PatientCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <div className="flex space-x-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-8" />
      </div>
    </div>
  )
}

export function PatientProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center space-x-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SCHEDULE/CALENDAR SKELETONS
// ============================================================================

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Week view skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="text-center p-2 border rounded">
            <Skeleton className="h-4 w-12 mx-auto mb-1" />
            <Skeleton className="h-6 w-8 mx-auto rounded-full" />
          </div>
        ))}

        {/* Time slots */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[60px] border rounded p-1">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DayViewSkeleton() {
  return (
    <div className="flex">
      {/* Time column */}
      <div className="w-16 space-y-4 pr-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="text-right">
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>

      {/* Appointments column */}
      <div className="flex-1 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex">
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// FINANCIAL SKELETONS
// ============================================================================

export function FinancialCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  )
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// ANALYTICS/CHART SKELETONS
// ============================================================================

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="w-full" style={{ height: `${height}px` }} />
    </div>
  )
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={250} />
        <ChartSkeleton height={250} />
      </div>

      {/* Table section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <TableSkeleton rows={5} cols={4} />
      </div>
    </div>
  )
}

// ============================================================================
// EXERCISE/PROTOCOL SKELETONS
// ============================================================================

export function ExerciseCardSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Thumbnail skeleton */}
      <Skeleton className="w-full h-40" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  )
}

export function ExerciseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ExerciseCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ============================================================================
// COMMUNICATION/CHAT SKELETONS
// ============================================================================

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`flex max-w-[70%] space-x-2 ${i % 2 === 0 ? '' : 'flex-row-reverse space-x-reverse'}`}>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className={`space-y-1 ${i % 2 === 0 ? 'bg-muted' : 'bg-primary/10'} rounded-lg p-3`}>
              <Skeleton className={`h-4 ${i % 2 === 0 ? 'w-48' : 'w-40'}`} />
              <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-32' : 'w-24'}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// SETTINGS/FORM SKELETONS
// ============================================================================

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="border rounded-lg p-4 space-y-4">
          <Skeleton className="h-5 w-32" />

          {Array.from({ length: 2 }).map((_, fieldIndex) => (
            <div key={fieldIndex} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}

          <div className="flex space-x-2 pt-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// GENERIC LIST VARIANTS
// ============================================================================

export function ListItemSkeleton({ withAvatar = true, withAction = true }: { withAvatar?: boolean; withAction?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      {withAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}

      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      {withAction && <Skeleton className="h-8 w-8 shrink-0" />}
    </div>
  )
}

export function CompactListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2 border rounded">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}