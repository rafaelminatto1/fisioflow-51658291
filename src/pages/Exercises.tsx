/**
 * DOCUMENTAÇÃO DESTA PÁGINA:
 * Consulte o arquivo de documentação em 'docs/exercises-page.md' na raiz do projeto
 * antes de fazer qualquer modificação neste arquivo ou em componentes relacionados à biblioteca de exercícios.
 */
import "@/styles/bundles/exercises-shell.css";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  BookOpen,
  ClipboardList,
  Dumbbell,
  FileText,
  Plus,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExercises, type Exercise } from "@/hooks/useExercises";
import { useExerciseFavorites } from "@/hooks/useExerciseFavorites";
import { useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { useExerciseTemplates } from "@/hooks/useExerciseTemplates";
import { useActivePatients } from "@/hooks/patients/usePatients";
import type { Patient } from "@/types";
import type { ExerciseAIPatientSummary, ExercisesRouteContextValue } from "./exercises/exercisesRouteContext";

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

const SECTION_NAV = [
  { key: "library", label: "Biblioteca", icon: BookOpen, href: "/exercises" },
  { key: "templates", label: "Templates", icon: FileText, href: "/exercises/templates" },
  { key: "protocols", label: "Protocolos", icon: Target, href: "/exercises/protocols" },
  { key: "search-ai", label: "Busca IA", icon: Search, href: "/exercises/search-ai", badge: "IA" },
  { key: "ai", label: "IA Assistente", icon: Sparkles, href: "/exercises/ai" },
  { key: "curation", label: "Curadoria", icon: ClipboardList, href: "/exercises/curation" },
  { key: "analytics", label: "Analytics", icon: Activity, href: "/exercises/analytics" },
] as const;

const LEGACY_TAB_TO_PATH: Record<string, string> = {
  library: "/exercises",
  videos: "/exercises/videos",
  templates: "/exercises/templates",
  protocols: "/exercises/protocols",
  "search-ai": "/exercises/search-ai",
  ai: "/exercises/ai",
  curation: "/exercises/curation",
  analytics: "/exercises/analytics",
};

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

function toExerciseAIPatient(patient?: Patient): ExerciseAIPatientSummary | undefined {
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

function resolveActiveSection(pathname: string) {
  if (pathname.startsWith("/exercises/videos")) return "videos";
  if (pathname.startsWith("/exercises/templates")) return "templates";
  if (pathname.startsWith("/exercises/protocols")) return "protocols";
  if (pathname.startsWith("/exercises/search-ai")) return "search-ai";
  if (pathname.startsWith("/exercises/ai")) return "ai";
  if (pathname.startsWith("/exercises/curation")) return "curation";
  if (pathname.startsWith("/exercises/analytics")) return "analytics";
  return "library";
}

function buildLegacyRedirect(searchParams: URLSearchParams) {
  const tab = searchParams.get("tab");
  if (!tab) return null;

  const pathname = LEGACY_TAB_TO_PATH[tab] ?? "/exercises";
  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("tab");
  const search = nextParams.toString();

  return `${pathname}${search ? `?${search}` : ""}`;
}

export default function Exercises() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const legacyRedirect = buildLegacyRedirect(searchParams);

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
  const [selectedPatientId, setSelectedPatientId] = useState(() => searchParams.get("patientId") || "");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  const activeSection = resolveActiveSection(location.pathname);
  const shouldLoadPatientsForAI = activeSection === "ai" || Boolean(selectedPatientId);
  const { data: patients = [], isLoading: loadingPatients } = useActivePatients({
    enabled: shouldLoadPatientsForAI,
  });

  if (legacyRedirect) {
    return <Navigate to={legacyRedirect} replace />;
  }

  const exercisesWithoutVideo = useMemo(() => exercises.filter((ex) => !ex.video_url), [exercises]);
  const exercisesWithVideo = useMemo(() => exercises.filter((ex) => ex.video_url), [exercises]);
  const isLoadingSummary = loadingExercises || loadingProtocols || loadingTemplates;

  useEffect(() => {
    const patientIdFromUrl = searchParams.get("patientId") || "";
    if (patientIdFromUrl !== selectedPatientId) {
      setSelectedPatientId(patientIdFromUrl);
    }
  }, [searchParams, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId],
  );
  const exerciseAIPatient = useMemo(() => toExerciseAIPatient(selectedPatient), [selectedPatient]);

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
    [createExercise, editingExercise, updateExercise],
  );

  const handleModalOpenChange = useCallback((open: boolean) => {
    setShowNewModal(open);
    if (!open) setEditingExercise(null);
  }, []);

  const handleUploadClick = useCallback(() => {
    setShowVideoUpload(true);
  }, []);

  const handleVideoUploadOpenChange = useCallback((open: boolean) => {
    setShowVideoUpload(open);
  }, []);

  const handlePatientChange = useCallback(
    (patientId: string) => {
      setSelectedPatientId(patientId);
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (patientId) {
            nextParams.set("patientId", patientId);
          } else {
            nextParams.delete("patientId");
          }
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const outletContext = useMemo<ExercisesRouteContextValue>(
    () => ({
      exercises,
      exercisesWithoutVideo,
      isLoadingSummary,
      selectedPatientId,
      patients,
      loadingPatients,
      exerciseAIPatient,
      onEditExercise: handleEditExercise,
      onPatientChange: handlePatientChange,
      onUploadClick: handleUploadClick,
    }),
    [
      exerciseAIPatient,
      exercises,
      exercisesWithoutVideo,
      handleEditExercise,
      handlePatientChange,
      handleUploadClick,
      isLoadingSummary,
      loadingPatients,
      patients,
      selectedPatientId,
    ],
  );

  return (
    <PageLayout fullWidth compactHeader>
      <PageHeader
        title="Biblioteca de Exercícios"
        description="Gerencie protocolos, templates e vídeos demonstrativos para prescrição clínica."
        icon={Dumbbell}
        breadcrumb={[{ label: "Exercícios", href: "/exercises" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl font-bold border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5"
              onClick={handleUploadClick}
            >
              <Video className="h-4 w-4 mr-2" />
              Upload Vídeo
            </Button>
            <Button
              size="sm"
              className="h-10 rounded-2xl px-5 font-bold shadow-sm bg-brand-blue hover:bg-brand-blue/90"
              onClick={handleNewExercise}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Exercício
            </Button>
          </div>
        }
      >
        {!isLoadingSummary && (
          <div className="flex items-center gap-4 mt-2 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-brand-blue" />
              <span className="text-xs font-medium text-slate-600">
                <span className="text-slate-900">{exercises.length}</span> Exercícios
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-600">
                <span className="text-slate-900">{exercisesWithVideo.length}</span> Com Vídeo
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-slate-600">
                <span className="text-slate-900">{templates.length}</span> Templates
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-slate-600">
                <span className="text-slate-900">{protocols.length}</span> Protocolos
              </span>
            </div>
          </div>
        )}
      </PageHeader>

      <PageContainer maxWidth="full">
        <Card className="overflow-visible border-none bg-transparent shadow-none">
          <div className="border-b bg-card rounded-t-xl overflow-hidden">
            <div className="bg-slate-100 p-1 rounded-xl mb-4 flex h-12 sm:h-14 gap-1 overflow-x-auto">
              {SECTION_NAV.map((item) => {
                const Icon = item.icon;
                const isLibrary = item.key === "library";
                const isTemplates = item.key === "templates";
                const isProtocols = item.key === "protocols";

                return (
                  <NavLink
                    key={item.key}
                    to={item.href}
                    end={item.key === "library"}
                    data-testid={
                      item.key === "library"
                        ? "tab-library"
                        : item.key === "templates"
                          ? "tab-templates"
                          : item.key === "protocols"
                            ? "tab-protocols"
                            : undefined
                    }
                    className={({ isActive }) =>
                      `flex min-w-max items-center gap-1.5 rounded-lg px-3 text-xs sm:px-4 md:px-6 sm:text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white text-brand-blue shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                        item.key === "ai" ? "text-cyan-600" : ""
                      }`}
                    />
                    <span className="hidden xs:inline">{item.label}</span>
                    {isLibrary && (
                      <Badge
                        variant="secondary"
                        className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs"
                      >
                        {exercises.length}
                      </Badge>
                    )}
                    {isTemplates && (
                      <Badge
                        variant="secondary"
                        className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs"
                      >
                        {templates.length}
                      </Badge>
                    )}
                    {isProtocols && (
                      <Badge
                        variant="secondary"
                        className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs"
                      >
                        {protocols.length}
                      </Badge>
                    )}
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs bg-cyan-500/20 text-cyan-600"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          <Outlet context={outletContext} />
        </Card>

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
              // Query invalidation remains inside feature hooks.
            }}
          />
        </Suspense>
      </PageContainer>
    </PageLayout>
  );
}
