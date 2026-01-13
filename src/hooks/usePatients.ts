import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { PatientSchema, type Patient } from '@/schemas/patient';

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
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('patients-changes')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['patients', organizationId],
    queryFn: async () => {
      // Offline check
      if (!navigator.onLine) {
        logger.warn('Offline: Carregando pacientes do cache (vazio por enquanto para pacientes)', {}, 'usePatients');
        // TODO: Extend CacheService to support Patients or just generic IDB
        return [];
      }

      try {
        let query = supabase
          .from('patients')
          .select('*')
          .in('status', ['active', 'Em Tratamento', 'Inicial']);

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
              name: p.full_name || p.name || (p.phone ? `Paciente (${p.phone})` : 'Paciente sem nome'),
              email: p.email,
              phone: p.phone,
              cpf: p.cpf,
              birthDate: p.birth_date,
              gender: 'outro', // Default fallback
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

        // Ideally save to cache here
        return validPatients;

      } catch (err: unknown) {
        logger.error('Erro ao carregar pacientes', err, 'usePatients');

        // Mock fallback only if critical env var or specific mode set, otherwise empty
        // Keeping original behavior logic slightly adapted
        if (err instanceof Error && err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
          // Try cache?
          // return getFromCache();
        }

        throw err;
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });
};

export const usePatients = () => {
  return useActivePatients();
};