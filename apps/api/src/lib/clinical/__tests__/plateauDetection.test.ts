import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectPlateaus,
  PLATEAU_MIN_SESSIONS,
  PAIN_MCID_POINTS,
} from "../plateauDetection";

const sqlSpy = vi.fn();
vi.mock("../../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

const ORG = "11111111-1111-1111-1111-111111111111";

function row(over: Record<string, unknown> = {}) {
  return {
    patientId: "22222222-2222-2222-2222-222222222222",
    patientName: "Paciente Teste",
    sig: "lombar,liberacao_miofascial_manual,tens",
    sessoes: 5,
    de: "2026-06-01",
    ate: "2026-07-01",
    loadStalled: null,
    painStalled: null,
    ...over,
  };
}

beforeEach(() => sqlSpy.mockReset().mockResolvedValue({ rows: [] }));

describe("limiares", () => {
  it("usa 4 sessões, acima do p95 do nosso corpus", () => {
    // p50=1, p90=2, p95=3 em 8.876 sequências: 4 é raro por construção.
    expect(PLATEAU_MIN_SESSIONS).toBe(4);
  });

  it("usa 1 ponto como MCID de dor (Salaffi 2004)", () => {
    expect(PAIN_MCID_POINTS).toBe(1);
  });
});

describe("detectPlateaus", () => {
  it("isola por organização", async () => {
    await detectPlateaus({} as any, { organizationId: ORG });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(ORG);
  });

  it("nunca aceita janela menor que 2 sessões", async () => {
    await detectPlateaus({} as any, { organizationId: ORG, minSessions: 1 });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(2);
  });

  it("limita o retorno para não varrer a base inteira", async () => {
    await detectPlateaus({} as any, { organizationId: ORG, limit: 9999 });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(200);
  });

  it("conta 1 eixo quando só a conduta se repete", async () => {
    sqlSpy.mockResolvedValue({ rows: [row()] });
    const [p] = await detectPlateaus({} as any, { organizationId: ORG });
    expect(p.confirmingAxes).toBe(1);
    expect(p.loadStalled).toBeNull();
  });

  it("conta 3 eixos quando carga e dor também estagnaram", async () => {
    sqlSpy.mockResolvedValue({ rows: [row({ loadStalled: true, painStalled: true })] });
    const [p] = await detectPlateaus({} as any, { organizationId: ORG });
    expect(p.confirmingAxes).toBe(3);
  });

  it("não conta eixo quando a carga progrediu", async () => {
    sqlSpy.mockResolvedValue({ rows: [row({ loadStalled: false, painStalled: true })] });
    const [p] = await detectPlateaus({} as any, { organizationId: ORG });
    expect(p.confirmingAxes).toBe(2);
  });

  it("distingue 'sem dado' de 'não estagnou' — null não vira false", async () => {
    // Importa para a UI: "não medimos" e "medimos e melhorou" são coisas
    // diferentes, e colapsá-las esconderia falta de registro.
    sqlSpy.mockResolvedValue({ rows: [row({ painStalled: null, loadStalled: false })] });
    const [p] = await detectPlateaus({} as any, { organizationId: ORG });
    expect(p.painStalled).toBeNull();
    expect(p.loadStalled).toBe(false);
  });

  it("devolve a assinatura como lista de códigos", async () => {
    sqlSpy.mockResolvedValue({ rows: [row()] });
    const [p] = await detectPlateaus({} as any, { organizationId: ORG });
    expect(p.signature).toEqual(["lombar", "liberacao_miofascial_manual", "tens"]);
  });

  it("assinatura vazia não vira lista com string vazia", async () => {
    sqlSpy.mockResolvedValue({ rows: [row({ sig: null })] });
    const [p] = await detectPlateaus({} as any, { organizationId: ORG });
    expect(p.signature).toEqual([]);
  });
});
