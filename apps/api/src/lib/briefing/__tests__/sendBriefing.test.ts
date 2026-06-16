import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn(async () => ({ id: "e1" }));
vi.mock("../../email", () => ({ createResend: () => ({ emails: { send } }) }));
vi.mock("../../../routes/briefing", () => ({
  getBriefing: vi.fn(async () => ({
    date: "2026-06-16",
    total: 0,
    countsByStatus: {},
    appointmentsToday: [],
    noShowsYesterday: 0,
    inactivePatients: 0,
    summary: "s",
  })),
}));

import { dispatchMorningBriefing } from "../sendBriefing";

describe("dispatchMorningBriefing (gating)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when the flag is off", async () => {
    const sent = await dispatchMorningBriefing({ MORNING_BRIEFING_TO: "a@b.com", MORNING_BRIEFING_ORG_ID: "o1" } as any);
    expect(sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("does nothing when recipient/org are missing", async () => {
    const sent = await dispatchMorningBriefing({ MORNING_BRIEFING_ENABLED: "true" } as any);
    expect(sent).toBe(false);
  });

  it("sends when enabled and configured", async () => {
    const sent = await dispatchMorningBriefing({
      MORNING_BRIEFING_ENABLED: "true",
      MORNING_BRIEFING_TO: "a@b.com",
      MORNING_BRIEFING_ORG_ID: "o1",
      RESEND_API_KEY: "k",
    } as any);
    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledOnce();
  });
});
