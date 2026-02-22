import { useEffect, useState, useCallback } from 'react';

import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { encryptionService } from '@/lib/services/encryptionService';
import { phiCacheManager, type ClearableCache } from '@/lib/services/phiCacheManager';
import type { SOAPRecord } from '@/types';
import type { EncryptedData } from '@/types/encryption';

/**
 * In-memory cache for decrypted SOAP notes
 * Cleared when app goes to background via PHI Cache Manager
 */
class SOAPCache implements ClearableCache {
  private cache: Map<string, SOAPRecord> = new Map();

  set(id: string, record: SOAPRecord): void {
    this.cache.set(id, record);
  }

  get(id: string): SOAPRecord | undefined {
    return this.cache.get(id);
  }

  clear(): void {
    console.log('[SOAPCache] Clearing decrypted SOAP notes cache');
    this.cache.clear();
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  size(): number {
    return this.cache.size;
  }
}

const soapCache = new SOAPCache();

// Register SOAP cache with PHI Cache Manager
phiCacheManager.registerCache('soap-notes', soapCache);

export function useEvolutions(patientId?: string) {
  const [data, setData] = useState<SOAPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Encrypt PHI fields in SOAP note
   * Encrypts: subjective, objective, assessment, plan
   */
  const encryptSOAPFields = async (
    userId: string,
    subjective?: string,
    objective?: any,
    assessment?: string,
    plan?: any
  ): Promise<{
    subjective_encrypted?: EncryptedData;
    objective_encrypted?: EncryptedData;
    assessment_encrypted?: EncryptedData;
    plan_encrypted?: EncryptedData;
  }> => {
    const encrypted: any = {};

    try {
      // Encrypt subjective field
      if (subjective) {
        encrypted.subjective_encrypted = await encryptionService.encrypt(subjective, userId);
      }

      // Encrypt objective field (convert to JSON string first)
      if (objective) {
        const objectiveStr = typeof objective === 'string' ? objective : JSON.stringify(objective);
        encrypted.objective_encrypted = await encryptionService.encrypt(objectiveStr, userId);
      }

      // Encrypt assessment field
      if (assessment) {
        encrypted.assessment_encrypted = await encryptionService.encrypt(assessment, userId);
      }

      // Encrypt plan field (convert to JSON string first)
      if (plan) {
        const planStr = typeof plan === 'string' ? plan : JSON.stringify(plan);
        encrypted.plan_encrypted = await encryptionService.encrypt(planStr, userId);
      }

      return encrypted;
    } catch (err) {
      // Never log PHI content - only log error type
      console.error('[useEvolutions] Failed to encrypt SOAP fields - encryption error occurred');
      throw new Error('Failed to encrypt SOAP note data');
    }
  };

  /**
   * Decrypt PHI fields from SOAP note
   * Decrypts: subjective, objective, assessment, plan
   */
  const decryptSOAPFields = async (
    userId: string,
    data: any
  ): Promise<{
    subjective?: string;
    objective?: any;
    assessment?: string;
    plan?: any;
  }> => {
    const decrypted: any = {};

    try {
      // Decrypt subjective field
      if (data.subjective_encrypted) {
        decrypted.subjective = await encryptionService.decrypt(data.subjective_encrypted, userId);
      } else if (data.subjective) {
        // Fallback for unencrypted legacy data
        decrypted.subjective = data.subjective;
      }

      // Decrypt objective field
      if (data.objective_encrypted) {
        const objectiveStr = await encryptionService.decrypt(data.objective_encrypted, userId);
        try {
          decrypted.objective = JSON.parse(objectiveStr);
        } catch {
          // If not valid JSON, keep as string
          decrypted.objective = objectiveStr;
        }
      } else if (data.objective || data.examination) {
        // Fallback for unencrypted legacy data
        decrypted.objective = data.objective || data.examination;
      }

      // Decrypt assessment field
      if (data.assessment_encrypted) {
        decrypted.assessment = await encryptionService.decrypt(data.assessment_encrypted, userId);
      } else if (data.assessment || data.diagnosis) {
        // Fallback for unencrypted legacy data
        decrypted.assessment = data.assessment || data.diagnosis;
      }

      // Decrypt plan field
      if (data.plan_encrypted) {
        const planStr = await encryptionService.decrypt(data.plan_encrypted, userId);
        try {
          decrypted.plan = JSON.parse(planStr);
        } catch {
          // If not valid JSON, keep as string
          decrypted.plan = planStr;
        }
      } else if (data.plan || data.treatment_plan) {
        // Fallback for unencrypted legacy data
        decrypted.plan = data.plan || data.treatment_plan;
      }

      return decrypted;
    } catch (err) {
      // Never log PHI content - only log error type
      console.error('[useEvolutions] Failed to decrypt SOAP fields - decryption error occurred');
      throw new Error('Failed to decrypt SOAP note data');
    }
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Get current user ID for decryption
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError(new Error('User not authenticated'));
      setLoading(false);
      return;
    }

    // Build query based on patientId filter
    let q;
    if (patientId) {
      q = query(
        collection(db, 'evolutions'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );
    } else {
      q = query(
        collection(db, 'evolutions'),
        orderBy('created_at', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const evolutions: SOAPRecord[] = [];
        
        // Process each document and decrypt PHI fields
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Check cache first
          if (soapCache.has(docSnap.id)) {
            const cached = soapCache.get(docSnap.id);
            if (cached) {
              evolutions.push(cached);
              continue;
            }
          }
          
          try {
            // Decrypt PHI fields
            const decryptedFields = await decryptSOAPFields(userId, data);
            
            const record: SOAPRecord = {
              id: docSnap.id,
              patientId: data.patient_id || data.patientId || '',
              appointmentId: data.appointment_id || data.appointmentId,
              sessionNumber: data.session_number || data.sessionNumber || 0,
              subjective: decryptedFields.subjective,
              objective: decryptedFields.objective,
              assessment: decryptedFields.assessment,
              plan: decryptedFields.plan,
              vitalSigns: data.vital_signs || data.vitalSigns,
              functionalTests: data.functional_tests || data.functionalTests,
              createdBy: data.created_by || data.createdBy || '',
              createdAt: data.created_at?.toDate?.() || new Date(),
              updatedAt: data.updated_at?.toDate?.() || new Date(),
              signedAt: data.signed_at?.toDate?.(),
              signatureHash: data.signature_hash || data.signatureHash,
            } as SOAPRecord;
            
            // Cache the decrypted record
            soapCache.set(docSnap.id, record);
            evolutions.push(record);
          } catch (decryptErr) {
            // Never log PHI content - only log document ID for debugging
            console.error('[useEvolutions] Failed to decrypt SOAP note ID:', docSnap.id);
            // Skip this record or add with error indicator
            // For now, we'll skip to prevent showing corrupted data
          }
        }
        
        setData(evolutions);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching evolutions:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [patientId]);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData]);

  // Get single evolution by ID
  const getById = useCallback(async (id: string) => {
    try {
      // Check cache first
      if (soapCache.has(id)) {
        const cached = soapCache.get(id);
        if (cached) {
          console.log('[useEvolutions] Using cached SOAP note');
          return cached;
        }
      }

      // Get current user ID for decryption
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const docRef = doc(db, 'evolutions', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Decrypt PHI fields
        const decryptedFields = await decryptSOAPFields(userId, data);
        
        const record: SOAPRecord = {
          id: docSnap.id,
          patientId: data.patient_id || data.patientId || '',
          appointmentId: data.appointment_id || data.appointmentId,
          sessionNumber: data.session_number || data.sessionNumber || 0,
          subjective: decryptedFields.subjective,
          objective: decryptedFields.objective,
          assessment: decryptedFields.assessment,
          plan: decryptedFields.plan,
          vitalSigns: data.vital_signs || data.vitalSigns,
          functionalTests: data.functional_tests || data.functionalTests,
          createdBy: data.created_by || data.createdBy || '',
          createdAt: data.created_at?.toDate?.() || new Date(),
          updatedAt: data.updated_at?.toDate?.() || new Date(),
          signedAt: data.signed_at?.toDate?.(),
          signatureHash: data.signature_hash || data.signatureHash,
        } as SOAPRecord;
        
        // Cache the decrypted record
        soapCache.set(id, record);
        
        return record;
      }
      return null;
    } catch (err) {
      console.error('Error fetching evolution:', err);
      throw err;
    }
  }, []);

  // Create new evolution
  const create = useCallback(async (evolution: Omit<SOAPRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Get current user ID for encryption
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Encrypt PHI fields
      const encryptedFields = await encryptSOAPFields(
        userId,
        evolution.subjective,
        evolution.objective,
        evolution.assessment,
        evolution.plan
      );

      // Store encrypted data in Firestore
      const docRef = await addDoc(collection(db, 'evolutions'), {
        patient_id: evolution.patientId,
        appointment_id: evolution.appointmentId,
        session_number: evolution.sessionNumber,
        // Store encrypted PHI fields
        subjective_encrypted: encryptedFields.subjective_encrypted,
        objective_encrypted: encryptedFields.objective_encrypted,
        assessment_encrypted: encryptedFields.assessment_encrypted,
        plan_encrypted: encryptedFields.plan_encrypted,
        // Non-PHI fields stored as-is
        vital_signs: evolution.vitalSigns,
        functional_tests: evolution.functionalTests,
        created_by: evolution.createdBy,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        signed_at: evolution.signedAt || null,
        signature_hash: evolution.signatureHash || null,
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating evolution:', err);
      throw err;
    }
  }, []);

  // Update evolution
  const update = useCallback(async (id: string, updates: Partial<SOAPRecord>) => {
    try {
      // Get current user ID for encryption
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updateData: any = { updated_at: serverTimestamp() };

      // Handle non-PHI fields
      if (updates.patientId !== undefined) updateData.patient_id = updates.patientId;
      if (updates.appointmentId !== undefined) updateData.appointment_id = updates.appointmentId;
      if (updates.sessionNumber !== undefined) updateData.session_number = updates.sessionNumber;
      if (updates.vitalSigns !== undefined) updateData.vital_signs = updates.vitalSigns;
      if (updates.functionalTests !== undefined) updateData.functional_tests = updates.functionalTests;
      if (updates.signedAt !== undefined) updateData.signed_at = updates.signedAt;
      if (updates.signatureHash !== undefined) updateData.signature_hash = updates.signatureHash;

      // Encrypt PHI fields if they are being updated
      const hasPhiUpdates = 
        updates.subjective !== undefined ||
        updates.objective !== undefined ||
        updates.assessment !== undefined ||
        updates.plan !== undefined;

      if (hasPhiUpdates) {
        const encryptedFields = await encryptSOAPFields(
          userId,
          updates.subjective,
          updates.objective,
          updates.assessment,
          updates.plan
        );

        if (encryptedFields.subjective_encrypted) {
          updateData.subjective_encrypted = encryptedFields.subjective_encrypted;
        }
        if (encryptedFields.objective_encrypted) {
          updateData.objective_encrypted = encryptedFields.objective_encrypted;
        }
        if (encryptedFields.assessment_encrypted) {
          updateData.assessment_encrypted = encryptedFields.assessment_encrypted;
        }
        if (encryptedFields.plan_encrypted) {
          updateData.plan_encrypted = encryptedFields.plan_encrypted;
        }
      }

      await updateDoc(doc(db, 'evolutions', id), updateData);
    } catch (err) {
      console.error('Error updating evolution:', err);
      throw err;
    }
  }, []);

  // Sign evolution
  const sign = useCallback(async (id: string, signatureHash: string) => {
    return update(id, {
      signedAt: new Date(),
      signatureHash,
    });
  }, [update]);

  // Delete evolution
  const remove = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'evolutions', id));
    } catch (err) {
      console.error('Error deleting evolution:', err);
      throw err;
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    getById,
    create,
    update,
    sign,
    remove,
  };
}
