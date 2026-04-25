import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiLeaderboardEntry {
  id: string;
  patient_id: string;
  full_name: string;
  level: number;
  total_points: number;
  current_streak: number;
}

export async function getLeaderboard(params?: {
  period?: "weekly" | "monthly" | "all";
  limit?: number;
}): Promise<ApiLeaderboardEntry[]> {
  const response = await fetchApi<ApiResponse<ApiLeaderboardEntry[]>>(
    "/api/gamification/leaderboard",
    {
      params,
    },
  );
  return response.data || [];
}
