// Componentes existentes
export { GoalsTracker } from './GoalsTracker';
export { MeasurementCharts } from './MeasurementCharts';
export { MeasurementForm } from './MeasurementForm';
export { PathologyStatus } from './PathologyStatus';
export { SurgeryTimeline } from './SurgeryTimeline';
export { PainMapCanvas } from './PainMapCanvas';
export { PainEvolutionChart } from './PainEvolutionChart';
export { PainMapHistory } from './PainMapHistory';
export { PainMapManager } from './PainMapManager';
export { FloatingActionBar } from './FloatingActionBar';
export { SOAPAccordion, type SOAPData } from './SOAPAccordion';
export { PainScaleWidget } from './PainScaleWidget';
export { type PainScaleData } from '@/lib/evolution/painScale';

// Componentes otimizados (v2.0)
export {
  OptimizedLoadingSkeleton,
  OptimizedSection,
  StatCard,
  StatusBadge,
  LazyWrapper,
  SectionSeparator,
  withMemo,
  Spacer,
  useMemoizedComponent,
  useEvolutionCallbacks,
} from './OptimizedEvolutionComponents';

// Suspense boundaries otimizados
export {
  CriticalDataBoundary,
  SecondaryDataBoundary,
  HeavyDataBoundary,
  AIComponentBoundary,
  MediaBoundary,
  EvolutionSuspenseLayout,
  AssessmentTabSuspense,
  HistoryTabSuspense,
  AssistantTabSuspense,
  CardFallback,
  ListFallback,
  GridFallback,
} from './SuspenseConfig';
