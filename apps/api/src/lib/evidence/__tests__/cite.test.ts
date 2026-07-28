import { describe, it, expect } from "vitest";
import { toVancouver } from "../cite";

describe("toVancouver", () => {
  it("formats a complete citation with DOI", () => {
    const result = toVancouver(
      "EULAR Recommendations for the Non-Pharmacological Core Management of Hip and Knee Osteoarthritis: 2023 Update",
      "Smolen JS, Landewé RBM, Bergstra SA, et al.",
      "Annals of the Rheumatic Diseases",
      2024,
      "83",
      "1368-1378",
      "10.1136/ard-2023-225041",
    );
    expect(result).toContain("Smolen JS");
    expect(result).toContain("EULAR Recommendations");
    expect(result).toContain("Annals of the Rheumatic Diseases");
    expect(result).toContain("2024");
    expect(result).toContain("83");
    expect(result).toContain("(1368-1378)");
    expect(result).toContain("doi:10.1136/ard-2023-225041");
  });

  it("handles missing optional fields gracefully", () => {
    const result = toVancouver(
      "A Short Title",
      "Author A.",
      "J Med",
      2020,
      null,
      null,
      null,
    );
    expect(result).toBe("Author A. A Short Title. J Med. 2020");
  });

  it("handles authors as array", () => {
    const result = toVancouver(
      "Title",
      ["Author A.", "Author B."],
      "J Med",
      2020,
      "10",
      "1-5",
      "10.1234/abc",
    );
    expect(result).toContain("Author A., Author B.");
    expect(result).toContain("10");
    expect(result).toContain("(1-5)");
  });
});
