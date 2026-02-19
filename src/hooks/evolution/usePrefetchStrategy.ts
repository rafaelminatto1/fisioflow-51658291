/**
 * usePrefetchStrategy - Hook para prefetch inteligente de dados de evolução
 *
 * FEATURES:
 * 1. Delay de 2 segundos antes de iniciar prefetch (evita prefetch desnecessário)
 * 2. Network-aware: detecta conexão lenta e desabilita prefetch
 * 3. Deduplicação: evita prefetch duplicado da mesma aba
 * 4. Prioridade baixa: usa startTransition para não bloquear UI
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * Properties: 10, 13, 14, 15, 16
 *
 * @version 1.0.0
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startTransition } from 'react';
import { evolutionKeys, EVOLUTION_CACHE_CONFIG, type EvolutionTab } from './useEvolutionDataOptimized';

interface PrefetchStrategyOptions {
  patientId: string;
  activeTab: EvolutionTab;
  activePathologies?: Array<{ pathology_name: string }>;
  enabled?: boolean;
  delay?: number; // Delay in milliseconds before prefetching (default: 2000ms)
}

interface NetworkInformation extends EventTarget {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/**
 * Detecta se a conexão é lenta e deve evitar prefetch
 * Requirements: 11.4 - Network-aware prefetching
 */
function isSlowConnection(): boolean {
  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (!connection) {
    // Se não temos informação de rede, assumimos conexão boa
    return false;
  }

  // Evitar prefetch em conexões lentas ou com saveData ativo
  if (connection.saveData) {
    return true;
  }

  const slowTypes = ['2g', 'slow-2g'];
  if (connection.effectiveType && slowTypes.includes(connection.effectiveType)) {
    return true;
  }

  // RTT > 400ms ou downlink < 0.5 Mbps = conexão lenta
  if (connection.rtt && connection.rtt > 400) {
    return true;
  }

  if (connection.downlink && connection.downlink < 0.5) {
    return true;
  }

  return false;
}

/**
 * Determina a próxima aba na sequência
 */
function getNextTab(currentTab: EvolutionTab): EvolutionTab | null {
  const tabs: EvolutionTab[] = ['evolucao', 'avaliacao', 'tratamento', 'historico', 'assistente'];
  const currentIdx = tabs.indexOf(currentTab);

  if (currentIdx === -1 || currentIdx === tabs.length - 1) {
    return null; // Última aba, não há próxima
  }

  return tabs[currentIdx + 1];
}

/**
 * Mapeamento de abas para os dados que elas precisam
 */
const TAB_DATA_MAP: Record<EvolutionTab, string[]> = {
  evolucao: ['goals', 'pathologies', 'measurements', 'required-measurements', 'soap-records'],
  avaliacao: ['measurements', 'required-measurements'],
  tratamento: ['goals', 'pathologies'],
  historico: ['soap-records', 'surgeries', 'medical-returns', 'measurements'],
  assistente: ['goals', 'pathologies'],
};

/**
 * Hook para prefetch inteligente de dados da próxima aba
 *
 * Estratégia:
 * 1. Aguarda 2 segundos após mudança de aba (usuário pode estar navegando rápido)
 * 2. Verifica se conexão é boa (evita prefetch em 2G/slow-2G)
 * 3. Determina próxima aba na sequência
 * 4. Faz prefetch dos dados necessários para essa aba
 * 5. Usa startTransition para não bloquear UI
 * 6. Deduplica prefetch (não faz prefetch da mesma aba duas vezes)
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function usePrefetchStrategy(options: PrefetchStrategyOptions) {
  const {
    patientId,
    activeTab,
    activePathologies = [],
    enabled = true,
    delay = 2000, // 2 seconds default delay
  } = options;

  const queryClient = useQueryClient();

  // Tracking de prefetch para deduplicação
  const prefetchedTabsRef = useRef<Set<EvolutionTab>>(new Set());
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTabRef = useRef<EvolutionTab>(activeTab);

  /**
   * Executa o prefetch dos dados de uma aba específica
   * Requirements: 11.1, 11.5
   */
  const executePrefetch = useCallback((targetTab: EvolutionTab) => {
    if (!patientId) return;

    // Requirement 11.5: Prefetch deduplication
    if (prefetchedTabsRef.current.has(targetTab)) {
      if (import.meta.env.DEV) {
        console.log(`[Prefetch] Skipping ${targetTab} - already prefetched`);
      }
      return;
    }

    // Requirement 11.4: Network-aware prefetching
    if (isSlowConnection()) {
      if (import.meta.env.DEV) {
        console.log('[Prefetch] Skipping - slow connection detected');
      }
      return;
    }

    // Marcar como prefetched
    prefetchedTabsRef.current.add(targetTab);

    const dataToPrefetch = TAB_DATA_MAP[targetTab] || [];

    if (import.meta.env.DEV) {
      console.log(`[Prefetch] Starting prefetch for tab: ${targetTab}`, dataToPrefetch);
    }

    // Requirement 11.1: Non-blocking prefetch with low priority
    startTransition(() => {
      dataToPrefetch.forEach(dataType => {
        try {
          switch (dataType) {
            case 'goals':
              queryClient.prefetchQuery({
                queryKey: evolutionKeys.goals(patientId),
                staleTime: EVOLUTION_CACHE_CONFIG.GOALS.staleTime,
              });
              break;

            case 'pathologies':
              queryClient.prefetchQuery({
                queryKey: evolutionKeys.pathologies(patientId),
                staleTime: EVOLUTION_CACHE_CONFIG.PATHOLOGIES.staleTime,
              });
              break;

            case 'measurements':
              queryClient.prefetchQuery({
                queryKey: evolutionKeys.measurements(patientId, 50),
                staleTime: EVOLUTION_CACHE_CONFIG.MEASUREMENTS.staleTime,
              });
              break;

            case 'required-measurements':
              if (activePathologies.length > 0) {
                queryClient.prefetchQuery({
                  queryKey: evolutionKeys.requiredMeasurements(
                    activePathologies.map(p => p.pathology_name)
                  ),
                  staleTime: EVOLUTION_CACHE_CONFIG.REQUIRED_MEASUREMENTS.staleTime,
                });
              }
              break;

            case 'surgeries':
              queryClient.prefetchQuery({
                queryKey: evolutionKeys.surgeries(patientId),
                staleTime: EVOLUTION_CACHE_CONFIG.SURGERIES.staleTime,
              });
              break;

            case 'medical-returns':
              queryClient.prefetchQuery({
                queryKey: evolutionKeys.medicalReturns(patientId),
                staleTime: EVOLUTION_CACHE_CONFIG.MEDICAL_RETURNS.staleTime,
              });
              break;

            case 'soap-records':
              queryClient.prefetchQuery({
                queryKey: evolutionKeys.soapRecords(patientId, 50),
                staleTime: EVOLUTION_CACHE_CONFIG.SOAP_RECORDS.staleTime,
              });
              break;
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error(`[Prefetch] Error prefetching ${dataType}:`, error);
          }
        }
      });
    });
  }, [patientId, activePathologies, queryClient]);

  /**
   * Effect principal: gerencia o prefetch com delay
   * Requirements: 11.1 (2-second delay), 11.3 (prefetch on tab change)
   */
  useEffect(() => {
    if (!enabled || !patientId) return;

    // Limpar timeout anterior se aba mudou
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }

    // Se a aba mudou, resetar o tracking de prefetch
    if (lastActiveTabRef.current !== activeTab) {
      lastActiveTabRef.current = activeTab;
      // Não resetamos prefetchedTabsRef para manter deduplicação global
    }

    // Determinar próxima aba
    const nextTab = getNextTab(activeTab);
    if (!nextTab) {
      if (import.meta.env.DEV) {
        console.log('[Prefetch] No next tab to prefetch');
      }
      return;
    }

    // Requirement 11.1: 2-second delay before prefetching
    prefetchTimeoutRef.current = setTimeout(() => {
      executePrefetch(nextTab);
    }, delay);

    // Cleanup
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, [enabled, patientId, activeTab, delay, executePrefetch]);

  /**
   * Método para resetar o tracking de prefetch
   * Útil quando o usuário navega para outro paciente
   */
  const resetPrefetchTracking = useCallback(() => {
    prefetchedTabsRef.current.clear();
    if (import.meta.env.DEV) {
      console.log('[Prefetch] Tracking reset');
    }
  }, []);

  /**
   * Método para prefetch manual de uma aba específica
   * Útil para casos especiais onde queremos forçar prefetch
   */
  const prefetchTab = useCallback((targetTab: EvolutionTab) => {
    executePrefetch(targetTab);
  }, [executePrefetch]);

  return {
    resetPrefetchTracking,
    prefetchTab,
    isPrefetched: (tab: EvolutionTab) => prefetchedTabsRef.current.has(tab),
  };
}
