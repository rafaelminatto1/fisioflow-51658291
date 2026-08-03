import { List } from "lucide-react";
import { IndicatorTile } from "@/components/analytics/IndicatorTile";
import { Button } from "@/components/ui/button";
import {
  usePatientPendingFilters,
  type PatientPendingFilterKey,
} from "@/hooks/patients/usePatientPendingFilters";

/**
 * Pendências da clínica como FILTRO da lista de pacientes.
 *
 * Why: os indicadores existiam só como endpoint, e um número que ninguém vê não
 * muda conduta nenhuma. A primeira versão deste painel abria um diálogo com os
 * nomes — resolvia o "quem", mas criava um segundo lugar onde a mesma pergunta
 * é respondida: o diálogo listava 100 nomes soltos enquanto a lista de pacientes
 * logo abaixo, com busca, ordenação, cartão e caminho para o prontuário, ficava
 * mostrando outra coisa. Agora clicar no tile filtra a lista que já está na
 * tela; não existe caminho paralelo para manter em sincronia.
 *
 * A contagem do tile e a lista filtrada vêm do MESMO predicado SQL no backend
 * (`apps/api/src/lib/clinical/patientPendingFilters.ts`). Nada aqui recalcula
 * número: um tile que diz "334" abrindo uma lista de 351 queima a confiança no
 * painel inteiro, inclusive nos números que estavam certos.
 *
 * O que deliberadamente NÃO vira filtro: "pacientes sem avaliação" como número
 * único. Ele misturava quem está em reabilitação sem avaliação (pendência real)
 * com quem vem só para liberação miofascial ou recovery, que não tem avaliação
 * a fazer. A lista somada passava de 500 e a equipe aprenderia a ignorá-la.
 */

interface ClinicPendingPanelProps {
  /** Pendência aplicada na lista, ou `null`. */
  value: PatientPendingFilterKey | null;
  /** Recebe `null` quando o filtro ativo é clicado de novo (alternância). */
  onChange: (key: PatientPendingFilterKey | null) => void;
  className?: string;
}

export function ClinicPendingPanel({ value, onChange, className }: ClinicPendingPanelProps) {
  const { data, isLoading, isError } = usePatientPendingFilters();
  const filtros = data?.data ?? [];

  if (isError) {
    return (
      <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
        Não foi possível carregar as pendências da clínica.
      </p>
    );
  }

  // Enquanto carrega, os tiles existem com valor nulo em vez de sumirem: o
  // layout não pode pular e a ausência não pode ser lida como "sem pendência".
  const tiles = isLoading
    ? [1, 2, 3, 4, 5, 6].map((n) => ({
        key: `skeleton-${n}` as const,
        label: "Carregando…",
        criterio: undefined,
        count: null,
      }))
    : filtros.map((f) => ({ ...f, criterio: f.criterio }));

  return (
    <div className={className} data-testid="clinic-pending-panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pendências da clínica</h2>
          <p className="text-sm text-muted-foreground">
            Clique para filtrar a lista de pacientes abaixo.
            {data?.meta?.total ? ` Base de ${data.meta.total.toLocaleString("pt-BR")} pacientes.` : ""}
          </p>
        </div>

        {value !== null && (
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>
            Remover filtro de pendência
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const ativo = tile.key === value;
          const vazio = tile.count === 0;

          return (
            <IndicatorTile
              key={tile.key}
              label={tile.label}
              value={tile.count}
              criterio={tile.criterio}
              isLoading={isLoading}
              active={ativo}
              // Zero fica visível e desabilitado: filtrar por uma pendência
              // inexistente só devolveria uma lista vazia sem explicar por quê.
              disabled={vazio}
              verListaLabel={ativo ? "Filtro aplicado" : vazio ? "Sem pendência" : "Filtrar lista"}
              onVerLista={() => onChange(ativo ? null : (tile.key as PatientPendingFilterKey))}
            />
          );
        })}
      </div>

      {value !== null && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-border p-2 text-sm text-muted-foreground">
          <List className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            A lista abaixo mostra apenas os pacientes desta pendência, e o total exibido é o mesmo
            número do tile.
          </span>
        </p>
      )}
    </div>
  );
}
