/**
 * AssistenteTab - Tab component for AI assistant, WhatsApp, and gamification
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

// Lazy load heavy components
const LazyTreatmentAssistant = lazy(() => import('@/components/ai/TreatmentAssistant').then(m => ({ default: m.TreatmentAssistant })));
const LazyWhatsAppIntegration = lazy(() => import('@/components/whatsapp/WhatsAppIntegration').then(m => ({ default: m.WhatsAppIntegration })));
const LazyPatientGamification = lazy(() => import('@/components/gamification/PatientGamification').then(m => ({ default: m.PatientGamification })));

interface AssistenteTabProps {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  onApplyToSoap: (field: string, content: string) => void;
}

export function AssistenteTab({
  patientId,
  patientName,
  patientPhone,
  onApplyToSoap,
}: AssistenteTabProps) {
  return (
    <div className="mt-4 space-y-4">
      {/* Assistente de IA */}
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyTreatmentAssistant
          patientId={patientId}
          patientName={patientName}
          onApplyToSoap={onApplyToSoap}
        />
      </Suspense>

      {/* Integração WhatsApp */}
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyWhatsAppIntegration patientId={patientId} patientPhone={patientPhone} />
      </Suspense>

      {/* Gamificação */}
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyPatientGamification patientId={patientId} />
      </Suspense>
    </div>
  );
}
