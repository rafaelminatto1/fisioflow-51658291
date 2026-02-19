/**
 * TratamentoTab - Tab component for treatment (exercises, goals, pathologies)
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { GoalsTracker } from '@/components/evolution/GoalsTracker';
import { PathologyStatus } from '@/components/evolution/PathologyStatus';
import type { SessionExercise } from '@/components/evolution/SessionExercisesPanel';
import type { Goal, Pathology } from '@/types';

// Lazy load heavy components
const LazySessionExercisesPanel = lazy(() => import('@/components/evolution/SessionExercisesPanel').then(m => ({ default: m.SessionExercisesPanel })));

interface TratamentoTabProps {
  sessionExercises: SessionExercise[];
  onExercisesChange: (exercises: SessionExercise[]) => void;
  goals: Goal[];
  pathologies: Pathology[];
}

export function TratamentoTab({
  sessionExercises,
  onExercisesChange,
  goals,
  pathologies,
}: TratamentoTabProps) {
  return (
    <div className="mt-4 space-y-4">
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazySessionExercisesPanel
          exercises={sessionExercises}
          onChange={onExercisesChange}
        />
      </Suspense>
      <GoalsTracker goals={goals} />
      <PathologyStatus pathologies={pathologies} />
    </div>
  );
}
