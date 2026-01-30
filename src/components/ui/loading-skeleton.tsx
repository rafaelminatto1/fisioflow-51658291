import React from 'react';
import { Card, CardContent, CardHeader } from './card';
import { Skeleton } from './skeleton';

interface LoadingSkeletonProps {
  type?: 'table' | 'card' | 'list' | 'form' | 'stats' | 'calendar' | 'calendar-day' | 'calendar-week';
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  rows = 3,
  className = ''
}) => {
  if (type === 'stats') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Calendar-specific loading skeleton
  if (type === 'calendar-week') {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Header with days */}
        <div className="grid grid-cols-8 gap-px border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8 gap-px min-h-[600px]">
            <Skeleton className="h-full" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-full bg-slate-50 dark:bg-slate-900/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'calendar-day') {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Header */}
        <Skeleton className="h-10 w-full mb-2" />
        {/* Time slots */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-12 w-16 flex-shrink-0" />
              <Skeleton className="h-12 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'calendar') {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Calendar header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        {/* Calendar grid */}
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return null;
};