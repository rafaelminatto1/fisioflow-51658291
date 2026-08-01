import { useState } from "react";
import { IndicatorTile } from "@/components/analytics/IndicatorTile";
import {
  useRecordQuality,
  type RecordQualityIndicatorKey,
} from "@/hooks/analytics/useRecordQuality";
import { useOperationalIndicators } from "@/hooks/analytics/useOperationalIndicators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/**
 * Pendências da clínica, com caminho para a lista de nomes.
 *
 * Why este painel: os indicadores existiam só como endpoint. Um número que
 * ninguém vê não muda conduta nenhuma — e um número sem os nomes por trás não é
 * acionável pela recepção, que precisa saber para quem ligar, não quantos são.
 *
 * O que deliberadamente NÃO aparece aqui: "pacientes sem avaliação" como número
 * único. Ele misturava quem está em reabilitação sem avaliação (pendência real)
 * com quem vem só para liberação miofascial ou recovery, que não tem avaliação
 * a fazer. A lista somada passava de 500 e a equipe aprenderia a ignorá-la.
 */

type ListaAberta = {
  chave: RecordQualityIndicatorKey;
  titulo: string;
  criterio?: string;
} | null;

interface LinhaLista {
  patientId?: string;
  patient_id?: string;
  nome?: string;
  patientName?: string;
  full_name?: string;
  [k: string]: unknown;
}

function nomeDaLinha(linha: LinhaLista, indice: number): string {
  return (
    linha.nome ??
    linha.patientName ??
    linha.full_name ??
    `Registro ${indice + 1}`
  );
}

export function ClinicPendingPanel({ className }: { className?: string }) {
  const [lista, setLista] = useState<ListaAberta>(null);

  const resumo = useRecordQuality();
  const operacional = useOperationalIndicators();
  // Só busca a lista quando alguém pede — o painel abre com 1 requisição.
  const detalhe = useRecordQuality({
    includeList: true,
    indicador: lista?.chave ?? null,
    limit: 100,
    enabled: lista !== null,
  });

  const rq = resumo.data?.data;
  const op = operacional.data?.data;
  const criterios = resumo.data?.meta?.criterios ?? {};

  const abrir = (chave: RecordQualityIndicatorKey, titulo: string) =>
    setLista({ chave, titulo, criterio: criterios[chave] });

  const linhas = (lista
    ? ((detalhe.data?.data?.[lista.chave] as { lista?: LinhaLista[] } | undefined)?.lista ?? [])
    : []) as LinhaLista[];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IndicatorTile
          label="Atendimentos sem evolução"
          value={rq?.agendamentosSemSessao.valor ?? null}
          secondary={
            rq ? `${rq.agendamentosSemSessao.recentes} nos últimos 90 dias` : undefined
          }
          criterio={criterios.agendamentosSemSessao}
          isLoading={resumo.isLoading}
          onVerLista={() => abrir("agendamentosSemSessao", "Atendimentos sem evolução")}
        />

        <IndicatorTile
          label="Em reabilitação, sem avaliação"
          value={rq?.semAvaliacaoEmReabilitacao.valor ?? null}
          secondary={
            rq
              ? `${rq.terapiaManualAvulsa.valor} de terapia manual avulsa não entram aqui`
              : undefined
          }
          criterio={criterios.semAvaliacaoEmReabilitacao}
          isLoading={resumo.isLoading}
          onVerLista={() =>
            abrir("semAvaliacaoEmReabilitacao", "Em reabilitação, sem avaliação")
          }
        />

        <IndicatorTile
          label="Ativos sem próxima sessão"
          value={op?.ativosSemProximaSessao?.valor ?? null}
          secondary={
            op?.riscoAbandono
              ? `${op.riscoAbandono.valor} em risco de abandono`
              : undefined
          }
          isLoading={operacional.isLoading}
          onVerLista={() => abrir("agendamentosSemSessao", "Ativos sem próxima sessão")}
          verListaLabel="Ver indicadores"
        />

        <IndicatorTile
          label="Pacientes sem telefone"
          value={rq?.pacientesSemTelefone.valor ?? null}
          secondary="Bloqueia lembretes, follow-up e alta por telefone"
          criterio={criterios.pacientesSemTelefone}
          isLoading={resumo.isLoading}
          onVerLista={() => abrir("pacientesSemTelefone", "Pacientes sem telefone")}
        />
      </div>

      <Dialog open={lista !== null} onOpenChange={(aberto) => !aberto && setLista(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lista?.titulo}</DialogTitle>
            {lista?.criterio ? (
              <DialogDescription>{lista.criterio}</DialogDescription>
            ) : null}
          </DialogHeader>

          {/* Único scroller: o DialogContent do projeto é flex-col, e um
              segundo container rolável cortaria o conteúdo. */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {detalhe.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
            ) : linhas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum registro nesta lista.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {linhas.map((linha, i) => (
                  <li
                    key={String(linha.patientId ?? linha.patient_id ?? i)}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="truncate">{nomeDaLinha(linha, i)}</span>
                    {typeof linha.sessoes === "number" ? (
                      <Badge variant="outline">{linha.sessoes} sessões</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {linhas.length >= 100 ? (
            <p className="pt-2 text-xs text-muted-foreground">
              Mostrando os primeiros 100. Use o painel de indicadores para a lista completa.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
