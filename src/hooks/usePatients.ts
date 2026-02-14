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

import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { app } from '@/integrations/firebase/app';
import { patientsApi } from '@/integrations/firebase/functions';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { patientsCacheService } from '@/lib/offline/PatientsCacheService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { PatientService } from '@/services/patientService';
import {

  PATIENT_QUERY_CONFIG,
  PATIENT_SELECT,
  devValidate
} from '@/lib/constants/patient-queries';
import {
  isOnline,
  isNetworkError
} from '@/lib/utils/query-helpers';
import type { Patient } from '@/types';

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
interface UseActivePatientsOptions {
  enabled?: boolean;
}

export const useActivePatients = (options: UseActivePatientsOptions = {}) => {
  const { profile } = useAuth();
  const { _toast } = useToast();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();
  const isHookEnabled = options.enabled ?? true;

  // Setup realtime subscription via Firebase Realtime Database
  useEffect(() => {
    if (!isHookEnabled || !organizationId) {
      logger.debug('useActivePatients: Missing organizationId', undefined, 'usePatients');
      return;
    }

    logger.debug('useActivePatients: subscribing via RTDB', { organizationId }, 'usePatients');

    let db;
    try {
      db = getDatabase(app);
    } catch (error) {
      // Realtime Database não configurado ou indisponível
      logger.debug('RTDB not available, patients sync disabled', error, 'usePatients');
      return;
    }

    const triggerRef = ref(db, `orgs/${organizationId}/patients/refresh_trigger`);

    const unsubscribe = onValue(triggerRef, (snapshot) => {
      if (snapshot.exists()) {
        logger.debug('Realtime (RTDB): Pacientes atualizados', { organizationId }, 'usePatients');
        queryClient.invalidateQueries({ queryKey: ['patients', organizationId] });
      }
    });

    return () => {
      logger.debug('Realtime (RTDB): Unsubscribing from patients trigger', { organizationId }, 'usePatients');
      off(triggerRef, 'value', unsubscribe);
    };
  }, [organizationId, queryClient, isHookEnabled]);

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

        const validPatients: Patient[] = data ?? [];
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
    enabled: isHookEnabled && !!organizationId,
    staleTime: PATIENT_QUERY_CONFIG.staleTime,
    retry: PATIENT_QUERY_CONFIG.maxRetries,
  });

  // Optimized prefetch of related data - removed stagger for better performance
  useEffect(() => {
    if (result.data && result.data.length > 0) {
      // Use requestIdleCallback for non-blocking prefetch when available
      const prefetchIfNeeded = () => {
        // Prefetch stats for first 10 patients in parallel (no stagger)
        const patientsToPrefetch = result.data.slice(0, 10);

        patientsToPrefetch.forEach((patient) => {
          // Fire and forget prefetch - don't await
          queryClient.prefetchQuery({
            queryKey: ['patient-stats', patient.id],
            queryFn: async () => {
              return patientsApi.getStats(patient.id);
            },
            staleTime: PATIENT_QUERY_CONFIG.staleTime,
          }).catch(() => {
            // Silently fail prefetch - not critical
          });
        });
      };

      // Use requestIdleCallback if available for better scheduling
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const id = window.requestIdleCallback(() => prefetchIfNeeded());
        return () => window.cancelIdleCallback(id);
      } else {
        const timer = setTimeout(() => prefetchIfNeeded(), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [result.data, queryClient]);

  return result;
};

/**
 * Alias for useActivePatients
 * @deprecated Use useActivePatients directly for clarity
 */
export const usePatients = (options: UseActivePatientsOptions = {}) => useActivePatients(options);

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

      return data;
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
