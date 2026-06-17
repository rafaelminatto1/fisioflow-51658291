import { describe, it, expect } from "vitest";
import { coerceCondition } from "../nlCondition";

describe("coerceCondition", () => {
  it("accepts a valid condition", () => {
    expect(coerceCondition({ field: "evolution.painScale", op: "gt", value: 7 })).toEqual({
      field: "evolution.painScale",
      op: "gt",
      value: 7,
    });
  });
  it("keeps exists without value", () => {
    expect(coerceCondition({ field: "appointment.status", op: "exists" })).toEqual({
      field: "appointment.status",
      op: "exists",
    });
  });
  it("rejects invalid op or missing field", () => {
    expect(coerceCondition({ field: "x", op: "bogus" })).toBeNull();
    expect(coerceCondition({ op: "eq", value: 1 })).toBeNull();
    expect(coerceCondition("nope")).toBeNull();
  });
});
