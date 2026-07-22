import { describe, it, expect } from "vitest";
import { buildRegistry } from "../tools";

describe("copilot tools registry", () => {
  it("exposes a clinical knowledge base search tool for grounding", () => {
    const tool = buildRegistry().find((t) => t.name === "search_clinical_knowledge");
    expect(tool).toBeDefined();
    expect(tool!.description.toLowerCase()).toContain("protocolo");
  });

  it("requires a non-trivial query for the clinical knowledge tool", () => {
    const tool = buildRegistry().find((t) => t.name === "search_clinical_knowledge")!;
    expect(tool.parameters.safeParse({ q: "ok" }).success).toBe(false);
    expect(tool.parameters.safeParse({ q: "reabilitação de LCA" }).success).toBe(true);
  });
});
