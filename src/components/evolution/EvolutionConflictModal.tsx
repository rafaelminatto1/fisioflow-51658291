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
import { AlertTriangle, RotateCw, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  onReload: () => void;
  onKeepLocal: () => void;
  onClose: () => void;
}

export function EvolutionConflictModal({
  open,
  conflict,
  onReload,
  onKeepLocal,
  onClose,
}: EvolutionConflictModalProps) {
  if (!conflict) return null;
  const updatedAt = new Date(conflict.current.updated_at).toLocaleString("pt-BR");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onReload}>
            <RotateCw className="h-4 w-4 mr-2" />
            Recarregar do servidor
          </Button>
          <Button onClick={onKeepLocal} className="bg-amber-600 hover:bg-amber-700">
            <Save className="h-4 w-4 mr-2" />
            Manter minha versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
