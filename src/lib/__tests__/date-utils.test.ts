import { describe, expect, it } from "vitest";
import { parseAnyDate, formatAnyDate, toLocalYMD } from "@/lib/date-utils";

describe("parseAnyDate", () => {
  it("treats a bare YYYY-MM-DD as a local calendar date (no UTC off-by-one)", () => {
    const d = parseAnyDate("2026-05-10");
    // Built at local noon so it never crosses a day boundary in BRT (UTC-3).
    expect(d.getHours()).toBe(12);
    expect(toLocalYMD(d)).toBe("2026-05-10");
  });

  it("treats an exact-UTC-midnight serialization (Postgres DATE) as a calendar date", () => {
    // How a DATE column serializes from a UTC Worker.
    const d = parseAnyDate("2026-05-10T00:00:00.000Z");
    expect(d.getHours()).toBe(12);
    expect(toLocalYMD(d)).toBe("2026-05-10");
  });

  it("preserves the time of a real timestamp instead of coercing to a calendar date", () => {
    const d = parseAnyDate("2026-05-10T14:30:00.000Z");
    expect(d.getTime()).toBe(new Date("2026-05-10T14:30:00.000Z").getTime());
  });

  it("parses BR display format dd/MM/yyyy", () => {
    const d = parseAnyDate("10/05/2026");
    expect(toLocalYMD(d)).toBe("2026-05-10");
  });

  it("returns an invalid date for empty/garbage input", () => {
    expect(Number.isNaN(parseAnyDate(null).getTime())).toBe(true);
    expect(Number.isNaN(parseAnyDate("").getTime())).toBe(true);
    expect(Number.isNaN(parseAnyDate("não é data").getTime())).toBe(true);
  });
});

describe("formatAnyDate", () => {
  it("formats a calendar date without shifting the day", () => {
    expect(formatAnyDate("2026-05-10", "dd/MM/yyyy")).toBe("10/05/2026");
  });

  it("returns the fallback for invalid input", () => {
    expect(formatAnyDate(null, "dd/MM/yyyy", "Data inválida")).toBe("Data inválida");
  });
});
