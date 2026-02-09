/**
 * Lazy Components for PatientProfilePage
 *
 * Componentes pesados carregados sob demanda para melhor performance
 */

import { lazy } from 'react';

// Dashboard 360 - Componente principal do overview
export const LazyPatientDashboard360 = lazy(() =>
  import('@/components/patient/dashboard/PatientDashboard360').then(m => ({ default: m.PatientDashboard360 }))
);

// Evolution Dashboard - Gráficos de evolução
export const LazyPatientEvolutionDashboard = lazy(() =>
  import('@/components/patients/PatientEvolutionDashboard').then(m => ({ default: m.PatientEvolutionDashboard }))
);

// Analytics Dashboard - Análises pesadas
export const LazyPatientAnalyticsDashboard = lazy(() =>
  import('@/components/patients/analytics').then(m => ({ default: m.PatientAnalyticsDashboard }))
);

// Gamification Components
export const LazyGamificationHeader = lazy(() =>
  import('@/components/gamification/GamificationHeader').then(m => ({ default: m.GamificationHeader }))
);

export const LazyStreakCalendar = lazy(() =>
  import('@/components/gamification/StreakCalendar').then(m => ({ default: m.StreakCalendar }))
);

// AI Components
export const LazyPatientAIChat = lazy(() =>
  import('@/components/ai/PatientAIChat').then(m => ({ default: m.PatientAIChat }))
);

// Document Scanner - OCR pesado
export const LazyDocumentScanner = lazy(() =>
  import('@/components/patient/DocumentScanner').then(m => ({ default: m.DocumentScanner }))
);

// Session History Panel - Lista histórica
export const LazySessionHistoryPanel = lazy(() =>
  import('@/components/session/SessionHistoryPanel').then(m => ({ default: m.SessionHistoryPanel }))
);

// Lifecycle Chart - Gráfico complexo
export const LazyPatientLifecycleChart = lazy(() =>
  import('@/components/patients/analytics').then(m => ({ default: m.PatientLifecycleChart }))
);

// Insights Panel - Análise de IA
export const LazyPatientInsightsPanel = lazy(() =>
  import('@/components/patients/analytics').then(m => ({ default: m.PatientInsightsPanel }))
);

// Level Journey Map - Visualização complexa
export const LazyLevelJourneyMap = lazy(() =>
  import('@/components/gamification/LevelJourneyMap').then(m => ({ default: m.LevelJourneyMap }))
);
