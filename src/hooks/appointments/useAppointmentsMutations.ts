/**
 * useAppointmentsMutations — create/update/delete/status com optimistic updates.
 */

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ErrorHandler } from "@/lib/errors/ErrorHandler";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { AppointmentNotificationService } from "@/lib/services/AppointmentNotificationService";
import { AppointmentService } from "@/services/appointmentService";
import { normalizeStatus as normalizeFrontendStatus } from "@/components/schedule/shared/appointment-status";
import type {
  Appointment,
  AppointmentBase,
  AppointmentFormData,
  AppointmentStatus,
} from "@/types/appointment";
import { isAppointmentConflictError } from "@/utils/appointmentErrors";
import { requireUserOrganizationId } from "@/utils/userHelpers";
import { parseUpdatesToAppointment } from "../appointmentOptimistic";
import { parseLocalDate } from "@/lib/date-utils";
import { appointmentPeriodKeys } from "../useAppointmentsByPeriod";
import type { AppointmentsQueryResult } from "./useAppointmentsCache";
import { appointmentKeys } from "./useAppointmentsData";
import { isOfflinePlaceholder } from "@/api/v2/base";

async function invalidateAppointmentsCache(
  queryClient: QueryClient,
  date?: string | Date,
  organizationId?: string,
) {
  const { invalidateAppointmentsComprehensive } = await import("@/utils/cacheInvalidation");
  return invalidateAppointmentsComprehensive(queryClient, date, organizationId);
}

function mergeAppointmentIntoCaches(
  queryClient: QueryClient,
  organizationId: string | undefined,
  appointmentId: string,
  appointment: Partial<AppointmentBase>,
) {
  queryClient.setQueryData(
    appointmentKeys.list(organizationId),
    (old: AppointmentsQueryResult | undefined) => ({
      ...old,
      data: (old?.data || []).map((apt) =>
        apt.id === appointmentId ? { ...apt, ...appointment } : apt,
      ),
    }),
  );

  queryClient.setQueriesData(
    { queryKey: appointmentPeriodKeys.all },
    (old: AppointmentBase[] | undefined) =>
      old?.map((apt) => (apt.id === appointmentId ? { ...apt, ...appointment } : apt)),
  );

  queryClient.setQueriesData<Appointment[]>({ queryKey: ["schedule-appointments"] }, (old) =>
    old?.map((apt) =>
      apt.id === appointmentId ? ({ ...apt, ...appointment } as Appointment) : apt,
    ),
  );

  queryClient.setQueryData(appointmentKeys.detail(appointmentId), (old: Appointment | undefined) =>
    old ? ({ ...old, ...appointment } as Appointment) : old,
  );
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: AppointmentFormData & { ignoreCapacity?: boolean }) => {
      const organizationId = profile?.organization_id || (await requireUserOrganizationId());
      const currentResult = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(profile?.organization_id),
      );
      return AppointmentService.createAppointment(data, organizationId, currentResult?.data || []);
    },
    onMutate: async (variables) => {
      const organizationId = profile?.organization_id;
      const queryKey = appointmentKeys.list(organizationId);
      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(queryKey);

      const tempId = `temp-${Date.now()}`;
      const optimisticAppointment: AppointmentBase = {
        id: tempId,
        patientId: variables.patient_id,
        patientName: variables.patient_name || variables.patient_id || "",
        phone: "",
        date: variables.appointment_date ? parseLocalDate(variables.appointment_date) : new Date(),
        time: variables.appointment_time || variables.start_time || "",
        duration: variables.duration || 60,
        type: variables.type || "Fisioterapia",
        status: variables.status || "agendado",
        notes: variables.notes || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        therapistId: variables.therapist_id || undefined,
        room: variables.room || undefined,
        payment_status: variables.payment_status || "pending",
      };

      queryClient.setQueryData(queryKey, (old: AppointmentsQueryResult | undefined) => ({
        ...old,
        data: [...(old?.data || []), optimisticAppointment],
      }));

      await queryClient.cancelQueries({ queryKey });

      return { previousData, tempId };
    },
    onSuccess: async (data, _variables, context) => {
      queryClient.setQueryData(
        appointmentKeys.list(profile?.organization_id),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: [...(old?.data.filter((apt) => apt.id !== context?.tempId) || []), data],
        }),
      );

      const isOnline = typeof navigator === "undefined" || navigator.onLine;
      const isPending = typeof data.id === "string" && data.id.startsWith("offline-");

      if (isOnline && !isPending) {
        await invalidateAppointmentsCache(queryClient, data.date, profile?.organization_id);
      }

      toast({
        title: isPending ? "Salvo localmente" : "Sucesso",
        description: isPending
          ? "Agendamento será sincronizado quando a conexão voltar."
          : "Agendamento criado com sucesso",
      });

      if (isPending) return;

      AppointmentNotificationService.scheduleNotification(
        data.id,
        data.patientId,
        data.date,
        data.time,
        data.patientName,
      );
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          appointmentKeys.list(profile?.organization_id),
          context.previousData,
        );
      }
      if (isAppointmentConflictError(error)) {
        ErrorHandler.handle(error, "useCreateAppointment", {
          showNotification: false,
        });
      } else {
        ErrorHandler.handle(error, "useCreateAppointment");
      }
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      updates,
      ignoreCapacity,
    }: {
      appointmentId: string;
      updates: Partial<AppointmentFormData>;
      ignoreCapacity?: boolean;
      suppressSuccessToast?: boolean;
    }) => {
      const organizationId = profile?.organization_id || (await requireUserOrganizationId());
      return AppointmentService.updateAppointment(
        appointmentId,
        { ...updates, ignoreCapacity },
        organizationId,
      );
    },
    networkMode: "offlineFirst",
    onMutate: async (variables) => {
      const organizationId = profile?.organization_id;
      await queryClient.cancelQueries({
        queryKey: appointmentKeys.list(organizationId),
      });
      await queryClient.cancelQueries({ queryKey: appointmentPeriodKeys.all });
      await queryClient.cancelQueries({ queryKey: ["schedule-appointments"] });

      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(organizationId),
      );
      const previousPeriodQueries = queryClient.getQueriesData({
        queryKey: appointmentPeriodKeys.all,
      });
      // A agenda (FullCalendar) lê de ["schedule-appointments"], chave distinta
      // das demais. Sem este update otimista o card "volta" para a posição
      // antiga até o refetch concluir — causando o flicker no drag-and-drop.
      const previousScheduleQueries = queryClient.getQueriesData<Appointment[]>({
        queryKey: ["schedule-appointments"],
      });
      const parsedUpdates = parseUpdatesToAppointment(variables.updates);

      queryClient.setQueryData(
        appointmentKeys.list(organizationId),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data:
            old?.data.map((apt) =>
              apt.id === variables.appointmentId ? { ...apt, ...parsedUpdates } : apt,
            ) || [],
        }),
      );

      queryClient.setQueriesData(
        { queryKey: appointmentPeriodKeys.all },
        (old: AppointmentBase[] | undefined) =>
          old?.map((apt) =>
            apt.id === variables.appointmentId ? { ...apt, ...parsedUpdates } : apt,
          ),
      );

      queryClient.setQueriesData<Appointment[]>({ queryKey: ["schedule-appointments"] }, (old) =>
        old?.map((apt) =>
          apt.id === variables.appointmentId ? ({ ...apt, ...parsedUpdates } as Appointment) : apt,
        ),
      );

      return { previousData, previousPeriodQueries, previousScheduleQueries };
    },
    onSuccess: async (data, variables) => {
      const organizationId = profile?.organization_id || "";
      const isOffline = isOfflinePlaceholder<AppointmentBase>(data);

      if (!isOffline && data) {
        mergeAppointmentIntoCaches(queryClient, organizationId, variables.appointmentId, data);
      }

      if (!isOffline && typeof navigator !== "undefined" && navigator.onLine) {
        await invalidateAppointmentsCache(queryClient, data.date, organizationId);
      }

      if (!variables.suppressSuccessToast) {
        toast({
          title: isOffline ? "Salvo localmente" : "Sucesso",
          description: isOffline
            ? "Alteração será sincronizada quando a conexão voltar."
            : "Agendamento atualizado com sucesso",
        });
      }
    },
    onError: (error: Error, _variables, context) => {
      const organizationId = profile?.organization_id;
      if (context?.previousData) {
        queryClient.setQueryData(appointmentKeys.list(organizationId), context.previousData);
      }
      context?.previousPeriodQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousScheduleQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (isAppointmentConflictError(error)) {
        ErrorHandler.handle(error, "useUpdateAppointment", {
          showNotification: false,
        });
      } else {
        ErrorHandler.handle(error, "useUpdateAppointment");
      }
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const organizationId = profile?.organization_id || (await requireUserOrganizationId());
      const currentResult = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(profile?.organization_id),
      );
      const appointment = currentResult?.data.find((apt) => apt.id === appointmentId);
      await AppointmentService.deleteAppointment(appointmentId, organizationId);
      return { appointmentId, appointment };
    },
    networkMode: "offlineFirst",
    onMutate: async (appointmentId) => {
      const organizationId = profile?.organization_id;
      await queryClient.cancelQueries({ queryKey: appointmentKeys.list(organizationId) });
      await queryClient.cancelQueries({ queryKey: appointmentPeriodKeys.all });

      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(organizationId),
      );
      const previousPeriodQueries = queryClient.getQueriesData({
        queryKey: appointmentPeriodKeys.all,
      });

      // Remoção optimista — some imediatamente da agenda
      queryClient.setQueryData(
        appointmentKeys.list(organizationId),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: (old?.data || []).filter((apt) => apt.id !== appointmentId),
        }),
      );
      queryClient.setQueriesData(
        { queryKey: appointmentPeriodKeys.all },
        (old: AppointmentBase[] | undefined) => old?.filter((apt) => apt.id !== appointmentId),
      );

      return { previousData, previousPeriodQueries };
    },
    onSuccess: async ({ appointmentId, appointment }) => {
      const organizationId = profile?.organization_id || "";

      // Quando offline a fila ainda não confirmou — só revalida quando online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        await invalidateAppointmentsCache(queryClient, appointment?.date, organizationId);
      }

      queryClient.removeQueries({ queryKey: appointmentKeys.detail(appointmentId) });

      toast({
        title: "Sucesso",
        description: "Agendamento excluído com sucesso",
      });
    },
    onError: (error: Error, _appointmentId, context) => {
      const organizationId = profile?.organization_id;
      if (context?.previousData) {
        queryClient.setQueryData(appointmentKeys.list(organizationId), context.previousData);
      }
      context?.previousPeriodQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      ErrorHandler.handle(error, "useDeleteAppointment");
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: AppointmentStatus;
    }) => {
      if (!appointmentId) throw new Error("ID do agendamento é obrigatório");
      if (!status) throw new Error("Status é obrigatório");
      await requireUserOrganizationId();
      return await AppointmentService.updateStatus(appointmentId, status);
    },
    onMutate: async ({ appointmentId, status }) => {
      const organizationId = profile?.organization_id;
      const normalizedStatus = normalizeFrontendStatus(status);

      await queryClient.cancelQueries({
        queryKey: appointmentKeys.list(organizationId),
      });
      await queryClient.cancelQueries({ queryKey: appointmentPeriodKeys.all });
      await queryClient.cancelQueries({ queryKey: ["schedule-appointments"] });

      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(organizationId),
      );
      const previousPeriodQueries = queryClient.getQueriesData({
        queryKey: appointmentPeriodKeys.all,
      });
      const previousScheduleQueries = queryClient.getQueriesData({
        queryKey: ["schedule-appointments"],
      });

      // Atualiza o cache principal imediatamente
      queryClient.setQueryData(
        appointmentKeys.list(organizationId),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: (old?.data || []).map((apt) =>
            apt.id === appointmentId ? { ...apt, status: normalizedStatus } : apt,
          ),
        }),
      );

      // Atualiza todas as queries de período (visão semanal/diária do calendário)
      queryClient.setQueriesData(
        { queryKey: appointmentPeriodKeys.all },
        (old: AppointmentBase[] | undefined) =>
          old?.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: normalizedStatus } : apt,
          ),
      );

      queryClient.setQueriesData(
        { queryKey: ["schedule-appointments"] },
        (old: AppointmentBase[] | undefined) =>
          old?.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: normalizedStatus } : apt,
          ),
      );

      return { previousData, previousPeriodQueries, previousScheduleQueries };
    },
    onSuccess: (updatedData, variables) => {
      const organizationId = profile?.organization_id;
      const { appointmentId } = variables;
      const isOffline = isOfflinePlaceholder(updatedData);

      if (isOffline) {
        toast({
          title: "Salvo localmente",
          description: "Status será sincronizado quando a conexão voltar.",
        });
        return;
      }

      // Se tivermos os dados atualizados, injetamos no cache para evitar o "flicker" de refetch
      if (updatedData) {
        mergeAppointmentIntoCaches(queryClient, organizationId, appointmentId, updatedData);
      }

      invalidateAppointmentsCache(queryClient, updatedData?.date, organizationId);

      toast({
        title: "Status atualizado",
        description: `Status alterado para ${variables.status}`,
      });
    },
    onError: (error, _variables, context) => {
      const organizationId = profile?.organization_id;
      if (context?.previousData) {
        queryClient.setQueryData(appointmentKeys.list(organizationId), context.previousData);
      }
      context?.previousPeriodQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousScheduleQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      logger.error("Erro ao atualizar status", error, "useAppointmentsMutations");
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    },
  });
}
