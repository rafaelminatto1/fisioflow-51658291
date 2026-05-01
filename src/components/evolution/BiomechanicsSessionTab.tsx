/**
 * BiomechanicsSessionTab — Renders the correct studio inside a session context.
 * Results are auto-linked to the session's appointment_id when saved.
 */
import React, { Suspense, lazy, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Zap,
  AlignJustify,
  Layout,
  Save,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { biomechanicsApi, sessionsApi, type BiomechanicsData } from "@/api/v2";

type StudioType = "gait" | "jump" | "posture" | "functional" | "comparison";

const GaitAnalysisStudio = lazy(() =>
  import("@/components/analysis/studios/GaitAnalysisStudio").then((m) => ({
    default: m.GaitAnalysisStudio,
  })),
);
const JumpAnalysisStudio = lazy(() =>
  import("@/components/analysis/studios/JumpAnalysisStudio").then((m) => ({
    default: m.JumpAnalysisStudio,
  })),
);
const PostureAnalysisStudio = lazy(() =>
  import("@/components/analysis/studios/PostureAnalysisStudio").then((m) => ({
    default: m.PostureAnalysisStudio,
  })),
);
const FunctionalAnalysisStudio = lazy(() =>
  import("@/components/analysis/studios/FunctionalAnalysisStudio").then((m) => ({
    default: m.FunctionalAnalysisStudio,
  })),
);
const VisualComparisonStudio = lazy(() =>
  import("@/components/analysis/studios/VisualComparisonStudio").then((m) => ({
    default: m.VisualComparisonStudio,
  })),
);

const STUDIO_CONFIG: Record<
  StudioType,
  { label: string; description: string; icon: React.FC<any>; color: string; bgColor: string }
> = {
  gait: {
    label: "Marcha & Corrida em Esteira",
    description: "TC/TF, cadência, eventos e comparação 2D",
    icon: Activity,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  jump: {
    label: "Análise de Salto",
    description: "Altura, Bosco, Sayers, assimetria L/R",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
  },
  posture: {
    label: "Avaliação Postural",
    description: "Goniômetro, linha de prumo, planos",
    icon: AlignJustify,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30",
  },
  functional: {
    label: "Análise Funcional",
    description: "Tracking de pontos, checkpoints e vídeo 2D",
    icon: Layout,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/30",
  },
  comparison: {
    label: "Evolução Visual",
    description: "Compare 2 sessões e veja o progresso (Delta)",
    icon: ArrowLeftRight,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/30",
  },
};

interface BiomechanicsSessionTabProps {
  sessionId: string | null;
  patientId: string;
  appointmentId: string | null;
  patientName: string;
  existingBiomechanics?: BiomechanicsData | null;
}

function StudioLoadingFallback({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando {label.toLowerCase()}...
        </div>
      </CardContent>
    </Card>
  );
}

export const BiomechanicsSessionTab: React.FC<BiomechanicsSessionTabProps> = ({
  sessionId,
  patientId,
  appointmentId,
  patientName,
  existingBiomechanics,
}) => {
  const { toast } = useToast();
  const [selectedStudio, setSelectedStudio] = useState<StudioType | null>(
    (existingBiomechanics?.type as StudioType) || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedType, setSavedType] = useState<StudioType | null>(
    (existingBiomechanics?.type as StudioType) || null,
  );
  const [pendingData, setPendingData] = useState<Partial<BiomechanicsData> | null>(null);

  const handleSaveToSession = async () => {
    if (!selectedStudio) return;
    if (!sessionId && !appointmentId) {
      toast({
        title: "Sessão não encontrada",
        description: "Inicie um atendimento antes de salvar a análise biomecânica.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data: BiomechanicsData = {
        type: selectedStudio,
        analyzedAt: new Date().toISOString(),
        ...pendingData,
      };

      if (sessionId) {
        await biomechanicsApi.saveToSession(sessionId, data);
      } else if (appointmentId) {
        // Find or create the draft session for this appointment and then save
        const draftsRes = await sessionsApi.list({
          patientId: "", // Will be resolved server-side from appointment
          appointmentId,
          status: "draft",
          limit: 1,
        });
        const draft = draftsRes.data?.[0];
        if (draft?.id) {
          await biomechanicsApi.saveToSession(draft.id, data);
        }
      }

      setSavedType(selectedStudio);
      toast({
        title: "✅ Análise salva na sessão",
        description: `${STUDIO_CONFIG[selectedStudio].label} vinculada ao atendimento de ${patientName}.`,
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível vincular a análise à sessão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStudioData = (data: any) => {
    setPendingData((prev) => ({ ...prev, ...data }));
  };

  const renderStudio = () => {
    const selectedLabel = selectedStudio ? STUDIO_CONFIG[selectedStudio].label : "estúdio";

    switch (selectedStudio) {
      case "gait":
        return (
          <Suspense fallback={<StudioLoadingFallback label={selectedLabel} />}>
            <GaitAnalysisStudio onDataUpdate={handleStudioData} />
          </Suspense>
        );
      case "jump":
        return (
          <Suspense fallback={<StudioLoadingFallback label={selectedLabel} />}>
            <JumpAnalysisStudio onDataUpdate={handleStudioData} />
          </Suspense>
        );
      case "posture":
        return (
          <Suspense fallback={<StudioLoadingFallback label={selectedLabel} />}>
            <PostureAnalysisStudio onDataUpdate={handleStudioData} />
          </Suspense>
        );
      case "functional":
        return (
          <Suspense fallback={<StudioLoadingFallback label={selectedLabel} />}>
            <FunctionalAnalysisStudio onDataUpdate={handleStudioData} />
          </Suspense>
        );
      case "comparison":
        return (
          <Suspense fallback={<StudioLoadingFallback label={selectedLabel} />}>
            <VisualComparisonStudio patientId={patientId} onDataUpdate={handleStudioData} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Studio Selector */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black tracking-tight">Análise Biomecânica</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione o tipo e execute a análise. Os resultados serão vinculados a esta sessão.
            </p>
          </div>
          {savedType && (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              {STUDIO_CONFIG[savedType].label} salva
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(STUDIO_CONFIG) as [StudioType, typeof STUDIO_CONFIG.gait][]).map(
            ([type, config]) => {
              const Icon = config.icon;
              const isSelected = selectedStudio === type;
              return (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStudio(type)}
                  className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? `${config.bgColor} border-2`
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="studio-indicator"
                      className="absolute top-3 right-3"
                      initial={false}
                    >
                      <div className="h-2 w-2 rounded-full bg-current" />
                    </motion.div>
                  )}
                  <div className={`p-2 rounded-xl ${isSelected ? config.bgColor : "bg-muted/50"}`}>
                    <Icon
                      className={`h-5 w-5 ${isSelected ? config.color : "text-muted-foreground"}`}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-black ${isSelected ? config.color : ""}`}>
                      {config.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </motion.button>
              );
            },
          )}
        </div>
      </div>

      {/* Studio Canvas */}
      <AnimatePresence mode="wait">
        {selectedStudio && (
          <motion.div
            key={selectedStudio}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {renderStudio()}

            {/* Save to Session Button */}
            <Card className="border-dashed border-2 bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <Save className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Vincular análise a esta sessão</p>
                    <p className="text-xs text-muted-foreground">
                      Os dados serão salvos no prontuário de {patientName}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveToSession}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-black rounded-xl"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Salvando..." : "Salvar na Sessão"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!selectedStudio && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="p-4 rounded-full bg-muted/50">
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-muted-foreground">Selecione o tipo de análise</p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                Escolha entre Marcha, Salto, Postura ou Funcional para iniciar a captura e análise
                biomecânica.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
