import { describe, it, expect, vi, beforeEach } from "vitest";
import { processClinicalEmbedding, ClinicalEmbeddingError } from "./embeddings";
import { CLINICAL_EMBEDDING_DIM } from "../workersAi";

const sqlSpy = vi.fn();
vi.mock("../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

function makeEnv(vector: number[] | undefined) {
  return {
    AI: { run: vi.fn().mockResolvedValue({ data: vector ? [vector] : [] }) },
    ANALYTICS: { writeDataPoint: vi.fn() },
  } as any;
}

const ORG = "11111111-1111-1111-1111-111111111111";
const PAC = "22222222-2222-2222-2222-222222222222";
const EVO = "33333333-3333-3333-3333-333333333333";
const TEXTO = "Paciente relatou melhora após liberação miofascial em lombar.";

beforeEach(() => {
  sqlSpy.mockReset().mockResolvedValue({ rows: [] });
});

describe("processClinicalEmbedding", () => {
  it("grava o vetor quando a dimensão bate com a coluna", async () => {
    const env = makeEnv(Array(CLINICAL_EMBEDDING_DIM).fill(0.1));
    await processClinicalEmbedding(env, ORG, PAC, EVO, TEXTO);
    expect(sqlSpy).toHaveBeenCalledTimes(1);
  });

  it("falha alto quando a dimensão do modelo diverge da coluna", async () => {
    // Regressão: bge-m3 devolve 1024 e a coluna era vector(1536). O INSERT
    // quebrava no Postgres e um catch silencioso escondia ~11 mil falhas.
    const env = makeEnv(Array(1536).fill(0.1));

    await expect(processClinicalEmbedding(env, ORG, PAC, EVO, TEXTO)).rejects.toThrow(
      ClinicalEmbeddingError,
    );
    expect(sqlSpy).not.toHaveBeenCalled();
    expect(env.ANALYTICS.writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({ indexes: ["clinical_embedding_failed"] }),
    );
  });

  it("falha quando o modelo não devolve vetor", async () => {
    const env = makeEnv(undefined);
    await expect(processClinicalEmbedding(env, ORG, PAC, EVO, TEXTO)).rejects.toThrow(
      /sem vetor/,
    );
  });

  it("propaga erro de persistência em vez de engolir", async () => {
    const env = makeEnv(Array(CLINICAL_EMBEDDING_DIM).fill(0.1));
    sqlSpy.mockRejectedValueOnce(new Error("conexão caiu"));

    await expect(processClinicalEmbedding(env, ORG, PAC, EVO, TEXTO)).rejects.toMatchObject({
      stage: "persist",
    });
  });

  it("ignora texto curto demais para carregar sinal clínico", async () => {
    const env = makeEnv(Array(CLINICAL_EMBEDDING_DIM).fill(0.1));
    await processClinicalEmbedding(env, ORG, PAC, EVO, "ok");
    expect(env.AI.run).not.toHaveBeenCalled();
    expect(sqlSpy).not.toHaveBeenCalled();
  });
});
