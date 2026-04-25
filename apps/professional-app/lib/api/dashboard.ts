import { fetchApi } from "./client";
import type { ApiResponse, ApiDashboardStats } from "@/types/api";

export async function getDashboardStats(organizationId?: string): Promise<ApiDashboardStats> {
  try {
    const response = await fetchApi<ApiResponse<ApiDashboardStats>>("/api/insights/dashboard", {
      params: { organizationId },
    });
    return (
      response.data || {
        activePatients: 0,
        todayAppointments: 0,
        pendingAppointments: 0,
        completedAppointments: 0,
      }
    );
  } catch (error) {
    console.error("[getDashboardStats] Error:", error);
    return {
      activePatients: 0,
      todayAppointments: 0,
      pendingAppointments: 0,
      completedAppointments: 0,
    };
  }
}
