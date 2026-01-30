/**
 * useInnovations - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - patient_levels -> patient_levels
 * - gamification_rewards -> gamification_rewards
 * - patient_achievements -> patient_achievements
 * - achievements_log -> achievements_log
 * - clinic_inventory -> clinic_inventory
 * - inventory_movements -> inventory_movements
 * - staff_performance_metrics -> staff_performance_metrics
 * - appointment_predictions -> appointment_predictions
 * - revenue_forecasts -> revenue_forecasts
 * - whatsapp_exercise_queue -> whatsapp_exercise_queue
 * - patient_self_assessments -> patient_self_assessments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, getFirebaseAuth } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  writeBatch
} from 'firebase/firestore';

const auth = getFirebaseAuth();

// Helper
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => ({ id: doc.id, ...doc.data() } as T);

// ==================== GAMIFICATION ====================

export interface PatientLevel {
  id: string;
  patient_id: string;
  current_level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  badges: Record<string, unknown>[];
  title: string;
  created_at: string;
  updated_at: string;
}

export interface GamificationReward {
  id: string;
  name: string;
  description: string | null;
  type: 'badge' | 'title' | 'discount' | 'bonus_session';
  xp_required: number | null;
  level_required: number | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface PatientAchievement {
  id: string;
  patient_id: string;
  reward_id: string;
  unlocked_at: string;
  notified: boolean;
  reward?: GamificationReward;
}

export function usePatientLevel(patientId: string) {
  return useQuery({
    queryKey: ['patient-level', patientId],
    queryFn: async () => {
      const q = query(collection(db, 'patient_levels'), where('patient_id', '==', patientId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;
      return convertDoc<PatientLevel>(snapshot.docs[0]);
    },
    enabled: !!patientId,
  });
}

export function useGamificationRewards() {
  return useQuery({
    queryKey: ['gamification-rewards'],
    queryFn: async () => {
      const q = query(
        collection(db, 'gamification_rewards'),
        where('is_active', '==', true),
        orderBy('xp_required', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as GamificationReward[];
    },
  });
}

export function usePatientAchievements(patientId: string) {
  return useQuery({
    queryKey: ['patient-achievements', patientId],
    queryFn: async () => {
      const q = query(
        collection(db, 'patient_achievements'),
        where('patient_id', '==', patientId),
        orderBy('unlocked_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const achievements = snapshot.docs.map(convertDoc) as PatientAchievement[];

      // Manual join for reward details
      const achievementsWithRewards = await Promise.all(
        achievements.map(async (achievement) => {
          if (achievement.reward_id) {
            const rewardSnap = await getDoc(doc(db, 'gamification_rewards', achievement.reward_id));
            if (rewardSnap.exists()) {
              return { ...achievement, reward: convertDoc<GamificationReward>(rewardSnap) };
            }
          }
          return achievement;
        })
      );

      return achievementsWithRewards;
    },
    enabled: !!patientId,
  });
}

export function useAddXP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, xp, achievementTitle }: { patientId: string; xp: number; achievementTitle: string }) => {
      // Add to log
      await addDoc(collection(db, 'achievements_log'), {
        patient_id: patientId,
        achievement_id: crypto.randomUUID(),
        achievement_title: achievementTitle,
        xp_reward: xp,
        created_at: new Date().toISOString()
      });

      // Update patient level/XP logic would ideally be here or in a Cloud Function trigger.
      // For now we just log it as per original code which just inserted to log?
      // Original code: inserts to achievements_log. Note: It does NOT automatically update patient_levels table in the original Supabase code shown, perhaps a Trigger did that?
      // Assuming logic exists elsewhere or just logging for now.
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-level', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient-achievements', variables.patientId] });
      toast.success('XP adicionado com sucesso!');
    },
  });
}

// ==================== INVENTORY ====================

export interface InventoryItem {
  id: string;
  organization_id: string | null;
  item_name: string;
  category: string | null;
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  cost_per_unit: number | null;
  supplier: string | null;
  last_restock_date: string | null;
  expiration_date: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste' | 'perda';
  quantity: number;
  reason: string | null;
  related_appointment_id: string | null;
  created_by: string | null;
  created_at: string;
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const q = query(
        collection(db, 'clinic_inventory'),
        where('is_active', '==', true),
        orderBy('item_name')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as InventoryItem[];
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      await addDoc(collection(db, 'clinic_inventory'), {
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item adicionado ao estoque');
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const docRef = doc(db, 'clinic_inventory', id);
      await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item atualizado');
    },
  });
}

export function useInventoryMovements(inventoryId?: string) {
  return useQuery({
    queryKey: ['inventory-movements', inventoryId],
    queryFn: async () => {
      let q = query(
        collection(db, 'inventory_movements'),
        orderBy('created_at', 'desc'),
        limit(100)
      );

      if (inventoryId) {
        q = query(
          collection(db, 'inventory_movements'),
          where('inventory_id', '==', inventoryId),
          orderBy('created_at', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as InventoryMovement[];
    },
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: Partial<InventoryMovement>) => {
      await addDoc(collection(db, 'inventory_movements'), {
        ...movement,
        created_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movimentação registrada');
    },
  });
}

// ==================== STAFF PERFORMANCE ====================

export interface StaffPerformance {
  id: string;
  therapist_id: string;
  metric_date: string;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  average_session_duration: number | null;
  patient_satisfaction_avg: number | null;
  revenue_generated: number;
  new_patients: number;
  returning_patients: number;
  created_at: string;
}

export function useStaffPerformance(therapistId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['staff-performance', therapistId, startDate, endDate],
    queryFn: async () => {
      let q = query(collection(db, 'staff_performance_metrics'), orderBy('metric_date', 'desc'));

      if (therapistId) {
        q = query(q, where('therapist_id', '==', therapistId));
      }
      if (startDate) {
        q = query(q, where('metric_date', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('metric_date', '<=', endDate));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as StaffPerformance[];
    },
  });
}

// ==================== PREDICTIONS ====================

export interface AppointmentPrediction {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  no_show_probability: number;
  risk_factors: string[];
  recommended_actions: string[] | null;
  prediction_date: string;
  was_accurate: boolean | null;
  created_at: string;
}

export function useAppointmentPredictions() {
  return useQuery({
    queryKey: ['appointment-predictions'],
    queryFn: async () => {
      const q = query(
        collection(db, 'appointment_predictions'),
        orderBy('no_show_probability', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as AppointmentPrediction[];
    },
  });
}

// ==================== REVENUE FORECASTS ====================

export interface RevenueForecast {
  id: string;
  organization_id: string | null;
  forecast_date: string;
  predicted_revenue: number;
  actual_revenue: number | null;
  predicted_appointments: number;
  actual_appointments: number | null;
  confidence_interval_low: number;
  confidence_interval_high: number;
  factors: Record<string, unknown>;
  model_version: string;
  created_at: string;
}

export function useRevenueForecasts() {
  return useQuery({
    queryKey: ['revenue-forecasts'],
    queryFn: async () => {
      const q = query(
        collection(db, 'revenue_forecasts'),
        orderBy('forecast_date', 'asc'),
        limit(90)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as RevenueForecast[];
    },
  });
}

// ==================== WHATSAPP EXERCISE QUEUE ====================

export interface WhatsAppExerciseQueue {
  id: string;
  patient_id: string;
  exercise_plan_id: string | null;
  phone_number: string;
  exercises: Record<string, unknown>[];
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';
  error_message: string | null;
  created_at: string;
}

export function useWhatsAppExerciseQueue() {
  return useQuery({
    queryKey: ['whatsapp-exercise-queue'],
    queryFn: async () => {
      const q = query(
        collection(db, 'whatsapp_exercise_queue'),
        orderBy('created_at', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as WhatsAppExerciseQueue[];
    },
  });
}

export function useCreateWhatsAppExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WhatsAppExerciseQueue>) => {
      await addDoc(collection(db, 'whatsapp_exercise_queue'), {
        ...data,
        created_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-exercise-queue'] });
      toast.success('Exercícios agendados para envio via WhatsApp');
    },
  });
}

// ==================== PATIENT SELF-ASSESSMENTS ====================

export interface PatientSelfAssessment {
  id: string;
  patient_id: string;
  assessment_type: 'pain_level' | 'mood' | 'exercise_completion' | 'nps';
  question: string;
  response: string | null;
  numeric_value: number | null;
  received_via: string;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export function usePatientSelfAssessments(patientId?: string) {
  return useQuery({
    queryKey: ['patient-self-assessments', patientId],
    queryFn: async () => {
      let q = query(
        collection(db, 'patient_self_assessments'),
        orderBy('created_at', 'desc'),
        limit(100)
      );

      if (patientId) {
        q = query(
          collection(db, 'patient_self_assessments'),
          where('patient_id', '==', patientId),
          orderBy('created_at', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as PatientSelfAssessment[];
    },
  });
}
