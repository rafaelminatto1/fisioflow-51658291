import { callGemini } from "../../lib/ai-gemini";
import { Env } from "../../types/env";

export interface ChartConfig {
	type: "line" | "bar" | "radar" | "scatter";
	title: string;
	xAxisLabel: string;
	yAxisLabel: string;
	dataPoints: Array<{ x: string | number; y: number; series?: string }>;
	insights: string[];
}

export class ChartGenerationAgent {
	constructor(private env: Env) {}

	public async generateChartConfig(
		clinicalDataSummary: string,
		focusArea: "pain" | "adherence" | "rom" | "strength" | "general"
	): Promise<ChartConfig> {
		const prompt = `You are a Clinical Data Visualization Expert Agent.
Your task is to analyze raw clinical progress data and determine the best way to visualize it for a physiotherapist.

FOCUS AREA: ${focusArea}
RAW CLINICAL DATA SUMMARY:
"""
${clinicalDataSummary}
"""

INSTRUCTIONS:
1. Analyze the data to find trends relevant to the focus area.
2. Select the most appropriate chart type (line for trends over time, bar for comparisons, etc.).
3. Extract the data points into a clean, structured format.
4. Generate 1-3 brief text insights explaining what the chart shows.

Respond STRICTLY with a JSON object matching this schema, no markdown blocks:
{
  "type": "line" | "bar" | "radar" | "scatter",
  "title": "Clear chart title",
  "xAxisLabel": "X axis label",
  "yAxisLabel": "Y axis label",
  "dataPoints": [{"x": "label_or_date", "y": numeric_value, "series": "optional_category_name"}],
  "insights": ["insight 1", "insight 2"]
}`;

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
            const result = JSON.parse(jsonStr) as ChartConfig;
            return result;
		} catch (error) {
			console.error("[ChartGenerationAgent] Error generating chart config:", error);
			throw new Error("Failed to generate chart configuration");
		}
	}
}
