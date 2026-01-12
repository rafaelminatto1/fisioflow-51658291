/**
 * Exportações centralizadas para melhorias de código
 *
 * Este arquivo exporta todos os componentes, hooks e utilitários
 * criados para melhorar a qualidade do código.
 */

// ==================== Error Handling ====================
export {
  ErrorBoundary,
  useErrorBoundary,
  QueryErrorBoundary,
  QueryErrorFallback,
  withErrorBoundary,
  SmallErrorBoundary,
  SmallErrorFallback,
} from '@/components/error-handling';

// ==================== Loading States ====================
export {
  LoadingSpinner,
  LoadingScreen,
  LoadingCard,
  LoadingTable,
  LoadingButton,
  WithLoading,
  LoadingAvatar,
  LoadingList,
  LoadingChart,
  LoadingStats,
  LoadingOverlay,
  PulseLoader,
  LoadingBar,
  LoadingForm,
} from '@/components/loading/LoadingStates';

// ==================== Hooks ====================
export {
  useOptimisticMutation,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from '@/hooks/useOptimisticMutation';

export { QueryKeys } from '@/hooks/queryKeys';

export {
  STANDARD_FORMS,
  useCreateStandardForm,
  useStandardFormExists,
} from '@/hooks/useStandardForms';

// ==================== i18n ====================
export {
  useTranslation,
  useBrowserLocale,
  translations,
  locales,
  type SupportedLocale,
  type LocaleConfig,
  type TranslationKey,
} from '@/lib/i18n';

// ==================== Componentes Clínicos ====================
export { StandardFormsManager } from '@/components/clinical/StandardFormsManager';

// ==================== Páginas de Relatórios ====================
export { default as RelatorioConvenioPage } from '@/pages/relatorios/RelatorioConvenioPage';
export { default as RelatorioMedicoPage } from '@/pages/relatorios/RelatorioMedicoPage';
