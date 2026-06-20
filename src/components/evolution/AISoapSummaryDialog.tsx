import { useState } from "react";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { aiApi } from "@/api/v2";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface AISoapSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentObservation?: string;
}

interface SoapSummaryResult {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const emptyResult: SoapSummaryResult = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

export function AISoapSummaryDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentObservation,
}: AISoapSummaryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SoapSummaryResult>(emptyResult);
  const [meta, setMeta] = useState<{ analyzedEntries: number; includesCurrentDraft: boolean }>();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await aiApi.summarizePatientSoap({
        patientId,
        currentObservation,
        limit: 5,
      });
      setResult(response.data);
      setMeta(response.meta);
      toast.success("Resumo SOAP gerado");
    } catch (error) {
      console.error("[AISoapSummaryDialog] Error:", error);
      toast.error("Não foi possível gerar o resumo SOAP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = [
      `S: ${result.subjective}`,
      `O: ${result.objective}`,
      `A: ${result.assessment}`,
      `P: ${result.plan}`,
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resumo copiado");
    } catch {
      toast.error("Não foi possível copiar o resumo");
    }
  };

  const hasResult = Boolean(
    result.subjective || result.objective || result.assessment || result.plan,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Resumo SOAP com IA
          </DialogTitle>
          <DialogDescription>
            Consolida as últimas evoluções de {patientName} em um resumo rápido para continuidade
            clínica.
          </DialogDescription>
        </DialogHeader>

        {!hasResult ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            Gere o resumo quando quiser consolidar as últimas evoluções em S, O, A e P.
          </div>
        ) : null}

        {meta ? (
          <div className="text-xs font-medium text-slate-500">
            {meta.analyzedEntries} registro(s) analisado(s)
            {meta.includesCurrentDraft ? " incluindo o rascunho atual" : ""}.
          </div>
        ) : null}

        <div className="grid gap-4">
          <Textarea
            value={result.subjective}
            readOnly
            placeholder="Subjetivo"
            className="min-h-[110px]"
          />
          <Textarea
            value={result.objective}
            readOnly
            placeholder="Objetivo"
            className="min-h-[110px]"
          />
          <Textarea
            value={result.assessment}
            readOnly
            placeholder="Avaliação"
            className="min-h-[110px]"
          />
          <Textarea
            value={result.plan}
            readOnly
            placeholder="Plano"
            className="min-h-[110px]"
          />
        </div>

        <DialogFooter className="gap-2">
          {hasResult ? (
            <Button type="button" variant="outline" onClick={handleCopy}>
              Copiar
            </Button>
          ) : null}
          <Button type="button" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Gerar Resumo com IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
