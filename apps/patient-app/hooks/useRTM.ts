import { useState, useEffect, useCallback } from "react";
import { wearablesApi } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { log } from "../lib/logger";

export interface RTMStatus {
  patientId: string;
  engagementScore: number;
  clinicalAlerts: number;
  activityScore: number;
  status: string;
  milestones: {
    total: number;
    completed: number;
    nextMilestone: string | null;
  };
  trends: {
    steps: number;
    activeMinutes: number;
    adherence: number;
  };
}

export function useRTM() {
  const { user } = useAuthStore();
  const [data, setData] = useState<RTMStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRtmStatus = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const status = await wearablesApi.getRtmStatus(user.id);
      setData(status);
      setError(null);
    } catch (err) {
      log.error("USE_RTM", "Failed to fetch RTM status", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch RTM status"));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const syncMilestones = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await wearablesApi.syncMilestones(user.id);
      await fetchRtmStatus();
    } catch (err) {
      log.error("USE_RTM", "Failed to sync milestones", err);
    }
  }, [user?.id, fetchRtmStatus]);

  useEffect(() => {
    fetchRtmStatus();
  }, [fetchRtmStatus]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchRtmStatus,
    syncMilestones,
  };
}
