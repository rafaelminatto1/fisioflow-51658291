/**
 * AppointmentListSkeleton - Loading skeleton for appointment lists
 * Renders multiple AppointmentCardSkeleton components
 */

import { AppointmentCardSkeleton } from './AppointmentCardSkeleton';
import { cn } from '@/lib/utils';

interface AppointmentListSkeletonProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Card variant to match skeleton structure */
  variant?: 'compact' | 'expanded';
  /** Optional className for customization */
  className?: string;
}

/**
 * AppointmentListSkeleton component
 * Shows a list of loading skeletons for appointment cards
 * Used during initial load or when filtering appointments
 */
export function AppointmentListSkeleton({ 
  count = 5, 
  variant = 'expanded',
  className 
}: AppointmentListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <AppointmentCardSkeleton 
          key={index} 
          variant={variant}
        />
      ))}
    </div>
  );
}
