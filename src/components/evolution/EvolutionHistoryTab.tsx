import React from 'react';
import { EvolutionMultiView } from '@/components/evolution/EvolutionMultiView';
import { SurgeryTimeline } from '@/components/evolution/SurgeryTimeline';
import { MedicalReportSuggestions } from '@/components/evolution/MedicalReportSuggestions';

interface Surgery {
  id: string;
  name: string;
  date: string;
  description?: string;
}

interface Evolution {
  id: string;
  patient_id: string;
  /** Preferido: vem de SoapRecord. Fallback para compatibilidade. */
  record_date?: string;
  date?: string;
  created_at: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  pain_level?: number;
  attachments?: string[];
}

interface EvolutionHistoryTabProps {
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

export const EvolutionHistoryTab = React.memo(function EvolutionHistoryTab({
  patientId,
  surgeries,
  previousEvolutions,
  onCopyEvolution,
  goals = [],
  pathologies = [],
}: EvolutionHistoryTabProps) {
  return (
    <div className="mt-4 space-y-4">
      {/* Multi-view evolution history (Notion-style: Timeline, Calendar, Gallery, Graph) */}
      <EvolutionMultiView
        patientId={patientId}
        surgeries={surgeries}
        previousEvolutions={previousEvolutions}
        onCopyEvolution={onCopyEvolution}
        goals={goals}
        pathologies={pathologies}
      />

      {/* Surgery Timeline */}
      <SurgeryTimeline surgeries={surgeries} />

      {/* Medical Report Suggestions */}
      <MedicalReportSuggestions patientId={patientId || ''} />
    </div>
  );
});
