import * as fs from 'fs';

const filePath = 'apps/api/src/routes/ai-agents.ts';
let code = fs.readFileSync(filePath, 'utf8');

const importStatement = `import { ChartGenerationAgent } from "../services/ai/ChartGenerationAgent";\n`;

const newRoute = `
aiAgentsRoutes.post("/charts/generate", async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const clinicalDataSummary = typeof body.clinicalDataSummary === "string" ? body.clinicalDataSummary : "";
	const focusArea = typeof body.focusArea === "string" ? body.focusArea : "general";

	if (!clinicalDataSummary) {
		return c.json({ error: "clinicalDataSummary is required" }, 400);
	}

	if (!c.env.GOOGLE_AI_API_KEY) {
		return c.json({ error: "AI not configured" }, 503);
	}

	const agent = new ChartGenerationAgent(c.env);

	try {
		const result = await agent.generateChartConfig(
            clinicalDataSummary,
            focusArea as any
        );
        return c.json({ data: result });
	} catch (error: any) {
		return c.json({ error: error.message || "Failed to generate chart config" }, 500);
	}
});
`;

// Insert import if not exists
if (!code.includes('ChartGenerationAgent')) {
    code = code.replace('import { SoapReviewAgent', importStatement + 'import { SoapReviewAgent');
}

// Append new route
code += newRoute;

fs.writeFileSync(filePath, code);
console.log("Updated ai-agents.ts with charts");
