import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientPortalApi } from "@/api/v2/patientPortal";
import { exerciseSessionsApi } from "@/api/v2/rehab";
import { toast } from "@/hooks/use-toast";
import { format, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const KEYS = {
  profile: ["patient-portal", "profile"],
  appointments: (status?: string) => ["patient-portal", "appointments", status ?? "all"],
  exercises: ["patient-portal", "exercises"],
  exerciseHistory: ["patient-portal", "exercise-history"],
  notifications: ["patient-portal", "notifications"],
  progress: ["patient-portal", "progress"],
  stats: ["patient-portal", "stats"],
};

export function usePortalProfile() {
  return useQuery({
    queryKey: KEYS.profile,
    queryFn: patientPortalApi.getProfile,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePortalAppointments(status?: string) {
  return useQuery({
    queryKey: KEYS.appointments(status),
    queryFn: () => patientPortalApi.getAppointments({ status, limit: 50 }),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePortalExercises() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEYS.exercises,
    queryFn: patientPortalApi.getExercises,
    staleTime: 3 * 60 * 1000,
  });

  const complete = useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: { sets_done?: number; reps_done?: number; pain_level?: number; notes?: string };
    }) => patientPortalApi.completeExercise(assignmentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.exercises });
      qc.invalidateQueries({ queryKey: KEYS.progress });
      qc.invalidateQueries({ queryKey: KEYS.stats });
      toast({ title: "Exercício registrado!", description: "Continue assim! 💪" });
    },
    onError: () => toast({ title: "Erro ao registrar exercício", variant: "destructive" }),
  });

  return { ...query, complete };
}

export function usePortalExerciseHistory(patientId?: string) {
  return useQuery({
    queryKey: [...KEYS.exerciseHistory, patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const res = await exerciseSessionsApi.list({ patientId, limit: 50 });
      const sessions = res.data || [];

      // Construir os últimos 7 dias
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date,
          day: format(date, "eee", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase()),
          completed: 0,
        };
      });

      // Distribuir sessões concluídas
      sessions.forEach((session) => {
        if (!session.completed || !session.start_time) return;
        const sessionDate = new Date(session.start_time);

        const dayEntry = last7Days.find((d) => isSameDay(d.date, sessionDate));
        if (dayEntry) {
          dayEntry.completed += 100; // Simplificação: se tem sessão concluída, ganha 100.
        }
      });

      // Limitar máximo a 100%
      return last7Days.map((d) => ({
        day: d.day,
        completed: Math.min(d.completed, 100),
      }));
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePortalNotifications() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEYS.notifications,
    queryFn: patientPortalApi.getNotifications,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: patientPortalApi.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications }),
  });

  const markAllRead = useMutation({
    mutationFn: patientPortalApi.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications }),
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.read).length;

  return { ...query, markRead, markAllRead, unreadCount };
}

export function usePortalProgress() {
  return useQuery({
    queryKey: KEYS.progress,
    queryFn: patientPortalApi.getProgress,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePortalStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: patientPortalApi.getStats,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePortalAppointmentActions() {
  const qc = useQueryClient();

  const confirm = useMutation({
    mutationFn: (id: string) => patientPortalApi.confirmAppointment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-portal", "appointments"] });
      toast({ title: "Consulta confirmada!" });
    },
    onError: () => toast({ title: "Erro ao confirmar consulta", variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      patientPortalApi.cancelAppointment(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-portal", "appointments"] });
      toast({ title: "Consulta cancelada" });
    },
    onError: () => toast({ title: "Erro ao cancelar consulta", variant: "destructive" }),
  });

  return { confirm, cancel };
}
