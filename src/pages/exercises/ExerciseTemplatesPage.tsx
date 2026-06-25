import { lazy, Suspense } from "react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

const TemplateManager = lazy(() =>
  Promise.all([
    import("@/styles/bundles/exercises-templates.css"),
    import("@/components/exercises/TemplateManager"),
  ]).then(([, m]) => ({ default: m.TemplateManager })),
);

function TabFallback() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Skeleton className="w-full h-[400px] rounded-xl" />
    </div>
  );
}

export default function ExerciseTemplatesPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6">
      <ComponentErrorBoundary componentName="TemplateManager">
        <Suspense fallback={<TabFallback />}>
          <TemplateManager />
        </Suspense>
      </ComponentErrorBoundary>
    </div>
  );
}
