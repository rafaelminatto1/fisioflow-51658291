import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../lib/db", () => ({
  createPool: () => ({ query: mockQuery }),
  createPoolForOrg: () => ({ query: mockQuery }),
  getRawSql: () => vi.fn(),
  runWithOrg: (_org: string, fn: () => any) => fn(),
}));

const mockGeneratePdf = vi.fn(async (..._a: any[]) => new Uint8Array([1, 2, 3]));
vi.mock("../routes/reportsPdf", () => ({
  buildHtml: () => "<html></html>",
  generatePdfQuickAction: (...a: unknown[]) => mockGeneratePdf(...a),
}));

const mockUpload = vi.fn(async () => undefined);
vi.mock("../lib/storage/R2Service", () => ({
  R2Service: class {
    uploadFile = mockUpload;
  },
}));

const mockSendEmail = vi.fn(async (..._a: any[]) => undefined);
vi.mock("../lib/email", () => ({
  sendPrescriptionEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

import { processPrescriptionCreated } from "../queue";

const env = { R2_PUBLIC_URL: "https://media.example.com" } as any;

describe("processPrescriptionCreated", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gera PDF, sobe no R2 e envia email quando o paciente tem email", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          patient_name: "Fulano de Tal",
          email: "fulano@example.com",
          plan_name: "Plano Lombar",
          items: [{ name: "Agachamento", sets: 3, reps: 12, notes: null }],
        },
      ],
    });

    const out = await processPrescriptionCreated(
      { planId: "plan-1", patientId: "pat-1", organizationId: "org-1" },
      env,
    );

    expect(mockGeneratePdf).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(out.emailSent).toBe(true);
    expect(out.pdfUrl).toContain("https://media.example.com/");
  });

  it("gera o PDF mas NÃO envia email quando o paciente não tem email", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ patient_name: "Sem Email", email: null, plan_name: "Plano", items: [] }],
    });

    const out = await processPrescriptionCreated(
      { planId: "plan-2", patientId: "pat-2", organizationId: "org-1" },
      env,
    );

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(out.emailSent).toBe(false);
  });

  it("retorna erro e não gera nada quando o plano não existe", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const out = await processPrescriptionCreated(
      { planId: "x", patientId: "y", organizationId: "org-1" },
      env,
    );

    expect(out.error).toBeTruthy();
    expect(mockGeneratePdf).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
