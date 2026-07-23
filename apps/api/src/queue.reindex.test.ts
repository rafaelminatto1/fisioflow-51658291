import { describe, it, expect, vi } from "vitest";

vi.mock("./lib/kbReindex", () => ({
  reindexKbItem: vi.fn(async () => {
    throw new Error("boom");
  }),
}));

import { handleQueue } from "./queue";

function makeMessage(attempts: number) {
  return {
    body: { type: "REINDEX_KB_ITEM", payload: { source: "protocols", id: "x" } },
    attempts,
    ack: vi.fn(),
    retry: vi.fn(),
  };
}

describe("handleQueue REINDEX_KB_ITEM", () => {
  it("re-tenta com backoff exponencial em vez de ack", async () => {
    const msg = makeMessage(2);
    await handleQueue({ messages: [msg] } as any, {} as any);
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledWith({ delaySeconds: 20 });
  });
});
