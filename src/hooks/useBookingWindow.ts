import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulingApi, type ScheduleBookingWindow } from "@/api/v2/scheduling";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface BookingWindowData {
  minAdvanceDays: number;
  maxAdvanceDays: number;
  allowSameDay: boolean;
  allowOnlineBooking: boolean;
}

const QUERY_KEY = "schedule-booking-window";

const DEFAULT_BOOKING_WINDOW: BookingWindowData = {
  minAdvanceDays: 0,
  maxAdvanceDays: 60,
  allowSameDay: true,
  allowOnlineBooking: true,
};

export function useBookingWindow() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async (): Promise<BookingWindowData> => {
      try {
        const res = await schedulingApi.bookingWindow.get();
        const row = (res?.data ?? null) as ScheduleBookingWindow | null;
        if (!row) return DEFAULT_BOOKING_WINDOW;
        return {
          minAdvanceDays: row.min_advance_days,
          maxAdvanceDays: row.max_advance_days,
          allowSameDay: row.same_day_booking,
          allowOnlineBooking: row.online_booking,
        };
      } catch {
        return DEFAULT_BOOKING_WINDOW;
      }
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const save = useMutation({
    mutationFn: async (d: BookingWindowData) => {
      await schedulingApi.bookingWindow.upsert({
        min_advance_days: d.minAdvanceDays,
        max_advance_days: d.maxAdvanceDays,
        same_day_booking: d.allowSameDay,
        online_booking: d.allowOnlineBooking,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar janela de agendamento", variant: "destructive" });
    },
  });

  return {
    data: data ?? DEFAULT_BOOKING_WINDOW,
    isLoading,
    save: save.mutate,
    isSaving: save.isPending,
  };
}
