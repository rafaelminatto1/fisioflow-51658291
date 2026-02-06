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
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

export interface Evaluation {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  medications?: string;
  examination?: {
    inspection?: string;
    palpation?: string;
    range_of_motion?: Record<string, string>;
    muscle_strength?: Record<string, string>;
    special_tests?: Record<string, boolean>;
  };
  vitalSigns?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
  };
  diagnosis?: string;
  prognosis?: string;
  treatmentPlan?: string;
  recommendations?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function useEvaluations(patientId?: string) {
  const { profile } = useAuth();
  const [data, setData] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Build query based on patientId filter
    let q;
    if (patientId) {
      q = query(
        collection(db, 'evaluations'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );
    } else {
      q = query(
        collection(db, 'evaluations'),
        orderBy('created_at', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const evaluations: Evaluation[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          evaluations.push({
            id: docSnap.id,
            patientId: data.patient_id || data.patientId || '',
            patientName: data.patient_name || data.patientName,
            appointmentId: data.appointment_id || data.appointmentId,
            chiefComplaint: data.chief_complaint || data.chiefComplaint || '',
            historyOfPresentIllness: data.history_of_present_illness || data.historyOfPresentIllness,
            pastMedicalHistory: data.past_medical_history || data.pastMedicalHistory,
            medications: data.medications,
            examination: data.examination || data.examination,
            vitalSigns: data.vital_signs || data.vitalSigns,
            diagnosis: data.diagnosis,
            prognosis: data.prognosis,
            treatmentPlan: data.treatment_plan || data.treatmentPlan,
            recommendations: data.recommendations,
            createdBy: data.created_by || data.createdBy || '',
            createdByName: data.created_by_name || data.createdByName,
            createdAt: data.created_at?.toDate?.() || new Date(),
            updatedAt: data.updated_at?.toDate?.() || new Date(),
          } as Evaluation);
        });
        setData(evaluations);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching evaluations:', err);
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

  // Get single evaluation by ID
  const getById = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'evaluations', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          patientId: data.patient_id || data.patientId || '',
          patientName: data.patient_name || data.patientName,
          appointmentId: data.appointment_id || data.appointmentId,
          chiefComplaint: data.chief_complaint || data.chiefComplaint || '',
          historyOfPresentIllness: data.history_of_present_illness || data.historyOfPresentIllness,
          pastMedicalHistory: data.past_medical_history || data.pastMedicalHistory,
          medications: data.medications,
          examination: data.examination,
          vitalSigns: data.vital_signs || data.vitalSigns,
          diagnosis: data.diagnosis,
          prognosis: data.prognosis,
          treatmentPlan: data.treatment_plan || data.treatmentPlan,
          recommendations: data.recommendations,
          createdBy: data.created_by || data.createdBy || '',
          createdByName: data.created_by_name || data.createdByName,
          createdAt: data.created_at?.toDate?.() || new Date(),
          updatedAt: data.updated_at?.toDate?.() || new Date(),
        } as Evaluation;
      }
      return null;
    } catch (err) {
      console.error('Error fetching evaluation:', err);
      throw err;
    }
  }, []);

  // Create new evaluation
  const create = useCallback(async (evaluation: Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'evaluations'), {
        patient_id: evaluation.patientId,
        patient_name: evaluation.patientName,
        appointment_id: evaluation.appointmentId,
        chief_complaint: evaluation.chiefComplaint,
        history_of_present_illness: evaluation.historyOfPresentIllness,
        past_medical_history: evaluation.pastMedicalHistory,
        medications: evaluation.medications,
        examination: evaluation.examination,
        vital_signs: evaluation.vitalSigns,
        diagnosis: evaluation.diagnosis,
        prognosis: evaluation.prognosis,
        treatment_plan: evaluation.treatmentPlan,
        recommendations: evaluation.recommendations,
        created_by: profile?.id,
        created_by_name: profile?.name,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating evaluation:', err);
      throw err;
    }
  }, [profile?.id, profile?.name]);

  // Update evaluation
  const update = useCallback(async (id: string, updates: Partial<Evaluation>) => {
    try {
      const updateData: any = { updated_at: serverTimestamp() };

      if (updates.chiefComplaint !== undefined) updateData.chief_complaint = updates.chiefComplaint;
      if (updates.historyOfPresentIllness !== undefined) updateData.history_of_present_illness = updates.historyOfPresentIllness;
      if (updates.pastMedicalHistory !== undefined) updateData.past_medical_history = updates.pastMedicalHistory;
      if (updates.medications !== undefined) updateData.medications = updates.medications;
      if (updates.examination !== undefined) updateData.examination = updates.examination;
      if (updates.vitalSigns !== undefined) updateData.vital_signs = updates.vitalSigns;
      if (updates.diagnosis !== undefined) updateData.diagnosis = updates.diagnosis;
      if (updates.prognosis !== undefined) updateData.prognosis = updates.prognosis;
      if (updates.treatmentPlan !== undefined) updateData.treatment_plan = updates.treatmentPlan;
      if (updates.recommendations !== undefined) updateData.recommendations = updates.recommendations;

      await updateDoc(doc(db, 'evaluations', id), updateData);
    } catch (err) {
      console.error('Error updating evaluation:', err);
      throw err;
    }
  }, []);

  // Delete evaluation
  const remove = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'evaluations', id));
    } catch (err) {
      console.error('Error deleting evaluation:', err);
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
    remove,
  };
}

export type { Evaluation };
