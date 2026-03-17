/**
 * useAppointmentsCache — camadas de fallback de cache (IndexedDB → localStorage).
 */

import { AppointmentBase } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { appointmentsCacheService } from '@/lib/offline/AppointmentsCacheService';
import { loadEmergencyBackup } from './appointmentHelpers';

export interface AppointmentsQueryResult {
  data: AppointmentBase[];
  isFromCache: boolean;
  cacheTimestamp: string | null;
  source?: 'server' | 'indexeddb' | 'localstorage' | 'memory';
}

/**
 * Obtém dados do cache com fallback multi-camada:
 * Camada 1: IndexedDB (mais confiável e completo)
 * Camada 2: localStorage (backup de emergência)
 * Camada 3: array vazio
 */
export async function getFromCacheWithMetadata(
  organizationId?: string
): Promise<AppointmentsQueryResult> {
  // CAMADA 1: IndexedDB
  try {
    const cacheResult = await appointmentsCacheService.getFromCache(organizationId);
    if (cacheResult.data.length > 0) {
      const ageMinutes = appointmentsCacheService.getCacheAgeMinutes();
      logger.info('Usando dados do IndexedDB (Fallback Camada 1)', {
        count: cacheResult.data.length,
        ageMinutes,
        isStale: cacheResult.isStale,
      }, 'useAppointmentsCache');
      return {
        data: cacheResult.data,
        isFromCache: true,
        cacheTimestamp: cacheResult.metadata?.lastUpdated || null,
        source: 'indexeddb',
      };
    }
  } catch (indexedDbError) {
    logger.error('Falha ao ler IndexedDB, tentando localStorage', indexedDbError, 'useAppointmentsCache');
  }

  // CAMADA 2: localStorage
  const emergencyResult = loadEmergencyBackup(organizationId);
  if (emergencyResult.data.length > 0) {
    logger.warn('Usando backup de emergência do localStorage (Fallback Camada 2)', {
      count: emergencyResult.data.length,
    }, 'useAppointmentsCache');
    return emergencyResult;
  }

  // CAMADA 3: sem dados
  logger.error('NENHUM CACHE DISPONÍVEL - retornando array vazio', {}, 'useAppointmentsCache');
  return { data: [], isFromCache: false, cacheTimestamp: null, source: 'memory' };
}
