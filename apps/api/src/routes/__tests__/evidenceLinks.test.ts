import { describe, it, expect } from "vitest";
import { isEvidenceTargetType, EVIDENCE_TARGET_TYPES } from "../evidence";

describe("isEvidenceTargetType", () => {
  it("accepts the canonical target types", () => {
    for (const t of EVIDENCE_TARGET_TYPES) expect(isEvidenceTargetType(t)).toBe(true);
  });
  it("rejects unknown / non-string values", () => {
    expect(isEvidenceTargetType("session")).toBe(false);
    expect(isEvidenceTargetType("")).toBe(false);
    expect(isEvidenceTargetType(undefined)).toBe(false);
    expect(isEvidenceTargetType(42)).toBe(false);
  });
});
