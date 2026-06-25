import { lazy, Suspense } from "react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useExercisesRouteContext } from "./exercisesRouteContext";

const ExerciseAI = lazy(() =>
  import("@/components/ai/ExerciseAI").then((m) => ({ default: m.ExerciseAI })),
);

function TabFallback() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Skeleton className="w-full h-[400px] rounded-xl" />
    </div>
  );
}

export default function ExerciseAiPage() {
  const {
    exerciseAIPatient,
    exercises,
    loadingPatients,
    onPatientChange,
    patients,
    selectedPatientId,
  } = useExercisesRouteContext();

  return (
    <ComponentErrorBoundary componentName="ExerciseAI">
      <Suspense fallback={<TabFallback />}>
        <ExerciseAI
          patient={exerciseAIPatient}
          patientOptions={patients}
          selectedPatientId={selectedPatientId}
          onPatientChange={onPatientChange}
          isLoadingPatients={loadingPatients}
          exerciseLibrary={exercises}
          onExerciseSelect={(selectedExercises) => {
            logger.debug("Exercises selected", { selectedExercises }, "Exercises");
          }}
        />
      </Suspense>
    </ComponentErrorBoundary>
  );
}
