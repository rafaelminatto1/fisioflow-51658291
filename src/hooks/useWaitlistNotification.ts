import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WaitlistSlotAvailablePayload {
  waitlist_id: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_phone: string;
  target_date: string;
  target_time: string;
}

export function useWaitlistNotification(
  onNotification?: (payload: WaitlistSlotAvailablePayload) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleWaitlistEvent = (event: CustomEvent<WaitlistSlotAvailablePayload>) => {
      const payload = event.detail;

      const dateStr = new Date(payload.target_date).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const timeStr = payload.target_time.slice(0, 5);

      const patientName = payload.patient_name || "Paciente";

      toast.info(
        `Vaga liberada para ${patientName} em ${dateStr} às ${timeStr}`,
        {
          action: {
            label: "Agendar agora",
            onClick: () => {
              onNotification?.(payload);
            },
          },
          duration: 10000,
        }
      );

      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
    };

    window.addEventListener("waitlist_slot_available", handleWaitlistEvent as EventListener);

    return () => {
      window.removeEventListener("waitlist_slot_available", handleWaitlistEvent as EventListener);
    };
  }, [queryClient, onNotification]);
}

export function useWaitlistSlotAvailableListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleEvent = (event: CustomEvent<WaitlistSlotAvailablePayload>) => {
      const payload = event.detail;

      const dateStr = new Date(payload.target_date).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const timeStr = payload.target_time.slice(0, 5);

      const patientName = payload.patient_name || "Paciente";

      toast.info(
        `Vaga liberada para ${patientName} em ${dateStr} às ${timeStr}`,
        {
          action: {
            label: "Agendar agora",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("waitlist_schedule_now", { detail: payload }));
            },
          },
          duration: 10000,
        }
      );

      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist-stats"] });
    };

    window.addEventListener("waitlist_slot_available", handleEvent as EventListener);

    return () => {
      window.removeEventListener("waitlist_slot_available", handleEvent as EventListener);
    };
  }, [queryClient]);
}