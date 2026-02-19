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

import { useQueryClient } from '@tanstack/react-query';
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
export type LoadStrategy = 'critical' | 'tab-based' | 'full';

export interface EvolutionDataOptions {
  patientId: string;
  appointmentId?: string;
  activeTab: EvolutionTab;
  // Opções de carregamento
  loadStrategy?: LoadStrategy;
  loadHistoricalData?: boolean;
  loadMeasurements?: boolean;
  loadRequiredMeasurements?: boolean;
  prefetchNextTab?: boolean;
}

// Cache configuration constants - OTIMIZADO BASEADO EM PADRÕES DE USO
// Requirement 7: Optimize Cache Configuration
export const EVOLUTION_CACHE_CONFIG = {
  // Session-scoped data (changes during session)
  SOAP_DRAFT: {
    staleTime: 30 * 1000,           // 30 seconds - drafts change frequently
    gcTime: 5 * 60 * 1000,          // 5 minutes
    refetchOnWindowFocus: true,
  },
  MEASUREMENTS_TODAY: {
    staleTime: 2 * 60 * 1000,       // 2 minutes - measurements added during session
    gcTime: 10 * 60 * 1000,         // 10 minutes
    refetchOnWindowFocus: true,
  },

  // Stable data (rarely changes during session)
  PATIENT: {
    staleTime: 10 * 60 * 1000,      // 10 minutes
    gcTime: 30 * 60 * 1000,         // 30 minutes
    refetchOnWindowFocus: false,
  },
  APPOINTMENT: {
    staleTime: 10 * 60 * 1000,      // 10 minutes
    gcTime: 30 * 60 * 1000,         // 30 minutes
    refetchOnWindowFocus: false,
  },
  GOALS: {
    staleTime: 5 * 60 * 1000,       // 5 minutes
    gcTime: 15 * 60 * 1000,         // 15 minutes
    refetchOnWindowFocus: false,
  },
  PATHOLOGIES: {
    staleTime: 10 * 60 * 1000,      // 10 minutes
    gcTime: 30 * 60 * 1000,         // 30 minutes
    refetchOnWindowFocus: false,
  },
  MEASUREMENTS: {
    staleTime: 5 * 60 * 1000,       // 5 minutes
    gcTime: 15 * 60 * 1000,         // 15 minutes
    refetchOnWindowFocus: false,
  },
  REQUIRED_MEASUREMENTS: {
    staleTime: 30 * 60 * 1000,      // 30 minutes - rarely change
    gcTime: 60 * 60 * 1000,         // 1 hour
    refetchOnWindowFocus: false,
  },

  // Historical data (never changes)
  SOAP_RECORDS: {
    staleTime: 30 * 60 * 1000,      // 30 minutes
    gcTime: 60 * 60 * 1000,         // 1 hour
    refetchOnWindowFocus: false,
  },
  SURGERIES: {
    staleTime: 30 * 60 * 1000,      // 30 minutes
    gcTime: 60 * 60 * 1000,         // 1 hour
    refetchOnWindowFocus: false,
  },
  MEDICAL_RETURNS: {
    staleTime: 30 * 60 * 1000,      // 30 minutes
    gcTime: 60 * 60 * 1000,         // 1 hour
    refetchOnWindowFocus: false,
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
    loadStrategy = 'tab-based', // Default to tab-based loading
    loadHistoricalData = false,
    loadMeasurements = true,
    loadRequiredMeasurements = true,
    prefetchNextTab = true,
  } = options;

  const queryClient = useQueryClient();

  // Ref para tracking de prefetch e evitar duplicações
  const prefetchedTabsRef = useRef<Set<EvolutionTab>>(new Set());
  const lastPrefetchRef = useRef<number>(0);

  // ==================== LOAD STRATEGY LOGIC ====================
  // Determine what data to load based on strategy
  
  const shouldLoadData = useCallback((dataType: 'goals' | 'pathologies' | 'soap' | 'measurements' | 'required' | 'surgeries' | 'medical-returns') => {
    // Full strategy: load everything
    if (loadStrategy === 'full') return true;
    
    // Critical strategy: only essential data
    if (loadStrategy === 'critical') {
      return dataType === 'goals' || dataType === 'pathologies' || dataType === 'soap';
    }
    
    // Tab-based strategy: load based on active tab
    const tabDataMap: Record<EvolutionTab, string[]> = {
      evolucao: ['goals', 'pathologies', 'soap', 'measurements', 'required'],
      avaliacao: ['measurements', 'required'],
      tratamento: ['goals', 'pathologies'],
      historico: ['soap', 'surgeries', 'medical-returns', 'measurements'],
      assistente: ['goals', 'pathologies'],
    };
    
    return tabDataMap[activeTab]?.includes(dataType) || false;
  }, [loadStrategy, activeTab]);

  // ==================== DADOS CRÍTICOS ====================
  // Sempre carregados, independente da aba (ou baseado em strategy)

  // Goals - usados em múltiplas abas
  const goalsQuery = usePatientGoals(patientId, { enabled: shouldLoadData('goals') });

  // Pathologies - usadas em múltiplas abas
  const pathologiesQuery = usePatientPathologies(patientId, { enabled: shouldLoadData('pathologies') });

  // SOAP records (últimas 10) - sempre necessário
  const soapRecordsQuery = useSoapRecords(patientId, 10, { enabled: shouldLoadData('soap') });

  // ==================== DADOS CONDICIONAIS ====================
  // Carregados baseado na aba ativa e strategy

  // Medições - apenas na aba avaliação ou evolução
  const shouldLoadMeasurements = shouldLoadData('measurements') && loadMeasurements;

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

  const shouldLoadRequired = shouldLoadData('required') && loadRequiredMeasurements;

  const requiredMeasurementsQuery = useRequiredMeasurements(
    shouldLoadRequired ? activePathologies.map(p => p.pathology_name) : []
  );

  // Dados históricos - apenas na aba histórico
  const surgeriesQuery = usePatientSurgeries(
    (shouldLoadData('surgeries') || loadHistoricalData) ? patientId : ''
  );

  const medicalReturnsQuery = usePatientMedicalReturns(
    (shouldLoadData('medical-returns') || loadHistoricalData) ? patientId : ''
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
  // Requirement 7.5: Selective cache invalidation

  const invalidateData = useCallback((dataType?: 'goals' | 'pathologies' | 'measurements' | 'soap' | 'surgeries' | 'medical-returns' | 'all') => {
    if (!patientId) return;

    if (!dataType || dataType === 'all') {
      // Invalidate all patient data
      queryClient.invalidateQueries({ queryKey: evolutionKeys.patient(patientId) });
    } else {
      // Selective invalidation - only invalidate specific data type
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
        case 'soap':
          queryClient.invalidateQueries({ queryKey: evolutionKeys.soapRecords(patientId) });
          queryClient.invalidateQueries({ queryKey: evolutionKeys.drafts(patientId) });
          break;
        case 'surgeries':
          queryClient.invalidateQueries({ queryKey: evolutionKeys.surgeries(patientId) });
          break;
        case 'medical-returns':
          queryClient.invalidateQueries({ queryKey: evolutionKeys.medicalReturns(patientId) });
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
    isLoadingCritical: goalsQuery.isLoading || pathologiesQuery.isLoading || soapRecordsQuery.isLoading,
    isLoadingTabData: measurementsQuery.isLoading || requiredMeasurementsQuery.isLoading || surgeriesQuery.isLoading || medicalReturnsQuery.isLoading,
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
