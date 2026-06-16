import { describe, it, expect } from "vitest";
import { evaluateCondition, getPath } from "../conditions";

describe("getPath", () => {
  it("reads nested dot paths", () => {
    expect(getPath({ patient: { vas: 3 } }, "patient.vas")).toBe(3);
    expect(getPath({ a: 1 }, "b.c")).toBeUndefined();
  });
});

describe("evaluateCondition", () => {
  const ctx = { vas: 3, name: "dor lombar", nested: { ok: true } };
  it("eq / neq", () => {
    expect(evaluateCondition({ field: "vas", op: "eq", value: 3 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: "vas", op: "neq", value: 5 }, ctx)).toBe(true);
  });
  it("gt / lt / gte / lte", () => {
    expect(evaluateCondition({ field: "vas", op: "gt", value: 2 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: "vas", op: "lt", value: 2 }, ctx)).toBe(false);
    expect(evaluateCondition({ field: "vas", op: "gte", value: 3 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: "vas", op: "lte", value: 3 }, ctx)).toBe(true);
  });
  it("contains / exists / dot-path", () => {
    expect(evaluateCondition({ field: "name", op: "contains", value: "lombar" }, ctx)).toBe(true);
    expect(evaluateCondition({ field: "nested.ok", op: "exists" }, ctx)).toBe(true);
    expect(evaluateCondition({ field: "missing", op: "exists" }, ctx)).toBe(false);
  });
});
