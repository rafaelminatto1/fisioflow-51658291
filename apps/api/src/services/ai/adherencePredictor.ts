import { db } from "../../db";
import { patientAdherencePredictions } from "../../db/schema/analytics";
import { sessions } from "../../db/schema/sessions";
import { patients } from "../../db/schema/patients";
import { eq, desc, sql, and } from "drizzle-orm";
import { generateText } from "ai"; // Assuming AI SDK is available
import { openai } from "@ai-sdk/openai";

export class AdherencePredictor {
  /**
   * Generates adherence predictions for a specific patient.
   */
  static async predictForPatient(organizationId: string, patientId: string) {
    // 1. Fetch recent clinical data
    const recentSessions = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.organizationId, organizationId), eq(sessions.patientId, patientId)))
      .orderBy(desc(sessions.sessionDate))
      .limit(10);

    if (recentSessions.length < 2) {
      return null; // Not enough data for prediction
    }

    // 2. Prepare context for AI
    const sessionSummary = recentSessions.map(s => ({
      date: s.sessionDate,
      painLevel: s.painLevel,
      status: s.status,
      isEdited: s.isEdited,
    }));

    // 3. AI Analysis (Simplified prompt)
    // In a real scenario, use Genkit with specific schemas
    const prompt = `
      Analise o histórico de sessões de fisioterapia abaixo e preveja o risco de abandono (churn) do paciente.
      Considere: frequência, evolução da dor e consistência.
      
      Dados: ${JSON.stringify(sessionSummary)}
      
      Responda em JSON:
      {
        "score": number (0-100, 100 = aderência total),
        "dropoutRisk": number (0-100),
        "riskFactors": string[],
        "suggestedAction": string
      }
    `;

    // Note: This is a placeholder for the actual AI call
    // For now, we simulate a logic-based prediction if AI is not configured
    const mockPrediction = this.calculateHeuristicScore(recentSessions);

    // 4. Save to DB
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

  private static calculateHeuristicScore(recentSessions: any[]) {
    let score = 70;
    const factors: string[] = [];
    
    const painLevels = recentSessions.map(s => s.painLevel).filter(p => p !== null);
    if (painLevels.length >= 2) {
      if (painLevels[0] >= painLevels[painLevels.length - 1]) {
        score -= 10;
        factors.push("Dor estagnada ou aumentando nas últimas sessões");
      } else {
        score += 10;
        factors.push("Melhora progressiva nos níveis de dor");
      }
    }

    const completedSessions = recentSessions.filter(s => s.status === "finalized").length;
    if (completedSessions < recentSessions.length * 0.7) {
      score -= 20;
      factors.push("Baixa taxa de finalização de sessões");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      dropoutRisk: 100 - score,
      riskFactors: factors,
      suggestedAction: score < 50 
        ? "Agendar conversa de acolhimento para entender as barreiras." 
        : "Manter protocolo atual e reforçar progressos."
    };
  }
}
