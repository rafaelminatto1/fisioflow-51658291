import { Hono } from "hono";
import { Env } from "../types/env";
import { SoapReviewAgent } from "../services/ai/SoapReviewAgent";

export const aiAgentsRoutes = new Hono<{ Bindings: Env }>();

aiAgentsRoutes.post("/soap-review", async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const text = typeof body.text === "string" ? body.text.trim() : "";

	if (!text) {
		return c.json({ error: "SOAP text is required" }, 400);
	}

	if (!c.env.GOOGLE_AI_API_KEY) {
		return c.json({ error: "AI not configured" }, 503);
	}

	const agent = new SoapReviewAgent(c.env);

	try {
		const review = await agent.reviewSoapNote(text);
		return c.json({ data: review });
	} catch (error: any) {
		return c.json({ error: error.message || "Failed to process SOAP note" }, 500);
	}
});
