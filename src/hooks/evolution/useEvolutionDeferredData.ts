/**
 * useEvolutionDeferredData - Hook otimizado para carregar dados secundários da evolução
 *
 * OTIMIZAÇÃO: Carrega dados pesados apenas quando necessário, reduzindo o tempo inicial de carregamento
 */

import { useMemo } from 'react';

// Import hooks existentes
import {
  usePatientSurgeries,
  usePatientMedicalReturns,
  usePatientGoals,
  usePatientPathologies,
  useEvolutionMeasurements,
  useRequiredMeasurements,
} from '../usePatientEvolution';

export interface DeferredDataOptions {
  patientId: string;
  activeTab: string;
  // Opções para controle fino do carregamento
  loadMeasurements?: boolean;
  loadRequiredMeasurements?: boolean;
}

/**
 * Hook que carrega dados secundários de forma inteligente baseado na aba ativa
 *
 * Estratégia de carregamento:
 * - evolucao: carrega dados mínimos (pathologies, goals)
 * - avaliacao: carrega medições e medições obrigatórias
 * - tratamento: carrega dados de tratamento
 * - historico: carrega todos os dados históricos
 * - assistente: mínimo de dados (IA processa no servidor)
 */
export function useEvolutionDeferredData({
  patientId,
  activeTab,
  loadMeasurements = true,
  loadRequiredMeasurements = true,
}: DeferredDataOptions) {

  // Dados sempre necessários (usados em múltiplas abas)
  const goalsQuery = usePatientGoals(patientId);
  const pathologiesQuery = usePatientPathologies(patientId);

  // Dados carregados condicionalmente
  const shouldLoadMeasurements =
    loadMeasurements && (activeTab === 'avaliacao' || activeTab === 'historico');

  const measurementsQuery = useEvolutionMeasurements(
    patientId,
    { limit: shouldLoadMeasurements ? 50 : 10, enabled: shouldLoadMeasurements }
  );

  // Cirurgias e retornos apenas na aba histórico
  const surgeriesQuery = usePatientSurgeries(
    activeTab === 'historico' ? patientId : ''
  );

  const medicalReturnsQuery = usePatientMedicalReturns(
    activeTab === 'historico' ? patientId : ''
  );

  // Medições obrigatórias apenas na aba avaliação ou evolução
  const activePathologies = useMemo(
    () => pathologiesQuery.data?.filter(p => p.status === 'em_tratamento') || [],
    [pathologiesQuery.data]
  );

  const shouldLoadRequired = loadRequiredMeasurements &&
    (activeTab === 'avaliacao' || activeTab === 'evolucao');

  const requiredMeasurementsQuery = useRequiredMeasurements(
    shouldLoadRequired ? activePathologies.map(p => p.pathology_name) : []
  );

  return {
    // Dados principais
    goals: goalsQuery.data || [],
    pathologies: pathologiesQuery.data || [],
    activePathologies,

    // Dados condicionais
    measurements: measurementsQuery.data || [],
    requiredMeasurements: requiredMeasurementsQuery.data || [],

    // Dados históricos
    surgeries: surgeriesQuery.data || [],
    medicalReturns: medicalReturnsQuery.data || [],

    // Estados de loading
    isLoading: goalsQuery.isLoading || pathologiesQuery.isLoading,
    isLoadingMeasurements: measurementsQuery.isLoading,
    isLoadingRequired: requiredMeasurementsQuery.isLoading,
    isLoadingHistorical: surgeriesQuery.isLoading || medicalReturnsQuery.isLoading,

    // Erros
    error: goalsQuery.error || pathologiesQuery.error,
  };
}
