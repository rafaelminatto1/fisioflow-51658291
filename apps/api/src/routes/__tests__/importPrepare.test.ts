import { describe, it, expect } from "vitest";
import { computeEndTime } from "../import";

describe("computeEndTime", () => {
  it("soma duração ao horário inicial", () => {
    expect(computeEndTime("15:00", 60)).toBe("16:00");
    expect(computeEndTime("23:30", 60)).toBe("00:30");
    expect(computeEndTime("14:15", 45)).toBe("15:00");
  });
});
