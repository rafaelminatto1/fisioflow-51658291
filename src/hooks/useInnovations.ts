import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ==================== GAMIFICATION ====================

export interface PatientLevel {
  id: string;
  patient_id: string;
  current_level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  badges: any[];
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
      const { data, error } = await supabase
        .from('patient_levels')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PatientLevel | null;
    },
    enabled: !!patientId,
  });
}

export function useGamificationRewards() {
  return useQuery({
    queryKey: ['gamification-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_rewards')
        .select('*')
        .eq('is_active', true)
        .order('xp_required', { ascending: true });
      
      if (error) throw error;
      return data as GamificationReward[];
    },
  });
}

export function usePatientAchievements(patientId: string) {
  return useQuery({
    queryKey: ['patient-achievements', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_achievements')
        .select('*, reward:gamification_rewards(*)')
        .eq('patient_id', patientId)
        .order('unlocked_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientAchievement[];
    },
    enabled: !!patientId,
  });
}

export function useAddXP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ patientId, xp, achievementTitle }: { patientId: string; xp: number; achievementTitle: string }) => {
      const { error } = await supabase
        .from('achievements_log')
        .insert({
          patient_id: patientId,
          achievement_id: crypto.randomUUID(),
          achievement_title: achievementTitle,
          xp_reward: xp,
        });
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('clinic_inventory')
        .select('*')
        .eq('is_active', true)
        .order('item_name');
      
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      const { error } = await supabase
        .from('clinic_inventory')
        .insert(item as any);
      
      if (error) throw error;
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
      const { error } = await supabase
        .from('clinic_inventory')
        .update(updates as any)
        .eq('id', id);
      
      if (error) throw error;
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
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (inventoryId) {
        query = query.eq('inventory_id', inventoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryMovement[];
    },
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (movement: Partial<InventoryMovement>) => {
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert(movement as any);
      
      if (movementError) throw movementError;
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
      let query = supabase
        .from('staff_performance_metrics')
        .select('*')
        .order('metric_date', { ascending: false });
      
      if (therapistId) query = query.eq('therapist_id', therapistId);
      if (startDate) query = query.gte('metric_date', startDate);
      if (endDate) query = query.lte('metric_date', endDate);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StaffPerformance[];
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
      const { data, error } = await supabase
        .from('appointment_predictions')
        .select('*')
        .order('no_show_probability', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AppointmentPrediction[];
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
  factors: Record<string, any>;
  model_version: string;
  created_at: string;
}

export function useRevenueForecasts() {
  return useQuery({
    queryKey: ['revenue-forecasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_forecasts')
        .select('*')
        .order('forecast_date', { ascending: true })
        .limit(90);
      
      if (error) throw error;
      return data as RevenueForecast[];
    },
  });
}

// ==================== WHATSAPP EXERCISE QUEUE ====================

export interface WhatsAppExerciseQueue {
  id: string;
  patient_id: string;
  exercise_plan_id: string | null;
  phone_number: string;
  exercises: any[];
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
      const { data, error } = await supabase
        .from('whatsapp_exercise_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as WhatsAppExerciseQueue[];
    },
  });
}

export function useCreateWhatsAppExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<WhatsAppExerciseQueue>) => {
      const { error } = await supabase
        .from('whatsapp_exercise_queue')
        .insert(data as any);
      
      if (error) throw error;
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
      let query = supabase
        .from('patient_self_assessments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (patientId) query = query.eq('patient_id', patientId);
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as PatientSelfAssessment[];
    },
  });
}
