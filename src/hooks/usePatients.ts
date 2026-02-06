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

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getAblyClient, ABLY_CHANNELS, ABLY_EVENTS } from '@/integrations/ably/client';
import { patientsApi } from '@/integrations/firebase/functions';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PatientSchema, type Patient } from '@/schemas/patient';
import { patientsCacheService } from '@/lib/offline/PatientsCacheService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { PatientService } from '@/services/patientService';

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
  const { toast } = useToast();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  const [retryCount, setRetryCount] = useState(0);

  // Setup realtime subscription via Ably
  useEffect(() => {
    if (!organizationId) {
      logger.debug('useActivePatients: Missing organizationId', undefined, 'usePatients');
      return;
    }

    logger.debug('useActivePatients: subscribing via Ably', { organizationId, retryCount }, 'usePatients');

    const ably = getAblyClient();
    const channel = ably.channels.get(ABLY_CHANNELS.patients(organizationId));

    channel.subscribe(ABLY_EVENTS.update, (message) => {
      logger.debug('Realtime (Ably): Pacientes atualizados', { organizationId, event: message.name }, 'usePatients');
      queryClient.invalidateQueries({ queryKey: ['patients', organizationId] });
    });

    // Handle channel errors (e.g. 410 Gone)
    const handleChannelState = (stateChange: any) => {
      if (stateChange.current === 'failed' || stateChange.current === 'suspended') {
        logger.error(`Realtime: Ably channel ${stateChange.current}`, stateChange.reason, 'usePatients');

        // Auto-retry connection after delay
        setTimeout(() => {
          logger.debug('Realtime: Retrying patients subscription...', {}, 'usePatients');
          setRetryCount(prev => prev + 1);
        }, 5000);
      }
    };

    channel.on(handleChannelState);

    return () => {
      logger.debug('Realtime (Ably): Unsubscribing from patients channel', { organizationId }, 'usePatients');
      channel.unsubscribe();
      channel.off(handleChannelState);
    };
  }, [organizationId, queryClient, retryCount]);

  const result = useQuery({
    queryKey: ['patients', organizationId],
    queryFn: async () => {
      // Try cache first when offline
      if (!isOnline()) {
        logger.debug('Offline: Carregando pacientes do cache', { organizationId }, 'usePatients');
        const cacheResult = await patientsCacheService.getFromCache(organizationId);
        if (cacheResult.data.length > 0) {
          logger.debug('Pacientes carregados do cache offline', { count: cacheResult.data.length }, 'usePatients');
          return cacheResult.data;
        }
        logger.debug('Cache vazio ou expirado', { organizationId }, 'usePatients');
        return [];
      }

      // Dev-only validation (removed in production for performance)
      devValidate(PATIENT_SELECT.standard);

      try {
        logger.debug('useActivePatients: fetching patients', { organizationId }, 'usePatients');

        // Execute query via Service (getActivePatients returns a thenable query builder)
        const { data, error } = await PatientService.getActivePatients(organizationId!);

        if (error) {
          logger.error('useActivePatients: error from PatientService', { error, organizationId }, 'usePatients');
          throw error;
        }

        // Transform data
        const validPatients = PatientService.mapPatientsFromDB(data);
        logger.debug('useActivePatients: fetched patients', {
          count: validPatients.length,
          patientIds: validPatients.map(p => p.id).slice(0, 5),
          organizationId,
        }, 'usePatients');

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
          logger.debug('Erro de rede detectado, tentando cache', { organizationId }, 'usePatients');
          const cacheResult = await patientsCacheService.getFromCache(organizationId);
          if (cacheResult.data.length > 0) {
            logger.debug('Pacientes carregados do cache (fallback)', { count: cacheResult.data.length }, 'usePatients');
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
        patientsToPrefetch.forEach((patient, index) => {
          setTimeout(() => {
            queryClient.prefetchQuery({
              queryKey: ['patient-stats', patient.id],
              queryFn: async () => {
                return patientsApi.getStats(patient.id);
              },
              staleTime: PATIENT_QUERY_CONFIG.staleTime,
            });
          }, index * 100); // Stagger by 100ms
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (patient: Record<string, unknown>) => {
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
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
  const { toast } = useToast();

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
