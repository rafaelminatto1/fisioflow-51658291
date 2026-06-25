import { lazy, Suspense } from "react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

const ClinicalAnalyticsDashboard = lazy(() =>
  import("@/components/analytics/ClinicalAnalyticsDashboard").then((m) => ({
    default: m.ClinicalAnalyticsDashboard,
  })),
);

function TabFallback() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Skeleton className="w-full h-[400px] rounded-xl" />
    </div>
  );
}

export default function ExerciseAnalyticsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6">
      <ComponentErrorBoundary componentName="ClinicalAnalyticsDashboard">
        <Suspense fallback={<TabFallback />}>
          <ClinicalAnalyticsDashboard />
        </Suspense>
      </ComponentErrorBoundary>
    </div>
  );
}
