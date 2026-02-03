import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import React from 'react';

/**
 * Hook para prefetching inteligente de dados
 * Carrega dados antecipadamente baseado em padrões de uso
 *
 * @example
 * // Prefetch pacientes quando o mouse passa sobre o link
 * usePrefetchOnHover(['patients'], () => fetchPatients());
 *
 * // Prefetch dados de um paciente quando visualizando a lista
 * usePrefetchRelated(['patient', patientId], () => fetchPatientDetails(patientId));
 */

/**
 * Hook para prefetch de dados ao passar o mouse (hover)
 * Útil para links e botões que levam a outras páginas
 */
export function usePrefetchOnHover<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    if (!enabled) return;
    // Prefetch em background com staleTime longo
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 1000 * 60 * 5, // 5 minutos
    });
  };

  return { prefetch };
}

/**
 * Hook para prefetch de dados relacionados
 * Carrega dados que provavelmente serão necessários em seguida
 */
export function usePrefetchRelated<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  trigger: boolean,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!trigger || !enabled) return;

    // Pequeno delay para não priorizar sobre dados críticos
    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 2, // 2 minutos para dados relacionados
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [trigger, enabled, queryClient, queryKey, queryFn]);
}

/**
 * Hook para prefetch de múltiplas queries
 * Útil para carregar todos os dados necessários para uma página
 */
export function usePrefetchMultiple<T>(
  queries: Array<{
    queryKey: string[];
    queryFn: () => Promise<T>;
  }>,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      queries.forEach(({ queryKey, queryFn }) => {
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: 1000 * 60 * 3, // 3 minutos
        });
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [queries, enabled, queryClient]);
}

/**
 * Hook para prefetch inteligente baseado em proximidade
 * Carrega dados quando o usuário está "próximo" de precisar deles
 */
export function usePrefetchOnProximity<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  proximity: number = 0.7, // 70% de scroll ou similar
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || proximity < 0.7) return;

    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 1000 * 60 * 5,
    });
  }, [proximity, enabled, queryClient, queryKey, queryFn]);
}

/**
 * Hook para prefetch de dados de paciente
 * Específico para o fluxo de pacientes do FisioFlow
 */
export function usePrefetchPatientData(
  patientId: string | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId || !enabled) return;

    // Prefetch dados relacionados ao paciente em paralelo
    const prefetchData = async () => {
      // Prefetch evoluções do paciente
      queryClient.prefetchQuery({
        queryKey: ['patient-evolutions', patientId],
        queryFn: async () => {
          const { data } = await fetch(`/api/patients/${patientId}/evolutions`).then(r => r.json());
          return data;
        },
        staleTime: 1000 * 60 * 2,
      });

      // Prefetch mapas de dor
      queryClient.prefetchQuery({
        queryKey: ['pain-maps', patientId],
        queryFn: async () => {
          const { data } = await fetch(`/api/patients/${patientId}/pain-maps`).then(r => r.json());
          return data;
        },
        staleTime: 1000 * 60 * 5,
      });
    };

    // Delay pequeno para não interferir com navegação
    const timer = setTimeout(prefetchData, 300);
    return () => clearTimeout(timer);
  }, [patientId, enabled, queryClient]);
}

/**
 * Hook para prefetch de agendas próximas
 * Carrega agendamentos quando o usuário está na dashboard
 */
export function usePrefetchUpcomingAppointments(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['appointments', 'upcoming'],
        queryFn: async () => {
          const { data } = await fetch('/api/appointments/upcoming').then(r => r.json());
          return data;
        },
        staleTime: 1000 * 60 * 1, // 1 minuto - agendamentos mudam frequentemente
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, queryClient]);
}

/**
 * Hook para prefetch de templates de evolução
 * Carrega templates quando o usuário está em páginas de evolução
 */
export function usePrefetchEvolutionTemplates(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['evolution-templates'],
        queryFn: async () => {
          const { data } = await fetch('/api/evolution-templates').then(r => r.json());
          return data;
        },
        staleTime: 1000 * 60 * 15, // 15 minutos - templates mudam pouco
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [enabled, queryClient]);
}

/**
 * Componente wrapper para prefetch em hover
 * Use envolvendo links ou botões
 */
export function PrefetchOnHover({
  children,
  queryKey,
  queryFn,
  enabled = true,
}: {
  children: React.ReactElement;
  queryKey: string[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
}) {
  const { prefetch } = usePrefetchOnHover(queryKey, queryFn, enabled);

  return React.cloneElement(children, {
    ...children.props,
    onMouseEnter: (e: React.MouseEvent) => {
      prefetch();
      children.props.onMouseEnter?.(e);
    },
  });
}
