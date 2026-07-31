import { describe, it, expect, vi, beforeEach } from "vitest";
import { toRows, extractAndStore } from "../extractionStore";
import { parseEvolution } from "../evolutionParser";
import { LEXICON_VERSION } from "../lexicon";

const sqlSpy = vi.fn();
vi.mock("../../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

const TEXTO =
  "Lib mio com massagem gun em TFS bilateral e lombar\nEENM em QDP D realizando agachamento 3x15rep com caneleira 4kg\nDesconforto EVA 6/10";

beforeEach(() => {
  sqlSpy.mockReset().mockResolvedValue({ rows: [] });
});

describe("toRows", () => {
  it("decompõe dosagem em séries e repetições numéricas, para permitir agregação", () => {
    const rows = toRows(parseEvolution(TEXTO));
    const series = rows.find((r) => r.code === "series");
    const reps = rows.find((r) => r.code === "repeticoes");
    expect(series).toMatchObject({ category: "dosagem", valueNumeric: 3, valueUnit: "sets" });
    expect(reps).toMatchObject({ category: "dosagem", valueNumeric: 15, valueUnit: "reps" });
  });

  it("registra carga com unidade", () => {
    const rows = toRows(parseEvolution(TEXTO));
    expect(rows.find((r) => r.category === "carga")).toMatchObject({
      valueNumeric: 4,
      valueUnit: "kg",
    });
  });

  it("registra EVA extraída do texto", () => {
    const rows = toRows(parseEvolution(TEXTO));
    expect(rows.find((r) => r.category === "eva")).toMatchObject({
      valueNumeric: 6,
      valueUnit: "pontos",
    });
  });

  it("toda linha carrega o trecho de origem", () => {
    for (const r of toRows(parseEvolution(TEXTO))) {
      expect(r.sourceText.length).toBeGreaterThan(0);
      expect(r.sourceStart).not.toBeNull();
    }
  });

  it("não emite duplicata para a mesma extração no mesmo offset", () => {
    const rows = toRows(parseEvolution(TEXTO));
    const keys = rows.map((r) => `${r.category}|${r.code}|${r.sourceStart}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("texto sem termos conhecidos não gera linha", () => {
    expect(toRows(parseEvolution("Paciente remarcou para a semana que vem."))).toHaveLength(0);
  });
});

describe("extractAndStore", () => {
  const base = {
    organizationId: "11111111-1111-1111-1111-111111111111",
    patientId: "22222222-2222-2222-2222-222222222222",
    sourceTable: "sessions",
    sourceId: "33333333-3333-3333-3333-333333333333",
  };

  it("apaga extrações anteriores do parser antes de reinserir (idempotência)", async () => {
    await extractAndStore({} as any, { ...base, text: TEXTO });
    const [deleteCall] = sqlSpy.mock.calls;
    expect(String(deleteCall[0].join("?"))).toMatch(/DELETE FROM clinical_extractions/);
  });

  it("preserva linhas de IA e linhas revisadas por humano ao reprocessar", async () => {
    // Reprocessar o léxico não pode descartar curadoria nem inferência auditada.
    await extractAndStore({} as any, { ...base, text: TEXTO });
    const deleteSql = String(sqlSpy.mock.calls[0][0].join("?"));
    expect(deleteSql).toMatch(/method = 'parser'/);
    expect(deleteSql).toMatch(/reviewed_by IS NULL/);
  });

  it("carimba a versão do léxico em cada linha gravada", async () => {
    await extractAndStore({} as any, { ...base, text: TEXTO });
    const insertArgs = sqlSpy.mock.calls[1];
    expect(insertArgs.slice(1)).toContain(LEXICON_VERSION);
  });

  it("não executa INSERT quando não há nada a extrair", async () => {
    const r = await extractAndStore({} as any, { ...base, text: "Paciente remarcou." });
    expect(r.rowsWritten).toBe(0);
    expect(sqlSpy).toHaveBeenCalledTimes(1); // só o DELETE
  });

  it("reporta quando a evolução não casou com nenhum termo", async () => {
    const r = await extractAndStore({} as any, { ...base, text: "Paciente remarcou." });
    expect(r.hasAnyMatch).toBe(false);
  });
});
