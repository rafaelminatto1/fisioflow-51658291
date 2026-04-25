import { useMemo } from "react";
import { getBuildEnvironment } from "@/utils/environment";

export interface FeatureFlags {
  enablePatientManagement: boolean;
  enableAppointments: boolean;
  enableFinance: boolean;
  enableProtocols: boolean;
  enableAuth: boolean;
  enableLiveCamera: boolean;
  enablePoseDetection: boolean;
  enableCharts: boolean;
  enableCameraPicker: boolean;
}

export function useFeatureFlags(): FeatureFlags {
  const env = getBuildEnvironment();

  return useMemo(
    () => ({
      enablePatientManagement: true,
      enableAppointments: true,
      enableFinance: true,
      enableProtocols: true,
      enableAuth: true,
      enableLiveCamera: !env.isExpoGo,
      enablePoseDetection: !env.isExpoGo,
      enableCharts: true,
      enableCameraPicker: true,
    }),
    [env.isExpoGo],
  );
}
