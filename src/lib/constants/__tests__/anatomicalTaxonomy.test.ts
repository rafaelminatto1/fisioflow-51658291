import { describe, it, expect } from "vitest";
import {
  classifyRawBodyPart,
  getAvailableMainRegions,
  getAvailableSubBranches,
  matchesAnatomicalFilter,
  matchesMultiAnatomicalFilter,
  normalizeString,
} from "../anatomicalTaxonomy";

describe("Anatomical Taxonomy Utility", () => {
  it("normalizes strings properly removing accents and case", () => {
    expect(normalizeString("Ombros (Articulação Glenoumeral)")).toBe("ombros (articulacao glenoumeral)");
    expect(normalizeString("Ombro (articulação glenoumeral)")).toBe("ombro (articulacao glenoumeral)");
  });

  it("classifies case-inconsistent and pluralized raw strings to canonical main & sub-branches", () => {
    const raw1 = classifyRawBodyPart("Ombros (Articulação Glenoumeral)");
    const raw2 = classifyRawBodyPart("Ombro (articulação glenoumeral)");
    const raw3 = classifyRawBodyPart("ombro (articulacao glenoumeral)");

    expect(raw1.mainRegionKey).toBe("ombro");
    expect(raw1.subBranchKey).toBe("glenoumeral");

    expect(raw2.mainRegionKey).toBe("ombro");
    expect(raw2.subBranchKey).toBe("glenoumeral");

    expect(raw3.mainRegionKey).toBe("ombro");
    expect(raw3.subBranchKey).toBe("glenoumeral");
  });

  it("deduplicates main regions and sub-branches correctly for exercises", () => {
    const mockExercises = [
      { body_parts: ["Ombros (Articulação Glenoumeral)"] },
      { body_parts: ["Ombro (articulação glenoumeral)"] },
      { body_parts: ["Ombro (acromioclavicular)"] },
    ];

    const mainRegions = getAvailableMainRegions(mockExercises);
    expect(mainRegions).toEqual([{ key: "ombro", label: "Ombro" }]);

    const subBranches = getAvailableSubBranches("ombro", mockExercises);
    expect(subBranches.map((s) => s.key)).toEqual(["glenoumeral", "acromioclavicular"]);
  });

  it("filters exercises by main region and sub-branch correctly", () => {
    const exGlenoumeralUpper = { body_parts: ["Ombros (Articulação Glenoumeral)"] };
    const exGlenoumeralLower = { body_parts: ["Ombro (articulação glenoumeral)"] };
    const exAcromio = { body_parts: ["Ombro (Acromioclavicular)"] };
    const exJoelho = { body_parts: ["Joelho (Patelofemoral)"] };

    // Filter main region = "ombro", subBranch = "all"
    expect(matchesAnatomicalFilter(exGlenoumeralUpper, "ombro", "all")).toBe(true);
    expect(matchesAnatomicalFilter(exGlenoumeralLower, "ombro", "all")).toBe(true);
    expect(matchesAnatomicalFilter(exAcromio, "ombro", "all")).toBe(true);
    expect(matchesAnatomicalFilter(exJoelho, "ombro", "all")).toBe(false);

    // Filter main region = "ombro", subBranch = "glenoumeral"
    expect(matchesAnatomicalFilter(exGlenoumeralUpper, "ombro", "glenoumeral")).toBe(true);
    expect(matchesAnatomicalFilter(exGlenoumeralLower, "ombro", "glenoumeral")).toBe(true);
    expect(matchesAnatomicalFilter(exAcromio, "ombro", "glenoumeral")).toBe(false);
  });

  it("handles multi-selection filtering in OR and AND boolean modes", () => {
    const exOmbroCore = { body_parts: ["Ombro (articulação glenoumeral)", "Core / Abdômen"] };
    const exOmbroOnly = { body_parts: ["Ombro (articulação glenoumeral)"] };
    const exCoreOnly = { body_parts: ["Core"] };

    const filters = [
      { id: "ombro", mainRegionKey: "ombro", label: "Ombro" },
      { id: "core", mainRegionKey: "core_abdomen", label: "Core / Abdômen" },
    ];

    // OR Mode: Any match
    expect(matchesMultiAnatomicalFilter(exOmbroCore, filters, "OR")).toBe(true);
    expect(matchesMultiAnatomicalFilter(exOmbroOnly, filters, "OR")).toBe(true);
    expect(matchesMultiAnatomicalFilter(exCoreOnly, filters, "OR")).toBe(true);

    // AND Mode: All match
    expect(matchesMultiAnatomicalFilter(exOmbroCore, filters, "AND")).toBe(true);
    expect(matchesMultiAnatomicalFilter(exOmbroOnly, filters, "AND")).toBe(false);
    expect(matchesMultiAnatomicalFilter(exCoreOnly, filters, "AND")).toBe(false);
  });
});

