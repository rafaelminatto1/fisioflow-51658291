import { lazy, Suspense } from "react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

const ProtocolsManager = lazy(() =>
  Promise.all([
    import("@/styles/bundles/exercises-protocols.css"),
    import("@/components/exercises/ProtocolsManager"),
  ]).then(([, m]) => ({ default: m.ProtocolsManager })),
);

function TabFallback() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Skeleton className="w-full h-[400px] rounded-xl" />
    </div>
  );
}

export default function ExerciseProtocolsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6">
      <ComponentErrorBoundary componentName="ProtocolsManager">
        <Suspense fallback={<TabFallback />}>
          <ProtocolsManager />
        </Suspense>
      </ComponentErrorBoundary>
    </div>
  );
}
