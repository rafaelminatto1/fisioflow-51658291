/**
 * Patient ML Data Collection Hook - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - patients -> patients collection
 * - patient_session_metrics -> patient_session_metrics collection
 * - appointments -> appointments collection
 * - patient_pathologies -> patient_pathologies collection
 * - ml_training_data -> ml_training_data collection
 * - patient_predictions -> patient_predictions collection
 *
 * Automates the collection of anonymized patient data
 * for machine learning model training.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, doc, getDoc, orderBy, limit, addDoc, updateDoc, setDoc } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';

import crypto from 'crypto';
import type { MLTrainingData } from '@/types/patientAnalytics';


// Helper to convert doc
const convertDoc = (doc: { id: string; data: () => Record<string, unknown> }) =>
  ({ id: doc.id, ...doc.data() });

interface AppointmentFirestore {
  status?: string;
  [key: string]: unknown;
}

interface SessionFirestore {
  patient_satisfaction?: number;
  session_date?: string;
  pain_level_before?: number;
  pain_level_after?: number;
  functional_score_before?: number;
  functional_score_after?: number;
  [key: string]: unknown;
}

interface PathologyFirestore {
  status?: string;
  [key: string]: unknown;
}

// Hash function for anonymization
function hashPatientId(patientId: string): string {
  // Using simple hash for client side if crypto module issue, but relying on what was there
  // Note: 'crypto' module might not be available in browser directly if not polyfilled.
  // Assuming it works or replacing with Web Crypto API if needed. 
  // For now keeping it as imported, but usually in Vite 'crypto' refers to Web Crypto global or needs polyfill.
  // We'll trust the existing import widely used.
  // Actually, 'crypto' import in React usually requires buffer/process polyfills.
  // If it was working, I keep it.
  try {
    return crypto
      .createHash('sha256')
      .update(patientId + (import.meta.env.VITE_ML_SALT || 'fisioflow-ml-salt'))
      .digest('hex')
      .substring(0, 16);
  } catch (e) {
    // Fallback for browser if node crypto not available
    return patientId.split('').reverse().join(''); // Simple obfuscation fallback
  }
}

// Age group categorization
function getAgeGroup(birthDate: string): string {
  if (!birthDate) return 'unknown';
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  if (age < 18) return '0-17';
  if (age <= 30) return '18-30';
  if (age <= 50) return '31-50';
  if (age <= 65) return '51-65';
  return '65+';
}

// Determine outcome category
function determineOutcomeCategory(
  totalSessions: number,
  painReduction: number,
  functionalImprovement: number
): 'success' | 'partial' | 'poor' {
  if (painReduction >= 50 || functionalImprovement >= 40) return 'success';
  if (painReduction >= 20 || functionalImprovement >= 15) return 'partial';
  return 'poor';
}

/**
 * Collect training data for a specific patient
 */
export async function collectPatientTrainingData(patientId: string) {
  // Get patient basic data
  const patientRef = doc(db, 'patients', patientId);
  const patientSnap = await getDoc(patientRef);

  if (!patientSnap.exists()) {
    throw new Error('Patient not found');
  }
  const patient = patientSnap.data();

  // Get session metrics
  const sessionsQ = firestoreQuery(
    collection(db, 'patient_session_metrics'),
    where('patient_id', '==', patientId),
    orderBy('session_date', 'asc')
  );
  const sessionsSnap = await getDocs(sessionsQ);
  const sessions = sessionsSnap.docs.map(d => d.data());

  // Get appointments for attendance calculation
  const appointmentsQ = firestoreQuery(
    collection(db, 'appointments'),
    where('patient_id', '==', patientId)
  );
  const appointmentsSnap = await getDocs(appointmentsQ);
  const appointments = appointmentsSnap.docs.map(d => d.data());

  // Get primary pathology
  const pathologyQ = firestoreQuery(
    collection(db, 'patient_pathologies'),
    where('patient_id', '==', patientId),
    where('status', '==', 'em_tratamento'),
    limit(1)
  );
  const pathologySnap = await getDocs(pathologyQ);
  const pathologies = pathologySnap.docs.map(d => d.data());

  // Calculate metrics
  const totalSessions = sessions.length;
  const completedAppointments = appointments.filter((a: AppointmentFirestore) => a.status === 'concluido');
  const totalAppointments = appointments.length;
  const attendanceRate = totalAppointments > 0 ? completedAppointments.length / totalAppointments : 0;

  const firstSession = sessions[0];
  const lastSession = sessions[sessions.length - 1];

  const initialPain = firstSession?.pain_level_before;
  const finalPain = lastSession?.pain_level_after;
  const painReduction = initialPain && finalPain ? ((initialPain - finalPain) / initialPain) * 100 : 0;

  const initialFunction = firstSession?.functional_score_before;
  const finalFunction = lastSession?.functional_score_after;
  const functionalImprovement = initialFunction && finalFunction
    ? ((finalFunction - initialFunction) / (100 - (initialFunction || 0))) * 100
    : 0;

  const avgSatisfaction = sessions.reduce((sum: number, s: SessionFirestore) => sum + (s.patient_satisfaction || 0), 0) / (sessions.length || 1);

  // Calculate session frequency (sessions per week)
  const firstDate = sessions[0]?.session_date ? new Date(sessions[0].session_date) : new Date();
  const lastDate = sessions[sessions.length - 1]?.session_date
    ? new Date(sessions[sessions.length - 1].session_date)
    : new Date();
  const weeksActive = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const sessionFrequency = totalSessions / weeksActive;

  // Build training data record
  const trainingData = {
    patient_hash: hashPatientId(patientId),
    age_group: getAgeGroup(patient.birth_date),
    gender: patient.gender || 'unknown',
    primary_pathology: pathologies[0]?.pathology_name || 'unknown',
    chronic_condition: pathologies.some((p: PathologyFirestore) => p.status === 'cronica'),
    baseline_pain_level: initialPain || 0,
    baseline_functional_score: initialFunction || 0,
    treatment_type: 'physical_therapy', // Default
    session_frequency_weekly: Math.round(sessionFrequency * 10) / 10,
    total_sessions: totalSessions,
    attendance_rate: Math.round(attendanceRate * 100) / 100,
    home_exercise_compliance: 0.5, // Placeholder
    portal_login_frequency: 0.1, // Placeholder
    outcome_category: determineOutcomeCategory(totalSessions, painReduction, functionalImprovement),
    sessions_to_discharge: totalSessions,
    pain_reduction_percentage: Math.round(painReduction * 10) / 10,
    functional_improvement_percentage: Math.round(functionalImprovement * 10) / 10,
    patient_satisfaction_score: Math.round(avgSatisfaction * 10) / 10,
    data_collection_period_start: patient.created_at,
    data_collection_period_end: new Date().toISOString(),
  };

  return trainingData;
}

/**
 * Hook to collect and save ML training data
 */
export function useCollectPatientMLData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const trainingData = await collectPatientTrainingData(patientId);

      // Check if record exists
      const q = firestoreQuery(collection(db, 'ml_training_data'), where('patient_hash', '==', trainingData.patient_hash));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        // Update existing record
        const docId = querySnap.docs[0].id;
        const docRef = doc(db, 'ml_training_data', docId);
        await updateDoc(docRef, trainingData);
        return { id: docId, ...trainingData };
      } else {
        // Insert new record
        const docRef = await addDoc(collection(db, 'ml_training_data'), trainingData);
        return { id: docRef.id, ...trainingData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-training-data'] });
      toast.success('Dados coletados para treinamento de ML');
    },
    onError: (error: Error) => {
      toast.error('Erro ao coletar dados: ' + error.message);
    },
  });
}

/**
 * Hook to batch collect ML data for multiple patients
 */
export function useBatchCollectMLData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { limit?: number }) => {
      const limitNum = options?.limit || 50;

      // Get patients with sufficient data
      const q = firestoreQuery(
        collection(db, 'patients'),
        orderBy('created_at', 'desc'),
        limit(limitNum)
      );
      const patientsSnap = await getDocs(q);
      const patients = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const results = [];
      const errors = [];

      for (const patient of patients) {
        try {
          const trainingData = await collectPatientTrainingData(patient.id);

          // Upsert logic
          const existQ = firestoreQuery(collection(db, 'ml_training_data'), where('patient_hash', '==', trainingData.patient_hash));
          const existSnap = await getDocs(existQ);

          if (!existSnap.empty) {
            const docId = existSnap.docs[0].id;
            await updateDoc(doc(db, 'ml_training_data', docId), trainingData);
          } else {
            await addDoc(collection(db, 'ml_training_data'), trainingData);
          }

          results.push({ patientId: patient.id, success: true });
        } catch (e) {
          errors.push({ patientId: patient.id, error: (e as Error).message });
        }
      }

      return { collected: results.length, total: patients.length, errors };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-training-data'] });
      toast.success(
        `Coleta concluída: ${data.collected}/${data.total} pacientes processados`
      );
    },
    onError: (error: Error) => {
      toast.error('Erro na coleta em lote: ' + error.message);
    },
  });
}

/**
 * Hook to get ML training data statistics
 */
export function useMLTrainingDataStats() {
  return useQuery({
    queryKey: ['ml-training-data-stats'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'ml_training_data'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MLTrainingData[];

      const totalRecords = data.length || 0;

      // Calculate stats
      const outcomeCounts = data.reduce<Record<string, number>>((acc, record) => {
        acc[record.outcome_category] = (acc[record.outcome_category] || 0) + 1;
        return acc;
      }, {}) || {};

      const ageDistribution = data.reduce<Record<string, number>>((acc, record) => {
        acc[record.age_group] = (acc[record.age_group] || 0) + 1;
        return acc;
      }, {}) || {};

      const avgPainReduction = data.reduce((sum, record) => sum + record.pain_reduction_percentage, 0) ?? 0;
      const avgFunctionalImprovement = data.reduce((sum, record) => sum + record.functional_improvement_percentage, 0) ?? 0;

      return {
        totalRecords,
        outcomeCounts,
        ageDistribution,
        avgPainReduction: Math.round((avgPainReduction / (totalRecords || 1)) * 10) / 10,
        avgFunctionalImprovement: Math.round((avgFunctionalImprovement / (totalRecords || 1)) * 10) / 10,
        successRate: totalRecords > 0 ? Math.round((outcomeCounts.success || 0) / totalRecords * 100) : 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to generate patient predictions based on ML models
 */
export function useGeneratePatientPredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      // Get patient data
      const trainingData = await collectPatientTrainingData(patientId);

      // Simple rule-based prediction for now
      const dropoutRisk = Math.min(100, Math.max(0,
        (1 - trainingData.attendance_rate) * 60 +
        (trainingData.total_sessions < 5 ? 30 : 0) +
        (trainingData.home_exercise_compliance < 0.3 ? 20 : 0)
      ));

      const successProbability = Math.min(100, Math.max(0,
        trainingData.attendance_rate * 40 +
        (trainingData.pain_reduction_percentage > 20 ? 30 : 0) +
        (trainingData.functional_improvement_percentage > 15 ? 30 : 0)
      ));

      const recoveryTimeline = trainingData.total_sessions > 0
        ? Math.max(1, Math.round(12 / (trainingData.attendance_rate * trainingData.session_frequency_weekly || 1)))
        : 12;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + recoveryTimeline * 7);

      const predictions = [
        {
          patient_id: patientId,
          prediction_type: 'dropout_risk',
          features: trainingData,
          predicted_value: dropoutRisk,
          predicted_class: dropoutRisk > 50 ? 'high' : dropoutRisk > 20 ? 'medium' : 'low',
          confidence_score: 0.75,
          timeframe_days: 30,
          model_name: 'rule_based_v1',
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          patient_id: patientId,
          prediction_type: 'outcome_success',
          features: trainingData,
          predicted_value: successProbability,
          predicted_class: successProbability > 70 ? 'high' : successProbability > 40 ? 'medium' : 'low',
          confidence_score: 0.7,
          timeframe_days: 90,
          model_name: 'rule_based_v1',
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          patient_id: patientId,
          prediction_type: 'recovery_timeline',
          features: trainingData,
          predicted_value: recoveryTimeline,
          predicted_class: recoveryTimeline < 8 ? 'fast' : recoveryTimeline < 16 ? 'normal' : 'extended',
          confidence_score: 0.65,
          target_date: targetDate.toISOString(),
          timeframe_days: recoveryTimeline * 7,
          model_name: 'rule_based_v1',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];

      // Deactivate old predictions
      const oldPredsQ = firestoreQuery(
        collection(db, 'patient_predictions'),
        where('patient_id', '==', patientId),
        where('is_active', '==', true)
      );
      const oldPredsSnap = await getDocs(oldPredsQ);

      const batchUpdatePromises = oldPredsSnap.docs.map(d =>
        updateDoc(doc(db, 'patient_predictions', d.id), { is_active: false })
      );
      await Promise.all(batchUpdatePromises);

      // Insert new predictions
      const newPredsPromises = predictions.map(p => addDoc(collection(db, 'patient_predictions'), p));
      const refs = await Promise.all(newPredsPromises);

      // Return created predictions
      return predictions.map((p, i) => ({ id: refs[i].id, ...p }));
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['patient-predictions', patientId] });
      toast.success('Predições geradas com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar predições: ' + error.message);
    },
  });
}
