/**
 * Patient Profile Page - Migrated to Neon/Cloudflare
 * Optimized with usePatientProfileOptimized for better performance
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { PatientHelpers, Patient } from "@/types";
import { request } from "@/api/v2/base";
import { APP_ROUTES, patientRoutes } from "@/lib/routing/appRoutes";
import { PatientProfileHeader } from "@/components/patient/PatientProfileHeader";
import { PersonalDataTab } from "@/components/patient/PersonalDataTab";
import { PatientClinicalHistoryTab } from "@/components/patient/PatientClinicalHistoryTab";
import { PatientAnalyticsTab } from "@/components/patient/PatientAnalyticsTab";
import { PatientDocumentsTab } from "@/components/patient/PatientDocumentsTab";
import { PatientFinancialTab } from "@/components/patient/PatientFinancialTab";
import { PatientGamificationTab } from "@/components/patient/PatientGamificationTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { PatientTimeline } from "@/components/patient/PatientTimeline";
import {
  Activity,
  Brain,
  Sparkles,
  History,
  ClipboardList,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { PatientTasksPanel } from "@/components/patient/PatientTasksPanel";
import EditPatientModal from "@/components/modals/EditPatientModal";
import { PatientQuickScheduleModal } from "@/components/patient/PatientQuickScheduleModal";
import { useTherapists } from "@/hooks/useTherapists";
import { RelatorioPremiumPDF } from "../relatorios/RelatorioPremiumPDF";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { OverviewTab } from "@/components/patient/OverviewTab";
import { EvidenceTab } from "@/components/patient/EvidenceTab";
import { AIMedicalReportModal } from "@/components/patient/AIMedicalReportModal";

// Hooks Otimizados
import { usePatientProfileOptimized } from "@/hooks/usePatientProfileOptimized";
import { usePatientEvolutionReport } from "@/hooks/usePatientEvolutionReport";
import { useEvaluationForms } from "@/hooks/useEvaluationForms";
import { Patient360ChatDrawer } from "@/features/ia-studio/components/Patient360ChatDrawer";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
const LazyDigitalTwinPanel = lazy(() =>
  import("@/components/patients/DigitalTwinPanel").then((m) => ({
    default: m.DigitalTwinPanel,
  })),
);

// Lazy loading para componentes de abas pesadas
const _LazyProgressAnalysisCard = lazy(() =>
  import("@/components/patient/ProgressAnalysisCard").then((m) => ({
    default: m.ProgressAnalysisCard,
  })),
);
const _LazyPatientEvolutionDashboard = lazy(() =>
  import("@/components/patient/PatientEvolutionDashboard").then((m) => ({
    default: m.PatientEvolutionDashboard,
  })),
);
const LazyEvolutionDashboard = lazy(() =>
  import("@/components/clinical/EvolutionDashboard").then((m) => ({
    default: m.EvolutionDashboard,
  })),
);
const LazyPatientActivityLabTab = lazy(() =>
  import("@/components/patient/PatientActivityLabTab").then((m) => ({
    default: m.PatientActivityLabTab,
  })),
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PatientProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [_searchParams] = useSearchParams();

  // Validação de UUID
  const isIdValid = id && id !== "undefined" && UUID_REGEX.test(id);

  useEffect(() => {
    if (!isIdValid && id) {
      console.error("[PatientProfilePage] ID de paciente inválido:", id);
      navigate(APP_ROUTES.PATIENTS, { replace: true });
    }
  }, [id, isIdValid, navigate]);

  if (!isIdValid) {
    return (
      <PageLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h2 className="text-2xl font-bold">ID de Paciente Inválido</h2>
            <Button onClick={() => navigate(APP_ROUTES.PATIENTS)}>Voltar para lista</Button>
          </div>
        </PageContainer>
      </PageLayout>
    );
  }

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <PatientProfileContent />
    </ErrorBoundary>
  );
};

const PatientProfileContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Valid tab values
  const validTabs = [
    "overview",
    "evolution",
    "timeline",
    "analytics",
    "personal",
    "clinical",
    "activity-lab",
    "financial",
    "gamification",
    "documents",
    "tasks",
    "evidence",
  ] as const;
  type TabValue = (typeof validTabs)[number];

  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl && validTabs.includes(tabFromUrl as TabValue)
      ? (tabFromUrl as TabValue)
      : "overview";
  });

  // Sync tab state with URL parameters
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validTabs.includes(tabFromUrl as TabValue) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl as TabValue);
    }
  }, [searchParams, activeTab]);

  // OTIMIZAÇÃO: Hook centralizado para carregar dados do perfil com cache inteligente e prefetch
  const { patient, appointments, documents, isLoading, isLoadingDocuments, invalidateTab } =
    usePatientProfileOptimized({
      patientId: id || "",
      activeTab:
        activeTab === "personal" || activeTab === "clinical" ? "overview" : (activeTab as any),
    });

  const [editingPatient, setEditingPatient] = useState<boolean>(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState<boolean>(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isMedicalReportOpen, setIsMedicalReportOpen] = useState<boolean>(false);
  const [generatedMedicalReport, setGeneratedMedicalReport] = useState<any>(null);

  const { data: evaluationForms = [] } = useEvaluationForms();

  // Buscar terapeutas para o modal de agendamento
  const { data: therapists = [] } = useTherapists();

  const { data: evolutionReportData } = usePatientEvolutionReport(id || "");

  const handleExportPremium = async () => {
    if (!patient || !evolutionReportData) {
      toast.error("Dados insuficientes para gerar PDF");
      return;
    }

    const patientNameStr = PatientHelpers.getName(patient as any);
    try {
      const blob = await pdf(
        <RelatorioPremiumPDF
          data={{
            clinica: {
              nome: "Activity Fisioterapia Mooca",
              endereco: "Rua Manuel Vieira de Sousa, 166 - Mooca, São Paulo - SP",
              telefone: "(11) 5874-9885",
              whatsapp: "11 93433-5858",
              logoUrl: "/logo/logo.png",
            },
            paciente: {
              nome: patientNameStr,
              cpf: patient.cpf || "---",
              data_nascimento: patient.birth_date,
            },
            profissional: {
              nome: "Rafael Minatto",
              registro: "CREFITO 12345-F",
              especialidade: "Fisioterapia Ortopédica",
            },
            data_emissao: new Date().toISOString(),
            narrativa_medica: `Paciente ${patientNameStr} apresenta evolução progressiva após intervenção fisioterapêutica. O quadro clínico inicial apresentava limitações funcionais e álgicas que foram mitigadas através de protocolo de cinesioterapia e mobilização articular precoce.`,
            narrativa_paciente: `Olá, ${patientNameStr}! Seu progresso está excelente. Aumentamos seu movimento do joelho e a dor diminuinu significativamente. Continue firme nos exercícios!`,
            evolucoes: (evolutionReportData.sessions || []).map((s: any) => ({
              data: s.date,
              objetivo: s.objective || s.observations || "Evolução de rotina.",
              dor: s.painLevel,
              mobilidade: s.mobilityScore,
            })),
            metricas: (evolutionReportData.measurementEvolution || []).map((m: any) => ({
              nome: m.name,
              inicial: `${m.initial.value}${m.initial.unit}`,
              atual: `${m.current.value}${m.current.unit}`,
              melhora: `${m.improvement}`,
            })),
            referencias: [
              {
                autor: "Smith et al.",
                titulo: "Efficacy of Early Mobilization in Knee Rehabilitation",
                periodico: "Journal of Orthopaedic & Sports Physical Therapy",
                url: "https://pubmed.ncbi.nlm.nih.gov/",
              },
            ],
          }}
        />,
      ).toBlob();

      saveAs(blob, `RELATORIO-PREMIUM-${patientNameStr.replace(/\s/g, "-")}.pdf`);
      toast.success("PDF Premium gerado com sucesso!");
    } catch (error) {
      logger.error("Erro ao gerar PDF Premium", error, "PatientProfilePage");
      toast.error("Erro ao gerar PDF Premium");
    }
  };

  useEffect(() => {
    if (patient && (patient as { incomplete_registration?: boolean }).incomplete_registration) {
      setEditingPatient(true);
    }
  }, [patient]);

  const handleStartEvaluation = () => {
    setEvaluationModalOpen(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    setEvaluationModalOpen(false);
    if (!id) return;
    navigate(`${patientRoutes.profile(id)}/evaluations/new/${templateId}`);
  };

  if (isLoading) {
    return (
      <PageLayout compactHeader>
        <PageContainer maxWidth="xl" className="space-y-6 pt-4 animate-fade-in">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row gap-6 md:items-start p-6 bg-card border border-blue-50/50 shadow-sm shadow-blue-500/5 rounded-xl">
            <div className="h-24 w-24 shrink-0 rounded-2xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-4 py-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
              <div className="flex gap-4">
                <div className="h-5 w-32 bg-muted animate-pulse rounded-md" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded-md" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
            <div className="flex gap-2 py-2">
              <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" />
              <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="sticky top-0 z-20 bg-card pb-1 pt-2 -mx-4 px-4 border-b border-blue-50/50 shadow-sm shadow-blue-500/5">
            <div className="flex gap-6 pb-2">
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="h-64 bg-muted animate-pulse rounded-xl" />
              <div className="h-64 bg-muted animate-pulse rounded-xl" />
            </div>
            <div className="space-y-6">
              <div className="h-96 bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        </PageContainer>
      </PageLayout>
    );
  }

  if (!patient) {
    return (
      <PageLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h2 className="text-2xl font-bold">Paciente não encontrado</h2>
            <Button onClick={() => navigate(APP_ROUTES.PATIENTS)}>Voltar para lista</Button>
          </div>
        </PageContainer>
      </PageLayout>
    );
  }

  const patientName = PatientHelpers.getName(patient as any);
  const initials = patientName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleOpenMedicalReport = async () => {
    if (!id) return;
    toast.loading("IA está sintetizando o laudo médico de desfecho...", {
      id: "medical-report",
    });

    try {
      const res = await request<{ success: boolean; data: any }>(
        `/api/ai/medical-report/outcome?patientId=${id}`,
      );
      setGeneratedMedicalReport(res.data);
      setIsMedicalReportOpen(true);
      toast.success("Laudo gerado com sucesso!", { id: "medical-report" });
    } catch (err) {
      console.error("Failed to generate medical report", err);
      toast.error("Falha ao gerar laudo médico.", { id: "medical-report" });
    }
  };

  const handleAskAI = () => {
    setIsChatOpen(true);
  };

  return (
    <PageLayout>
      <PageContainer>
        <div className="space-y-6 pb-20 fade-in relative">
          <PatientProfileHeader
            patient={patient as any}
            patientName={patientName}
            initials={initials}
            onBack={() => navigate(APP_ROUTES.PATIENTS)}
            onOpenReport={() => navigate(`/patient-evolution-report/${id}`)}
            onOpenPremiumReport={handleExportPremium}
            onOpenProntuario={() => navigate(`/prontuario/${id}`)}
            onEdit={() => setEditingPatient(true)}
            onEvaluate={handleStartEvaluation}
            onSchedule={() => setScheduleModalOpen(true)}
            onAskAI={handleAskAI}
            onOpenMedicalReport={handleOpenMedicalReport}
          />
          {/* Chat IA Contextual 360° */}
          <Patient360ChatDrawer
            open={isChatOpen}
            onOpenChange={setIsChatOpen}
            patientId={id || ""}
            patientName={patientName}
          />

          <AIMedicalReportModal
            open={isMedicalReportOpen}
            onOpenChange={setIsMedicalReportOpen}
            report={generatedMedicalReport}
            patientName={patientName}
          />

          {/* Modal de Agendamento Rápido */}
          <PatientQuickScheduleModal
            open={scheduleModalOpen}
            onOpenChange={setScheduleModalOpen}
            patient={patient as Patient}
            therapists={therapists.map((t: any) => ({
              id: t.id,
              name: t.name || t.full_name,
            }))}
          />

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as TabValue);
              const params = new URLSearchParams(searchParams);
              params.set("tab", value as string);
              navigate(`?${params.toString()}`, { replace: true });
            }}
            className="w-full"
          >
            <div className="sticky top-0 z-20 bg-card pb-1 pt-2 -mx-4 px-4 border-b border-blue-50/50 shadow-sm shadow-blue-500/5">
              <div className="relative">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent overflow-x-auto flex-nowrap scrollbar-hide gap-6 pr-12">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
                  >
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger
                    value="evolution"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Evolução
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
                  >
                    <History className="h-4 w-4" />
                    Linha do Tempo
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
                  >
                    <Brain className="h-4 w-4" />
                    Analytics & IA
                  </TabsTrigger>
                  <TabsTrigger
                    value="personal"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
                  >
                    Dados Pessoais
                  </TabsTrigger>
                  <TabsTrigger
                    value="clinical"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
                  >
                    Histórico Clínico
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity-lab"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Biomecânica
                  </TabsTrigger>
                  <TabsTrigger
                    value="financial"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
                  >
                    Financeiro
                  </TabsTrigger>
                  <TabsTrigger
                    value="gamification"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
                  >
                    Gamificação
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
                  >
                    Arquivos
                  </TabsTrigger>
                  <TabsTrigger
                    value="tasks"
                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Tarefas
                  </TabsTrigger>
                  <TabsTrigger
                    value="evidence"
                    className="data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
                  >
                    <Brain className="h-4 w-4" />
                    Evidência
                  </TabsTrigger>
                </TabsList>
                {/* Visual indicator for horizontal scroll */}
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
              </div>
            </div>

            <div className="mt-6 min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TabsContent
                    value="overview"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <OverviewTab
                      patient={patient as any}
                      upcomingAppointments={appointments}
                      invalidateTab={invalidateTab}
                    />
                  </TabsContent>

                  <TabsContent
                    value="evolution"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <Suspense fallback={<LoadingSkeleton type="card" />}>
                      <LazyEvolutionDashboard patientId={id || ""} />
                    </Suspense>
                  </TabsContent>

                  <TabsContent
                    value="timeline"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-premium-sm">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-8 flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-600" />
                        Linha do Tempo de Atividades
                      </h3>
                      <PatientTimeline patientId={id} />
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="analytics"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PatientAnalyticsTab
                      patientId={id || ""}
                      patientName={patientName}
                      birthDate={patient.birth_date}
                      condition={(patient as any).main_condition || "Não informada"}
                    />
                    <Suspense fallback={null}>
                      <LazyDigitalTwinPanel patientId={id || ""} />
                    </Suspense>
                  </TabsContent>

                  <TabsContent
                    value="personal"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PersonalDataTab patient={patient as any} />
                  </TabsContent>

                  <TabsContent
                    value="clinical"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PatientClinicalHistoryTab patientId={id || ""} />
                  </TabsContent>

                  <TabsContent
                    value="activity-lab"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <Suspense fallback={<LoadingSkeleton />}>
                      <LazyPatientActivityLabTab patientId={id || ""} />
                    </Suspense>
                  </TabsContent>

                  <TabsContent
                    value="financial"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PatientFinancialTab patientId={id || ""} appointments={appointments} />
                  </TabsContent>

                  <TabsContent
                    value="gamification"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PatientGamificationTab patientId={id || ""} />
                  </TabsContent>

                  <TabsContent
                    value="documents"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PatientDocumentsTab
                      patientId={id || ""}
                      documents={documents as any}
                      isLoading={isLoadingDocuments}
                    />
                  </TabsContent>

                  <TabsContent
                    value="tasks"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <PatientTasksPanel patientId={id || ""} />
                  </TabsContent>

                  <TabsContent
                    value="evidence"
                    className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
                  >
                    <EvidenceTab patient={patient} />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>

          <EditPatientModal
            open={editingPatient}
            onOpenChange={setEditingPatient}
            patientId={id}
            patient={patient as any}
          />

          <Dialog open={evaluationModalOpen} onOpenChange={setEvaluationModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  Iniciar Nova Avaliação
                </DialogTitle>
                <DialogDescription>
                  Selecione um template de avaliação para {patientName}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 pt-4">
                  {evaluationForms.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        Nenhum template de avaliação disponível
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vá em "Cadastros → Fichas de Avaliação" para criar templates
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {evaluationForms.filter((f) => f.is_favorite).slice(0, 3).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Favoritos
                          </p>
                          {evaluationForms
                            .filter((f) => f.is_favorite)
                            .slice(0, 3)
                            .map((form) => (
                              <button
                                type="button"
                                key={form.id}
                                onClick={() => handleSelectTemplate(form.id)}
                                className="w-full text-left p-3 rounded-lg border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{form.nome}</p>
                                    {form.descricao && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {form.descricao}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary" className="text-xs">
                                      {form.evaluation_form_fields?.length || 0} campos
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}

                      <details className="group">
                        <summary className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground list-none p-0 bg-transparent border-none w-full">
                          <span>Ver todos os templates</span>
                          <span className="ml-auto group-open:rotate-90 transition-transform">
                            ›
                          </span>
                        </summary>
                        <div className="mt-2 space-y-2 pl-4">
                          {evaluationForms.map((form) => (
                            <button
                              type="button"
                              key={form.id}
                              onClick={() => handleSelectTemplate(form.id)}
                              className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-between group"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{form.nome}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {form.tipo}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {form.evaluation_form_fields?.length || 0} campos
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                Selecionar →
                              </div>
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEvaluationModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setEvaluationModalOpen(false)}>Criar Template Novo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageContainer>
    </PageLayout>
  );
};

export default PatientProfilePage;
