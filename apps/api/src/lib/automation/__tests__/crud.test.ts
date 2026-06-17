import { describe, it, expect } from "vitest";
import { CreateAutomationBody, buildAutomationInsert } from "../../../routes/automation";

const validDef = {
  nodes: [
    { id: "t", type: "trigger" },
    { id: "a", type: "action", action: "send_email" },
  ],
  edges: [{ from: "t", to: "a" }],
};

describe("CreateAutomationBody", () => {
  it("accepts a valid automation", () => {
    const parsed = CreateAutomationBody.parse({ name: "Parabéns por melhora", definition: validDef });
    expect(parsed.name).toBe("Parabéns por melhora");
    expect(parsed.enabled).toBeUndefined();
  });
  it("rejects an empty name", () => {
    expect(() => CreateAutomationBody.parse({ name: "", definition: validDef })).toThrow();
  });
  it("rejects an invalid definition (no nodes)", () => {
    expect(() => CreateAutomationBody.parse({ name: "x", definition: { nodes: [], edges: [] } })).toThrow();
  });
});

describe("buildAutomationInsert", () => {
  it("builds org-scoped insert params with serialized definition", () => {
    const body = CreateAutomationBody.parse({ name: "A", triggerEvent: "evolution.updated", enabled: true, definition: validDef });
    const { params } = buildAutomationInsert(body, "org-1", "user-1");
    expect(params[0]).toBe("org-1");
    expect(params[1]).toBe("A");
    expect(params[3]).toBe("evolution.updated");
    expect(params[4]).toBe(true);
    expect(typeof params[5]).toBe("string"); // JSON.stringify(definition)
    expect(params[6]).toBe("user-1");
  });
});
