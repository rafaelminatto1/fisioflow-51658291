/**
 * useEvolutionDataOptimized - Hook otimizado para carregar dados de evolução
 *
 * OTIMIZAÇÕES IMPLEMENTADAS:
 * 1. Cache estratégico por tipo de dado (staleTime/gcTime otimizados)
 * 2. Carregamento condicional baseado na aba ativa
 * 3. Prefetch inteligente em background
 * 4. Query keys estruturadas para cache granular
 * 5. Deduplicação de requests simultâneas
 *
 * @version 2.0.0 - Performance Optimization
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { startTransition } from 'react';

// Import hooks existentes
import {
  usePatientSurgeries,
  usePatientMedicalReturns,
  usePatientGoals,
  usePatientPathologies,
  useEvolutionMeasurements,
  useRequiredMeasurements,
} from '../usePatientEvolution';
import { useSoapRecords } from '../useSoapRecords';

// Tipos
export type EvolutionTab = 'evolucao' | 'avaliacao' | 'tratamento' | 'historico' | 'assistente';

export interface EvolutionDataOptions {
  patientId: string;
  appointmentId?: string;
  activeTab: EvolutionTab;
  // Opções de carregamento
  loadHistoricalData?: boolean;
  loadMeasurements?: boolean;
  loadRequiredMeasurements?: boolean;
  prefetchNextTab?: boolean;
}

// Cache configuration constants - OTIMIZADO BASEADO EM PATRÕES DE USO
export const EVOLUTION_CACHE_CONFIG = {
  // Dados críticos - carregados imediatamente
  PATIENT: {
    staleTime: 1000 * 60 * 5,      // 5 minutos
    gcTime: 1000 * 60 * 30,         // 30 minutos
  },
  APPOINTMENT: {
    staleTime: 1000 * 60 * 2,      // 2 minutos
    gcTime: 1000 * 60 * 10,         // 10 minutos
  },

  // Dados de evolução - mudam durante a sessão
  SOAP_RECORDS: {
    staleTime: 1000 * 60 * 10,     // 10 minutos
    gcTime: 1000 * 60 * 20,        // 20 minutos
  },
  DRAFTS: {
    staleTime: 1000 * 60 * 1,      // 1 minuto - drafts mudam frequentemente
    gcTime: 1000 * 60 * 5,         // 5 minutos
  },

  // Dados secundários - mudam pouco
  GOALS: {
    staleTime: 1000 * 60 * 10,     // 10 minutos
    gcTime: 1000 * 60 * 30,        // 30 minutos
  },
  PATHOLOGIES: {
    staleTime: 1000 * 60 * 20,     // 20 minutos - mudam raramente
    gcTime: 1000 * 60 * 45,        // 45 minutos
  },

  // Medições - podem ser adicionadas durante sessão
  MEASUREMENTS: {
    staleTime: 1000 * 60 * 5,      // 5 minutos
    gcTime: 1000 * 60 * 15,        // 15 minutos
  },
  REQUIRED_MEASUREMENTS: {
    staleTime: 1000 * 60 * 30,     // 30 minutos - mudam muito raramente
    gcTime: 1000 * 60 * 60,        // 1 hora
  },

  // Dados históricos - mudam muito pouco
  SURGERIES: {
    staleTime: 1000 * 60 * 15,     // 15 minutos
    gcTime: 1000 * 60 * 30,        // 30 minutos
  },
  MEDICAL_RETURNS: {
    staleTime: 1000 * 60 * 10,     // 10 minutos
    gcTime: 1000 * 60 * 20,        // 20 minutos
  },
} as const;

// Query keys factory para cache consistente
export const evolutionKeys = {
  all: ['evolution'] as const,
  patients: () => [...evolutionKeys.all, 'patient'] as const,
  patient: (id: string) => [...evolutionKeys.patients(), id] as const,

  goals: (id: string) => [...evolutionKeys.patient(id), 'goals'] as const,
  pathologies: (id: string) => [...evolutionKeys.patient(id), 'pathologies'] as const,
  measurements: (id: string, limit?: number) =>
    [...evolutionKeys.patient(id), 'measurements', limit ?? 'all'] as const,
  requiredMeasurements: (pathologies: string[]) =>
    [...evolutionKeys.all, 'required-measurements', pathologies.sort()] as const,

  surgeries: (id: string) => [...evolutionKeys.patient(id), 'surgeries'] as const,
  medicalReturns: (id: string) => [...evolutionKeys.patient(id), 'medical-returns'] as const,

  soapRecords: (id: string, limit?: number) =>
    [...evolutionKeys.patient(id), 'soap', limit ?? 'all'] as const,
  drafts: (id: string) => [...evolutionKeys.patient(id), 'drafts'] as const,
} as const;

/**
 * Hook principal para dados de evolução com cache otimizado
 *
 * Estratégia de carregamento por aba:
 * - evolucao: SOAP + goals + pathologies + medições obrigatórias
 * - avaliacao: medições + medições obrigatórias + mapa de dor
 * - tratamento: goals + pathologies + exercícios
 * - historico: todas as evoluções + cirurgias + retornos
 * - assistente: mínimo de dados (IA processa no servidor)
 */
export function useEvolutionDataOptimized(options: EvolutionDataOptions) {
  const {
    patientId,
    appointmentId,
    activeTab,
    loadHistoricalData = false,
    loadMeasurements = true,
    loadRequiredMeasurements = true,
    prefetchNextTab = true,
  } = options;

  const queryClient = useQueryClient();

  // Ref para tracking de prefetch e evitar duplicações
  const prefetchedTabsRef = useRef<Set<EvolutionTab>>(new Set());
  const lastPrefetchRef = useRef<number>(0);

  // ==================== DADOS CRÍTICOS ====================
  // Sempre carregados, independente da aba

  // Goals - usados em múltiplas abas
  const goalsQuery = usePatientGoals(patientId);

  // Pathologies - usadas em múltiplas abas
  const pathologiesQuery = usePatientPathologies(patientId);

  // SOAP records (últimas 10) - sempre necessário
  const soapRecordsQuery = useSoapRecords(patientId, 10);

  // ==================== DADOS CONDICIONAIS ====================
  // Carregados baseado na aba ativa

  // Medições - apenas na aba avaliação ou evolução
  const shouldLoadMeasurements =
    loadMeasurements &&
    (activeTab === 'avaliacao' || activeTab === 'evolucao' || activeTab === 'historico');

  // OTIMIZAÇÃO: Limite dinâmico baseado na aba
  const measurementsLimit = activeTab === 'avaliacao' ? 50 : 10;
  const measurementsQuery = useEvolutionMeasurements(
    patientId,
    { limit: shouldLoadMeasurements ? measurementsLimit : 0, enabled: shouldLoadMeasurements }
  );

  // Medições obrigatórias - baseado em patologias ativas
  const activePathologies = useMemo(
    () => pathologiesQuery.data?.filter(p => p.status === 'em_tratamento') || [],
    [pathologiesQuery.data]
  );

  const shouldLoadRequired = loadRequiredMeasurements &&
    (activeTab === 'avaliacao' || activeTab === 'evolucao');

  const requiredMeasurementsQuery = useRequiredMeasurements(
    shouldLoadRequired ? activePathologies.map(p => p.pathology_name) : []
  );

  // Dados históricos - apenas na aba histórico
  const surgeriesQuery = usePatientSurgeries(
    loadHistoricalData || activeTab === 'historico' ? patientId : ''
  );

  const medicalReturnsQuery = usePatientMedicalReturns(
    loadHistoricalData || activeTab === 'historico' ? patientId : ''
  );

  // ==================== PREFETCH INTELIGENTE ====================
  // Carrega dados da próxima aba em background

  useEffect(() => {
    if (!patientId || !prefetchNextTab) return;

    // Debounce prefetch (máximo 1 prefetch por segundo)
    const now = Date.now();
    if (now - lastPrefetchRef.current < 1000) return;
    lastPrefetchRef.current = now;

    // Mapeamento de abas para seus dados
    const tabDataMap: Record<EvolutionTab, string[]> = {
      evolucao: ['goals', 'pathologies', 'measurements', 'required-measurements'],
      avaliacao: ['measurements', 'required-measurements'],
      tratamento: ['goals', 'pathologies'],
      historico: ['soap-records', 'surgeries', 'medical-returns', 'measurements'],
      assistente: ['goals', 'pathologies'],
    };

    // Determinar próxima aba
    const tabs: EvolutionTab[] = ['evolucao', 'avaliacao', 'tratamento', 'historico', 'assistente'];
    const currentIdx = tabs.indexOf(activeTab);
    const nextTab = tabs[(currentIdx + 1) % tabs.length];

    // Evitar prefetch duplicado
    if (prefetchedTabsRef.current.has(nextTab)) return;
    prefetchedTabsRef.current.add(nextTab);

    // Prefetch em background usando startTransition
    startTransition(() => {
      const dataToPrefetch = tabDataMap[nextTab] || [];

      dataToPrefetch.forEach(dataType => {
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
                queryKey: evolutionKeys.requiredMeasurements(activePathologies.map(p => p.pathology_name)),
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
      });
    });
  }, [patientId, activeTab, activePathologies, prefetchNextTab, queryClient]);

  // ================= métodos de invalidação ====================

  const invalidateData = useCallback((dataType?: 'goals' | 'pathologies' | 'measurements' | 'all') => {
    if (!patientId) return;

    if (!dataType || dataType === 'all') {
      queryClient.invalidateQueries({ queryKey: evolutionKeys.patient(patientId) });
    } else {
      switch (dataType) {
        case 'goals':
          queryClient.invalidateQueries({ queryKey: evolutionKeys.goals(patientId) });
          break;
        case 'pathologies':
          queryClient.invalidateQueries({ queryKey: evolutionKeys.pathologies(patientId) });
          break;
        case 'measurements':
          queryClient.invalidateQueries({ queryKey: evolutionKeys.measurements(patientId) });
          break;
      }
    }
  }, [patientId, queryClient]);

  // ==================== RETORNO CONSOLIDADO ====================

  return {
    // Dados principais
    goals: goalsQuery.data || [],
    pathologies: pathologiesQuery.data || [],
    activePathologies,
    soapRecords: soapRecordsQuery.data || [],

    // Dados de medição
    measurements: measurementsQuery.data || [],
    requiredMeasurements: requiredMeasurementsQuery.data || [],

    // Dados históricos
    surgeries: surgeriesQuery.data || [],
    medicalReturns: medicalReturnsQuery.data || [],

    // Estados de loading - granulares para UI responsiva
    isLoading: goalsQuery.isLoading || pathologiesQuery.isLoading || soapRecordsQuery.isLoading,
    isLoadingMeasurements: measurementsQuery.isLoading,
    isLoadingRequired: requiredMeasurementsQuery.isLoading,
    isLoadingHistorical: surgeriesQuery.isLoading || medicalReturnsQuery.isLoading,

    // Erros
    error: goalsQuery.error || pathologiesQuery.error || soapRecordsQuery.error,

    // Métodos
    invalidateData,
    refetch: () => queryClient.invalidateQueries({ queryKey: evolutionKeys.patient(patientId) }),

    // Query keys para uso externo
    queryKeys: evolutionKeys,
  };
}

/**
 * Hook simplificado para usar em componentes filhos
 * Fornece acesso aos dados sem precisar passar props
 */
export function useEvolutionData() {
  const queryClient = useQueryClient();

  return {
    // Acessar dados do cache
    getData: (patientId: string) => ({
      goals: queryClient.getQueryData(evolutionKeys.goals(patientId)),
      pathologies: queryClient.getQueryData(evolutionKeys.pathologies(patientId)),
      measurements: queryClient.getQueryData(evolutionKeys.measurements(patientId)),
    }),

    // Prefetch manual
    prefetch: (patientId: string, dataType: 'goals' | 'pathologies' | 'measurements') => {
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
            queryKey: evolutionKeys.measurements(patientId),
            staleTime: EVOLUTION_CACHE_CONFIG.MEASUREMENTS.staleTime,
          });
          break;
      }
    },
  };
}

/**
 * Hook para gerenciar prefetch de navegação
 * Deve ser usado no componente de lista/navegação para prefetch
 * dados dos pacientes antes de abrir a página de evolução
 */
export function useEvolutionPrefetch() {
  const queryClient = useQueryClient();
  const prefetchQueueRef = useRef<Set<string>>(new Set());

  const prefetchPatientData = useCallback((patientId: string) => {
    if (prefetchQueueRef.current.has(patientId)) return;
    prefetchQueueRef.current.add(patientId);

    // Prefetch em paralelo para máxima velocidade
    startTransition(() => {
      queryClient.prefetchQuery({
        queryKey: evolutionKeys.goals(patientId),
        staleTime: EVOLUTION_CACHE_CONFIG.GOALS.staleTime,
      });
      queryClient.prefetchQuery({
        queryKey: evolutionKeys.pathologies(patientId),
        staleTime: EVOLUTION_CACHE_CONFIG.PATHOLOGIES.staleTime,
      });
      queryClient.prefetchQuery({
        queryKey: evolutionKeys.soapRecords(patientId, 10),
        staleTime: EVOLUTION_CACHE_CONFIG.SOAP_RECORDS.staleTime,
      });
    });
  }, [queryClient]);

  const prefetchMultiplePatients = useCallback((patientIds: string[]) => {
    // Prefetch em lote com prioridade
    patientIds.forEach((id, idx) => {
      // Delay escalonado para não sobrecarregar
      setTimeout(() => prefetchPatientData(id), idx * 100);
    });
  }, [prefetchPatientData]);

  return { prefetchPatientData, prefetchMultiplePatients };
}
