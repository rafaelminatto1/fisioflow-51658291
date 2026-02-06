import { useEffect, useState, useCallback } from 'react';

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
import { db } from '@/lib/firebase';
import type { SOAPRecord } from '@/types';

export function useEvolutions(patientId?: string) {
  const [data, setData] = useState<SOAPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

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
      (snapshot) => {
        const evolutions: SOAPRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          evolutions.push({
            id: docSnap.id,
            patientId: data.patient_id || data.patientId || '',
            appointmentId: data.appointment_id || data.appointmentId,
            sessionNumber: data.session_number || data.sessionNumber || 0,
            subjective: data.subjective,
            objective: data.objective || data.examination,
            assessment: data.assessment || data.diagnosis,
            plan: data.plan || data.treatment_plan,
            vitalSigns: data.vital_signs || data.vitalSigns,
            functionalTests: data.functional_tests || data.functionalTests,
            createdBy: data.created_by || data.createdBy || '',
            createdAt: data.created_at?.toDate?.() || new Date(),
            updatedAt: data.updated_at?.toDate?.() || new Date(),
            signedAt: data.signed_at?.toDate?.(),
            signatureHash: data.signature_hash || data.signatureHash,
          } as SOAPRecord);
        });
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
      const docRef = doc(db, 'evolutions', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          patientId: data.patient_id || data.patientId || '',
          appointmentId: data.appointment_id || data.appointmentId,
          sessionNumber: data.session_number || data.sessionNumber || 0,
          subjective: data.subjective,
          objective: data.objective || data.examination,
          assessment: data.assessment || data.diagnosis,
          plan: data.plan || data.treatment_plan,
          vitalSigns: data.vital_signs || data.vitalSigns,
          functionalTests: data.functional_tests || data.functionalTests,
          createdBy: data.created_by || data.createdBy || '',
          createdAt: data.created_at?.toDate?.() || new Date(),
          updatedAt: data.updated_at?.toDate?.() || new Date(),
          signedAt: data.signed_at?.toDate?.(),
          signatureHash: data.signature_hash || data.signatureHash,
        } as SOAPRecord;
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
      const docRef = await addDoc(collection(db, 'evolutions'), {
        patient_id: evolution.patientId,
        appointment_id: evolution.appointmentId,
        session_number: evolution.sessionNumber,
        subjective: evolution.subjective,
        objective: evolution.objective,
        assessment: evolution.assessment,
        plan: evolution.plan,
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
      const updateData: any = { updated_at: serverTimestamp() };

      if (updates.patientId !== undefined) updateData.patient_id = updates.patientId;
      if (updates.appointmentId !== undefined) updateData.appointment_id = updates.appointmentId;
      if (updates.sessionNumber !== undefined) updateData.session_number = updates.sessionNumber;
      if (updates.subjective !== undefined) updateData.subjective = updates.subjective;
      if (updates.objective !== undefined) updateData.objective = updates.objective;
      if (updates.assessment !== undefined) updateData.assessment = updates.assessment;
      if (updates.plan !== undefined) updateData.plan = updates.plan;
      if (updates.vitalSigns !== undefined) updateData.vital_signs = updates.vitalSigns;
      if (updates.functionalTests !== undefined) updateData.functional_tests = updates.functionalTests;
      if (updates.signedAt !== undefined) updateData.signed_at = updates.signedAt;
      if (updates.signatureHash !== undefined) updateData.signature_hash = updates.signatureHash;

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
