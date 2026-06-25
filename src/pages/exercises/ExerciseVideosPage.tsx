import { lazy, Suspense } from "react";
import { NavLink } from "react-router-dom";
import { VideoOff } from "lucide-react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExercisesRouteContext } from "./exercisesRouteContext";

const ExerciseVideoLibrary = lazy(() =>
  Promise.all([
    import("@/styles/bundles/exercises-video.css"),
    import("@/components/exercises/ExerciseVideoLibrary"),
  ]).then(([, m]) => ({ default: m.ExerciseVideoLibrary })),
);

function TabFallback() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Skeleton className="w-full h-[400px] rounded-xl" />
    </div>
  );
}

export default function ExerciseVideosPage() {
  const { exercisesWithoutVideo, isLoadingSummary, onUploadClick } = useExercisesRouteContext();

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {!isLoadingSummary && exercisesWithoutVideo.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3">
          <VideoOff className="h-4 w-4 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800 dark:text-orange-200 flex-1">
            <span className="font-medium">{exercisesWithoutVideo.length} exercícios</span> sem
            mídia demonstrativa
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 h-7 text-xs"
          >
            <NavLink to="/exercises">Ver na biblioteca</NavLink>
          </Button>
        </div>
      )}

      <ComponentErrorBoundary componentName="ExerciseVideoLibrary">
        <Suspense fallback={<TabFallback />}>
          <ExerciseVideoLibrary onUploadClick={onUploadClick} />
        </Suspense>
      </ComponentErrorBoundary>
    </div>
  );
}
