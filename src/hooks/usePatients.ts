import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { PatientSchema, type Patient } from '@/schemas/patient';
import { patientsCacheService } from '@/lib/offline/PatientsCacheService';
import { PATIENT_SELECT, validatePatientSelectQuery } from '@/lib/constants/patient-queries';

// Helper for timeout
function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Helper for retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export const useActivePatients = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Setup realtime subscription
  // FIX: Track subscription state to avoid WebSocket errors
  useEffect(() => {
    if (!organizationId) return;

    let isSubscribed = false;
    const channel = supabase.channel('patients-changes');

    (channel as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          logger.info('Realtime: Pacientes atualizados', {}, 'usePatients');
          queryClient.invalidateQueries({ queryKey: ['patients', organizationId] });
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
        }
      });

    return () => {
      if (isSubscribed) {
        supabase.removeChannel(channel).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [organizationId, queryClient]);

  const result = useQuery({
    queryKey: ['patients', organizationId],
    queryFn: async () => {
      // Offline check - try cache first
      if (!navigator.onLine) {
        logger.warn('Offline: Carregando pacientes do cache', {}, 'usePatients');
        const cacheResult = await patientsCacheService.getFromCache(organizationId);
        if (cacheResult.data.length > 0) {
          logger.info('Pacientes carregados do cache offline', { count: cacheResult.data.length }, 'usePatients');
          return cacheResult.data;
        }
        logger.warn('Cache vazio ou expirado, retornando lista vazia', {}, 'usePatients');
        return [];
      }

      try {
        // Optimized query: use centralized constant for column selection
        // Validates that we don't accidentally select non-existent columns like 'name'
        validatePatientSelectQuery(PATIENT_SELECT.standard);

        let query = supabase
          .from('patients')
          .select(PATIENT_SELECT.standard)
          .in('status', ['active']);

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data: supabasePatients, error } = await retryWithBackoff(() =>
          withTimeout(
            query.order('created_at', { ascending: false }),
            10000
          )
        );

        if (error) throw error;

        // Validation & Transformation
        const validPatients: Patient[] = [];

        if (supabasePatients && supabasePatients.length > 0) {
          supabasePatients.forEach(p => {
            // Map to schema expected format
            const mapped = {
              id: p.id,
              name: p.full_name || (p.phone ? `Paciente (${p.phone})` : 'Paciente sem nome'),
              email: p.email,
              phone: p.phone,
              cpf: p.cpf,
              birthDate: p.birth_date,
              gender: 'outro' as const, // Default fallback
              mainCondition: p.observations,
              status: (p.status === 'active' ? 'Em Tratamento' : 'Inicial'),
              progress: 0,
              incomplete_registration: p.incomplete_registration,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              organization_id: p.organization_id
            };

            const result = PatientSchema.safeParse(mapped);
            if (result.success) {
              validPatients.push(result.data);
            } else {
              logger.warn(`Paciente inválido ignorado: ${p.id}`, { error: result.error }, 'usePatients');
            }
          });
        }

        // Save to cache for offline use
        if (validPatients.length > 0) {
          patientsCacheService.saveToCache(validPatients, organizationId).catch(err => {
            logger.warn('Falha ao salvar pacientes no cache', err, 'usePatients');
          });
        }

        return validPatients;

      } catch (err: unknown) {
        logger.error('Erro ao carregar pacientes', err, 'usePatients');

        // Try cache on network error
        if (err instanceof Error && err.message && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Timeout'))) {
          logger.info('Erro de rede detectado, tentando cache', {}, 'usePatients');
          const cacheResult = await patientsCacheService.getFromCache(organizationId);
          if (cacheResult.data.length > 0) {
            logger.info('Pacientes carregados do cache (fallback)', { count: cacheResult.data.length }, 'usePatients');
            return cacheResult.data;
          }
        }

        throw err;
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });

  // Prefetch inteligente: carregar dados relacionados quando a lista de pacientes é carregada
  useEffect(() => {
    if (result.data && result.data.length > 0) {
      // Prefetch estatísticas dos primeiros 10 pacientes em background
      const firstTenPatients = result.data.slice(0, 10);

      // Delay para não priorizar sobre a query principal
      const timer = setTimeout(() => {
        firstTenPatients.forEach((patient, index) => {
          // Stagger prefetch para não sobrecarregar a rede
          setTimeout(() => {
            queryClient.prefetchQuery({
              queryKey: ['patient-stats', patient.id],
              queryFn: async () => {
                // Prefetch stats para cada paciente
                const { data } = await supabase
                  .from('appointments')
                  .select('id, patient_id, status, date')
                  .eq('patient_id', patient.id)
                  .order('date', { ascending: false })
                  .limit(10);
                return data;
              },
              staleTime: 1000 * 60 * 5, // 5 minutos
            });
          }, index * 100); // 100ms entre cada prefetch
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [result.data, queryClient]);

  return result;
};

export const usePatients = () => {
  return useActivePatients();
};
