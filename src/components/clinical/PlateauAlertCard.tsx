import { AlertTriangle, CircleHelp, Info, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatAnyDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type {
  PlateauCriterios,
  PlateauSignal,
  PlateauStatus,
} from "@/hooks/clinical/usePlateauSignals";

/**
 * Cartão de alerta de platô terapêutico.
 *
 * Duas decisões que não são estéticas:
 *
 * 1. Os critérios (`meta.criterios`) aparecem no próprio cartão. Alerta sem
 *    justificativa é lido como arbitrário e a equipe passa a ignorá-lo — foi o
 *    motivo de o backend devolver os limiares junto com os sinais.
 * 2. `loadStalled`/`painStalled` têm TRÊS estados e os três são exibidos
 *    distintamente. `null` significa "não medido" (falta de registro, acionável
 *    por si) e `false` significa "progrediu" (boa notícia). Colapsar os dois em
 *    "não estagnado" esconderia justamente o buraco de prontuário.
 */

export interface PlateauAlertCardProps {
  signal: PlateauSignal;
  /** Vem de `meta.criterios`. Sem isto o cartão não mostra a justificativa. */
  criterios?: PlateauCriterios;
  onVerPaciente?: (patientId: string) => void;
  className?: string;
}

const STATUS_LABEL: Record<PlateauStatus, string> = {
  confirmado: "Platô confirmado",
  progredindo: "Paciente progredindo",
  sem_dados: "Sem dados para afirmar",
};

/** Borda + ícone + texto. Sem fundo saturado e sem transparência. */
const STATUS_BORDER: Record<PlateauStatus, string> = {
  confirmado: "border-l-4 border-l-amber-600",
  progredindo: "border-l-4 border-l-emerald-600",
  sem_dados: "border-l-4 border-l-slate-400",
};

const STATUS_BADGE: Record<PlateauStatus, string> = {
  confirmado: "border-amber-600 text-amber-700 dark:text-amber-400",
  progredindo: "border-emerald-600 text-emerald-700 dark:text-emerald-400",
  sem_dados: "border-slate-400 text-slate-600 dark:text-slate-300",
};

type EixoEstado = "estagnado" | "progrediu" | "nao_medido";

function eixoEstado(value: boolean | null): EixoEstado {
  if (value === true) return "estagnado";
  if (value === false) return "progrediu";
  return "nao_medido";
}

function Eixo({
  nome,
  value,
  textos,
}: {
  nome: string;
  value: boolean | null;
  textos: Record<EixoEstado, string>;
}) {
  const estado = eixoEstado(value);
  const Icon =
    estado === "estagnado" ? AlertTriangle : estado === "progrediu" ? TrendingUp : CircleHelp;
  const cor =
    estado === "estagnado"
      ? "text-amber-700 dark:text-amber-400"
      : estado === "progrediu"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-slate-600 dark:text-slate-300";

  return (
    <li className="flex items-start gap-2" data-testid={`eixo-${nome}`} data-estado={estado}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cor)} aria-hidden="true" />
      <span className="text-sm text-foreground">{textos[estado]}</span>
    </li>
  );
}

export function PlateauAlertCard({
  signal,
  criterios,
  onVerPaciente,
  className,
}: PlateauAlertCardProps) {
  const periodo = `${formatAnyDate(signal.firstDate, "dd/MM/yyyy", "—")} a ${formatAnyDate(
    signal.lastDate,
    "dd/MM/yyyy",
    "—",
  )}`;

  return (
    <Card className={cn("bg-card", STATUS_BORDER[signal.status], className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">{signal.patientName}</h3>
            <p className="text-sm text-muted-foreground">
              {signal.consecutiveSessions} sessões consecutivas com a mesma conduta · {periodo}
            </p>
          </div>
          <Badge variant="outline" className={cn("bg-transparent", STATUS_BADGE[signal.status])}>
            {STATUS_LABEL[signal.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {signal.signature.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {signal.signature.map((code) => (
              <Badge key={code} variant="secondary" className="font-normal">
                {code}
              </Badge>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Eixos avaliados ({signal.confirmingAxes} de 3 confirmam)
          </p>
          <ul className="mt-2 space-y-1.5">
            <Eixo
              nome="conduta"
              value={true}
              textos={{
                estagnado: `Conduta e região repetidas em ${signal.consecutiveSessions} sessões seguidas`,
                progrediu: "Conduta variou no período",
                nao_medido: "Conduta sem registro no período",
              }}
            />
            <Eixo
              nome="carga"
              value={signal.loadStalled}
              textos={{
                estagnado: "Carga sem variação em kg no período",
                progrediu: "Carga progrediu no período — o paciente está evoluindo",
                nao_medido: "Carga não medida: sem registro suficiente para afirmar",
              }}
            />
            <Eixo
              nome="dor"
              value={signal.painStalled}
              textos={{
                estagnado: "Dor sem variação clinicamente relevante na EVA",
                progrediu: "Dor variou acima do mínimo clinicamente importante",
                nao_medido: "Dor não medida: menos de duas leituras de EVA no período",
              }}
            />
          </ul>
        </div>

        {criterios && (
          <div className="rounded-md border border-border p-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Por que este alerta apareceu
            </p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div>
                <dt className="inline font-medium text-foreground">Conduta: </dt>
                <dd className="inline text-muted-foreground">{criterios.conduta}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Dor: </dt>
                <dd className="inline text-muted-foreground">{criterios.dor}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Carga: </dt>
                <dd className="inline text-muted-foreground">{criterios.carga}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Eixos: </dt>
                <dd className="inline text-muted-foreground">{criterios.eixos}</dd>
              </div>
            </dl>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          O sistema não decide se é máximo funcional ou platô temporário — a conduta é oposta
          nos dois casos. Reavalie o caso com o paciente.
        </p>

        {onVerPaciente && (
          <Button variant="outline" size="sm" onClick={() => onVerPaciente(signal.patientId)}>
            Abrir prontuário
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default PlateauAlertCard;
