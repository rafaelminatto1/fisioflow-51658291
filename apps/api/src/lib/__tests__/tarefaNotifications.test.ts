import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendAutomationTemplate = vi.fn();
vi.mock("../whatsappAutomations", () => ({
  sendAutomationTemplate: (...args: unknown[]) => mockSendAutomationTemplate(...args),
}));

import {
  assignmentTarget,
  formatDueDateBR,
  notifyTaskAssignment,
  extractMentionIds,
} from "../tarefaNotifications";

const ENV = {} as never;

describe("assignmentTarget", () => {
  it("notifica novo responsável na criação", () => {
    expect(assignmentTarget(undefined, { id: "t1", responsavel_id: "u2" }, "u1")).toBe("u2");
  });

  it("não notifica auto-atribuição", () => {
    expect(assignmentTarget(undefined, { id: "t1", responsavel_id: "u1" }, "u1")).toBeNull();
  });

  it("não notifica quando responsável não mudou", () => {
    expect(
      assignmentTarget({ responsavel_id: "u2" }, { id: "t1", responsavel_id: "u2" }, "u1"),
    ).toBeNull();
  });

  it("notifica troca de responsável", () => {
    expect(
      assignmentTarget({ responsavel_id: "u2" }, { id: "t1", responsavel_id: "u3" }, "u1"),
    ).toBe("u3");
  });

  it("sem responsável → null", () => {
    expect(assignmentTarget(undefined, { id: "t1", responsavel_id: null }, "u1")).toBeNull();
  });
});

describe("formatDueDateBR", () => {
  it("formata date-only", () => {
    expect(formatDueDateBR("2026-07-15")).toBe("15/07/2026");
  });
  it("formata timestamp", () => {
    expect(formatDueDateBR("2026-07-15T00:00:00.000Z")).toBe("15/07/2026");
  });
  it("sem data → sem prazo", () => {
    expect(formatDueDateBR(null)).toBe("sem prazo");
    expect(formatDueDateBR("")).toBe("sem prazo");
  });
});

describe("notifyTaskAssignment", () => {
  const task = {
    id: "t1",
    titulo: "Ligar para paciente",
    prioridade: "MEDIA",
    responsavel_id: "u2",
    data_vencimento: "2026-07-15",
    board_id: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insere notificação in-app para o responsável", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await notifyTaskAssignment(pool as never, ENV, "org1", task, "u2");

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("INSERT INTO notifications");
    expect(params[1]).toBe("u2");
    expect(params[2]).toBe("task_assigned");
    expect(mockSendAutomationTemplate).not.toHaveBeenCalled();
  });

  it("URGENTE dispara WhatsApp com nome/título/prazo", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // insert notification
        .mockResolvedValueOnce({ rows: [{ name: "Maria Souza", phone: "+5511999999999" }] }),
    };
    await notifyTaskAssignment(
      pool as never,
      ENV,
      "org1",
      { ...task, prioridade: "URGENTE" },
      "u2",
    );

    expect(mockSendAutomationTemplate).toHaveBeenCalledWith(
      ENV,
      "org1",
      "+5511999999999",
      "tarefa_urgente_equipe",
      ["Maria", "Ligar para paciente", "15/07/2026"],
    );
  });

  it("falha no insert não explode nem impede WhatsApp", async () => {
    const pool = {
      query: vi
        .fn()
        .mockRejectedValueOnce(new Error("db down"))
        .mockResolvedValueOnce({ rows: [{ name: "Ana", phone: "+551188888888" }] }),
    };
    await expect(
      notifyTaskAssignment(pool as never, ENV, "org1", { ...task, prioridade: "URGENTE" }, "u2"),
    ).resolves.toBeUndefined();
    expect(mockSendAutomationTemplate).toHaveBeenCalled();
  });

  it("membro sem telefone → passa phone null (gate decide)", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ name: "Ana", phone: null }] }),
    };
    await notifyTaskAssignment(
      pool as never,
      ENV,
      "org1",
      { ...task, prioridade: "URGENTE" },
      "u2",
    );
    expect(mockSendAutomationTemplate).toHaveBeenCalledWith(
      ENV,
      "org1",
      null,
      "tarefa_urgente_equipe",
      expect.any(Array),
    );
  });
});

describe("extractMentionIds", () => {
  it("filtra não-strings e limita a 20", () => {
    expect(extractMentionIds(["u1", "", 3, "u2"])).toEqual(["u1", "u2"]);
    expect(extractMentionIds(Array.from({ length: 30 }, (_, i) => `u${i}`))).toHaveLength(20);
    expect(extractMentionIds(null)).toEqual([]);
  });
});
