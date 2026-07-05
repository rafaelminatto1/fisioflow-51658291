import { AIRouterError } from "./aiErrors";
import { getGatewayUrl } from "./aiGateway";

// Note: In Cloudflare Workers, env.AI is provided by the binding.
// For type-safety we use any here, assuming it's passed from the Hono context.

export interface AIProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function runWorkersAI(env: any, model: string, prompt: string): Promise<AIProviderResponse> {
  if (!env.AI) {
    throw new AIRouterError("Workers AI binding not found", "MISSING_BINDING");
  }
  
  // Workaround since we don't have @cloudflare/ai types installed in this prompt context
  // but it's typically: const ai = new Ai(env.AI); await ai.run(...)
  const response = await env.AI.run(model, {
    messages: [{ role: "user", content: prompt }]
  });
  
  const text = response.response || "";
  return {
    text,
    inputTokens: Math.ceil(prompt.length / 4), // Rough estimate
    outputTokens: Math.ceil(text.length / 4), // Rough estimate
  };
}

export async function runGemini(env: any, model: string, prompt: string): Promise<AIProviderResponse> {
  const gatewayUrl = getGatewayUrl(env, "google-ai-studio");
  
  // Here we would use fetch to the gateway or Google SDK
  // const res = await fetch(`${gatewayUrl}/v1/models/${model}:generateContent`, {...});
  
  // TODO(PRODUCTION-STUB): This is a stub for Gemini. Replace with actual fetch implementation for production.
  return {
    text: "Resposta gerada pelo Gemini (Stub)",
    inputTokens: Math.ceil(prompt.length / 4),
    outputTokens: 50,
  };
}
