import { useEffect, useMemo, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  useDischargeReasons,
  useDischargeSuggestion,
  useRecordDischarge,
  type DischargeReason,
  type RecordDischargeInput,
} from "@/hooks/clinical/useDischarge";

/**
 * Diálogo de registro de alta fisioterapêutica.
 *
 * O formulário é de CONFIRMAÇÃO, não de digitação: a barreira ao registro é
 * atrito, não falta de vontade (82,7% de não uso de PROMs por tempo/plataforma).
 * Por isso linha de base, EVA inicial/final e contagem de sessões chegam
 * pré-preenchidas de `/discharge/suggestion` e o profissional só corrige.
 *
 * Layout: o `DialogContent` do projeto já é `flex-col` com um único container
 * `overflow-y-auto` interno. Nada aqui cria um segundo scroll — scroll aninhado
 * é o que corta modais altos.
 */

export interface DischargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
  /** Vincula a alta à sessão em que ela foi decidida, quando houver. */
  sessionId?: string | null;
  onRecorded?: () => void;
}

function hojeYMD(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function toNumeroOuNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function DischargeDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  sessionId = null,
  onRecorded,
}: DischargeDialogProps) {
  const reasonsQuery = useDischargeReasons();
  const suggestionQuery = useDischargeSuggestion(patientId, open);
  const recordMutation = useRecordDischarge();

  const [reason, setReason] = useState<DischargeReason | "">("");
  const [dischargedAt, setDischargedAt] = useState(hojeYMD);
  const [scope, setScope] = useState("");
  const [baselineSummary, setBaselineSummary] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [painInitial, setPainInitial] = useState("");
  const [painFinal, setPainFinal] = useState("");
  const [maintenancePlan, setMaintenancePlan] = useState("");
  const [returnCriteria, setReturnCriteria] = useState("");
  const [notes, setNotes] = useState("");
  /** Impede que o pré-preenchimento sobrescreva o que o profissional já digitou. */
  const [prefilled, setPrefilled] = useState(false);

  const suggestion = suggestionQuery.data;

  useEffect(() => {
    if (!open) {
      setPrefilled(false);
      return;
    }
    if (prefilled || !suggestion) return;

    setBaselineSummary(suggestion.baselineSummary ?? "");
    setPainInitial(suggestion.painInitial != null ? String(suggestion.painInitial) : "");
    setPainFinal(suggestion.painFinal != null ? String(suggestion.painFinal) : "");
    setPrefilled(true);
  }, [open, prefilled, suggestion]);

  const reasons = reasonsQuery.data ?? [];

  const resumoSessoes = useMemo(() => {
    if (!suggestion) return null;
    const partes = [`${suggestion.sessionsCount} sessões registradas`];
    if (suggestion.firstSessionAt) partes.push(`primeira em ${suggestion.firstSessionAt.slice(0, 10)}`);
    if (suggestion.lastSessionAt) partes.push(`última em ${suggestion.lastSessionAt.slice(0, 10)}`);
    return partes.join(" · ");
  }, [suggestion]);

  const handleSubmit = () => {
    if (!reason) return;

    const input: RecordDischargeInput = {
      patientId,
      sessionId,
      reason,
      dischargedAt: dischargedAt || null,
      scope: scope.trim() || null,
      baselineSummary: baselineSummary.trim() || null,
      finalSummary: finalSummary.trim() || null,
      painInitial: toNumeroOuNull(painInitial),
      painFinal: toNumeroOuNull(painFinal),
      maintenancePlan: maintenancePlan.trim() || null,
      returnCriteria: returnCriteria.trim() || null,
      notes: notes.trim() || null,
    };

    recordMutation.mutate(input, {
      onSuccess: () => {
        onRecorded?.();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar alta{patientName ? ` — ${patientName}` : ""}</DialogTitle>
          <DialogDescription>
            Confira o que já está no prontuário e complete o que faltar. Alta é um evento datado:
            sem ela, o paciente é indistinguível de quem abandonou o tratamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {resumoSessoes && (
            <p className="flex items-start gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{resumoSessoes}</span>
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Motivo da alta</legend>
            {reasonsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando motivos…</p>
            ) : (
              <RadioGroup
                value={reason}
                onValueChange={(v) => setReason(v as DischargeReason)}
                aria-label="Motivo da alta"
              >
                {reasons.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`discharge-reason-${opt.value}`} />
                    <Label htmlFor={`discharge-reason-${opt.value}`} className="font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="discharge-date">Data da alta</Label>
              <Input
                id="discharge-date"
                type="date"
                value={dischargedAt}
                onChange={(e) => setDischargedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discharge-scope">Região (alta parcial)</Label>
              <Input
                id="discharge-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Ex.: ombro direito"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                Preencha só se o tratamento continua para outras regiões.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discharge-baseline">Linha de base</Label>
            <Textarea
              id="discharge-baseline"
              value={baselineSummary}
              onChange={(e) => setBaselineSummary(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discharge-final">Situação na alta</Label>
            <Textarea
              id="discharge-final"
              value={finalSummary}
              onChange={(e) => setFinalSummary(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="discharge-pain-initial">EVA inicial (0–10)</Label>
              <Input
                id="discharge-pain-initial"
                type="number"
                min={0}
                max={10}
                value={painInitial}
                onChange={(e) => setPainInitial(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discharge-pain-final">EVA final (0–10)</Label>
              <Input
                id="discharge-pain-final"
                type="number"
                min={0}
                max={10}
                value={painFinal}
                onChange={(e) => setPainFinal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discharge-maintenance">Plano de manutenção</Label>
            <Textarea
              id="discharge-maintenance"
              value={maintenancePlan}
              onChange={(e) => setMaintenancePlan(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Exercícios domiciliares, academia, orientações"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discharge-return">Critérios de retorno</Label>
            <Textarea
              id="discharge-return"
              value={returnCriteria}
              onChange={(e) => setReturnCriteria(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="O que faz o paciente voltar a procurar a clínica"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discharge-notes">Observações</Label>
            <Textarea
              id="discharge-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>

          {recordMutation.isError && (
            <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
              Não foi possível registrar a alta. Tente novamente.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!reason || recordMutation.isPending}>
            {recordMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Registrar alta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DischargeDialog;
