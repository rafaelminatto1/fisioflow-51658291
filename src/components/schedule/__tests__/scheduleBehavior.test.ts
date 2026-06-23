import { describe, it, expect } from "vitest";
import { deriveCalendarBehavior } from "../scheduleBehavior";

const D = {
  showDuration: true,
  showType: true,
  showPhone: false,
  nowIndicator: true,
  businessHours: true,
  hideSunday: true,
};

describe("deriveCalendarBehavior", () => {
  it("hideSunday=true → hiddenDays inclui 0", () => {
    expect(deriveCalendarBehavior(D, []).hiddenDays).toEqual([0]);
  });
  it("hideSunday=false → hiddenDays vazio", () => {
    expect(deriveCalendarBehavior({ ...D, hideSunday: false }, []).hiddenDays).toEqual([]);
  });
  it("businessHours=false → retorna false", () => {
    expect(
      deriveCalendarBehavior({ ...D, businessHours: false }, [{ daysOfWeek: [1] }]).businessHours,
    ).toBe(false);
  });
  it("businessHours=true → repassa fcBusinessHours", () => {
    const bh = [{ daysOfWeek: [1], startTime: "07:00", endTime: "21:00" }];
    expect(deriveCalendarBehavior(D, bh).businessHours).toBe(bh);
  });
  it("repassa nowIndicator", () => {
    expect(deriveCalendarBehavior({ ...D, nowIndicator: false }, []).nowIndicator).toBe(false);
  });
});
