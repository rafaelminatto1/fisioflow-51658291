import { describe, it, expect } from "vitest";
import {
  parsePainDetail,
  writePainDetail,
  type PainDetail,
} from "./painDetail";

describe("painDetail utility", () => {
  it("deve parsear e escrever detalhe de dor com múltiplos membros e EVA individual", () => {
    const detail: PainDetail = {
      arrival: 7,
      discharge: 3,
      quality: [{ type: "Pontada", intensity: "intensa" }],
      isIndividualPain: true,
      locationMembers: [
        { member: "Ombro D", arrival: 8, discharge: 4 },
        { member: "Lombar", arrival: 5, discharge: 1 },
      ],
    };

    const measurements = writePainDetail([], detail);
    const parsed = parsePainDetail(measurements);

    expect(parsed.arrival).toBe(7);
    expect(parsed.discharge).toBe(3);
    expect(parsed.isIndividualPain).toBe(true);
    expect(parsed.locationMembers).toHaveLength(2);
    expect(parsed.locationMembers?.[0]).toEqual({ member: "Ombro D", arrival: 8, discharge: 4 });
    expect(parsed.locationMembers?.[1]).toEqual({ member: "Lombar", arrival: 5, discharge: 1 });
    expect(parsed.location).toBe("Ombro D, Lombar");
  });

  it("deve manter compatibilidade retroativa com string de localização legada", () => {
    const legacyMeasurements = [
      {
        id: "paindetail_location",
        measurement_type: "__pain_detail__",
        measurement_name: "Localização da dor",
        value: "Joelho E, Cervical",
        unit: "/10",
        notes: "",
        custom_data: {},
        completed: false,
      },
    ];

    const parsed = parsePainDetail(legacyMeasurements as any);
    expect(parsed.location).toBe("Joelho E, Cervical");
    expect(parsed.locationMembers).toEqual([
      { member: "Joelho E" },
      { member: "Cervical" },
    ]);
  });
});
