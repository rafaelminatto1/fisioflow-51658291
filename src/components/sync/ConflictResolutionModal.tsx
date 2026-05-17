/**
 * ConflictResolutionModal — exibe ações offline com 409 (conflito) e permite
 * ao usuário escolher entre manter a versão local (sobrescrever servidor) ou
 * descartar e aceitar a versão do servidor.
 */
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ServerCog, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOfflineSync, type QueuedAction } from "@/services/offlineSync";
import { toast } from "sonner";

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function describeAction(a: QueuedAction): { title: string; subtitle: string } {
  const payload = a.payload as { url?: string; method?: string } | undefined;
  const url = payload?.url ?? "";
  const method = (payload?.method ?? "?").toUpperCase();

  let resource = "Recurso";
  const m = url.match(/^\/api\/([^/?#]+)/);
  if (m?.[1]) {
    const map: Record<string, string> = {
      appointments: "Agendamento",
      patients: "Paciente",
      sessions: "Evolução / Sessão",
      "exercise-plans": "Plano de exercícios",
      goals: "Meta",
    };
    resource = map[m[1]] ?? m[1];
  }

  return {
    title: `${resource} — ${method}`,
    subtitle: url || a.action,
  };
}

export function ConflictResolutionModal({ open, onOpenChange }: ConflictResolutionModalProps) {
  const { listConflicts, resolveConflictKeepServer, resolveConflictKeepLocal } = useOfflineSync();
  const [conflicts, setConflicts] = useState<QueuedAction[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void listConflicts().then(setConflicts);
  }, [open, listConflicts]);

  const refresh = async () => setConflicts(await listConflicts());

  const handleKeepServer = async (id: string) => {
    setBusyId(id);
    try {
      await resolveConflictKeepServer(id);
      toast.success("Versão do servidor mantida; alteração local descartada.");
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleKeepLocal = async (id: string) => {
    setBusyId(id);
    try {
      await resolveConflictKeepLocal(id);
      toast.success("Alteração local será reaplicada no próximo sync.");
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Conflitos de sincronização
          </DialogTitle>
        </DialogHeader>

        {conflicts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Nenhum conflito pendente.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-slate-600">
              As alterações abaixo foram feitas offline, mas o servidor já tem uma versão mais
              recente do mesmo registro. Escolha qual versão manter para cada item.
            </p>

            {conflicts.map((a) => {
              const { title, subtitle } = describeAction(a);
              const when = a.conflictedAt
                ? format(new Date(a.conflictedAt), "dd/MM • HH:mm", { locale: ptBR })
                : "—";
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{title}</p>
                      <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Conflito em {when}
                        {a.lastError && (
                          <span className="ml-2 text-rose-600">· {a.lastError}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-slate-300"
                      disabled={busyId === a.id}
                      onClick={() => handleKeepServer(a.id)}
                    >
                      {busyId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Manter servidor (descartar local)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={busyId === a.id}
                      onClick={() => handleKeepLocal(a.id)}
                    >
                      {busyId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <ServerCog className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Forçar minha versão
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
