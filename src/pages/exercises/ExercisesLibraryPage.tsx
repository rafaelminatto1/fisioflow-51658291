import "@/styles/bundles/exercises-library.css";
import { lazy, Suspense } from "react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useExercisesRouteContext } from "./exercisesRouteContext";

const ExerciseLibrary = lazy(() =>
  import("@/components/exercises/ExerciseLibrary").then((m) => ({
    default: m.ExerciseLibrary,
  })),
);

export default function ExercisesLibraryPage() {
  const { onEditExercise } = useExercisesRouteContext();

  return (
    <ComponentErrorBoundary componentName="ExerciseLibrary">
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center">
            <Skeleton className="w-full h-[400px] rounded-xl" />
          </div>
        }
      >
        <ExerciseLibrary onEditExercise={onEditExercise} />
      </Suspense>
    </ComponentErrorBoundary>
  );
}
