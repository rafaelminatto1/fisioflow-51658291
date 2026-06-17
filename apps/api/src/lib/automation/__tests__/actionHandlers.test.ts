import { describe, it, expect, vi } from "vitest";

const send = vi.fn(async () => ({ id: "e1" }));
vi.mock("../../email", () => ({ createResend: (env: any) => (env.RESEND_API_KEY ? { emails: { send } } : null) }));

const sqlInsert = vi.fn(async (_q: string, _p?: unknown[]) => ({ rows: [] }));
vi.mock("../../db", () => ({
  getRawSql: () => sqlInsert,
  runWithOrg: (_org: string, fn: () => Promise<unknown>) => fn(),
}));

import { buildActionHandlers } from "../actionHandlers";

describe("buildActionHandlers", () => {
  it("send_email sends via Resend when configured", async () => {
    const handlers = buildActionHandlers({ RESEND_API_KEY: "k" } as any);
    const out: any = await handlers.send_email({ to: "a@b.com", subject: "Oi", message: "<p>oi</p>" }, {});
    expect(out.sent).toBe(true);
    expect(send).toHaveBeenCalled();
  });

  it("send_email skips without a recipient", async () => {
    const handlers = buildActionHandlers({ RESEND_API_KEY: "k" } as any);
    const out: any = await handlers.send_email({}, {});
    expect(out.skipped).toBeTruthy();
  });

  it("send_whatsapp enqueues a SEND_WHATSAPP task", async () => {
    const queueSend = vi.fn(async (_t: any) => {});
    const handlers = buildActionHandlers({ BACKGROUND_QUEUE: { send: queueSend } } as any);
    const out: any = await handlers.send_whatsapp(
      { templateName: "lembrete", message: "oi" },
      { organizationId: "o1", patientId: "p1", patientPhone: "5511999" },
    );
    expect(out.enqueued).toBe(true);
    const task = queueSend.mock.calls[0][0];
    expect(task.type).toBe("SEND_WHATSAPP");
    expect(task.payload.to).toBe("5511999");
    expect(task.payload.organizationId).toBe("o1");
  });

  it("create_task inserts into tarefas with org context", async () => {
    sqlInsert.mockClear();
    const handlers = buildActionHandlers({} as any);
    const out: any = await handlers.create_task({ title: "Ligar para paciente" }, { organizationId: "o1" });
    expect(out.created).toBe(true);
    const [q, p] = sqlInsert.mock.calls[0];
    expect(String(q)).toContain("INSERT INTO tarefas");
    expect(p).toEqual(["o1", "automation", "Ligar para paciente", null]);
  });

  it("create_task skips without org", async () => {
    const handlers = buildActionHandlers({} as any);
    const out: any = await handlers.create_task({ title: "x" }, {});
    expect(out.skipped).toBeTruthy();
  });

  it("log_event returns logged", async () => {
    const handlers = buildActionHandlers({} as any);
    const out: any = await handlers.log_event({ msg: "x" }, { a: 1 });
    expect(out.logged).toBe(true);
  });
});
