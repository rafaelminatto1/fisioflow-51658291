import { useEffect, lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NetworkStatus } from "@/components/ui/network-status";
import { SyncManager } from "@/components/sync/SyncManager";
import { OfflineBanner } from "@/components/sync/OfflineBanner";
import { TourGuide } from "@/components/system/TourGuide";
import { VersionManager } from "@/components/system/VersionManager";
import { WebVitalsIndicator } from "@/lib/monitoring/web-vitals";
import { PosePreloadManager } from "@/components/ai/PosePreloadManager";
import { AuthenticatedAppShell } from "@/components/app/AuthenticatedAppShell";
import { useClinicSetupWizard } from "@/hooks/useClinicSetupWizard";
import { useNpsPrompt } from "@/hooks/useNpsPrompt";
import { NpsPrompt } from "@/components/feedback/NpsPrompt";

const ClinicSetupWizard = lazy(() =>
  import("@/components/onboarding/ClinicSetupWizard").then((m) => ({
    default: m.ClinicSetupWizard,
  })),
);

import { useNavigate } from "react-router-dom";
import { fisioLogger as logger } from "@/lib/errors/logger";

const NotificationInitializer = () => {
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
          "RouterLayouts",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return null;
};

// Public path helper
const PUBLIC_BOOT_PATH_PREFIXES = [
  "/auth",
  "/welcome",
  "/pre-cadastro",
  "/prescricoes/publica",
  "/agendar",
  "/checkin",
];

function isPublicBootPath(pathname: string): boolean {
  return PUBLIC_BOOT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Pose preload helper
const POSE_BOOT_PATH_PREFIXES = ["/computer-vision", "/augmented-reality", "/dashboard/imagens"];

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
export const InfrastructureLayout = () => {
  const location = useLocation();
  const isPublicRoute = isPublicBootPath(location.pathname);
  const shouldPreloadPose = shouldPreloadPoseForPath(location.pathname);

  return (
    <>
      <NetworkStatus />
      {!isPublicRoute && <SyncManager />}
      {!isPublicRoute && <OfflineBanner />}
      {!isPublicRoute && <TourGuide />}
      {!isPublicRoute && <NotificationInitializer />}
      {!isPublicRoute && <VersionManager />}
      {!isPublicRoute && shouldPreloadPose && <PosePreloadManager />}
      {!isPublicRoute && import.meta.env.DEV && !window.location.search.includes("e2e=true") && (
        <WebVitalsIndicator />
      )}
      <Outlet />
    </>
  );
};

/**
 * App Shell Layout
 * Wraps private routes with the Authenticated App Shell.
 */
const SetupWizardPortal = () => {
  const { open, dismiss } = useClinicSetupWizard();
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <ClinicSetupWizard open={open} onClose={dismiss} />
    </Suspense>
  );
};

const NpsPromptPortal = () => {
  const { open, dismiss } = useNpsPrompt();
  if (!open) return null;
  return <NpsPrompt open={open} onDismiss={dismiss} />;
};

export const AppShellLayout = () => {
  const location = useLocation();
  const isPublicRoute = isPublicBootPath(location.pathname);

  if (isPublicRoute) {
    return <Outlet />;
  }

  return (
    <AuthenticatedAppShell>
      <Outlet />
      <SetupWizardPortal />
      <NpsPromptPortal />
    </AuthenticatedAppShell>
  );
};
