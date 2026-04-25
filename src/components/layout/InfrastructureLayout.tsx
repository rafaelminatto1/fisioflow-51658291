import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { fisioLogger as logger } from "@/lib/errors/logger";

import { NetworkStatus } from "@/components/system/NetworkStatus";
import { SyncManager } from "@/components/system/SyncManager";
import { TourGuide } from "@/components/system/TourGuide";
import { VersionManager } from "@/components/system/VersionManager";
import { WebVitalsIndicator } from "@/components/system/WebVitalsIndicator";
import { PosePreloadManager } from "@/components/system/PosePreloadManager";

export function InfrastructureLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    void import("@/lib/mobile/push-notifications")
      .then(({ initPushNotifications }) => {
        if (isMounted) {
          return initPushNotifications(navigate);
        }
        return undefined;
      })
      .catch((error) => {
        logger.error(
          "Falha ao carregar inicialização de push notifications",
          error,
          "InfrastructureLayout",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return null;
}

// Public path helper
const PUBLIC_BOOT_PATH_PREFIXES = [
  "/auth",
  "/welcome",
  "/pre-cadastro",
  "/prescricoes/publica",
  "/agendar",
];

export function isPublicBootPath(pathname: string): boolean {
  return PUBLIC_BOOT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Pose preload helper
const POSE_BOOT_PATH_PREFIXES = [
  "/biomechanics",
  "/clinical/biomechanics",
  "/computer-vision",
  "/augmented-reality",
  "/dashboard/imagens",
];

function shouldPreloadPoseForPath(pathname: string): boolean {
  if (pathname.startsWith("/pacientes/") && pathname.includes("/imagens")) {
    return true;
  }
  return POSE_BOOT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Infrastructure Layout
 * Wraps all routes and handles global services like network status, sync, and notifications.
 */
export default function InfrastructureLayout() {
  const location = useLocation();
  const isPublicRoute = isPublicBootPath(location.pathname);
  const shouldPreloadPose = shouldPreloadPoseForPath(location.pathname);
  return (
    <>
      {!isPublicRoute && <NetworkStatus />}
      {!isPublicRoute && <SyncManager />}
      {!isPublicRoute && <TourGuide />}
      {!isPublicRoute && <VersionManager />}
      {!isPublicRoute && shouldPreloadPose && <PosePreloadManager />}
      {!isPublicRoute && import.meta.env.DEV && !window.location.search.includes("e2e=true") && (
        <WebVitalsIndicator />
      )}
      <Outlet />
    </>
  );
}
