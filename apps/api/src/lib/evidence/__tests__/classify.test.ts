import { describe, it, expect } from "vitest";
import { classifyEvidenceLevel } from "../classify";

describe("classifyEvidenceLevel", () => {
  it("returns 1a for meta-analysis", () => {
    expect(classifyEvidenceLevel(["Meta-Analysis"], "unknown")).toBe("1a");
  });

  it("returns 1a for systematic review", () => {
    expect(
      classifyEvidenceLevel(["Systematic Review"], "unknown"),
    ).toBe("1a");
  });

  it("returns 1b for randomized controlled trial", () => {
    expect(
      classifyEvidenceLevel(["Randomized Controlled Trial"], "unknown"),
    ).toBe("1b");
  });

  it("returns 2b for cohort study", () => {
    expect(
      classifyEvidenceLevel(["Cohort Studies"], "cohort study"),
    ).toBe("2b");
  });

  it("returns 3b for case-control", () => {
    expect(
      classifyEvidenceLevel(["Case-Control Studies"], "case-control"),
    ).toBe("3b");
  });

  it("returns 4 for case series", () => {
    expect(classifyEvidenceLevel(["Case Series"], "unknown")).toBe("4");
  });

  it("returns 5 for expert opinion / guideline without grading", () => {
    expect(classifyEvidenceLevel(["Guideline"], "expert opinion")).toBe("5");
  });

  it("returns 5 for empty input", () => {
    expect(classifyEvidenceLevel([], "")).toBe("5");
  });
});
