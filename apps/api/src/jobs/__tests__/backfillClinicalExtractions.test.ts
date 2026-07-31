import { describe, it, expect, vi, beforeEach } from "vitest";
import { backfillClinicalExtractions } from "../backfillClinicalExtractions";
import { LEXICON_VERSION } from "../../lib/clinical/lexicon";

const selectSpy = vi.fn();
vi.mock("../../lib/db", () => ({
  getRawSql: () => (...args: unknown[]) => selectSpy(...args),
}));

const storeSpy = vi.fn();
vi.mock("../../lib/clinical/extractionStore", () => ({
  extractAndStore: (...args: unknown[]) => storeSpy(...args),
}));

const ORG = "11111111-1111-1111-1111-111111111111";

function evolucoes(n: number, prefix = "a") {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${String(i).padStart(8, "0")}-0000-0000-0000-000000000000`,
    patient_id: "22222222-2222-2222-2222-222222222222",
    observacao: "Lib mio manual em TFS e lombar 3x10rep",
  }));
}

beforeEach(() => {
  selectSpy.mockReset();
  storeSpy.mockReset().mockResolvedValue({ sourceId: "x", rowsWritten: 4, hasAnyMatch: true });
});

describe("backfillClinicalExtractions", () => {
  it("processa o lote e soma as linhas gravadas", async () => {
    selectSpy.mockResolvedValue({ rows: evolucoes(3) });
    const r = await backfillClinicalExtractions({} as any, { organizationId: ORG, batchSize: 10 });
    expect(r.processed).toBe(3);
    expect(r.rowsWritten).toBe(12);
    expect(storeSpy).toHaveBeenCalledTimes(3);
  });

  it("devolve cursor quando o lote veio cheio — ainda há fila", async () => {
    selectSpy.mockResolvedValue({ rows: evolucoes(5) });
    const r = await backfillClinicalExtractions({} as any, { organizationId: ORG, batchSize: 5 });
    expect(r.nextCursor).toBe(evolucoes(5)[4].id);
  });

  it("encerra com cursor nulo quando o lote veio incompleto", async () => {
    selectSpy.mockResolvedValue({ rows: evolucoes(2) });
    const r = await backfillClinicalExtractions({} as any, { organizationId: ORG, batchSize: 5 });
    expect(r.nextCursor).toBeNull();
  });

  it("lote vazio encerra sem erro", async () => {
    selectSpy.mockResolvedValue({ rows: [] });
    const r = await backfillClinicalExtractions({} as any, { organizationId: ORG });
    expect(r).toMatchObject({ processed: 0, rowsWritten: 0, nextCursor: null });
  });

  it("conta evoluções que não casaram com o léxico", async () => {
    selectSpy.mockResolvedValue({ rows: evolucoes(2) });
    storeSpy.mockResolvedValue({ sourceId: "x", rowsWritten: 0, hasAnyMatch: false });
    const r = await backfillClinicalExtractions({} as any, { organizationId: ORG });
    expect(r.withoutMatch).toBe(2);
  });

  it("limita o lote para não estourar o CPU do Worker", async () => {
    selectSpy.mockResolvedValue({ rows: [] });
    await backfillClinicalExtractions({} as any, { organizationId: ORG, batchSize: 99999 });
    const params = selectSpy.mock.calls[0].slice(1);
    expect(params).toContain(500);
  });

  it("reporta a versão do léxico usada, para detectar backfill defasado", async () => {
    selectSpy.mockResolvedValue({ rows: [] });
    const r = await backfillClinicalExtractions({} as any, { organizationId: ORG });
    expect(r.lexiconVersion).toBe(LEXICON_VERSION);
  });

  it("isola por organização — nunca varre o corpus de outra clínica", async () => {
    selectSpy.mockResolvedValue({ rows: [] });
    await backfillClinicalExtractions({} as any, { organizationId: ORG });
    expect(selectSpy.mock.calls[0].slice(1)).toContain(ORG);
  });
});
