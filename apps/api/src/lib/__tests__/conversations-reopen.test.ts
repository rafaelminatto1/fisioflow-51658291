import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ createPool: vi.fn() }));

import { findOrCreateConversation } from "../whatsapp-conversations";

function makePool(impl: (sql: string, params: any[]) => any) {
  return { query: vi.fn((sql: string, params: any[]) => Promise.resolve(impl(sql, params))) } as any;
}

describe("findOrCreateConversation — soft-deleted reopen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reopens a soft-deleted conversation when new activity arrives", async () => {
    const pool = makePool((sql) => {
      if (/SELECT \* FROM wa_conversations/.test(sql)) {
        return {
          rows: [
            {
              id: "conv-1",
              status: "open",
              metadata: { deleted_at: "2026-06-24T21:33:38Z", sla_escalated: "x" },
            },
          ],
        };
      }
      if (/UPDATE wa_conversations/.test(sql)) {
        return { rows: [{ id: "conv-1", status: "open", metadata: {} }] };
      }
      return { rows: [] };
    });

    const conv = await findOrCreateConversation(pool, "org-1", "contact-1", "whatsapp");

    expect(conv.id).toBe("conv-1");
    // An UPDATE that strips deleted_at must have been issued.
    const updateCall = pool.query.mock.calls.find((c: any[]) =>
      /UPDATE wa_conversations/.test(String(c[0])) && /deleted_at/.test(String(c[0])),
    );
    expect(updateCall).toBeTruthy();
    expect(conv.metadata.deleted_at).toBeUndefined();
  });

  it("returns an active conversation as-is without an UPDATE", async () => {
    const pool = makePool((sql) => {
      if (/SELECT \* FROM wa_conversations/.test(sql)) {
        return { rows: [{ id: "conv-2", status: "open", metadata: {} }] };
      }
      return { rows: [] };
    });

    const conv = await findOrCreateConversation(pool, "org-1", "contact-1", "whatsapp");

    expect(conv.id).toBe("conv-2");
    const updateCall = pool.query.mock.calls.find((c: any[]) => /UPDATE wa_conversations/.test(String(c[0])));
    expect(updateCall).toBeFalsy();
  });
});
