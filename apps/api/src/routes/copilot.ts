import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables, type AuthUser } from "../lib/auth";
import { rateLimit } from "../middleware/rateLimit";
import { buildRegistry } from "../agents/tools";
import { makeCallModel } from "../lib/copilot/workersAiAdapter";
import { runCopilot } from "../lib/copilot/runCopilot";
import type { CopilotMessage } from "../lib/copilot/types";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
        name: z.string().optional(),
      }),
    )
    .min(1),
  // A/B: modelo de tool-calling (allowlist de modelos ativos). Default = llama_3_1_8b.
  model: z.enum(["llama_3_1_8b", "llama_3_3_70b"]).optional(),
});

const COPILOT_MODELS: Record<string, string> = {
  llama_3_1_8b: "@cf/meta/llama-3.1-8b-instruct-fast",
  llama_3_3_70b: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};

const SYSTEM: CopilotMessage = {
  role: "system",
  content:
    "Você é o copiloto clínico do FisioFlow. Responda em português (PT-BR), com base em evidência. " +
    "Use as ferramentas quando precisar de dados (evidência científica, exercícios, histórico do paciente). " +
    "Ao chamar search_evidence, formule a query em INGLÊS com termos clínicos (o PubMed é indexado em inglês); " +
    "responda ao usuário em PT-BR. Ao apresentar evidência, LISTE cada artigo retornado em tópicos com título, PMID e ano, " +
    "e finalize com uma conclusão clínica curta. Não invente dados nem PMIDs; use apenas o que as ferramentas retornaram.",
};

export async function runCopilotChat(
  env: Env,
  user: AuthUser,
  token: string,
  baseUrl: string,
  messages: CopilotMessage[],
  modelKey?: string,
) {
  const tools = buildRegistry();
  const model = (modelKey && COPILOT_MODELS[modelKey]) || undefined;
  const callModel = makeCallModel(env, tools, model);
  return runCopilot({
    callModel,
    tools,
    ctx: { env, user, token, baseUrl },
    messages: [SYSTEM, ...messages],
  });
}

app.post(
  "/chat",
  requireAuth,
  rateLimit({ endpoint: "copilot", limit: 60, windowSeconds: 3600 }),
  async (c) => {
    const body = BodySchema.parse(await c.req.json());
    const user = c.get("user");
    const auth = c.req.header("Authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
    const baseUrl = new URL(c.req.url).origin;
    const out = await runCopilotChat(c.env, user, token, baseUrl, body.messages as CopilotMessage[], body.model);
    return c.json(out);
  },
);

export default app;
