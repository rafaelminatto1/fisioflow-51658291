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

Evaluate the text and provide a JSON response STRICTLY matching this schema, no markdown or markdown block wrappers:
{
  "hasChanges": boolean,
  "score": number (0-100 indicating quality),
  "suggestions": string[] (list of actionable improvements),
  "improvedText": string | null (the rewritten note, or null if it's perfect)
}

SOAP NOTE DRAFT:
"""
${text}
"""`;

		try {
			const resultText = await callGemini(
				this.env.GOOGLE_AI_API_KEY,
				prompt,
				"gemini-1.5-flash",
				this.env.FISIOFLOW_AI_GATEWAY_URL,
				this.env.FISIOFLOW_AI_GATEWAY_TOKEN,
				"clinical"
			);

            // Strip potential markdown fences
		    const jsonStr = resultText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
            const result = JSON.parse(jsonStr) as SoapReviewResult;
            return result;
		} catch (error) {
			console.error("[SoapReviewAgent] Error reviewing SOAP note:", error);
			throw new Error("Failed to review SOAP note");
		}
	}
}
