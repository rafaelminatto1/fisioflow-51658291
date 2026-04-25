/**
 * useInnovations - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  gamificationApi,
  innovationsApi,
  type AchievementRow,
  type GamificationProfileRow,
  type InventoryItemRow,
  type InventoryMovementRow,
  type RevenueForecastRow,
  type StaffPerformanceRow,
  type WhatsAppExerciseQueueRow,
  type PatientSelfAssessmentRow,
} from "@/api/v2";
import { toast } from "sonner";

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
  type: "badge" | "title" | "discount" | "bonus_session";
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

const mapProfile = (profile: GamificationProfileRow): PatientLevel => ({
  id: profile.id,
  patient_id: profile.patient_id,
  current_level: profile.level,
  total_xp: profile.total_points ?? profile.current_xp ?? 0,
  current_streak: profile.current_streak,
  longest_streak: profile.longest_streak,
  last_activity_date: profile.last_activity_date,
  badges: [],
  title: `Nível ${profile.level}`,
  created_at: profile.created_at,
  updated_at: profile.updated_at,
});

const mapReward = (achievement: AchievementRow): GamificationReward => ({
  id: achievement.id,
  name: achievement.title,
  description: achievement.description ?? null,
  type: "badge",
  xp_required: achievement.xp_reward ?? null,
  level_required: null,
  icon: achievement.icon ?? null,
  color: null,
  is_active: true,
});

export function usePatientLevel(patientId: string) {
  return useQuery({
    queryKey: ["patient-level", patientId],
    queryFn: async () => {
      const res = await gamificationApi.getProfile(patientId);
      return mapProfile(res.data);
    },
    enabled: !!patientId,
  });
}

export function useGamificationRewards() {
  return useQuery({
    queryKey: ["gamification-rewards"],
    queryFn: async () => {
      const res = await gamificationApi.achievementDefinitions.list();
      return (res?.data ?? []).map(mapReward);
    },
  });
}

export function usePatientAchievements(patientId: string) {
  return useQuery({
    queryKey: ["patient-achievements", patientId],
    queryFn: async () => {
      const res = await gamificationApi.getAchievements(patientId);
      const rewards = new Map((res.data.all ?? []).map((item) => [item.id, mapReward(item)]));
      return (res.data.unlocked ?? []).map((item) => ({
        id: item.id,
        patient_id: item.patient_id,
        reward_id: item.achievement_id,
        unlocked_at: item.unlocked_at,
        notified: true,
        reward: rewards.get(item.achievement_id),
      })) as PatientAchievement[];
    },
    enabled: !!patientId,
  });
}

export function useAddXP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      xp,
      achievementTitle,
    }: {
      patientId: string;
      xp: number;
      achievementTitle: string;
    }) => {
      await gamificationApi.awardXp({
        patientId,
        amount: xp,
        reason: achievementTitle,
        description: achievementTitle,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-level", variables.patientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["patient-achievements", variables.patientId],
      });
      toast.success("XP adicionado com sucesso!");
    },
  });
}

export type InventoryItem = InventoryItemRow;
export type InventoryMovement = InventoryMovementRow;
export type StaffPerformance = StaffPerformanceRow;

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

export type RevenueForecast = RevenueForecastRow;
export type WhatsAppExerciseQueue = WhatsAppExerciseQueueRow;
export type PatientSelfAssessment = PatientSelfAssessmentRow;

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await innovationsApi.inventory.list({ activeOnly: true });
      return (res?.data ?? []) as InventoryItem[];
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      const res = await innovationsApi.inventory.create(item);
      return (res?.data ?? res) as InventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item adicionado ao estoque");
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const res = await innovationsApi.inventory.update(id, updates);
      return (res?.data ?? res) as InventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item atualizado");
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await innovationsApi.inventory.delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      toast.success("Item removido do estoque");
    },
  });
}

export function useInventoryMovements(inventoryId?: string) {
  return useQuery({
    queryKey: ["inventory-movements", inventoryId],
    queryFn: async () => {
      const res = await innovationsApi.inventoryMovements.list({
        inventoryId,
        limit: 100,
      });
      return (res?.data ?? []) as InventoryMovement[];
    },
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: Partial<InventoryMovement>) => {
      const res = await innovationsApi.inventoryMovements.create(movement);
      return (res?.data ?? res) as InventoryMovement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      toast.success("Movimentação registrada");
    },
  });
}

export function useStaffPerformance(therapistId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["staff-performance", therapistId, startDate, endDate],
    queryFn: async () => {
      const res = await innovationsApi.staffPerformance.list({
        therapistId,
        startDate,
        endDate,
      });
      return (res?.data ?? []) as StaffPerformance[];
    },
  });
}

export function useAppointmentPredictions() {
  return useQuery({
    queryKey: ["appointment-predictions"],
    queryFn: async () => {
      const res = await innovationsApi.appointmentPredictions.list({
        limit: 50,
      });
      return (res?.data ?? []) as AppointmentPrediction[];
    },
  });
}

export function useRevenueForecasts() {
  return useQuery({
    queryKey: ["revenue-forecasts"],
    queryFn: async () => {
      const res = await innovationsApi.revenueForecasts.list({ limit: 90 });
      return (res?.data ?? []) as RevenueForecast[];
    },
  });
}

export function useWhatsAppExerciseQueue() {
  return useQuery({
    queryKey: ["whatsapp-exercise-queue"],
    queryFn: async () => {
      const res = await innovationsApi.whatsappExerciseQueue.list({
        limit: 100,
      });
      return (res?.data ?? []) as WhatsAppExerciseQueue[];
    },
  });
}

export function useCreateWhatsAppExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WhatsAppExerciseQueue>) => {
      const res = await innovationsApi.whatsappExerciseQueue.create(data);
      return (res?.data ?? res) as WhatsAppExerciseQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-exercise-queue"] });
      toast.success("Exercícios agendados para envio via WhatsApp");
    },
  });
}

export function usePatientSelfAssessments(patientId?: string) {
  return useQuery({
    queryKey: ["patient-self-assessments", patientId],
    queryFn: async () => {
      const res = await innovationsApi.patientSelfAssessments.list({
        patientId,
        limit: 100,
      });
      return (res?.data ?? []) as PatientSelfAssessment[];
    },
  });
}
