import * as fs from 'fs';

const filePath = 'apps/api/src/routes/ai-agents.ts';
let code = fs.readFileSync(filePath, 'utf8');

const importStatement = `import { AITutorAgent, ChatMessage } from "../services/ai/AITutorAgent";\n`;

const newRoute = `
aiAgentsRoutes.post("/tutor/chat", async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const patientProfile = typeof body.patientProfile === "string" ? body.patientProfile : "Standard Patient";
	const exerciseContext = typeof body.exerciseContext === "string" ? body.exerciseContext : "General Physiotherapy";
	const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];
	const newMessage = typeof body.newMessage === "string" ? body.newMessage : "";

	if (!newMessage) {
		return c.json({ error: "newMessage is required" }, 400);
	}

	if (!c.env.GOOGLE_AI_API_KEY) {
		return c.json({ error: "AI not configured" }, 503);
	}

	const agent = new AITutorAgent(c.env);

	try {
		const stream = await agent.generateTutorResponseStream(
            patientProfile,
            exerciseContext,
            chatHistory as ChatMessage[],
            newMessage
        );

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
	} catch (error: any) {
		return c.json({ error: error.message || "Failed to generate tutor response" }, 500);
	}
});
`;

// Insert import if not exists
if (!code.includes('AITutorAgent')) {
    code = code.replace('import { SoapReviewAgent', importStatement + 'import { SoapReviewAgent');
}

// Append new route
code += newRoute;

fs.writeFileSync(filePath, code);
console.log("Updated ai-agents.ts");
