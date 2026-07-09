import { describe, it, expect } from "vitest";
import { groupMinhasTarefas, isMinhaTarefa } from "../tarefasGrouping";
import type { Tarefa } from "@/types/tarefas";

const TODAY = "2026-07-09";

function tarefa(partial: Partial<Tarefa>): Tarefa {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: "t",
    status: "A_FAZER",
    prioridade: "MEDIA",
    tipo: "TAREFA",
    created_at: "2026-07-01",
    updated_at: "2026-07-01",
    ...partial,
  } as Tarefa;
}

describe("isMinhaTarefa", () => {
  it("responsável direto", () => {
    expect(isMinhaTarefa(tarefa({ responsavel_id: "u1" }), "u1")).toBe(true);
    expect(isMinhaTarefa(tarefa({ responsavel_id: "u2" }), "u1")).toBe(false);
  });

  it("via assignees", () => {
    expect(
      isMinhaTarefa(tarefa({ assignees: [{ id: "u1", full_name: "Ana" }] }), "u1"),
    ).toBe(true);
  });

  it("userId vazio nunca casa", () => {
    expect(isMinhaTarefa(tarefa({ responsavel_id: "" }), "")).toBe(false);
  });
});

describe("groupMinhasTarefas", () => {
  it("agrupa por atrasadas/hoje/em breve/sem data", () => {
    const tarefas = [
      tarefa({ id: "a", responsavel_id: "u1", data_vencimento: "2026-07-01" }),
      tarefa({ id: "b", responsavel_id: "u1", data_vencimento: "2026-07-09" }),
      tarefa({ id: "c", responsavel_id: "u1", data_vencimento: "2026-07-12" }),
      tarefa({ id: "d", responsavel_id: "u1" }),
    ];
    const g = groupMinhasTarefas(tarefas, "u1", TODAY);
    expect(g.atrasadas.map((t) => t.id)).toEqual(["a"]);
    expect(g.hoje.map((t) => t.id)).toEqual(["b"]);
    expect(g.emBreve.map((t) => t.id)).toEqual(["c"]);
    expect(g.semData.map((t) => t.id)).toEqual(["d"]);
  });

  it("vencimento além de 7 dias vai para sem data", () => {
    const g = groupMinhasTarefas(
      [tarefa({ id: "x", responsavel_id: "u1", data_vencimento: "2026-08-01" })],
      "u1",
      TODAY,
    );
    expect(g.semData.map((t) => t.id)).toEqual(["x"]);
    expect(g.emBreve).toHaveLength(0);
  });

  it("exclui concluídas/arquivadas e tarefas de outros", () => {
    const g = groupMinhasTarefas(
      [
        tarefa({ responsavel_id: "u1", status: "CONCLUIDO", data_vencimento: "2026-07-01" }),
        tarefa({ responsavel_id: "u1", status: "ARQUIVADO" }),
        tarefa({ responsavel_id: "u2", data_vencimento: "2026-07-09" }),
      ],
      "u1",
      TODAY,
    );
    expect(g.atrasadas).toHaveLength(0);
    expect(g.hoje).toHaveLength(0);
    expect(g.semData).toHaveLength(0);
  });

  it("ordena atrasadas/em breve por vencimento", () => {
    const g = groupMinhasTarefas(
      [
        tarefa({ id: "b", responsavel_id: "u1", data_vencimento: "2026-07-05" }),
        tarefa({ id: "a", responsavel_id: "u1", data_vencimento: "2026-07-01" }),
      ],
      "u1",
      TODAY,
    );
    expect(g.atrasadas.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("aceita timestamp ISO no vencimento", () => {
    const g = groupMinhasTarefas(
      [tarefa({ id: "t", responsavel_id: "u1", data_vencimento: "2026-07-09T00:00:00Z" })],
      "u1",
      TODAY,
    );
    expect(g.hoje.map((t) => t.id)).toEqual(["t"]);
  });
});
