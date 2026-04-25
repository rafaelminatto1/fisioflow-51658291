import React, { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const NotificationPreferences = lazy(() =>
  import("@/components/notifications/NotificationPreferences").then((module) => ({
    default: module.NotificationPreferences,
  })),
);
const NotificationHistory = lazy(() =>
  import("@/components/notifications/NotificationHistory").then((module) => ({
    default: module.NotificationHistory,
  })),
);

export function NotificationsTab() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <NotificationPreferences />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <NotificationHistory />
      </Suspense>
    </div>
  );
}
