import type { ReactNode } from "react";
import { Info, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Tile de indicador operacional / de qualidade de prontuário.
 *
 * Regra do componente: SEMPRE oferece "ver lista". Um número sozinho não é
 * acionável — "902 atendimentos sem evolução" não vira tarefa, "estes 50
 * atendimentos" vira. É por isso que todos os endpoints de analytics aceitam
 * `?includeList=true`, e o tile existe para não deixar essa lista escondida.
 *
 * O botão continua visível quando o valor é 0 ou nulo: nesse caso ele abre uma
 * lista vazia, que é informação (não há pendência) e não um beco sem saída.
 */

export interface IndicatorTileProps {
  label: string;
  /** `null` = indicador sem valor calculável (ex.: média sem gaps válidos). */
  value: number | null;
  /** Ex.: "%" ou " dias". Não é aplicado quando `value` é `null`. */
  unit?: string;
  /** Segunda linha: recorte recente, denominador, etc. */
  secondary?: ReactNode;
  /** Critério vindo de `meta.criterios` — como o número foi calculado. */
  criterio?: string;
  /** Obrigatório: o tile não existe sem caminho para a lista. */
  onVerLista: () => void;
  verListaLabel?: string;
  isLoading?: boolean;
  className?: string;
}

function formatValue(value: number | null, unit?: string): string {
  if (value === null) return "—";
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("pt-BR")
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return unit ? `${formatted}${unit}` : formatted;
}

export function IndicatorTile({
  label,
  value,
  unit,
  secondary,
  criterio,
  onVerLista,
  verListaLabel = "Ver lista",
  isLoading = false,
  className,
}: IndicatorTileProps) {
  return (
    <Card className={cn("bg-card", className)}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
            ) : (
              formatValue(value, unit)
            )}
          </p>
          {secondary && <div className="mt-1 text-sm text-muted-foreground">{secondary}</div>}
        </div>

        {criterio && (
          <p className="flex items-start gap-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{criterio}</span>
          </p>
        )}

        <div className="mt-auto pt-1">
          <Button variant="outline" size="sm" onClick={onVerLista}>
            <List className="mr-2 h-4 w-4" aria-hidden="true" />
            {verListaLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default IndicatorTile;
