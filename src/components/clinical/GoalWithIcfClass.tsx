import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useGoalClassification,
  useIcfClasses,
  type IcfClass,
} from "@/hooks/clinical/useClinicalGoals";

/**
 * Campo de objetivo terapêutico com classe CIF.
 *
 * A classe do objetivo é fator prognóstico (FYSIOPRIM, N=2.591: OR 1,80 para
 * atividade/participação frente a sintoma), então o aviso aparece ENQUANTO o
 * profissional digita — é nesse momento que ainda dá para renegociar o objetivo
 * com o paciente.
 *
 * O aviso é orientação, nunca bloqueio: o componente não desabilita nada e não
 * emite estado de "inválido". Um objetivo só de sintoma é um objetivo pior, não
 * um objetivo proibido — travar o salvamento faria a equipe contornar o campo.
 */

export interface GoalWithIcfClassProps {
  value: string;
  onChange: (value: string) => void;
  /** Classe escolhida pelo profissional. `null` = seguir a sugestão. */
  icfClass?: IcfClass | null;
  onIcfClassChange?: (value: IcfClass) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  /** Atraso antes de classificar. Existe para os testes rodarem sem timers. */
  debounceMs?: number;
}

export function GoalWithIcfClass({
  value,
  onChange,
  icfClass = null,
  onIcfClassChange,
  label = "Objetivo terapêutico",
  id = "clinical-goal",
  disabled = false,
  debounceMs = 500,
}: GoalWithIcfClassProps) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (debounceMs <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  const classesQuery = useIcfClasses();
  // Texto curto demais não carrega informação: classificar cada tecla só gera
  // ruído de rede e um aviso que pisca.
  const classificationQuery = useGoalClassification(debounced, {
    enabled: debounced.trim().length >= 3,
  });

  const classification = classificationQuery.data ?? null;
  const options = classesQuery.data?.data ?? [];
  const efetiva: IcfClass | null = icfClass ?? classification?.suggested ?? null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          maxLength={1000}
          placeholder="O que o paciente quer voltar a fazer. Ex.: voltar a jogar futebol aos domingos"
        />
      </div>

      {classification?.advice && (
        // Borda + ícone + texto, sem fundo saturado: é orientação, não erro.
        <div
          role="status"
          data-testid="goal-icf-advice"
          className={cn(
            "flex items-start gap-2 rounded-md border p-3",
            classification.symptomOnly ? "border-amber-600" : "border-border",
          )}
        >
          <Lightbulb
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              classification.symptomOnly ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-sm text-foreground">{classification.advice}</p>
            <p className="text-xs text-muted-foreground">
              Sugestão é orientação: o objetivo pode ser salvo do jeito que está.
            </p>
          </div>
        </div>
      )}

      {options.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Classe CIF
            {classification && (
              <Badge variant="outline" className="ml-2 bg-transparent font-normal">
                sugerida pelo texto
              </Badge>
            )}
          </legend>
          <RadioGroup
            value={efetiva ?? ""}
            onValueChange={(v) => onIcfClassChange?.(v as IcfClass)}
            aria-label="Classe CIF do objetivo"
            disabled={disabled || !onIcfClassChange}
          >
            {options.map((opt) => (
              <div key={opt.value} className="flex items-start gap-2">
                <RadioGroupItem
                  value={opt.value}
                  id={`${id}-icf-${opt.value}`}
                  className="mt-1"
                />
                <Label htmlFor={`${id}-icf-${opt.value}`} className="font-normal">
                  <span className="block text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      )}
    </div>
  );
}

export default GoalWithIcfClass;
