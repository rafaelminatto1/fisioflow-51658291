import { useQuery } from "@tanstack/react-query";
import { patientsApi, type PatientRow } from "@/api/v2";
import { differenceInDays, parseISO } from "date-fns";

/**
 * Hook para identificar pacientes inativos que precisam de reengajamento
 */
export function usePatientReengagement() {
  const { data: inactivePatients = [], isLoading } = useQuery({
    queryKey: ["inactive-patients-reengagement"],
    queryFn: async () => {
      const res = await patientsApi.list({ status: "ativo", limit: 200, minimal: true });
      const patients = (res?.data ?? []) as PatientRow[];
      const today = new Date();

      return patients
        .filter((p) => {
          const lastVisitDate = p.last_appointment_date || p.lastAppointmentDate;
          if (!lastVisitDate) return false;
          const lastVisit = parseISO(lastVisitDate);
          const daysSinceLastVisit = differenceInDays(today, lastVisit);

          // Critério: mais de 60 dias sem visita
          return daysSinceLastVisit >= 60;
        })
        .map((p) => {
          const lastVisitDate = p.last_appointment_date || p.lastAppointmentDate;
          return {
            id: p.id,
            name: p.name || p.full_name,
            phone: p.phone,
            daysInactive: differenceInDays(today, parseISO(lastVisitDate!)),
            lastVisit: lastVisitDate,
          };
        })
        .sort((a, b) => b.daysInactive - a.daysInactive);
    },
  });

  return {
    inactivePatients,
    isLoading,
    totalToReengage: inactivePatients.length,
  };
}
