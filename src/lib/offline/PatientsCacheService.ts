/**
 * Serviço de cache para pacientes
 * Gerencia persistência offline e fallback automático
 *
 * Baseado no AppointmentsCacheService com adaptações para pacientes
 *
 * Melhorias:
 * - Cache com expiração configurável
 * - Validação de integridade do cache
 * - Suporte a múltiplas organizações
 * - Logging detalhado para debug
 */
import { dbStore } from './IndexedDBStore';
import type { Patient } from '@/types/patient';
import { logger } from '@/lib/errors/logger';

const CACHE_KEY = 'patients_cache_metadata';
const STORE_NAME = 'patients';
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

export interface CacheMetadata {
  lastUpdated: string;
  count: number;
  organizationId?: string;
  version: number;
  expiresAt: string;
}

export interface PatientCacheResult {
  data: Patient[];
  metadata: CacheMetadata | null;
  isExpired: boolean;
  isStale: boolean;
}

class PatientsCacheService {
  private initialized = false;
  private readonly CACHE_VERSION = 1;
  private readonly STALE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutos = stale

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await dbStore.init();
      this.initialized = true;
      logger.debug('PatientsCacheService inicializado', {}, 'PatientsCacheService');
    } catch (error) {
      logger.error('Erro ao inicializar PatientsCacheService', error, 'PatientsCacheService');
      throw error;
    }
  }

  /**
   * Salva pacientes no cache local com metadata
   */
  async saveToCache(patients: Patient[], organizationId?: string, ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<void> {
    try {
      await this.init();

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMs);

      // Limpar cache anterior e salvar novos dados
      await dbStore.clear(STORE_NAME);

      if (patients.length > 0) {
        // Converter para formato serializável com ID garantido
        const serializablePatients = patients.map((patient) => ({
          ...patient,
          id: patient.id, // Garantir que ID existe (keyPath do IndexedDB)
          birth_date: patient.birth_date instanceof Date ? patient.birth_date.toISOString() : patient.birth_date,
          created_at: patient.created_at instanceof Date ? patient.created_at.toISOString() : patient.created_at,
          updated_at: patient.updated_at instanceof Date ? patient.updated_at.toISOString() : patient.updated_at,
          _cachedAt: now.toISOString(),
        }));

        await dbStore.putAll(STORE_NAME, serializablePatients);
      }

      // Salvar metadata
      const metadata: CacheMetadata = {
        lastUpdated: now.toISOString(),
        count: patients.length,
        organizationId,
        version: this.CACHE_VERSION,
        expiresAt: expiresAt.toISOString(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(metadata));

      logger.info('Cache de pacientes atualizado', {
        count: patients.length,
        organizationId,
        expiresAt: expiresAt.toISOString()
      }, 'PatientsCacheService');
    } catch (error) {
      logger.error('Erro ao salvar cache de pacientes', error, 'PatientsCacheService');
    }
  }

  /**
   * Recupera pacientes do cache local com validações
   */
  async getFromCache(organizationId?: string): Promise<PatientCacheResult> {
    const emptyResult: PatientCacheResult = {
      data: [],
      metadata: null,
      isExpired: true,
      isStale: true
    };

    try {
      await this.init();

      const metadata = this.getCacheMetadata();

      // Verificar se existe metadata
      if (!metadata) {
        logger.debug('Sem cache de pacientes disponível', {}, 'PatientsCacheService');
        return emptyResult;
      }

      // Verificar versão do cache
      if (metadata.version !== this.CACHE_VERSION) {
        logger.warn('Cache de pacientes com versão incompatível, limpando', {
          cacheVersion: metadata.version,
          currentVersion: this.CACHE_VERSION
        }, 'PatientsCacheService');
        await this.clearCache();
        return emptyResult;
      }

      // Verificar organização (se especificada)
      if (organizationId && metadata.organizationId !== organizationId) {
        logger.debug('Cache de pacientes de outra organização', {
          cacheOrg: metadata.organizationId,
          requestedOrg: organizationId
        }, 'PatientsCacheService');
        return emptyResult;
      }

      // Calcular estados do cache
      const now = new Date();
      const lastUpdated = new Date(metadata.lastUpdated);
      const expiresAt = new Date(metadata.expiresAt);
      const isExpired = now > expiresAt;
      const isStale = now.getTime() - lastUpdated.getTime() > this.STALE_THRESHOLD_MS;

      // Recuperar dados
      const cachedData = await dbStore.getAll<Record<string, unknown>>(STORE_NAME);

      if (!cachedData || cachedData.length === 0) {
        return emptyResult;
      }

      // Converter datas de volta para objetos Date
      const patients: Patient[] = cachedData.map(patient => ({
        ...patient,
        birth_date: patient.birth_date ? new Date(patient.birth_date) : undefined,
        created_at: patient.created_at ? new Date(patient.created_at) : new Date(),
        updated_at: patient.updated_at ? new Date(patient.updated_at) : new Date(),
      }));

      logger.info('Cache de pacientes recuperado', {
        count: patients.length,
        isExpired,
        isStale,
        ageMinutes: Math.round((now.getTime() - lastUpdated.getTime()) / 60000)
      }, 'PatientsCacheService');

      return { data: patients, metadata, isExpired, isStale };
    } catch (error) {
      logger.error('Erro ao recuperar cache de pacientes', error, 'PatientsCacheService');
      return emptyResult;
    }
  }

  /**
   * Obtém metadata do cache de forma síncrona
   */
  getCacheMetadata(): CacheMetadata | null {
    try {
      const metadataStr = localStorage.getItem(CACHE_KEY);
      return metadataStr ? JSON.parse(metadataStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se cache existe e não está expirado
   */
  hasValidCache(organizationId?: string): boolean {
    const metadata = this.getCacheMetadata();
    if (!metadata) return false;
    if (metadata.version !== this.CACHE_VERSION) return false;
    if (organizationId && metadata.organizationId !== organizationId) return false;
    if (new Date() > new Date(metadata.expiresAt)) return false;
    return metadata.count > 0;
  }

  /**
   * Limpa o cache completamente
   */
  async clearCache(): Promise<void> {
    try {
      await this.init();
      await dbStore.clear(STORE_NAME);
      localStorage.removeItem(CACHE_KEY);
      logger.info('Cache de pacientes limpo', {}, 'PatientsCacheService');
    } catch (error) {
      logger.error('Erro ao limpar cache de pacientes', error, 'PatientsCacheService');
    }
  }

  /**
   * Retorna idade do cache em minutos
   */
  getCacheAgeMinutes(): number | null {
    const metadata = this.getCacheMetadata();
    if (!metadata) return null;
    const lastUpdated = new Date(metadata.lastUpdated);
    return Math.round((Date.now() - lastUpdated.getTime()) / 60000);
  }

  /**
   * Busca um paciente específico por ID no cache
   */
  async getPatientById(id: string): Promise<Patient | null> {
    try {
      await this.init();
      const cachedData = await dbStore.get<Record<string, unknown>>(STORE_NAME, id);

      if (!cachedData) {
        return null;
      }

      // Converter datas de volta para objetos Date
      return {
        ...cachedData,
        birth_date: cachedData.birth_date ? new Date(cachedData.birth_date) : undefined,
        created_at: cachedData.created_at ? new Date(cachedData.created_at) : new Date(),
        updated_at: cachedData.updated_at ? new Date(cachedData.updated_at) : new Date(),
      } as Patient;
    } catch (error) {
      logger.error('Erro ao buscar paciente no cache', error, 'PatientsCacheService');
      return null;
    }
  }

  /**
   * Adiciona ou atualiza um único paciente no cache
   */
  async upsertPatient(patient: Patient): Promise<void> {
    try {
      await this.init();

      const now = new Date();
      const serializablePatient = {
        ...patient,
        id: patient.id,
        birth_date: patient.birth_date instanceof Date ? patient.birth_date.toISOString() : patient.birth_date,
        created_at: patient.created_at instanceof Date ? patient.created_at.toISOString() : patient.created_at,
        updated_at: patient.updated_at instanceof Date ? patient.updated_at.toISOString() : patient.updated_at,
        _cachedAt: now.toISOString(),
      };

      await dbStore.put(STORE_NAME, serializablePatient);

      // Atualizar metadata
      const metadata = this.getCacheMetadata();
      if (metadata) {
        const updatedMetadata: CacheMetadata = {
          ...metadata,
          count: metadata.count + 1,
          lastUpdated: now.toISOString(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedMetadata));
      }

      logger.debug('Paciente atualizado no cache', { id: patient.id }, 'PatientsCacheService');
    } catch (error) {
      logger.error('Erro ao atualizar paciente no cache', error, 'PatientsCacheService');
    }
  }

  /**
   * Remove um paciente do cache
   */
  async removePatient(id: string): Promise<void> {
    try {
      await this.init();
      await dbStore.delete(STORE_NAME, id);

      // Atualizar metadata
      const metadata = this.getCacheMetadata();
      if (metadata) {
        const updatedMetadata: CacheMetadata = {
          ...metadata,
          count: Math.max(0, metadata.count - 1),
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedMetadata));
      }

      logger.debug('Paciente removido do cache', { id }, 'PatientsCacheService');
    } catch (error) {
      logger.error('Erro ao remover paciente do cache', error, 'PatientsCacheService');
    }
  }
}

// Singleton
export const patientsCacheService = new PatientsCacheService();
