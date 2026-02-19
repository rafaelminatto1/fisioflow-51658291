/**
 * CalendarSkeleton - Loading skeleton for calendar views
 * Matches the structure of day/week/month calendar grids
 */

import { cn } from '@/lib/utils';

interface CalendarSkeletonProps {
  /** Calendar view type to match skeleton structure */
  viewType: 'day' | 'week' | 'month';
  /** Optional className for customization */
  className?: string;
}

/**
 * CalendarSkeleton component
 * Shows a loading skeleton that matches the calendar grid structure
 * Includes shimmer animation for better UX
 */
export function CalendarSkeleton({ viewType, className }: CalendarSkeletonProps) {
  // Calculate number of columns based on view type
  const columns = viewType === 'day' ? 1 : viewType === 'week' ? 7 : 7;
  
  // Calculate number of rows (time slots or weeks)
  const rows = viewType === 'month' ? 5 : 14; // 14 hours for day/week (7am-9pm)

  return (
    <div className={cn('w-full h-full bg-white dark:bg-slate-950', className)}>
      {/* Header skeleton */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-9 w-32 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-9 w-9 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
          
          {/* View type buttons */}
          <div className="flex items-center gap-1">
            <div className="h-9 w-16 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-9 w-20 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-9 w-16 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
        
        {/* Day headers */}
        <div className={cn(
          'grid gap-px',
          viewType === 'day' ? 'grid-cols-1' : 'grid-cols-7'
        )}>
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-slate-100 dark:bg-slate-900 rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="p-4 overflow-hidden">
        <div className={cn(
          'grid gap-2',
          viewType === 'day' ? 'grid-cols-1' : 'grid-cols-7'
        )}>
          {Array.from({ length: columns * rows }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-md bg-slate-100 dark:bg-slate-900 animate-pulse',
                viewType === 'month' ? 'h-24' : 'h-16'
              )}
            />
          ))}
        </div>
      </div>

      {/* Shimmer overlay effect */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background: linear-gradient(
            90deg,
            rgb(226 232 240 / 1) 0%,
            rgb(241 245 249 / 1) 50%,
            rgb(226 232 240 / 1) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        
        .dark .animate-pulse {
          background: linear-gradient(
            90deg,
            rgb(15 23 42 / 1) 0%,
            rgb(30 41 59 / 1) 50%,
            rgb(15 23 42 / 1) 100%
          );
          background-size: 1000px 100%;
        }
      `}</style>
    </div>
  );
}
