import { fetchApi } from "./client";
import type { ApiResponse, ApiDashboardStats, ApiInsightsDashboard } from "@/types/api";

/**
 * `/api/insights/dashboard` responde agregados por período
 * (`{ appointments: { total, completed, upcoming }, ... }`), não os quatro campos
 * planos que os cards da home consomem. Até 08/2026 o app tipava a resposta como
 * se fossem planos, então `stats.activePatients` e companhia vinham `undefined` e
 * os cards mostravam "..." para sempre. A tradução acontece aqui.
 *
 * `period=today` porque três dos quatro cards são do dia ("Consultas Hoje",
 * "Aguardando Conf.", "Concluídas Hoje"). Pacientes ativos é dos últimos 90 dias
 * e não depende do período.
 */
export async function getDashboardStats(): Promise<ApiDashboardStats> {
  const response = await fetchApi<ApiResponse<ApiInsightsDashboard>>("/api/insights/dashboard", {
    params: { period: "today" },
  });

  const data = response.data;

  return {
    activePatients: Number(data?.active_patients ?? 0),
    todayAppointments: Number(data?.appointments?.total ?? 0),
    pendingAppointments: Number(data?.appointments?.upcoming ?? 0),
    completedAppointments: Number(data?.appointments?.completed ?? 0),
  };
}
