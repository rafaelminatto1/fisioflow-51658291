import { useState, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  BookOpen,
  Target,
  FileText,
  Dumbbell,
  VideoOff,
  Video,
  Activity,
  Sparkles,
} from "lucide-react";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { ExerciseLibrary } from "@/components/exercises/ExerciseLibrary";
import { useExercises, type Exercise } from "@/hooks/useExercises";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import { useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { useExerciseTemplates } from "@/hooks/useExerciseTemplates";
import { useActivePatients } from "@/hooks/patients/usePatients";
import { Skeleton } from "@/components/ui/skeleton";
import { fisioLogger as logger } from "@/lib/errors/logger";
import type { Patient } from "@/types";

// Lazy load heavy components for better performance
const TemplateManager = lazy(() =>
  import("@/components/exercises/TemplateManager").then((m) => ({
    default: m.TemplateManager,
  })),
);
const ProtocolsManager = lazy(() =>
  import("@/components/exercises/ProtocolsManager").then((m) => ({
    default: m.ProtocolsManager,
  })),
);
const ExerciseVideoLibrary = lazy(() =>
  import("@/components/exercises/ExerciseVideoLibrary").then((m) => ({
    default: m.ExerciseVideoLibrary,
  })),
);
const ExerciseVideoUpload = lazy(() =>
  import("@/components/exercises/ExerciseVideoUpload").then((m) => ({
    default: m.ExerciseVideoUpload,
  })),
);
const NewExerciseModal = lazy(() =>
  import("@/components/modals/NewExerciseModal").then((m) => ({
    default: m.NewExerciseModal,
  })),
);
const ExerciseAI = lazy(() =>
  import("@/components/ai/ExerciseAI").then((m) => ({ default: m.ExerciseAI })),
);
const ClinicalAnalyticsDashboard = lazy(() =>
  import("@/components/analytics/ClinicalAnalyticsDashboard").then((m) => ({
    default: m.ClinicalAnalyticsDashboard,
  })),
);

const TabFallback = () => (
  <div className="p-8 flex items-center justify-center">
    <Skeleton className="w-full h-[400px] rounded-xl" />
  </div>
);

function calculateAge(birthDate?: string | null): number {
  if (!birthDate) return 0;

  const parsedBirthDate = new Date(birthDate);
  if (Number.isNaN(parsedBirthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - parsedBirthDate.getFullYear();
  const monthDiff = today.getMonth() - parsedBirthDate.getMonth();
  const dayDiff = today.getDate() - parsedBirthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function toExerciseAIPatient(patient?: Patient) {
  if (!patient) return undefined;

  const birthDate = patient.birthDate || patient.birth_date || "";

  return {
    id: patient.id,
    name: patient.name || patient.full_name || "Paciente sem nome",
    birthDate,
    gender: patient.gender || "outro",
    mainCondition: patient.mainCondition || patient.status || "Condição não especificada",
    medicalHistory: patient.medicalHistory || patient.observations || "",
    age: calculateAge(birthDate),
  };
}

export default function Exercises() {
  const {
    exercises,
    loading: loadingExercises,
    createExercise,
    updateExercise,
    isCreating,
    isUpdating,
  } = useExercises();
  useExerciseFavorites();
  const { protocols, loading: loadingProtocols } = useExerciseProtocols();
  const { templates, loading: loadingTemplates } = useExerciseTemplates();

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => searchParams.get("tab") || "library");
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => searchParams.get("patientId") || "",
  );
  const shouldLoadPatientsForAI = activeTab === "ai" || Boolean(selectedPatientId);
  const { data: patients = [], isLoading: loadingPatients } = useActivePatients({
    enabled: shouldLoadPatientsForAI,
  });

  // Sync state from URL
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    } else if (!tabFromUrl && activeTab !== "library") {
      setActiveTabState("library");
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const patientIdFromUrl = searchParams.get("patientId") || "";
    if (patientIdFromUrl !== selectedPatientId) {
      setSelectedPatientId(patientIdFromUrl);
    }
  }, [searchParams, selectedPatientId]);

  const handleTabChange = useCallback(
    (v: string) => {
      setActiveTabState(v);
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set("tab", v);
          return newParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handlePatientChange = useCallback(
    (patientId: string) => {
      setSelectedPatientId(patientId);
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          if (patientId) {
            newParams.set("patientId", patientId);
          } else {
            newParams.delete("patientId");
          }
          return newParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [showNewModal, setShowNewModal] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  // Filter exercises based on search and active tab
  // Memoized computed values to prevent unnecessary recalculations
  const exercisesWithoutVideo = useMemo(() => exercises.filter((ex) => !ex.video_url), [exercises]);

  const exercisesWithVideo = useMemo(() => exercises.filter((ex) => ex.video_url), [exercises]);

  const videoPercentage = useMemo(
    () =>
      exercises.length > 0 ? Math.round((exercisesWithVideo.length / exercises.length) * 100) : 0,
    [exercises.length, exercisesWithVideo.length],
  );

  // Memoized callbacks to prevent unnecessary re-renders
  const handleEditExercise = useCallback((exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowNewModal(true);
  }, []);

  const handleNewExercise = useCallback(() => {
    setEditingExercise(null);
    setShowNewModal(true);
  }, []);

  const handleSubmit = useCallback(
    (data: Omit<Exercise, "id" | "created_at" | "updated_at">) => {
      if (editingExercise) {
        updateExercise({ id: editingExercise.id, ...data });
      } else {
        createExercise(data);
      }
      setShowNewModal(false);
      setEditingExercise(null);
    },
    [editingExercise, updateExercise, createExercise],
  );

  const handleModalOpenChange = useCallback((open: boolean) => {
    setShowNewModal(open);
    if (!open) setEditingExercise(null);
  }, []);

  const handleVideoUploadOpenChange = useCallback((open: boolean) => {
    setShowVideoUpload(open);
  }, []);

  const handleUploadClick = useCallback(() => {
    setShowVideoUpload(true);
  }, []);

  const isLoading = loadingExercises || loadingProtocols || loadingTemplates;
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId],
  );
  const exerciseAIPatient = useMemo(() => toExerciseAIPatient(selectedPatient), [selectedPatient]);

  return (
    <MainLayout>
      <div className="space-y-3 pb-20 md:pb-0 animate-fade-in">
        {/* Compact Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1
                className="text-base sm:text-lg font-semibold leading-tight"
                data-testid="exercise-library-title"
              >
                Biblioteca de Exercícios
              </h1>
              {isLoading ? (
                <Skeleton className="h-3.5 w-48 mt-1" />
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                  <span>
                    <span className="font-medium text-foreground">{exercises.length}</span>{" "}
                    exercícios
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    <span className="font-medium text-emerald-600">
                      {exercisesWithVideo.length}
                    </span>{" "}
                    com vídeo ({videoPercentage}%)
                  </span>
                  <span className="text-border hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    <span className="font-medium text-blue-600">{templates.length}</span> templates
                  </span>
                  <span className="text-border hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    <span className="font-medium text-amber-600">{protocols.length}</span>{" "}
                    protocolos
                  </span>
                </div>
              )}
            </div>
          </div>

          {(activeTab === "library" || activeTab === "videos") && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={handleNewExercise}
                size="sm"
                className="gap-1.5 shadow-sm shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Exercício</span>
              </Button>
              <Button onClick={handleUploadClick} variant="outline" size="sm" className="gap-1.5">
                <Video className="h-4 w-4" />
                <span className="hidden xs:inline">Upload Vídeo</span>
                <span className="xs:hidden">Upload</span>
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Tabs - Mobile Optimized */}
        <Card className="overflow-visible border-none bg-transparent shadow-none">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="border-b bg-background/95 backdrop-blur-sm rounded-t-xl overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-0 bg-transparent h-12 sm:h-14 p-0">
                <TabsTrigger
                  value="library"
                  data-testid="tab-library"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Biblioteca</span>
                  <Badge
                    variant="secondary"
                    className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs"
                  >
                    {exercises.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="videos"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Mídias</span>
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  data-testid="tab-templates"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Templates</span>
                  <Badge
                    variant="secondary"
                    className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs"
                  >
                    {templates.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="protocols"
                  data-testid="tab-protocols"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Protocolos</span>
                  <Badge
                    variant="secondary"
                    className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs"
                  >
                    {protocols.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm bg-gradient-to-r from-cyan-500/10 to-teal-500/10 hover:from-cyan-500/20 hover:to-teal-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-600" />
                  <span className="hidden xs:inline">IA Assistente</span>
                  <Badge
                    variant="secondary"
                    className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs bg-cyan-500/20 text-cyan-600"
                  >
                    NOVO
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="library" className="m-0 p-0">
              <ComponentErrorBoundary componentName="ExerciseLibrary">
                <ExerciseLibrary onEditExercise={handleEditExercise} />
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="videos" className="m-0 p-3 sm:p-4 md:p-6 space-y-4">
              {!isLoading && exercisesWithoutVideo.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3">
                  <VideoOff className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-800 dark:text-orange-200 flex-1">
                    <span className="font-medium">{exercisesWithoutVideo.length} exercícios</span>{" "}
                    sem mídia demonstrativa
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 h-7 text-xs"
                    onClick={() => handleTabChange("library")}
                  >
                    Ver na biblioteca
                  </Button>
                </div>
              )}
              <ComponentErrorBoundary componentName="ExerciseVideoLibrary">
                <Suspense fallback={<TabFallback />}>
                  <ExerciseVideoLibrary onUploadClick={handleUploadClick} />
                </Suspense>
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="templates" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="TemplateManager">
                <Suspense fallback={<TabFallback />}>
                  <TemplateManager />
                </Suspense>
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="protocols" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="ProtocolsManager">
                <Suspense fallback={<TabFallback />}>
                  <ProtocolsManager />
                </Suspense>
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="ai" className="m-0 p-0 sm:p-0">
              <ComponentErrorBoundary componentName="ExerciseAI">
                <Suspense fallback={<TabFallback />}>
                  <ExerciseAI
                    patient={exerciseAIPatient}
                    patientOptions={patients}
                    selectedPatientId={selectedPatientId}
                    onPatientChange={handlePatientChange}
                    isLoadingPatients={loadingPatients}
                    exerciseLibrary={exercises}
                    onExerciseSelect={(selectedExercises) => {
                      logger.debug("Exercises selected", { selectedExercises }, "Exercises");
                    }}
                  />
                </Suspense>
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="analytics" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="ClinicalAnalyticsDashboard">
                <Suspense fallback={<TabFallback />}>
                  <ClinicalAnalyticsDashboard />
                </Suspense>
              </ComponentErrorBoundary>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <Suspense fallback={null}>
        <NewExerciseModal
          open={showNewModal}
          onOpenChange={handleModalOpenChange}
          onSubmit={handleSubmit}
          exercise={editingExercise || undefined}
          isLoading={isCreating || isUpdating}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ExerciseVideoUpload
          open={showVideoUpload}
          onOpenChange={handleVideoUploadOpenChange}
          onSuccess={() => {
            // Invalidate queries to refresh video list
          }}
        />
      </Suspense>
    </MainLayout>
  );
}
