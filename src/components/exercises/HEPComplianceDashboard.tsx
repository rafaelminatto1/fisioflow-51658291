import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, CheckCircle2, Loader2, XCircle, TrendingUp } from "lucide-react";
import { getWorkersApiUrl } from "@/lib/api/config";
import { toast } from "sonner";

interface ExercisePlan {
  id: string;
  name: string;
  status: string;
  patient_id: string;
  start_date?: string;
  end_date?: string;
}

interface HEPComplianceData {
  planId: string;
  planName: string;
  totalDays: number;
  completedDays: number;
  rate: number;
  byExercise: Record<string, { completed: number; total: number; rate: number }>;
  last14Days: Array<{ date: string; completed: boolean }>;
}

function ComplianceBar({ date, completed }: { date: string; completed: boolean }) {
  const label = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "narrow",
    day: "numeric",
  });
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-5 rounded-sm ${completed ? "bg-green-500" : "bg-muted"}`}
        style={{ height: 24 }}
        title={`${date}: ${completed ? "Realizado" : "Não realizado"}`}
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

interface HEPGeneratedExercise {
  name: string;
  description: string;
  sets?: number;
  repetitions?: number;
  frequency?: string;
  notes?: string;
}

interface HEPGeneratedResult {
  exercises: HEPGeneratedExercise[];
  general_instructions?: string;
  evidence_references?: Array<{ title: string; source: string }>;
}

function HEPGenerateWithAI({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HEPGeneratedResult | null>(null);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`${getWorkersApiUrl()}/api/exercise-plans/${planId}/generate-hep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      setResult(json.data ?? null);
    } catch {
      toast.error("Erro ao gerar HEP com IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3 flex flex-col gap-3">
      <Button
        size="sm"
        variant="outline"
        className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 self-start text-xs"
        onClick={generate}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
        {loading ? "Gerando..." : "Gerar HEP com IA"}
      </Button>

      {result && (
        <div className="flex flex-col gap-3 text-xs">
          {result.exercises.map((ex, i) => (
            <div key={i} className="rounded-lg border p-2 bg-violet-50/40">
              <p className="font-semibold text-sm">{ex.name}</p>
              {ex.description && <p className="text-muted-foreground mt-0.5">{ex.description}</p>}
              <div className="flex gap-3 mt-1 flex-wrap text-muted-foreground">
                {ex.sets && <span>{ex.sets} séries</span>}
                {ex.repetitions && <span>{ex.repetitions} rep.</span>}
                {ex.frequency && <span>{ex.frequency}</span>}
              </div>
            </div>
          ))}
          {result.evidence_references && result.evidence_references.length > 0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-2">
              <p className="font-semibold text-violet-700 mb-1">Baseado em:</p>
              {result.evidence_references.map((ref, i) => (
                <p key={i} className="text-violet-600">
                  • {ref.title} <span className="opacity-60">({ref.source})</span>
                </p>
              ))}
            </div>
          )}
          {result.general_instructions && (
            <p className="text-muted-foreground italic">{result.general_instructions}</p>
          )}
        </div>
      )}
    </div>
  );
}

function PlanComplianceCard({ planId }: { planId: string }) {
  const { data, isLoading } = useQuery<HEPComplianceData>({
    queryKey: ["hep-compliance", planId],
    queryFn: async () => {
      const res = await request<{ data: HEPComplianceData }>(
        `/api/exercise-plans/${planId}/compliance`,
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">{data.planName}</CardTitle>
          <Badge
            variant={data.rate >= 70 ? "default" : data.rate >= 40 ? "secondary" : "destructive"}
            className="shrink-0"
          >
            {data.rate}% adesão
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={data.rate} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {data.completedDays} de {data.totalDays} dias realizados
        </p>

        {/* Mini calendar dos últimos 14 dias */}
        <div className="flex gap-1 pt-1 overflow-x-auto pb-1">
          {data.last14Days.map((day) => (
            <ComplianceBar key={day.date} date={day.date} completed={day.completed} />
          ))}
        </div>

        <HEPGenerateWithAI planId={planId} />
      </CardContent>
    </Card>
  );
}

interface HEPComplianceDashboardProps {
  patientId: string;
}

export function HEPComplianceDashboard({ patientId }: HEPComplianceDashboardProps) {
  const { data: plansData, isLoading } = useQuery<{ data: ExercisePlan[] }>({
    queryKey: ["exercise-plans", patientId],
    queryFn: () => request(`/api/exercise-plans?patientId=${patientId}`),
    enabled: Boolean(patientId),
    staleTime: 5 * 60 * 1000,
  });

  const activePlans = (plansData?.data ?? []).filter((p) => p.status === "ativo");

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!activePlans.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhum plano de exercício ativo</p>
        <p className="text-xs">Crie um plano HEP para acompanhar a adesão do paciente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span>Adesão ao Plano Domiciliar (HEP)</span>
      </div>

      <div className="grid gap-3">
        {activePlans.map((plan) => (
          <PlanComplianceCard key={plan.id} planId={plan.id} />
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" /> Realizado
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-muted-foreground/50" /> Não realizado
        </span>
      </div>
    </div>
  );
}
