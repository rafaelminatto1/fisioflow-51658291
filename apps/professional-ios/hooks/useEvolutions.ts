import { useEffect, useState, useCallback } from 'react';
import { profApi } from '@/lib/api';
import { encryptionService } from '@/lib/services/encryptionService';
import { phiCacheManager, type ClearableCache } from '@/lib/services/phiCacheManager';
import { authClient } from '@/lib/neonAuth';
import type { SOAPRecord } from '@/types';
import type { EncryptedData } from '@/types/encryption';

class SOAPCache implements ClearableCache {
  private cache: Map<string, SOAPRecord> = new Map();
  set(id: string, record: SOAPRecord): void { this.cache.set(id, record); }
  get(id: string): SOAPRecord | undefined { return this.cache.get(id); }
  clear(): void { this.cache.clear(); }
  has(id: string): boolean { return this.cache.has(id); }
  size(): number { return this.cache.size; }
}

const soapCache = new SOAPCache();
phiCacheManager.registerCache('soap-notes', soapCache);

export function useEvolutions(patientId?: string) {
  const [data, setData] = useState<SOAPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const encryptSOAPFields = async (userId: string, subjective?: string, objective?: any, assessment?: string, plan?: any) => {
    const encrypted: any = {};
    try {
      if (subjective) encrypted.subjective_encrypted = await encryptionService.encrypt(subjective, userId);
      if (objective) encrypted.objective_encrypted = await encryptionService.encrypt(typeof objective === 'string' ? objective : JSON.stringify(objective), userId);
      if (assessment) encrypted.assessment_encrypted = await encryptionService.encrypt(assessment, userId);
      if (plan) encrypted.plan_encrypted = await encryptionService.encrypt(typeof plan === 'string' ? plan : JSON.stringify(plan), userId);
      return encrypted;
    } catch (err) {
      throw new Error('Failed to encrypt SOAP note data');
    }
  };

  const decryptSOAPFields = async (userId: string, data: any) => {
    const decrypted: any = {};
    try {
      if (data.subjective_encrypted) decrypted.subjective = await encryptionService.decrypt(data.subjective_encrypted, userId);
      if (data.objective_encrypted) {
        const obj = await encryptionService.decrypt(data.objective_encrypted, userId);
        try { decrypted.objective = JSON.parse(obj); } catch { decrypted.objective = obj; }
      }
      if (data.assessment_encrypted) decrypted.assessment = await encryptionService.decrypt(data.assessment_encrypted, userId);
      if (data.plan_encrypted) {
        const p = await encryptionService.decrypt(data.plan_encrypted, userId);
        try { decrypted.plan = JSON.parse(p); } catch { decrypted.plan = p; }
      }
      return decrypted;
    } catch (err) {
      throw new Error('Failed to decrypt SOAP note data');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = await authClient.getSession();
    const userId = session?.data?.user?.id;
    if (!userId) {
      setError(new Error('User not authenticated'));
      setLoading(false);
      return;
    }

    try {
      const evolutions = await profApi.getEvolutions(patientId || '');
      const processed: SOAPRecord[] = [];

      for (const item of evolutions) {
        if (soapCache.has(item.id)) {
          processed.push(soapCache.get(item.id)!);
          continue;
        }
        const decrypted = await decryptSOAPFields(userId, item);
        const record = {
          ...item,
          ...decrypted,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        };
        soapCache.set(item.id, record);
        processed.push(record);
      }
      setData(processed);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = useCallback(async (evolution: Omit<SOAPRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const session = await authClient.getSession();
    const userId = session?.data?.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const encrypted = await encryptSOAPFields(userId, evolution.subjective, evolution.objective, evolution.assessment, evolution.plan);
    const result = await profApi.createEvolution({
      ...evolution,
      ...encrypted,
      subjective: undefined, objective: undefined, assessment: undefined, plan: undefined
    });
    await fetchData();
    return result.id;
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create };
}
