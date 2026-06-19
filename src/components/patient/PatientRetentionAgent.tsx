import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bot, CheckCircle2, Send, XCircle, RefreshCcw, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getWorkersApiUrl } from "@/lib/api/config";
import { apiClient } from "@/lib/api/v2/client";
import { cn } from "@/lib/utils";

interface RetentionState {
  missedSessions: number;
  lastPainLevel: number;
  riskScore: number;
  status: string;
  draftMessage: string | null;
  suggestedAction: string | null;
}

interface PatientRetentionAgentProps {
  patientId: string;
  patientName: string;
}

const API_BASE = getWorkersApiUrl();

const STATUS_LABELS: Record<string, string> = {
  monitoring: "MONITORANDO",
  at_risk: "EM RISCO",
  action_needed: "AÇÃO NECESSÁRIA",
  recovered: "RECUPERADO",
};

export const PatientRetentionAgent: React.FC<PatientRetentionAgentProps> = ({
  patientId,
  patientName,
}) => {
  const [state, setState] = useState<RetentionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchAgentStatus = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: RetentionState }>(
        `${API_BASE}/api/ai/retention/${patientId}`,
      );
      setState(res.data);
      setRetryCount(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao conectar com o agente";
      setError(msg);
      console.error("[RetentionAgent] fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(() => fetchAgentStatus(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchAgentStatus]);

  // Auto-retry on error (max 3)
  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        fetchAgentStatus(true);
      }, 5_000 * (retryCount + 1));
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, fetchAgentStatus]);

  const handleManualUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await apiClient.post<{ data: RetentionState }>(
        `${API_BASE}/api/ai/retention/${patientId}/update`,
        { name: patientName },
      );
      setState(res.data);
      toast.success("Agente atualizado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao comunicar com o agente.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await apiClient.post<{ data: RetentionState }>(
        `${API_BASE}/api/ai/retention/${patientId}/draft`,
        {},
      );
      setState(res.data);
      toast.success("Rascunho gerado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar rascunho.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      const res = await apiClient.post<{ data: RetentionState }>(
        `${API_BASE}/api/ai/retention/${patientId}/dismiss`,
        {},
      );
      setState(res.data);
      toast.info("Ação arquivada pelo Agente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao arquivar a ação.");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="border-indigo-500/20">
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando agente...</span>
        </CardContent>
      </Card>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !state) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="flex flex-col items-center justify-center h-32 gap-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchAgentStatus()}>
            <RefreshCcw className="h-3 w-3 mr-1.5" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  const riskScore = state?.riskScore ?? 0;
  const riskColor =
    riskScore > 70 ? "text-red-500" : riskScore > 40 ? "text-orange-500" : "text-emerald-500";


  return (
    <Card
      className="border-indigo-500/20 shadow-sm bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/10 overflow-hidden"
      role="region"
      aria-label="Agente de Retenção do Paciente"
    >
      <CardHeader className="pb-3 border-b border-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-black">Agente de Retenção</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-indigo-600/60">
                Cloudflare Autonomous Agent
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] font-black uppercase tracking-tighter px-2 py-0", riskColor)}
          >
            {STATUS_LABELS[state?.status ?? "monitoring"] ?? "MONITORANDO"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Risco de Churn */}
        <div className="space-y-1.5" role="meter" aria-valuenow={riskScore} aria-valuemin={0} aria-valuemax={100} aria-label={`Risco de abandono: ${riskScore}%`}>
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Risco de Abandono
            </span>
            <span className={cn("text-lg font-black tracking-tighter", riskColor)}>
              {riskScore}%
            </span>
          </div>
          <Progress value={riskScore} className="h-1.5" />
        </div>

        {/* Sugestão da IA */}
        {state?.draftMessage ? (
          <div className="p-3 rounded-xl bg-white/80 dark:bg-black/40 border border-indigo-500/20 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span className="text-[11px] font-bold text-indigo-600 uppercase">
                Sugestão de Recuperação
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic mb-3">
              &ldquo;{state.draftMessage}&rdquo;
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
                aria-label="Enviar mensagem de retenção via WhatsApp"
              >
                <Send className="h-3 w-3 mr-1.5" aria-hidden="true" /> Enviar WhatsApp
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                aria-label="Ignorar ação de retenção"
              >
                <XCircle className="h-3 w-3 mr-1.5" aria-hidden="true" /> Ignorar
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-dashed border-border/60 text-center py-6">
            <CheckCircle2 className="h-6 w-6 text-emerald-500/40 mx-auto mb-2" aria-hidden="true" />
            <p className="text-[11px] font-bold text-muted-foreground uppercase">
              Paciente Engajado
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              O Agente não detectou riscos imediatos.
            </p>
            {riskScore > 30 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateDraft}
                disabled={isDrafting}
                className="mt-3 h-7 text-[10px] font-bold uppercase tracking-widest"
              >
                {isDrafting ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3 mr-1.5" />
                )}
                {isDrafting ? "Gerando..." : "Gerar Rascunho"}
              </Button>
            )}
          </div>
        )}

        {/* Stats + Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Faltas</p>
              <p className="text-sm font-black">{state?.missedSessions ?? 0}</p>
            </div>
            <div className="text-center border-l border-border pl-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Última Dor</p>
              <p className="text-sm font-black">{state?.lastPainLevel ?? 0}/10</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleManualUpdate}
            disabled={isUpdating}
            className="h-8 w-8 rounded-lg border-indigo-500/20 text-indigo-600 hover:bg-indigo-50"
            aria-label="Atualizar avaliação do agente"
          >
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Error banner (non-blocking) */}
        {error && state && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <p className="text-[10px] text-red-600 dark:text-red-400">
              Erro na última sincronização. Tentando novamente...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
