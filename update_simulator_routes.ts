import * as fs from 'fs';

const filePath = 'apps/api/src/routes/ai-agents.ts';
let code = fs.readFileSync(filePath, 'utf8');

const importStatement = `import { PatientSimulatorAgent, SimulatorProfile } from "../services/ai/PatientSimulatorAgent";\n`;

const newRoute = `
aiAgentsRoutes.post("/simulator/chat", async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const profile = body.profile as SimulatorProfile | undefined;
	const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];
	const agentLastMessage = typeof body.agentLastMessage === "string" ? body.agentLastMessage : "";

	if (!profile || !agentLastMessage) {
		return c.json({ error: "profile and agentLastMessage are required" }, 400);
	}

	if (!c.env.GOOGLE_AI_API_KEY) {
		return c.json({ error: "AI not configured" }, 503);
	}

	const simulator = new PatientSimulatorAgent(c.env);

	try {
		const result = await simulator.generateSimulatedResponse(
            profile,
            chatHistory,
            agentLastMessage
        );
        return c.json({ data: result });
	} catch (error: any) {
		return c.json({ error: error.message || "Failed to generate simulation" }, 500);
	}
});
`;

// Insert import if not exists
if (!code.includes('PatientSimulatorAgent')) {
    code = code.replace('import { SoapReviewAgent', importStatement + 'import { SoapReviewAgent');
}

// Append new route
code += newRoute;

fs.writeFileSync(filePath, code);
console.log("Updated ai-agents.ts with simulator");
