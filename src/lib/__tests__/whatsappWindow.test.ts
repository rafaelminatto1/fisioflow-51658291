import { describe, it, expect } from "vitest";
import { isWhatsAppWindowOpen } from "../whatsappWindow";

const HOUR = 60 * 60 * 1000;

describe("isWhatsAppWindowOpen", () => {
  const now = new Date("2026-06-29T17:00:00Z").getTime();

  it("is open when the last inbound message is within 24h", () => {
    const messages = [
      { direction: "inbound", timestamp: new Date(now - 2 * HOUR).toISOString() },
    ];
    expect(isWhatsAppWindowOpen(messages, now)).toBe(true);
  });

  it("is closed when the last inbound message is older than 24h", () => {
    const messages = [
      { direction: "inbound", timestamp: new Date(now - 30 * HOUR).toISOString() },
      { direction: "outbound", timestamp: new Date(now - 1 * HOUR).toISOString() },
    ];
    expect(isWhatsAppWindowOpen(messages, now)).toBe(false);
  });

  it("is closed when there are no inbound messages at all", () => {
    const messages = [
      { direction: "outbound", timestamp: new Date(now - 1 * HOUR).toISOString() },
    ];
    expect(isWhatsAppWindowOpen(messages, now)).toBe(false);
  });

  it("is closed for an empty conversation", () => {
    expect(isWhatsAppWindowOpen([], now)).toBe(false);
  });

  it("uses the most recent inbound message when several exist", () => {
    const messages = [
      { direction: "inbound", timestamp: new Date(now - 40 * HOUR).toISOString() },
      { direction: "inbound", timestamp: new Date(now - 1 * HOUR).toISOString() },
    ];
    expect(isWhatsAppWindowOpen(messages, now)).toBe(true);
  });
});
