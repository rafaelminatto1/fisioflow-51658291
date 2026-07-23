import { describe, it, expect } from "vitest";
import { aggregateStatus } from "./reindexStatus";

describe("aggregateStatus", () => {
  it("conta erros e pendentes e coleta chaves de erro", () => {
    const out = aggregateStatus([
      { status: "error", key: "protocol-1--0.md" },
      { status: "error", key: "wiki-2--0.md" },
      { status: "running", key: "exercise-3--0.md" },
      { status: "queued", key: "exercise-4--0.md" },
      { status: "completed", key: "protocol-5--0.md" },
    ]);
    expect(out.errors).toBe(2);
    expect(out.pending).toBe(2);
    expect(out.errorKeys).toEqual(["protocol-1--0.md", "wiki-2--0.md"]);
  });
});
