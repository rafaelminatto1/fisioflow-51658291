import { describe, expect, it } from "vitest";
import { normalizeAnalyticsRoute } from "../analytics";

describe("normalizeAnalyticsRoute", () => {
  it("normalizes UUID path segments", () => {
    expect(
      normalizeAnalyticsRoute("/api/patients/3fa85f64-5717-4562-b3fc-2c963f66afa6/evolution"),
    ).toBe("/api/patients/:id/evolution");
  });

  it("normalizes numeric path segments", () => {
    expect(normalizeAnalyticsRoute("/api/reports/2026/items/42")).toBe(
      "/api/reports/:n/items/:n",
    );
  });

  it("preserves stable route segments", () => {
    expect(normalizeAnalyticsRoute("/api/health/ready")).toBe("/api/health/ready");
  });
});

