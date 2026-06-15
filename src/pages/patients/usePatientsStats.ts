import { useMemo } from "react";

export function usePatientsStats(patients: any[], statsMap: any, totalCount: number) {
  return useMemo(() => {
    const stats = {
      total: totalCount,
      active: 0,
      inactive7: 0,
      inactive30: 0,
      inactive60: 0,
      noShowRisk: 0,
      hasUnpaid: 0,
      newPatients: 0,
      completed: 0,
    };

    Object.values(statsMap).forEach((patientStats: any) => {
      switch (patientStats.classification) {
        case "active":
          stats.active++;
          break;
        case "inactive_7":
          stats.inactive7++;
          break;
        case "inactive_30":
          stats.inactive30++;
          break;
        case "inactive_custom":
          stats.inactive60++;
          break;
        case "no_show_risk":
          stats.noShowRisk++;
          break;
        case "has_unpaid":
          stats.hasUnpaid++;
          break;
        case "new_patient":
          stats.newPatients++;
          break;
      }
    });

    patients.forEach((p) => {
      if (p.status === "Concluído") stats.completed++;
    });

    return stats;
  }, [patients, statsMap, totalCount]);
}
