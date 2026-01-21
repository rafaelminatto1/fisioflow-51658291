/**
 * React Query hooks for fetching patients
 *
 * Features:
 * - Offline support with cache fallback
 * - Realtime subscriptions for updates
 * - Intelligent prefetching of related data
 * - Type-safe queries with validation
 *
 * @module hooks/usePatients
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { PatientSchema, type Patient } from '@/schemas/patient';
import { patientsCacheService } from '@/lib/offline/PatientsCacheService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { PatientService } from '@/services/patientService';
import {
  PATIENT_QUERY_CONFIG,
  PATIENT_SELECT,
  devValidate,
  type PatientDBStandard
} from '@/lib/constants/patient-queries';
import {
  isOnline,
  isNetworkError
} from '@/lib/utils/query-helpers';

// ==============================================================================
// MAPPING FUNCTIONS
// ==============================================================================



// ==============================================================================
// HOOKS
// ==============================================================================

/**
 * Hook for fetching active patients with realtime updates
 *
 * Features:
 * - Offline support with cache fallback
 * - Realtime subscriptions for automatic updates
 * - Intelligent prefetching of related data
 * - Query validation (dev-only)
 * - Retry with backoff for network errors
 */
export const useActivePatients = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Setup realtime subscription
  useEffect(() => {
    if (!organizationId) {
      console.warn('useActivePatients: Missing organizationId');
      return;
    }
    console.log('useActivePatients: subscribing with orgId', organizationId);

    let isSubscribed = false;
    const channel = supabase.channel(`patients-${organizationId}`);

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
          logger.info('Realtime: Pacientes atualizados', { organizationId }, 'usePatients');
          queryClient.invalidateQueries({ queryKey: ['patients', organizationId] });
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          logger.debug('Realtime subscription active', { organizationId }, 'usePatients');
        }
      });

    return () => {
      if (isSubscribed) {
        supabase.removeChannel(channel).catch((error) => {
          logger.warn('Failed to remove realtime channel', error, 'usePatients');
        });
      }
    };
  }, [organizationId, queryClient]);

  const result = useQuery({
    queryKey: ['patients', organizationId],
    queryFn: async () => {
      // Try cache first when offline
      if (!isOnline()) {
        logger.info('Offline: Carregando pacientes do cache', { organizationId }, 'usePatients');
        const cacheResult = await patientsCacheService.getFromCache(organizationId);
        if (cacheResult.data.length > 0) {
          logger.info('Pacientes carregados do cache offline', { count: cacheResult.data.length }, 'usePatients');
          return cacheResult.data;
        }
        logger.warn('Cache vazio ou expirado', { organizationId }, 'usePatients');
        return [];
      }

      // Dev-only validation (removed in production for performance)
      devValidate(PATIENT_SELECT.standard);

      try {
        // Execute query via Service (getActivePatients returns a thenable query builder)
        const { data, error } = await PatientService.getActivePatients(organizationId!);

        if (error) throw error;

        // Transform data
        const validPatients = PatientService.mapPatientsFromDB(data);
        console.log('useActivePatients: fetched patients', validPatients.length);

        // Save to cache for offline use
        if (validPatients.length > 0) {
          patientsCacheService.saveToCache(validPatients, organizationId).catch((error) => {
            logger.warn('Falha ao salvar pacientes no cache', error, 'usePatients');
          });
        }

        return validPatients;

      } catch (error) {
        logger.error('Erro ao carregar pacientes', error, 'usePatients');

        // Try cache on network error
        if (isNetworkError(error)) {
          logger.info('Erro de rede detectado, tentando cache', { organizationId }, 'usePatients');
          const cacheResult = await patientsCacheService.getFromCache(organizationId);
          if (cacheResult.data.length > 0) {
            logger.info('Pacientes carregados do cache (fallback)', { count: cacheResult.data.length }, 'usePatients');
            return cacheResult.data;
          }
        }

        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: PATIENT_QUERY_CONFIG.staleTime,
    retry: PATIENT_QUERY_CONFIG.maxRetries,
  });

  // Intelligent prefetch of related data
  useEffect(() => {
    if (result.data && result.data.length > 0) {
      // Prefetch stats for first 10 patients
      const patientsToPrefetch = result.data.slice(0, 10);

      const timer = setTimeout(() => {
        // Fetch stats for all patients in parallel
        Promise.all(
          patientsToPrefetch.map((patient) =>
            queryClient.prefetchQuery({
              queryKey: ['patient-stats', patient.id],
              queryFn: async () => {
                const { data } = await supabase
                  .from('appointments')
                  .select('id, patient_id, status, date')
                  .eq('patient_id', patient.id)
                  .order('date', { ascending: false })
                  .limit(10);
                return data;
              },
              staleTime: PATIENT_QUERY_CONFIG.staleTime,
            })
          )
        ).catch((error) => {
          console.warn('Failed to prefetch patient stats', error);
        });
      }, 500); // Start after 500ms

      return () => clearTimeout(timer);
    }
  }, [result.data, queryClient]);

  return result;
};

/**
 * Alias for useActivePatients
 * @deprecated Use useActivePatients directly for clarity
 */
export const usePatients = useActivePatients;

/**
 * Hook for fetching a single patient by ID
 */
export const usePatientById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) return null;

      devValidate(PATIENT_SELECT.standard);

      const { data, error } = await PatientService.getPatientById(id);

      if (error) throw error;
      if (!data) return null;

      const patients = PatientService.mapPatientsFromDB([data]);
      return patients[0] ?? null;
    },
    enabled: !!id,
    staleTime: PATIENT_QUERY_CONFIG.staleTimeLong,
  });
};

/**
 * Hook for creating a new patient
 */
export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: any) => {
      const { data, error } = await PatientService.createPatient(patient);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Paciente cadastrado',
        description: 'O paciente foi cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useCreatePatient');
    },
  });
};

/**
 * Hook for updating an existing patient
 */
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any & { id: string }) => {
      const { data, error } = await PatientService.updatePatient(id, updates);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      toast({
        title: 'Paciente atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useUpdatePatient');
    },
  });
};

/**
 * Hook for deleting a patient
 */
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await PatientService.deletePatient(patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Paciente excluído',
        description: 'O paciente foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useDeletePatient');
    },
  });
};
