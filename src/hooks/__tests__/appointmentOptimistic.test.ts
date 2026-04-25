import { describe, expect, it } from "vitest";

import { parseUpdatesToAppointment } from "@/hooks/appointmentOptimistic";
import { formatDateToLocalISO } from "@/utils/dateUtils";

describe("parseUpdatesToAppointment", () => {
  it("preserves local calendar day for YYYY-MM-DD optimistic updates", () => {
    const parsed = parseUpdatesToAppointment({
      appointment_date: "2026-03-13",
      appointment_time: "16:00",
    });

    expect(parsed.date).toBeInstanceOf(Date);
    expect(formatDateToLocalISO(parsed.date as Date)).toBe("2026-03-13");
    expect((parsed.date as Date).getHours()).toBe(12);
    expect(parsed.time).toBe("16:00");
  });
});
