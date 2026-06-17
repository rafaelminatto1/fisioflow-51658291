import { describe, it, expect, vi } from "vitest";

const send = vi.fn(async () => ({ id: "e1" }));
vi.mock("../../email", () => ({ createResend: (env: any) => (env.RESEND_API_KEY ? { emails: { send } } : null) }));

import { buildActionHandlers } from "../actionHandlers";

describe("buildActionHandlers", () => {
  it("send_email sends via Resend when configured", async () => {
    const handlers = buildActionHandlers({ RESEND_API_KEY: "k" } as any);
    const out: any = await handlers.send_email({ to: "a@b.com", subject: "Oi", message: "<p>oi</p>" }, {});
    expect(out.sent).toBe(true);
    expect(send).toHaveBeenCalledOnce();
  });

  it("send_email skips without a recipient", async () => {
    const handlers = buildActionHandlers({ RESEND_API_KEY: "k" } as any);
    const out: any = await handlers.send_email({}, {});
    expect(out.skipped).toBeTruthy();
  });

  it("send_email skips when Resend is not configured", async () => {
    const handlers = buildActionHandlers({} as any);
    const out: any = await handlers.send_email({ to: "a@b.com" }, {});
    expect(out.skipped).toContain("Resend");
  });

  it("log_event returns logged", async () => {
    const handlers = buildActionHandlers({} as any);
    const out: any = await handlers.log_event({ msg: "x" }, { a: 1 });
    expect(out.logged).toBe(true);
  });
});
