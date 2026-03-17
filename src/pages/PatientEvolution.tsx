/**
 * Patient Evolution Page - Migrated to Neon/Cloudflare
 * Optimized with modular hooks and components for better maintainability.
 */

import { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Edit,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useCommandPalette } from '@/hooks/ui/useCommandPalette';
import { PatientHelpers } from '@/types';

// Hooks Modulares
import { usePatientEvolutionState } from '@/hooks/evolution/usePatientEvolutionState';
import { usePatientEvolutionHandlers } from '@/hooks/evolution/usePatientEvolutionHandlers';
import { useEvolutionShortcuts } from '@/hooks/evolution/useEvolutionShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAutoSaveSoapRecord } from '@/hooks/useSoapRecords';

// Componentes
import { EvolutionHeader } from '@/components/evolution/EvolutionHeader';
import { FloatingActionBar } from '@/components/evolution/FloatingActionBar';
import { EvolutionKeyboardShortcuts } from '@/components/evolution/EvolutionKeyboardShortcuts';
import { EvolutionAlerts } from '@/components/evolution/EvolutionAlerts';
import { MandatoryTestAlert } from '@/components/session/MandatoryTestAlert';
import { MedicalReturnCard } from '@/components/evolution/MedicalReturnCard';
import { SurgeriesCard } from '@/components/evolution/SurgeriesCard';
import { EvolutionSummaryCard } from '@/components/evolution/EvolutionSummaryCard';
import { MetasCard } from '@/components/evolution/MetasCard';
import { CardGrid } from '@/components/layout/ResponsiveGridLayout';
import { EvolutionGridContainer } from '@/components/evolution/EvolutionResponsiveLayout';
import { ComponentErrorBoundary } from '@/components/error';
import { ApplyTemplateModal } from '@/components/exercises/ApplyTemplateModal';
import { EvolutionDebugInfo } from '@/components/evolution/EvolutionDebugInfo';

import type { EvolutionTab } from '@/hooks/evolution/useEvolutionDataOptimized';

// Lazy tabs
const LazyEvolucaoTab = lazy(() => import('@/components/evolution/tabs/EvolucaoTab').then(m => ({ default: m.EvolucaoTab })));
const LazyAvaliacaoTab = lazy(() => import('@/components/evolution/tabs/AvaliacaoTab').then(m => ({ default: m.AvaliacaoTab })));
const LazyTratamentoTab = lazy(() => import('@/components/evolution/tabs/TratamentoTab').then(m => ({ default: m.TratamentoTab })));
const LazyHistoricoTab = lazy(() => import('@/components/evolution/tabs/HistoricoTab').then(m => ({ default: m.HistoricoTab })));
const LazyAssistenteTab = lazy(() => import('@/components/evolution/tabs/AssistenteTab').then(m => ({ default: m.AssistenteTab })));

// Lazy editors
const LazyNotionEvolutionPanel = lazy(() => import('@/components/evolution/v2/NotionEvolutionPanel').then(m => ({ default: m.NotionEvolutionPanel })));
const LazyNotionEvolutionPanelV3 = lazy(() => import('@/components/evolution/v3-notion/NotionEvolutionPanel').then(m => ({ default: m.NotionEvolutionPanel })));
const LazyNotionEvolutionEditor = lazy(() => import('@/components/evolution/NotionEvolutionEditor').then(m => ({ default: m.NotionEvolutionEditor })));
const LazyEvolutionDraggableGrid = lazy(() => import('@/components/evolution/EvolutionDraggableGrid').then(m => ({ default: m.EvolutionDraggableGrid })));

export interface PainScaleData {
  level: number;
  location?: string;
  character?: string;
}

const TABS_CONFIG = [
  { value: 'evolucao', label: 'Evolução', shortLabel: 'Evol', icon: 'FileText', description: 'SOAP + Dor' },
  { value: 'avaliacao', label: 'Avaliação', shortLabel: 'Aval', icon: 'BarChart3', description: 'Medições + Testes' },
  { value: 'tratamento', label: 'Tratamento', shortLabel: 'Trat', icon: 'Activity', description: 'Exercícios + Metas' },
  { value: 'historico', label: 'Histórico', shortLabel: 'Hist', icon: 'Clock', description: 'Timeline + Relatórios' },
  { value: 'assistente', label: 'Assistente', shortLabel: 'IA', icon: 'Sparkles', description: 'IA + WhatsApp' },
] as any;

const PatientEvolution = () => {
  const navigate = useNavigate();
  const { CommandPaletteComponent } = useCommandPalette();
  const state = usePatientEvolutionState();
  const handlers = usePatientEvolutionHandlers(state);
  const autoSaveMutation = useAutoSaveSoapRecord();

  // ========== AUTO-SAVE ==========
  const autoSaveData = useMemo(() => {
    if (state.evolutionVersion === 'v2-texto') {
      return {
        subjective: state.evolutionV2Data.patientReport || '',
        objective: state.evolutionV2Data.evolutionText || '',
        assessment: state.evolutionV2Data.procedures.map((p: any) => `${p.completed ? '[x]' : '[ ]'} ${p.name}${p.notes ? ` - ${p.notes}` : ''}`).join('\n'),
        plan: state.evolutionV2Data.observations || '',
      };
    }
    return state.soapData;
  }, [state.evolutionVersion, state.evolutionV2Data, state.soapData]);

  const { lastSavedAt } = useAutoSave({
    data: autoSaveData,
    onSave: async (data) => {
      if (!state.patientId || !state.appointmentId) return;
      if (!data.subjective && !data.objective && !data.assessment && !data.plan) return;

      const record = await autoSaveMutation.mutateAsync({
        patient_id: state.patientId,
        appointment_id: state.appointmentId,
        recordId: state.currentSoapRecordId,
        ...data
      });

      if (record?.id && record.id !== state.currentSoapRecordId) {
        state.setCurrentSoapRecordId(record.id);
      }
    },
    delay: 5000,
    enabled: state.autoSaveEnabled && !autoSaveMutation.isPending
  });

  // Shortcurs
  useEvolutionShortcuts(
    handlers.handleSave,
    handlers.handleCompleteSession,
    (section) => {
      if (['subjective', 'objective', 'assessment', 'plan'].includes(section)) {
        state.setActiveTab('evolucao');
        setTimeout(() => {
          const el = document.getElementById(section);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.focus();
        }, 100);
      } else if (section === 'measurements') state.setActiveTab('avaliacao');
      else if (section === 'history') state.setActiveTab('historico');
      else if (section === 'ai') state.setActiveTab('assistente');
    },
    () => state.setShowKeyboardHelp(true),
    () => state.setShowApplyTemplate(true),
    async () => {
      await handlers.handleSave();
      state.setActiveTab('assistente');
    }
  );

  // Memoized Content
  const alertsSectionContent = useMemo(() => (
    <>
      {state.requiredMeasurements.length > 0 && (
        <MandatoryTestAlert
          tests={state.requiredMeasurements.map((req: any) => ({
            id: req.id || req.measurement_name,
            name: req.measurement_name,
            critical: req.alert_level === 'high',
            completed: state.measurements.some((m: any) => m.measurement_name === req.measurement_name && new Date(m.measured_at).toDateString() === new Date().toDateString())
          }))}
          onResolve={() => state.setActiveTab('avaliacao')}
        />
      )}
      <EvolutionAlerts
        overdueGoals={state.goals.filter((g: any) => g.status !== 'concluido' && g.target_date && new Date(g.target_date) < new Date())}
        painScale={state.painScale}
        upcomingGoals={state.goals.filter((g: any) => g.status !== 'concluido' && g.target_date && new Date(g.target_date) >= new Date() && new Date(g.target_date) <= new Date(Date.now() + 3 * 86400000))}
        daysSinceLastEvolution={state.previousEvolutions.length > 0 ? Math.floor((Date.now() - new Date(state.previousEvolutions[0].created_at).getTime()) / 86400000) : null}
        sessionDurationMinutes={Math.floor((Date.now() - new Date().getTime()) / 60000)}
        activePathologies={state.activePathologies}
        previousEvolutionsCount={state.previousEvolutions.length}
        onTabChange={(v) => state.setActiveTab(v as EvolutionTab)}
      />
    </>
  ), [state]);

  const topSectionContent = useMemo(() => (
    <CardGrid>
      <MedicalReturnCard patient={state.patient} patientId={state.patientId} onPatientUpdated={() => state.invalidateData('all')} />
      <SurgeriesCard patientId={state.patientId} />
      <div className="lg:row-span-2">
        <EvolutionSummaryCard 
          stats={{ 
            totalEvolutions: state.previousEvolutions.length, 
            totalGoals: state.goals.length, 
            completedGoals: state.goals.filter((g: any) => g.status === 'concluido').length,
            activePathologiesCount: state.activePathologies.length,
            totalMeasurements: state.measurements.length,
            avgGoalProgress: state.goals.length > 0 
              ? Math.round((state.goals.filter((g: any) => g.status === 'concluido').length / state.goals.length) * 100)
              : 0,
            completionRate: state.previousEvolutions.length > 0 ? 100 : 0 // Placeholder logic
          }} 
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-2"><MetasCard patientId={state.patientId} /></div>
    </CardGrid>
  ), [state.patient, state.patientId, state.goals, state.previousEvolutions.length, state.activePathologies.length, state.measurements.length]);

  const mainGridContent = useMemo(() => {
    if (state.evolutionVersion === 'v4-tiptap') {
      return (
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyNotionEvolutionEditor 
            initialContent={state.evolutionV2Data.evolutionText || ''}
            evolutionId={state.currentSoapRecordId || state.appointmentId}
            patientId={state.patientId}
            onSave={(content) => {
              state.setEvolutionV2Data((prev: any) => ({ ...prev, evolutionText: content }));
              handlers.handleSave();
            }}
            isSaving={autoSaveMutation.isPending}
            soapData={state.soapData}
            onAiAssist={() => state.setActiveTab('assistente')}
          />
        </Suspense>
      );
    }
    if (state.evolutionVersion === 'v3-notion') {
      return <Suspense fallback={<LoadingSkeleton type="card" />}><LazyNotionEvolutionPanelV3 data={state.evolutionV2Data} onChange={state.setEvolutionV2Data} isSaving={autoSaveMutation.isPending} autoSaveEnabled={state.autoSaveEnabled} lastSaved={lastSavedAt} /></Suspense>;
    }
    if (state.evolutionVersion === 'v2-texto') {
      return <Suspense fallback={<LoadingSkeleton type="card" />}><LazyNotionEvolutionPanel data={state.evolutionV2Data} onChange={state.setEvolutionV2Data} isSaving={autoSaveMutation.isPending} autoSaveEnabled={state.autoSaveEnabled} lastSaved={lastSavedAt} previousEvolutions={state.previousEvolutions} /></Suspense>;
    }
    return (
      <EvolutionGridContainer>
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyEvolutionDraggableGrid
            soapData={state.soapData} onSoapChange={state.setSoapData}
            painScaleData={state.painScale} onPainScaleChange={state.setPainScale}
            onAISuggest={() => state.setActiveTab('assistente')}
            patientId={state.patientId} patientPhone={state.patient?.phone}
            exercises={state.sessionExercises} onExercisesChange={state.setSessionExercises}
            previousEvolutions={state.previousEvolutions}
            onCopyLastEvolution={handlers.handleCopyPreviousEvolution}
          />
        </Suspense>
      </EvolutionGridContainer>
    );
  }, [state, handlers, autoSaveMutation.isPending, lastSavedAt]);

  if (state.dataLoading) return <MainLayout><div className="flex items-center justify-center h-[50vh]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></MainLayout>;
  if (!state.appointment || !state.patient) return <MainLayout><div className="text-center p-10"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p>Dados não encontrados.</p><Button onClick={() => navigate('/agenda')} className="mt-4">Voltar</Button></div></MainLayout>;

  return (
    <ComponentErrorBoundary componentName="PatientEvolution">
      <MainLayout maxWidth="full" compactPadding>
        <div className="space-y-5 animate-fade-in pb-8">
          <EvolutionHeader
            patient={state.patient} appointment={state.appointment}
            evolutionStats={{ totalEvolutions: state.previousEvolutions.length }}
            onSave={handlers.handleSave} onComplete={handlers.handleCompleteSession}
            isSaving={handlers.isSaving} autoSaveEnabled={state.autoSaveEnabled}
            lastSavedAt={lastSavedAt} activeTab={state.activeTab} onTabChange={(v) => state.setActiveTab(v as EvolutionTab)}
            evolutionVersion={state.evolutionVersion} onVersionChange={state.setEvolutionVersion}
            onRestoreVersion={handlers.handleRestoreVersion}
            therapists={state.therapists}
            selectedTherapistId={state.selectedTherapistId}
            onTherapistChange={state.setSelectedTherapistId}
          />

          <Tabs value={state.activeTab} onValueChange={(v) => state.setActiveTab(v as EvolutionTab)} className="w-full pb-20">
            <TabsContent value="evolucao" className="mt-0"><Suspense fallback={<LoadingSkeleton />}><LazyEvolucaoTab alertsSection={alertsSectionContent} topSection={topSectionContent} mainGrid={mainGridContent} /></Suspense></TabsContent>
            <TabsContent value="avaliacao"><Suspense fallback={<LoadingSkeleton />}><LazyAvaliacaoTab patientId={state.patientId!} appointmentId={state.appointmentId!} todayMeasurements={state.measurements} /></Suspense></TabsContent>
            <TabsContent value="tratamento"><Suspense fallback={<LoadingSkeleton />}><LazyTratamentoTab sessionExercises={state.sessionExercises} onExercisesChange={state.setSessionExercises} patientId={state.patientId!} /></Suspense></TabsContent>
            <TabsContent value="historico"><Suspense fallback={<LoadingSkeleton />}><LazyHistoricoTab patientId={state.patientId!} previousEvolutions={state.previousEvolutions} onCopyEvolution={handlers.handleCopyPreviousEvolution} /></Suspense></TabsContent>
            <TabsContent value="assistente"><Suspense fallback={<LoadingSkeleton />}><LazyAssistenteTab patientId={state.patientId!} patientName={PatientHelpers.getName(state.patient)} onApplyToSoap={(f, c) => { state.setSoapData((prev: any) => ({ ...prev, [f]: prev[f] + c })); state.setActiveTab('evolucao'); }} /></Suspense></TabsContent>
          </Tabs>

          <FloatingActionBar onSave={handlers.handleSave} onComplete={handlers.handleCompleteSession} onExportPDF={handlers.handleExportPDF} isSaving={handlers.isSaving} />
          {state.showApplyTemplate && <ApplyTemplateModal open={state.showApplyTemplate} onOpenChange={state.setShowApplyTemplate} patientId={state.patientId!} patientName={PatientHelpers.getName(state.patient)} />}
          <EvolutionKeyboardShortcuts open={state.showKeyboardHelp} onOpenChange={state.setShowKeyboardHelp} />
          <CommandPaletteComponent />
        </div>
      </MainLayout>
    </ComponentErrorBoundary>
  );
};

export default PatientEvolution;
