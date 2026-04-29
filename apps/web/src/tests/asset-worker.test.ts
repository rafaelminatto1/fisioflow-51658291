import { describe, expect, it } from "vitest";
import { getFileExtension, isAssetRequest, isSpaNavigation } from "../asset-worker";

describe("asset worker routing helpers", () => {
  it("detects asset requests by assets prefix or extension", () => {
    expect(isAssetRequest(new URL("https://app.example.com/assets/app.js"))).toBe(true);
    expect(isAssetRequest(new URL("https://app.example.com/missing.png"))).toBe(true);
    expect(isAssetRequest(new URL("https://app.example.com/patients/123"))).toBe(false);
  });

  it("treats extensionless HTML GETs as SPA navigations", () => {
    const request = new Request("https://app.example.com/patients/123", {
      headers: { Accept: "text/html" },
    });

    expect(isSpaNavigation(request, new URL(request.url))).toBe(true);
  });

  it("does not treat missing asset files as SPA navigations", () => {
    const request = new Request("https://app.example.com/missing.js", {
      headers: { Accept: "text/html" },
    });

    expect(getFileExtension("/missing.js")).toBe("js");
    expect(isSpaNavigation(request, new URL(request.url))).toBe(false);
  });
});

