import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
vi.mock("../db", () => ({
  getRawSql: () => sqlMock,
}));

import { getAgentMemoryDriver, recallAgentMemory, rememberAgentMemory } from "../agentMemory";

function pgvectorEnv() {
  return {
    AI: {
      run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
    },
    HYPERDRIVE: { connectionString: "postgres://x" },
  } as any;
}

beforeEach(() => {
  sqlMock.mockReset();
});

describe("getAgentMemoryDriver", () => {
  it("prefere o binding nativo quando presente", () => {
    const env = { ...pgvectorEnv(), AGENT_MEMORY: { getProfile: vi.fn() } } as any;
    expect(getAgentMemoryDriver(env)).toBe("native");
  });

  it("cai para pgvector com AI + Hyperdrive", () => {
    expect(getAgentMemoryDriver(pgvectorEnv())).toBe("pgvector");
  });

  it("retorna null sem infraestrutura", () => {
    expect(getAgentMemoryDriver({} as any)).toBeNull();
  });
});

describe("rememberAgentMemory (pgvector)", () => {
  it("gera embedding e insere com escopo de organização", async () => {
    const env = pgvectorEnv();
    sqlMock.mockResolvedValue({ rows: [{ id: "m1", created_at: "2026-06-12" }] });

    const result = await rememberAgentMemory(env, {
      organizationId: "11111111-2222-3333-4444-555555555555",
      patientId: "99999999-8888-7777-6666-555555555555",
      content: "Paciente prefere sessões pela manhã e tem medo de agulhas.",
      profileTypes: ["patient"],
    });

    expect(result.configured).toBe(true);
    expect(result.driver).toBe("pgvector");
    expect(env.AI.run).toHaveBeenCalledWith("@cf/baai/bge-m3", {
      text: ["Paciente prefere sessões pela manhã e tem medo de agulhas."],
    });
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});

describe("recallAgentMemory (pgvector)", () => {
  it("filtra por similaridade mínima e monta resposta", async () => {
    const env = pgvectorEnv();
    sqlMock.mockResolvedValue({
      rows: [
        { content: "Prefere manhã", similarity: 0.9 },
        { content: "Irrelevante", similarity: 0.2 },
      ],
    });

    const result = await recallAgentMemory(env, {
      organizationId: "11111111-2222-3333-4444-555555555555",
      query: "qual horário o paciente prefere?",
    });

    expect(result.configured).toBe(true);
    expect(result.driver).toBe("pgvector");
    expect(result.count).toBe(1);
    expect(result.answer).toContain("Prefere manhã");
    expect(result.answer).not.toContain("Irrelevante");
  });

  it("retorna vazio sem lançar quando embedding falha", async () => {
    const env = pgvectorEnv();
    env.AI.run.mockRejectedValue(new Error("ai down"));

    const result = await recallAgentMemory(env, {
      organizationId: "11111111-2222-3333-4444-555555555555",
      query: "qualquer coisa",
    });

    expect(result.configured).toBe(true);
    expect(result.count).toBe(0);
  });
});
