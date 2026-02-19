/**
 * AvaliacaoTab - Tab component for patient assessment (measurements, pain map, charts)
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
// Types are inferred from hook return values

// Lazy load heavy components
const LazyPainMapManager = lazy(() => import('@/components/evolution/PainMapManager').then(m => ({ default: m.PainMapManager })));
const LazyMeasurementForm = lazy(() => import('@/components/evolution/MeasurementForm').then(m => ({ default: m.MeasurementForm })));
const LazyMeasurementCharts = lazy(() => import('@/components/evolution/MeasurementCharts').then(m => ({ default: m.MeasurementCharts })));

interface AvaliacaoTabProps {
  patientId: string;
  appointmentId?: string;
  currentSoapRecordId?: string;
  requiredMeasurements: Array<{
    id: string;
    pathology_name: string;
    measurement_name: string;
    measurement_unit?: string;
    alert_level: 'high' | 'medium' | 'low';
    instructions?: string;
  }>;
  pendingRequiredMeasurements: Array<{
    id: string;
    pathology_name: string;
    measurement_name: string;
    measurement_unit?: string;
    alert_level: 'high' | 'medium' | 'low';
    instructions?: string;
  }>;
  todayMeasurements: Array<{
    measurement_name: string;
    [key: string]: any;
  }>;
  measurementsByType: Record<string, any[]>;
}

export function AvaliacaoTab({
  patientId,
  appointmentId,
  currentSoapRecordId,
  requiredMeasurements,
  pendingRequiredMeasurements,
  todayMeasurements,
  measurementsByType,
}: AvaliacaoTabProps) {
  return (
    <div className="mt-4 space-y-4">
      {/* Mapa de Dor */}
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyPainMapManager
          patientId={patientId}
          appointmentId={appointmentId}
          sessionId={currentSoapRecordId}
        />
      </Suspense>

      {/* Alerta de Medições Pendentes */}
      {pendingRequiredMeasurements.length > 0 && (
        <Card className="border-destructive/30 shadow-sm">
          <CardHeader className="bg-destructive/5 py-2 px-3">
            <CardTitle className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              Medições Obrigatórias Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3 px-3 pb-3">
            {requiredMeasurements
              .filter(req => {
                const completedToday = todayMeasurements.some(m => m.measurement_name === req.measurement_name);
                return !completedToday;
              })
              .map((req) => (
                <Alert
                  key={req.id}
                  variant={req.alert_level === 'high' ? 'destructive' : 'default'}
                  className="py-2"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <AlertTitle className="text-xs font-semibold">{req.measurement_name}</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    {req.instructions}
                    {req.measurement_unit && ` (${req.measurement_unit})`}
                  </AlertDescription>
                </Alert>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Formulário de Medição */}
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyMeasurementForm
          patientId={patientId}
          soapRecordId={currentSoapRecordId}
          requiredMeasurements={requiredMeasurements}
        />
      </Suspense>

      {/* Gráficos de Evolução */}
      {Object.keys(measurementsByType).length > 0 && (
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyMeasurementCharts measurementsByType={measurementsByType} />
        </Suspense>
      )}
    </div>
  );
}
