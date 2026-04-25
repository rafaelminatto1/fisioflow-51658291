import { callGemini } from "../../lib/ai-gemini";
import { Env } from "../../types/env";

export interface SoapReviewResult {
  hasChanges: boolean;
  score: number; // 0 to 100
  suggestions: string[];
  improvedText: string | null;
}

export class SoapReviewAgent {
  constructor(private env: Env) {}

  public async reviewSoapNote(text: string): Promise<SoapReviewResult> {
    const prompt = `You are an expert Clinical Review Agent for physiotherapy SOAP notes.
Analyze the following SOAP note draft provided by a physiotherapist.

Your goal is to:
1. Ensure the Subjective, Objective, Assessment, and Plan components are clear.
2. Identify missing crucial objective data (e.g., pain scale, specific range of motion).
3. Suggest standardization of clinical terminology.
4. Provide a rewritten, improved version of the note if necessary.

SOAP NOTE DRAFT:
"""
${text}
"""`;

    const responseSchema = {
      type: "object",
      properties: {
        hasChanges: { type: "boolean" },
        score: { type: "number", description: "0-100 indicating quality" },
        suggestions: { type: "array", items: { type: "string" } },
        improvedText: { type: "string", nullable: true },
      },
      required: ["hasChanges", "score", "suggestions", "improvedText"],
    };

    try {
      const resultText = await callGemini(
        this.env.GOOGLE_AI_API_KEY,
        prompt,
        "gemini-1.5-flash",
        this.env.FISIOFLOW_AI_GATEWAY_URL,
        this.env.FISIOFLOW_AI_GATEWAY_TOKEN,
        "clinical",
        responseSchema,
      );

      return JSON.parse(resultText) as SoapReviewResult;
    } catch (error) {
      console.error("[SoapReviewAgent] Error reviewing SOAP note:", error);
      throw new Error("Failed to review SOAP note");
    }
  }
}
