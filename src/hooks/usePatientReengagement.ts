import { useQuery } from '@tanstack/react-query';
import { patientsApi, type PatientRow } from '@/lib/api/workers-client';
import { differenceInDays, parseISO } from 'date-fns';
import { patientsCircuitBreaker } from '@/lib/api/circuitBreaker';

/**
 * Hook para identificar pacientes inativos que precisam de reengajamento
 * Utiliza circuit breaker para proteger contra falhas repetitivas do endpoint
 */
export function usePatientReengagement() {
  const { data: inactivePatients = [], isLoading, error } = useQuery({
    queryKey: ['inactive-patients-reengagement'],
    queryFn: async () => {
      return patientsCircuitBreaker.execute(async () => {
        const res = await patientsApi.list({ status: 'ativo', limit: 1000 });
        const patients = (res?.data ?? []) as PatientRow[];
        const today = new Date();

        return patients.filter(p => {
          if (!p.last_visit_date) return false;
          const lastVisit = parseISO(p.last_visit_date);
          const daysSinceLastVisit = differenceInDays(today, lastVisit);
          
          // Critério: mais de 60 dias sem visita
          return daysSinceLastVisit >= 60;
        }).map(p => ({
          id: p.id,
          name: p.name || p.full_name,
          phone: p.phone,
          daysInactive: differenceInDays(today, parseISO(p.last_visit_date!)),
          lastVisit: p.last_visit_date
        })).sort((a, b) => b.daysInactive - a.daysInactive);
      });
    },
    // Configurar retry para respeitar circuit breaker
    retry: (failureCount, error) => {
      // Se o erro é do circuit breaker, não tentar novamente
      if (error && typeof error === 'object' && 'isCircuitBreakerError' in error) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 1000 * 60 * 15, // 15 minutos
    refetchOnWindowFocus: false, // Não refetchar automaticamente para evitar sobrecarga
  });

  return {
    inactivePatients,
    isLoading,
    totalToReengage: inactivePatients.length
  };
}
