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
4. Generate 1-3 brief text insights explaining what the chart shows.`;

        const responseSchema = {
            type: "object",
            properties: {
                type: { type: "string", enum: ["line", "bar", "radar", "scatter"] },
                title: { type: "string" },
                xAxisLabel: { type: "string" },
                yAxisLabel: { type: "string" },
                dataPoints: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            x: { type: "string" },
                            y: { type: "number" },
                            series: { type: "string", nullable: true }
                        },
                        required: ["x", "y"]
                    }
                },
                insights: { type: "array", items: { type: "string" } }
            },
            required: ["type", "title", "xAxisLabel", "yAxisLabel", "dataPoints", "insights"]
        };

		try {
			const resultText = await callGemini(
				this.env.GOOGLE_AI_API_KEY,
				prompt,
				"gemini-1.5-flash",
				this.env.FISIOFLOW_AI_GATEWAY_URL,
				this.env.FISIOFLOW_AI_GATEWAY_TOKEN,
				"clinical",
                responseSchema
			);

            return JSON.parse(resultText) as ChartConfig;
		} catch (error) {
			console.error("[ChartGenerationAgent] Error generating chart config:", error);
			throw new Error("Failed to generate chart configuration");
		}
	}
}
