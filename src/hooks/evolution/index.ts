/**
 * Evolution Hooks - Otimizados para Performance
 *
 * Exporta todos os hooks relacionados à evolução do paciente
 * com foco em cache inteligente e carregamento deferido
 */

// Hook principal de dados otimizados
export {
  useEvolutionDataOptimized,
  useEvolutionData,
  useEvolutionPrefetch,
  evolutionKeys,
  EVOLUTION_CACHE_CONFIG,
  type EvolutionDataOptions,
  type EvolutionTab,
} from './useEvolutionDataOptimized';

// Hook de dados deferidos (legado - manter para compatibilidade)
export {
  useEvolutionDeferredData,
  type DeferredDataOptions,
} from './useEvolutionDeferredData';

// Hook de atalhos de teclado
export {
  useEvolutionShortcuts,
  type ShortcutHandlers,
} from './useEvolutionShortcuts';

// Re-exportar tipos comuns
export type {
  Surgery,
  MedicalReturn,
  PatientGoal,
  Pathology,
} from '@/types/evolution';
