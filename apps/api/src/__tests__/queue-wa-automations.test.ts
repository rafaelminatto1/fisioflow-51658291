import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../lib/db", () => ({
  createPool: () => ({ query: mockQuery }),
  createPoolForOrg: () => ({ query: mockQuery }),
  getRawSql: () => vi.fn(),
  runWithOrg: (_o: string, fn: () => any) => fn(),
}));

const mockSend = vi.fn(async (..._a: any[]) => ({ sent: true }));
vi.mock("../lib/whatsappAutomations", () => ({
  sendAutomationTemplate: (...a: any[]) => mockSend(...a),
}));

import { processPatientCreatedWelcome, processAppointmentCompleted } from "../queue";

const baseEnv = { BACKGROUND_QUEUE: { send: vi.fn(async () => undefined) } } as any;

describe("queue — fluxos WhatsApp automáticos portados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseEnv.BACKGROUND_QUEUE.send = vi.fn(async () => undefined);
  });

  it("welcome: envia boas_vindas_paciente SEM variáveis (template aprovado na Meta tem 0 vars)", async () => {
    await processPatientCreatedWelcome(
      { organizationId: "org-1", name: "Maria Silva", phone: "5511999999999" },
      baseEnv,
    );
    expect(mockSend).toHaveBeenCalledWith(
      baseEnv,
      "org-1",
      "5511999999999",
      "boas_vindas_paciente",
      [],
    );
  });

  it("welcome: no-op sem organizationId", async () => {
    await processPatientCreatedWelcome({ name: "Maria", phone: "5511999999999" } as any, baseEnv);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("appointment.completed: enfileira feedback com atraso de 2h", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] }); // contagem de sessões
    await processAppointmentCompleted(
      { organizationId: "org-1", patientId: "p-1", name: "João Souza", phone: "5511988887777" },
      baseEnv,
    );
    const call = baseEnv.BACKGROUND_QUEUE.send.mock.calls[0];
    expect(call[0]).toMatchObject({
      type: "WA_AUTOMATION",
      payload: { templateKey: "feedback_atendimento", vars: ["João"], organizationId: "org-1" },
    });
    expect(call[1]).toEqual({ delaySeconds: 7200 });
  });

  it("appointment.completed: pede review na 5ª sessão concluída", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });
    await processAppointmentCompleted(
      { organizationId: "org-1", patientId: "p-1", name: "João Souza", phone: "5511988887777" },
      baseEnv,
    );
    expect(mockSend).toHaveBeenCalledWith(
      baseEnv,
      "org-1",
      "5511988887777",
      "avaliacao_google",
      ["João"],
    );
  });

  it("appointment.completed: NÃO pede review fora da 5ª sessão", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 3 }] });
    await processAppointmentCompleted(
      { organizationId: "org-1", patientId: "p-1", name: "João", phone: "5511988887777" },
      baseEnv,
    );
    const reviewCall = mockSend.mock.calls.find((c) => c[3] === "avaliacao_google");
    expect(reviewCall).toBeUndefined();
  });
});
