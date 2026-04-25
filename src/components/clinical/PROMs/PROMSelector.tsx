import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity,
  Target,
  Hand,
  Brain,
  Footprints,
  PersonStanding,
  ChevronLeft,
  Clock,
  ListChecks,
  Bone,
} from "lucide-react";
import { useCreateStandardizedTest } from "@/hooks/useStandardizedTests";
import { VasForm } from "./VasForm";
import { PsfsForm } from "./PsfsForm";
import { DashForm } from "./DashForm";
import { OswestryForm } from "./OswestryForm";
import { NdiForm } from "./NdiForm";
import { LefsForm } from "./LefsForm";
import { BergForm } from "./BergForm";

type ScaleKey = "VAS" | "PSFS" | "DASH" | "OSWESTRY" | "NDI" | "LEFS" | "BERG";

interface ScaleInfo {
  key: ScaleKey;
  name: string;
  description: string;
  items: string;
  time: string;
  icon: React.ReactNode;
  badgeColor: string;
  region: string;
}

const SCALES: ScaleInfo[] = [
  {
    key: "VAS",
    name: "EVA / VAS",
    description: "Avaliação da intensidade da dor pelo paciente",
    items: "1 item",
    time: "< 1 min",
    icon: <Activity className="h-5 w-5 text-blue-500" />,
    badgeColor: "bg-blue-100 text-blue-800",
    region: "Dor geral",
  },
  {
    key: "PSFS",
    name: "PSFS / EFEP",
    description: "Avaliação de atividades funcionais específicas do paciente",
    items: "3–5 atividades",
    time: "3–5 min",
    icon: <Target className="h-5 w-5 text-purple-500" />,
    badgeColor: "bg-purple-100 text-purple-800",
    region: "Funcional geral",
  },
  {
    key: "DASH",
    name: "DASH",
    description: "Incapacidade do braço, ombro e mão",
    items: "30 itens",
    time: "5–10 min",
    icon: <Hand className="h-5 w-5 text-blue-400" />,
    badgeColor: "bg-sky-100 text-sky-800",
    region: "Membro superior",
  },
  {
    key: "OSWESTRY",
    name: "Oswestry (ODI)",
    description: "Índice de incapacidade por dor lombar",
    items: "10 seções",
    time: "5 min",
    icon: <Bone className="h-5 w-5 text-orange-500" />,
    badgeColor: "bg-orange-100 text-orange-800",
    region: "Coluna lombar",
  },
  {
    key: "NDI",
    name: "NDI",
    description: "Índice de incapacidade cervical",
    items: "10 seções",
    time: "5 min",
    icon: <Brain className="h-5 w-5 text-indigo-500" />,
    badgeColor: "bg-indigo-100 text-indigo-800",
    region: "Coluna cervical",
  },
  {
    key: "LEFS",
    name: "LEFS",
    description: "Escala funcional dos membros inferiores",
    items: "20 itens",
    time: "5 min",
    icon: <Footprints className="h-5 w-5 text-green-500" />,
    badgeColor: "bg-green-100 text-green-800",
    region: "Membro inferior",
  },
  {
    key: "BERG",
    name: "Berg (BBS)",
    description: "Avaliação do equilíbrio funcional",
    items: "14 tarefas",
    time: "15–20 min",
    icon: <PersonStanding className="h-5 w-5 text-teal-500" />,
    badgeColor: "bg-teal-100 text-teal-800",
    region: "Equilíbrio",
  },
];

function getInterpretation(scaleName: ScaleKey, score: number): string {
  switch (scaleName) {
    case "VAS":
      if (score === 0) return "Sem dor";
      if (score <= 3) return "Dor leve";
      if (score <= 6) return "Dor moderada";
      if (score <= 9) return "Dor intensa";
      return "Dor máxima";
    case "PSFS":
      if (score >= 8) return "Função excelente";
      if (score >= 6) return "Boa função";
      if (score >= 4) return "Função moderada";
      if (score >= 2) return "Função limitada";
      return "Função muito limitada";
    case "DASH":
      if (score < 20) return "Incapacidade leve";
      if (score <= 40) return "Incapacidade moderada";
      return "Incapacidade grave";
    case "OSWESTRY":
      if (score <= 20) return "Incapacidade mínima";
      if (score <= 40) return "Incapacidade moderada";
      if (score <= 60) return "Incapacidade intensa";
      if (score <= 80) return "Deficiência grave";
      return "Acamado / exagerando";
    case "NDI":
      if (score <= 8) return "Sem incapacidade";
      if (score <= 28) return "Incapacidade leve";
      if (score <= 48) return "Incapacidade moderada";
      if (score <= 64) return "Incapacidade intensa";
      return "Incapacidade completa";
    case "LEFS":
      if (score <= 40) return "Incapacidade grave";
      if (score <= 60) return "Incapacidade moderada";
      return "Incapacidade leve";
    case "BERG":
      if (score <= 20) return "Cadeira de rodas necessária";
      if (score <= 40) return "Ambulação com auxílio";
      return "Independente";
    default:
      return "";
  }
}

interface PROMSelectorProps {
  patientId: string;
  sessionId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
  defaultScale?: ScaleKey;
}

export function PROMSelector({
  patientId,
  sessionId,
  open,
  onOpenChange,
  onSaved,
  defaultScale,
}: PROMSelectorProps) {
  const [selectedScale, setSelectedScale] = useState<ScaleKey | null>(defaultScale ?? null);
  const { mutateAsync: createTest, isPending } = useCreateStandardizedTest();

  const handleSave = async (score: number, responses: Record<string, unknown>) => {
    if (!selectedScale) return;
    const interpretation = getInterpretation(selectedScale, score);
    try {
      await createTest({
        patient_id: patientId,
        scale_name: selectedScale,
        score,
        interpretation,
        responses,
        session_id: sessionId,
        applied_at: new Date().toISOString(),
      });
      toast.success(`${SCALES.find((s) => s.key === selectedScale)?.name} salvo com sucesso!`);
      onSaved?.();
      onOpenChange(false);
      setSelectedScale(null);
    } catch {
      // error toast handled by mutation hook
    }
  };

  const handleCancel = () => {
    setSelectedScale(null);
  };

  const handleClose = () => {
    setSelectedScale(null);
    onOpenChange(false);
  };

  const renderForm = () => {
    const commonProps = {
      patientId,
      sessionId,
      onSave: handleSave,
      onCancel: handleCancel,
    };
    switch (selectedScale) {
      case "VAS":
        return <VasForm {...commonProps} />;
      case "PSFS":
        return <PsfsForm {...commonProps} />;
      case "DASH":
        return <DashForm {...commonProps} />;
      case "OSWESTRY":
        return <OswestryForm {...commonProps} />;
      case "NDI":
        return <NdiForm {...commonProps} />;
      case "LEFS":
        return <LefsForm {...commonProps} />;
      case "BERG":
        return <BergForm {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedScale && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -ml-2"
                onClick={() => setSelectedScale(null)}
                disabled={isPending}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {selectedScale
                ? `Aplicar ${SCALES.find((s) => s.key === selectedScale)?.name}`
                : "Selecionar Instrumento de Avaliação (PROM)"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!selectedScale ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione o instrumento de avaliação padronizado que deseja aplicar:
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SCALES.map((scale) => (
                <button
                  key={scale.key}
                  type="button"
                  onClick={() => setSelectedScale(scale.key)}
                  className="flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mt-0.5 shrink-0">{scale.icon}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold">{scale.name}</span>
                      <Badge className={`${scale.badgeColor} text-[10px] py-0`}>
                        {scale.region}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {scale.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        {scale.items}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {scale.time}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={isPending ? "pointer-events-none opacity-60" : ""}>{renderForm()}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
