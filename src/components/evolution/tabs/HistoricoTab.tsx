/**
 * HistoricoTab - Tab component for patient history (timeline, previous evolutions)
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 1.0.0
 */

import { lazy, Suspense } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

// Lazy load heavy components
const LazyEvolutionHistoryTab = lazy(() =>
  import("@/components/evolution/EvolutionHistoryTab").then((m) => ({
    default: m.EvolutionHistoryTab,
  })),
);

// Types matching EvolutionHistoryTab expectations
interface Surgery {
  id: string;
  name: string;
  date: string;
  description?: string;
}

interface Evolution {
  id: string;
  patient_id: string;
  record_date?: string;
  date?: string;
  created_at: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface HistoricoTabProps {
  patientId: string;
  surgeries: Surgery[];
  previousEvolutions: Evolution[];
  onCopyEvolution: (evolution: Evolution) => void;
  showComparison: boolean;
  onToggleComparison: () => void;
  goals?: Array<{
    id: string;
    goal_title: string;
    status: string;
    current_progress: number;
    priority: string;
  }>;
  pathologies?: Array<{
    id: string;
    pathology_name: string;
    status: string;
    severity?: string;
  }>;
}

export function HistoricoTab({
  patientId,
  surgeries,
  previousEvolutions,
  onCopyEvolution,
  showComparison,
  onToggleComparison,
  goals = [],
  pathologies = [],
}: HistoricoTabProps) {
  return (
    <div className="mt-4">
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyEvolutionHistoryTab
          patientId={patientId}
          surgeries={surgeries}
          previousEvolutions={previousEvolutions}
          onCopyEvolution={onCopyEvolution}
          showComparison={showComparison}
          onToggleComparison={onToggleComparison}
          goals={goals}
          pathologies={pathologies}
        />
      </Suspense>
    </div>
  );
}
