import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2";
import { toast } from "sonner";
import { PatientLifecycleEvent, LifecycleEventType } from "@/types/patientAnalytics";
import { PATIENT_ANALYTICS_KEYS } from "./constants";

export function usePatientLifecycleEvents(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.lifecycleEvents(patientId),
    queryFn: async (): Promise<PatientLifecycleEvent[]> => {
      if (!patientId) return [];
      const response = await analyticsApi.patientLifecycleEvents.list(patientId);
      return response?.data ?? [];
    },
    enabled: !!patientId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export interface PatientLifecycleSummaryData {
  current_stage: LifecycleEventType;
  days_in_current_stage: number;
  total_days_in_treatment: number;
  stage_history: Array<{
    stage: LifecycleEventType;
    date: string;
    duration_days?: number;
  }>;
}

export function usePatientLifecycleSummary(patientId: string) {
  const lifecycleEventsQuery = usePatientLifecycleEvents(patientId);
  const events = Array.isArray(lifecycleEventsQuery.data) ? lifecycleEventsQuery.data : [];

  const data: PatientLifecycleSummaryData =
    events.length === 0
      ? {
          current_stage: "lead_created",
          days_in_current_stage: 0,
          total_days_in_treatment: 0,
          stage_history: [],
        }
      : (() => {
          const now = new Date();
          const sortedEvents = [...events].sort(
            (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
          );

          const currentStage = sortedEvents[sortedEvents.length - 1].event_type;
          const currentStageDate = new Date(sortedEvents[sortedEvents.length - 1].event_date);
          const firstEventDate = new Date(sortedEvents[0].event_date);

          const stageHistory = sortedEvents.map((event, index) => {
            const nextEvent = sortedEvents[index + 1];
            return {
              stage: event.event_type,
              date: event.event_date,
              duration_days: nextEvent
                ? Math.floor(
                    (new Date(nextEvent.event_date).getTime() -
                      new Date(event.event_date).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : undefined,
            };
          });

          return {
            current_stage: currentStage as LifecycleEventType,
            days_in_current_stage: Math.floor(
              (now.getTime() - currentStageDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
            total_days_in_treatment: Math.floor(
              (now.getTime() - firstEventDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
            stage_history: stageHistory,
          };
        })();

  return {
    data,
    isLoading: lifecycleEventsQuery.isLoading,
    isFetching: lifecycleEventsQuery.isFetching,
    isError: lifecycleEventsQuery.isError,
    error: lifecycleEventsQuery.error,
    refetch: lifecycleEventsQuery.refetch,
  };
}

export function useCreateLifecycleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<PatientLifecycleEvent, "id" | "created_at">) => {
      const response = await analyticsApi.patientLifecycleEvents.create({
        patient_id: event.patient_id,
        event_type: event.event_type,
        event_date: event.event_date,
        notes: event.notes,
      });
      return response?.data ?? event;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.lifecycleEvents(variables.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.lifecycle(variables.patient_id),
      });
      toast.success("Evento de ciclo de vida registrado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar evento: " + error.message);
    },
  });
}
