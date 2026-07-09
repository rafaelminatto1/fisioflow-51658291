import type { Tarefa } from "@/types/tarefas";

export type MinhasTarefasGrupo = "atrasadas" | "hoje" | "emBreve" | "semData";

export interface MinhasTarefasGrupos {
  atrasadas: Tarefa[];
  hoje: Tarefa[];
  emBreve: Tarefa[];
  semData: Tarefa[];
}

const DONE_STATUSES = new Set(["CONCLUIDO", "ARQUIVADO"]);

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function isMinhaTarefa(tarefa: Tarefa, userId: string): boolean {
  if (!userId) return false;
  if (tarefa.responsavel_id === userId) return true;
  return Array.isArray(tarefa.assignees) && tarefa.assignees.some((a) => a.id === userId);
}

/**
 * Agrupa tarefas abertas do usuário no padrão "Minhas Tarefas" (Asana):
 * Atrasadas / Hoje / Em breve (próximos 7 dias) / Sem data.
 * `today` em YYYY-MM-DD para determinismo nos testes.
 */
export function groupMinhasTarefas(
  tarefas: Tarefa[],
  userId: string,
  today: string,
): MinhasTarefasGrupos {
  const grupos: MinhasTarefasGrupos = { atrasadas: [], hoje: [], emBreve: [], semData: [] };
  const [y, m, d] = today.split("-").map(Number);
  const limite = new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10);

  for (const tarefa of tarefas) {
    if (DONE_STATUSES.has(tarefa.status)) continue;
    if (!isMinhaTarefa(tarefa, userId)) continue;

    const due = dateOnly(tarefa.data_vencimento);
    if (!due) grupos.semData.push(tarefa);
    else if (due < today) grupos.atrasadas.push(tarefa);
    else if (due === today) grupos.hoje.push(tarefa);
    else if (due <= limite) grupos.emBreve.push(tarefa);
    else grupos.semData.push(tarefa);
  }

  const byDue = (a: Tarefa, b: Tarefa) =>
    (dateOnly(a.data_vencimento) ?? "9999").localeCompare(dateOnly(b.data_vencimento) ?? "9999");
  grupos.atrasadas.sort(byDue);
  grupos.emBreve.sort(byDue);
  return grupos;
}
