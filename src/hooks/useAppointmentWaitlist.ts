import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulingApi } from "@/api/v2/scheduling";
import { toast } from "sonner";

export interface AppointmentWaitlistEntry {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_phone: string;
  patient_name: string | null;
  target_date: string;
  target_time: string;
  type: string;
  status: "waiting" | "notified" | "fulfilled" | "declined" | "expired";
  notified_at: string | null;
  created_at: string;
  updated_at: string;
  position?: number;
}

interface AddToAppointmentWaitlistInput {
  patient_id?: string;
  patient_phone: string;
  patient_name?: string;
  target_date: string;
  target_time: string;
  type?: string;
}

export function useAppointmentWaitlist(filters?: {
  date?: string;
  time?: string;
  status?: string;
}) {
  const queryKey = ["appointment-waitlist", filters];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.date) params.set("date", filters.date);
      if (filters?.time) params.set("time", filters.time);
      if (filters?.status) params.set("status", filters.status);

      const res = await schedulingApi.request<{ data: AppointmentWaitlistEntry[] }>({
        method: "GET",
        path: `/api/scheduling/appointment-waitlist?${params.toString()}`,
      });
      return res.data ?? [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAppointmentWaitlistStats(date: string) {
  return useQuery({
    queryKey: ["appointment-waitlist-stats", date],
    queryFn: async () => {
      const res = await schedulingApi.request<{ data: Array<{
        target_time: string;
        waiting_count: number;
        waiting: number;
        notified: number;
        fulfilled: number;
      }> }>({
        method: "GET",
        path: `/api/scheduling/appointment-waitlist/stats/${encodeURIComponent(date)}`,
      });
      return res.data ?? [];
    },
    enabled: !!date,
    staleTime: 30 * 1000,
  });
}

export function useAddToAppointmentWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddToAppointmentWaitlistInput) => {
      const res = await schedulingApi.request<{ data: AppointmentWaitlistEntry }>({
        method: "POST",
        path: "/api/scheduling/appointment-waitlist",
        body: input,
      });
      return res.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
      toast.success(`${data.patient_name || "Paciente"} adicionado à fila (posição ${data.position})`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao adicionar à fila de espera");
    },
  });
}

export function useRemoveFromAppointmentWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await schedulingApi.request({
        method: "DELETE",
        path: `/api/scheduling/appointment-waitlist/${encodeURIComponent(id)}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
      toast.success("Removido da fila de espera");
    },
    onError: () => {
      toast.error("Erro ao remover da fila de espera");
    },
  });
}

export function useNotifyAppointmentWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await schedulingApi.request<{ data: AppointmentWaitlistEntry }>({
        method: "POST",
        path: `/api/scheduling/appointment-waitlist/${encodeURIComponent(id)}/notify`,
      });
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
      toast.success("Paciente notificado da vaga disponível");
    },
    onError: () => {
      toast.error("Erro ao notificar paciente");
    },
  });
}

export function useFulfillAppointmentWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await schedulingApi.request<{ data: AppointmentWaitlistEntry }>({
        method: "POST",
        path: `/api/scheduling/appointment-waitlist/${encodeURIComponent(id)}/fulfill`,
      });
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
      toast.success("Agendamento confirmado e paciente removido da fila");
    },
    onError: () => {
      toast.error("Erro ao confirmar agendamento");
    },
  });
}

export function useDeclineAppointmentWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await schedulingApi.request<{ data: AppointmentWaitlistEntry }>({
        method: "POST",
        path: `/api/scheduling/appointment-waitlist/${encodeURIComponent(id)}/decline`,
      });
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
      toast.success("Paciente recusou a vaga e foi removido da fila");
    },
    onError: () => {
      toast.error("Erro ao processar recusa");
    },
  });
}

export function formatWaitlistTime(time: string): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function getWaitlistStatusLabel(status: AppointmentWaitlistEntry["status"]): string {
  switch (status) {
    case "waiting":
      return "Aguardando";
    case "notified":
      return "Notificado";
    case "fulfilled":
      return "Agendado";
    case "declined":
      return "Recusou";
    case "expired":
      return "Expirado";
    default:
      return status;
  }
}

export function getWaitlistStatusColor(status: AppointmentWaitlistEntry["status"]): string {
  switch (status) {
    case "waiting":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "notified":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "fulfilled":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "declined":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "expired":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800";
  }
}