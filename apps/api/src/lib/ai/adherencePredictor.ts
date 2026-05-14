import { sessions, patientAdherencePredictions } from "@fisioflow/db";
import { eq, desc, and } from "drizzle-orm";
import type { FisioDb } from "../db";

type SessionRow = typeof sessions.$inferSelect;

export class AdherencePredictor {
  static async predictForPatient(db: FisioDb, organizationId: string, patientId: string) {
    const recentSessions = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.organizationId, organizationId), eq(sessions.patientId, patientId)))
      .orderBy(desc(sessions.date))
      .limit(10);

    if (recentSessions.length < 2) {
      return null;
    }

    const mockPrediction = AdherencePredictor.calculateHeuristicScore(recentSessions);

    const [prediction] = await db
      .insert(patientAdherencePredictions)
      .values({
        organizationId,
        patientId,
        adherenceScore: mockPrediction.score,
        dropoutRisk: mockPrediction.dropoutRisk,
        riskFactors: mockPrediction.riskFactors,
        suggestedAction: mockPrediction.suggestedAction,
      })
      .returning();

    return prediction;
  }

  private static calculateHeuristicScore(recentSessions: SessionRow[]) {
    let score = 70;
    const factors: string[] = [];

    const painLevels = recentSessions
      .map((s) => (s as any).painScale)
      .filter((p): p is number => p != null);

    if (painLevels.length >= 2) {
      if (Number(painLevels[0]) >= Number(painLevels[painLevels.length - 1])) {
        score -= 10;
        factors.push("Dor estagnada ou aumentando nas últimas sessões");
      } else {
        score += 10;
        factors.push("Melhora progressiva nos níveis de dor");
      }
    }

    const completedSessions = recentSessions.filter((s) => s.status === "finalized").length;
    if (completedSessions < recentSessions.length * 0.7) {
      score -= 20;
      factors.push("Baixa taxa de finalização de sessões");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      dropoutRisk: 100 - score,
      riskFactors: factors,
      suggestedAction:
        score < 50
          ? "Agendar conversa de acolhimento para entender as barreiras."
          : "Manter protocolo atual e reforçar progressos.",
    };
  }
}
