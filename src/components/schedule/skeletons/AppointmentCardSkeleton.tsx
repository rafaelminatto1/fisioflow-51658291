/**
 * AppointmentCardSkeleton - Loading skeleton for appointment cards
 * Matches the dimensions and structure of AppointmentCard component
 */

import { cn } from '@/lib/utils';

interface AppointmentCardSkeletonProps {
  /** Card variant to match skeleton structure */
  variant?: 'compact' | 'expanded';
  /** Optional className for customization */
  className?: string;
}

/**
 * AppointmentCardSkeleton component
 * Shows a loading skeleton that matches the AppointmentCard structure
 * Includes shimmer animation for better UX
 */
export function AppointmentCardSkeleton({ 
  variant = 'expanded', 
  className 
}: AppointmentCardSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-white dark:bg-slate-900',
          'border border-slate-200 dark:border-slate-800',
          'shadow-sm',
          className
        )}
      >
        {/* Status indicator strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-200 dark:bg-slate-800 animate-pulse" />

        <div className="p-3 pl-5">
          {/* Time and status row */}
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>

          {/* Patient name */}
          <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mb-1" />

          {/* Type */}
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-800',
        'shadow-sm',
        className
      )}
    >
      {/* Status indicator strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-200 dark:bg-slate-800 animate-pulse" />

      <div className="p-4 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {/* Time */}
            <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mb-2" />
            
            {/* Patient name */}
            <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mb-2" />
            
            {/* Type and duration */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          </div>

          {/* Status badge and actions */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>

        {/* Notes indicator (optional) */}
        <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-900 animate-pulse" />
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
