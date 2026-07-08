import { useQuery } from "@tanstack/react-query";
import { Brain, ShieldCheck, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/api/v2/base";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChurnSignalType = "increasing_noshow" | "scheduling_gap";
type ChurnRiskLevel = "high" | "medium";

interface ChurnSignal {
  patient_id: string;
  patient_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  risk_level: ChurnRiskLevel;
  signal_type: ChurnSignalType;
  days_gap?: number; // usado quando signal_type === 'scheduling_gap'
}

interface ChurnAtRiskPayload {
  signals: ChurnSignal[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContactUrl(signal: ChurnSignal): string | null {
  const raw = signal.whatsapp || signal.phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `tel:${number}`;
}

function signalLabel(signal: ChurnSignal): string {
  if (signal.signal_type === "increasing_noshow") return "Faltas frequentes";
  if (signal.signal_type === "scheduling_gap") {
    const days = signal.days_gap ?? 0;
    return `Sumiu há ${days}d`;
  }
  return signal.signal_type;
}

// ─── Sub-component: PatientRow ────────────────────────────────────────────────

interface PatientRowProps {
  signal: ChurnSignal;
  index: number;
}

function PatientRow({ signal, index }: PatientRowProps) {
  const contactUrl = buildContactUrl(signal);
  const isHigh = signal.risk_level === "high";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="flex items-center justify-between gap-3 rounded-xl bg-card border border-border/40 px-4 py-3 hover:bg-accent/20 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-bold truncate">{signal.patient_name}</p>
          <Badge
            className={cn(
              "text-[9px] px-1.5 py-0 border-0 font-black shrink-0",
              isHigh
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
            )}
          >
            {isHigh ? "Alto Risco" : "Médio Risco"}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">
          {signalLabel(signal)}
        </p>
      </div>

      {contactUrl ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8 gap-1.5 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          asChild
        >
          <a href={contactUrl}>
            <Phone className="h-3.5 w-3.5" />
            Contatar
          </a>
        </Button>
      ) : (
        <span className="text-[11px] text-muted-foreground shrink-0">Sem telefone</span>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChurnAlertPanel() {
  const { data, isLoading } = useQuery<ChurnAtRiskPayload>({
    queryKey: ["churn-prediction", "at-risk-signals"],
    queryFn: () => request<ChurnAtRiskPayload>("/api/churn-prediction/at-risk-signals"),
    staleTime: 30 * 60 * 1000, // 30 min
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm bg-card/80">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-52" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const signals = data?.signals ?? [];
  const visible = signals.slice(0, 10);
  const highCount = signals.filter((s) => s.risk_level === "high").length;
  const mediumCount = signals.filter((s) => s.risk_level === "medium").length;

  // ── Empty state ──
  if (signals.length === 0) {
    return (
      <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Sinais de Churn — IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Nenhum paciente em risco detectado
            </p>
            <p className="text-[11px] text-muted-foreground">
              A IA não identificou sinais de abandono no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── With data ──
  return (
    <Card className="border border-border/50 shadow-sm bg-card/80 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Brain className="h-4 w-4" />
            </div>
            Sinais de Churn — IA
          </CardTitle>
        </div>

        {/* Summary counters */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 border border-border/40 px-3 py-1.5">
            <span className="text-xs font-black text-foreground">{signals.length}</span>
            <span className="text-[10px] text-muted-foreground font-medium">total em risco</span>
          </div>
          {highCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-1.5">
              <span className="text-xs font-black text-red-600 dark:text-red-400">{highCount}</span>
              <span className="text-[10px] text-red-500/80 font-medium">alto risco</span>
            </div>
          )}
          {mediumCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5">
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">{mediumCount}</span>
              <span className="text-[10px] text-amber-500/80 font-medium">médio risco</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {visible.map((signal, index) => (
          <PatientRow key={signal.patient_id} signal={signal} index={index} />
        ))}
        {signals.length > 10 && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            + {signals.length - 10} pacientes adicionais em risco
          </p>
        )}
      </CardContent>
    </Card>
  );
}
