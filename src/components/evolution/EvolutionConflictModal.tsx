/**
 * Modal de conflito de versão (HTTP 409) durante autosave.
 *
 * Disparado quando a evolução foi editada em outro dispositivo/aba enquanto
 * o usuário fazia mudanças locais. Apresenta duas escolhas:
 * - Recarregar dados do servidor (descarta edição local)
 * - Manter minha versão (sobrescreve servidor — force overwrite)
 *
 * Ref: specs/autosave-hardening-p2-p3/spec.md US2
 */
import { AlertTriangle, RotateCw, Save, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { computeLineDiff } from "@/lib/utils/diff";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/stripHtml";
import { useMemo } from "react";

export interface EvolutionConflictData {
  message: string;
  current: {
    id: string;
    observacao?: string;
    pain_scale?: number | null;
    updated_at: string;
    version?: number;
    last_edited_by?: string;
  };
}

interface EvolutionConflictModalProps {
  open: boolean;
  conflict: EvolutionConflictData | null;
  localData?: {
    observacao?: string;
    painScale?: number | null;
  };
  onReload: () => void;
  onKeepLocal: () => void;
  onClose: () => void;
}

export function EvolutionConflictModal({
  open,
  conflict,
  localData,
  onReload,
  onKeepLocal,
  onClose,
}: EvolutionConflictModalProps) {
  const diffLines = useMemo(() => {
    if (!conflict || !localData) return [];
    const serverText = stripHtml(conflict.current.observacao || "");
    const localText = stripHtml(localData.observacao || "");
    return computeLineDiff(serverText, localText);
  }, [conflict, localData]);

  if (!conflict) return null;
  const updatedAt = new Date(conflict.current.updated_at).toLocaleString("pt-BR");

  const hasPainDiff =
    localData && conflict.current.pain_scale !== (localData.painScale ?? null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Conflito de edição detectado
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <span className="block">{conflict.message}</span>
            <span className="block text-xs text-muted-foreground">
              Última atualização no servidor: {updatedAt}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* Diff de Escala de Dor */}
          {hasPainDiff && (
            <div className="rounded-md border p-3 bg-muted/30">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Nível de Dor (EVA)
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 line-through">
                  {conflict.current.pain_scale ?? "Não definido"}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold">
                  {localData?.painScale ?? "Não definido"}
                </span>
              </div>
            </div>
          )}

          {/* Diff de Texto (Observação/Evolução) */}
          <div className="rounded-md border bg-background overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
              <span>Comparação de Texto (Diff)</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Servidor
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Seu Local
                </span>
              </div>
            </div>
            <div className="font-mono text-[11px] divide-y divide-border/40">
              {diffLines.length === 0 || (diffLines.length === 1 && diffLines[0].type === "same" && !diffLines[0].text) ? (
                <div className="p-4 text-center text-muted-foreground italic">
                  Sem alterações no texto principal.
                </div>
              ) : (
                diffLines.map((line, index) => (
                  <div
                    key={`${line.type}-${index}`}
                    className={cn(
                      "flex gap-3 px-3 py-0.5 min-h-[1.5rem]",
                      line.type === "added" &&
                        "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
                      line.type === "removed" &&
                        "bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-100",
                    )}
                  >
                    <span className="w-4 flex-shrink-0 text-center opacity-50 select-none">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    <span className="whitespace-pre-wrap break-words flex-1">
                      {line.text || " "}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium mb-1">O que você quer fazer?</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong>Recarregar do servidor</strong> — descarta o que você
                digitou agora e exibe a versão mais recente
              </li>
              <li>
                <strong>Manter minha versão</strong> — sobrescreve a versão do
                servidor com o que você editou
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={onReload} className="flex-1 sm:flex-none">
            <RotateCw className="h-4 w-4 mr-2" />
            Recarregar do servidor
          </Button>
          <Button onClick={onKeepLocal} className="bg-amber-600 hover:bg-amber-700 flex-1 sm:flex-none">
            <Save className="h-4 w-4 mr-2" />
            Manter minha versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
