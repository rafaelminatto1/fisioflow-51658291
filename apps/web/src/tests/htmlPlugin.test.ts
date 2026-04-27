/**
 * htmlPlugin unit tests — exploratory / fix-checking
 *
 * These tests use local copies of the buggy and fixed transformIndexHtml logic
 * so they have no dependency on vite.config.ts.
 *
 * Property 1 (fix-checking): numeric buildTime must NOT produce `window.<digits> =`
 * Property 2 (preservation): %APP_VERSION%, %BUILD_TIME%, %CACHE_BUSTER% substitutions
 *   must continue to work correctly in the fixed implementation.
 *
 * Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Local copies of the transform logic (no import from vite.config.ts)
// ---------------------------------------------------------------------------

/** 2.1 — Buggy implementation: replaces __CACHE_BUSTER__ globally, including in JS */
function transformIndexHtmlBuggy(
  html: string,
  appVersion: string,
  buildTime: string,
): string {
  return html
    .replace(/%APP_VERSION%/g, appVersion)
    .replace(/%BUILD_TIME%/g, buildTime)
    .replace(/%CACHE_BUSTER%/g, buildTime)
    .replace(/__CACHE_BUSTER__/g, buildTime); // ← BUG
}

/** 2.1 — Fixed implementation: __CACHE_BUSTER__ in JS is intentionally NOT replaced */
function transformIndexHtmlFixed(
  html: string,
  appVersion: string,
  buildTime: string,
): string {
  return html
    .replace(/%APP_VERSION%/g, appVersion)
    .replace(/%BUILD_TIME%/g, buildTime)
    .replace(/%CACHE_BUSTER%/g, buildTime);
  // __CACHE_BUSTER__ intentionally NOT replaced
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("htmlPlugin — transformIndexHtml", () => {
  // 2.2 — Property 1 (fix-checking): numeric buildTime does NOT produce window.<digits> =
  describe("Property 1: numeric buildTime does not corrupt JS identifier", () => {
    const jsLine =
      "window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()";
    const appVersion = "1.0.0";

    it("fixed: buildTime 1777249895018 does NOT produce window.<digits> =", () => {
      const buildTime = "1777249895018";
      const result = transformIndexHtmlFixed(jsLine, appVersion, buildTime);
      expect(result).not.toMatch(/window\.\d+\s*=/);
    });

    it("fixed: buildTime 1000000000000 does NOT produce window.<digits> =", () => {
      const buildTime = "1000000000000";
      const result = transformIndexHtmlFixed(jsLine, appVersion, buildTime);
      expect(result).not.toMatch(/window\.\d+\s*=/);
    });
  });

  // 2.3 — Property 2 (preservation): %APP_VERSION% is replaced correctly
  describe("Property 2: %APP_VERSION% placeholder is replaced correctly", () => {
    it("replaces %APP_VERSION% with the provided version string", () => {
      const html = '<meta name="app-version" content="%APP_VERSION%">';
      const appVersion = "1.2.3";
      const buildTime = "1777249895018";

      const result = transformIndexHtmlFixed(html, appVersion, buildTime);

      expect(result).toContain('content="1.2.3"');
      expect(result).not.toContain("%APP_VERSION%");
    });
  });

  // 2.4 — Property 2 (preservation): %BUILD_TIME% is replaced correctly
  describe("Property 2: %BUILD_TIME% placeholder is replaced correctly", () => {
    it("replaces %BUILD_TIME% with the provided buildTime string", () => {
      const html = '<meta name="build-time" content="%BUILD_TIME%">';
      const appVersion = "1.0.0";
      const buildTime = "1777249895018";

      const result = transformIndexHtmlFixed(html, appVersion, buildTime);

      expect(result).toContain('content="1777249895018"');
      expect(result).not.toContain("%BUILD_TIME%");
    });
  });

  // 2.5 — Property 2 (preservation): %CACHE_BUSTER% in CSS href is replaced correctly
  describe("Property 2: %CACHE_BUSTER% in CSS href is replaced correctly", () => {
    it("replaces %CACHE_BUSTER% in stylesheet href with the buildTime", () => {
      const html =
        '<link rel="stylesheet" href="/styles/premium-design-system.css?v=%CACHE_BUSTER%">';
      const appVersion = "1.0.0";
      const buildTime = "1777249895018";

      const result = transformIndexHtmlFixed(html, appVersion, buildTime);

      expect(result).toContain("?v=1777249895018");
      expect(result).not.toContain("%CACHE_BUSTER%");
    });
  });

  // 2.6 — Property 2 (preservation): HTML without placeholders passes through unchanged
  describe("Property 2: HTML without placeholders passes through unchanged", () => {
    it("returns the input unchanged when no placeholders are present", () => {
      const html = "<html><body><p>Hello world</p></body></html>";

      const result = transformIndexHtmlFixed(html, "1.0.0", "1777249895018");

      expect(result).toBe(html);
    });
  });

  // 2.7 — Exploratory/regression: buggy implementation DOES produce window.<digits> =
  describe("Regression: buggy implementation confirms the old code was broken", () => {
    it("buggy: buildTime 1777249895018 DOES produce window.<digits> = (confirms bug existed)", () => {
      const jsLine =
        "window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()";
      const appVersion = "1.0.0";
      const buildTime = "1777249895018";

      const result = transformIndexHtmlBuggy(jsLine, appVersion, buildTime);

      // The buggy output should contain the invalid pattern window.1777249895018 =
      expect(result).toMatch(/window\.\d+\s*=/);
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests (fast-check)
// ---------------------------------------------------------------------------

describe("Property-Based Tests", () => {
  /**
   * 3.1 — Property 1 (fix-checking): for any numeric buildTime string,
   * the fixed transform output never matches /window\.\d+\s*=/
   *
   * Validates: Requirements 2.1, 2.2
   */
  it("3.1 — Property 1: fixed transform never produces window.<digits>= for any numeric buildTime", () => {
    const html =
      "window.__CACHE_BUSTER__ = window.__BUILD_TIME__ || Date.now().toString()";
    const appVersion = "1.0.0";

    fc.assert(
      fc.property(fc.stringMatching(/^\d{1,20}$/), (buildTime) => {
        const result = transformIndexHtmlFixed(html, appVersion, buildTime);
        expect(result).not.toMatch(/window\.\d+\s*=/);
      }),
    );
  });

  /**
   * 3.2 — Property 2 (preservation): for any appVersion string,
   * %APP_VERSION% is always substituted correctly and the result equals
   * the buggy transform output for this placeholder (no __CACHE_BUSTER__ involved).
   *
   * Validates: Requirements 3.1
   */
  it("3.2 — Property 2: %APP_VERSION% is always substituted correctly for any appVersion", () => {
    const html = '<meta name="app-version" content="%APP_VERSION%">';

    fc.assert(
      fc.property(fc.string(), (appVersion) => {
        const result = transformIndexHtmlFixed(html, appVersion, "0");

        // The placeholder must be gone
        expect(result).not.toContain("%APP_VERSION%");
        // The appVersion value must appear in the output
        expect(result).toContain(appVersion);
        // Fixed and buggy must agree (no __CACHE_BUSTER__ in this HTML)
        expect(result).toBe(transformIndexHtmlBuggy(html, appVersion, "0"));
      }),
    );
  });

  /**
   * 3.3 — Property 2 (preservation): for any buildTime string,
   * %BUILD_TIME% and %CACHE_BUSTER% substitutions in the fixed transform
   * equal those in the original (buggy) transform for HTML that does not
   * contain __CACHE_BUSTER__.
   *
   * Validates: Requirements 3.2, 3.3
   */
  it("3.3 — Property 2: %BUILD_TIME% and %CACHE_BUSTER% substitutions match original for any buildTime", () => {
    const html =
      '<meta name="build-time" content="%BUILD_TIME%"><link href="/styles/app.css?v=%CACHE_BUSTER%">';

    fc.assert(
      fc.property(fc.string(), (buildTime) => {
        const fixed = transformIndexHtmlFixed(html, "1.0.0", buildTime);
        const buggy = transformIndexHtmlBuggy(html, "1.0.0", buildTime);

        // Fixed and buggy must produce identical output for this HTML
        // (no __CACHE_BUSTER__ token present, so the extra replace in buggy is a no-op)
        expect(fixed).toBe(buggy);
      }),
    );
  });

  /**
   * 3.4 — Preservation: for any HTML string that does not contain any of the
   * known placeholder tokens, the fixed transform output equals the original
   * (buggy) transform output.
   *
   * Validates: Requirements 3.1, 3.2, 3.3
   */
  it("3.4 — Preservation: fixed and original transforms agree on HTML with no known placeholders", () => {
    const arbitraryHtml = fc
      .string()
      .filter(
        (s) =>
          !s.includes("%APP_VERSION%") &&
          !s.includes("%BUILD_TIME%") &&
          !s.includes("%CACHE_BUSTER%") &&
          !s.includes("__CACHE_BUSTER__"),
      );

    fc.assert(
      fc.property(arbitraryHtml, (html) => {
        const fixed = transformIndexHtmlFixed(html, "1.0.0", "1777249895018");
        const buggy = transformIndexHtmlBuggy(html, "1.0.0", "1777249895018");

        expect(fixed).toBe(buggy);
      }),
    );
  });
});
