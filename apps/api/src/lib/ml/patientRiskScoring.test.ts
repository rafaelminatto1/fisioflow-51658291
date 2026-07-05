import { describe, it, expect } from "vitest";
import { calculatePatientRisks, PatientFeatures } from "./patientRiskScoring";

describe("Patient Risk Scoring (Heuristics)", () => {
  
  it("should calculate high no-show risk for repeated no-shows", () => {
    const features: PatientFeatures = {
      recentNoShows: 3,
      recentCancellations: 1,
      sessionsWithoutEvolution: 0,
      daysSinceLastSession: 5,
      hasFutureSession: true,
      painVariation: -1,
      totalSessions: 10
    };

    const scores = calculatePatientRisks(features);
    // 3 * 25 + 1 * 10 = 85
    expect(scores.noShowRisk).toBe(85);
    expect(scores.needsActiveContact).toBe(true);
  });

  it("should calculate high dropout risk for a patient who got better and didn't schedule", () => {
    const features: PatientFeatures = {
      recentNoShows: 0,
      recentCancellations: 0,
      sessionsWithoutEvolution: 0,
      daysSinceLastSession: 7,
      hasFutureSession: false,
      painVariation: -5, // melhorou muito
      totalSessions: 6 // fez varias sessoes
    };

    const scores = calculatePatientRisks(features);
    // Dropout: 50 (painVariation < -4 + > 5 sessions + !futureSession)
    expect(scores.dropoutRisk).toBe(50);
  });

  it("should reduce no-show risk if patient has future session", () => {
    const baseFeatures = {
      recentNoShows: 1,
      recentCancellations: 0,
      sessionsWithoutEvolution: 0,
      daysSinceLastSession: 2,
      painVariation: 0,
      totalSessions: 2
    };

    const withSession = calculatePatientRisks({ ...baseFeatures, hasFutureSession: true });
    const withoutSession = calculatePatientRisks({ ...baseFeatures, hasFutureSession: false });

    expect(withSession.noShowRisk).toBeLessThan(withoutSession.noShowRisk);
  });

  it("score never exceeds 100", () => {
    const features: PatientFeatures = {
      recentNoShows: 10,
      recentCancellations: 10,
      sessionsWithoutEvolution: 10,
      daysSinceLastSession: 50,
      hasFutureSession: false,
      painVariation: 0,
      totalSessions: 10
    };

    const scores = calculatePatientRisks(features);
    expect(scores.noShowRisk).toBe(100);
    expect(scores.dropoutRisk).toBe(100);
    expect(scores.nonAdherenceRisk).toBe(100);
  });
});
