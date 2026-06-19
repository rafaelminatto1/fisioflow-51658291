import { describe, expect, it } from "vitest";
import { mapOverduePatientRow, mapOverdueSummaryRow } from "../clinicMetrics";

describe("mapOverduePatientRow", () => {
  it("normalizes aggregated overdue receivable rows", () => {
    expect(
      mapOverduePatientRow({
        patient_id: "patient-1",
        full_name: "Maria Silva",
        phone: "(11) 99999-0000",
        whatsapp: null,
        overdue_count: "3",
        overdue_total: "450.75",
        oldest_overdue_date: "2026-06-01",
      }),
    ).toEqual({
      patient_id: "patient-1",
      full_name: "Maria Silva",
      phone: "(11) 99999-0000",
      whatsapp: null,
      overdue_count: 3,
      overdue_total: 450.75,
      oldest_overdue_date: "2026-06-01",
    });
  });

  it("applies safe fallbacks for incomplete rows", () => {
    expect(
      mapOverduePatientRow({
        patient_id: null,
        full_name: null,
        phone: null,
        whatsapp: null,
        overdue_count: null,
        overdue_total: null,
        oldest_overdue_date: null,
      }),
    ).toEqual({
      patient_id: "",
      full_name: "Paciente sem nome",
      phone: null,
      whatsapp: null,
      overdue_count: 0,
      overdue_total: 0,
      oldest_overdue_date: "",
    });
  });
});

describe("mapOverdueSummaryRow", () => {
  it("maps monetary and patient totals", () => {
    expect(
      mapOverdueSummaryRow({
        total_patients: "2",
        total_overdue: "980.40",
      }),
    ).toEqual({
      total_patients: 2,
      total_overdue: 980.4,
    });
  });

  it("returns zeros for empty summaries", () => {
    expect(mapOverdueSummaryRow(undefined)).toEqual({
      total_patients: 0,
      total_overdue: 0,
    });
  });
});
