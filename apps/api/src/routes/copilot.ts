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
});

const SYSTEM: CopilotMessage = {
  role: "system",
  content:
    "Você é o copiloto clínico do FisioFlow. Responda em português (PT-BR), com base em evidência. " +
    "Use as ferramentas quando precisar de dados (evidência científica, exercícios, histórico do paciente). " +
    "Não invente dados clínicos; cite os resultados das ferramentas.",
};

export async function runCopilotChat(
  env: Env,
  user: AuthUser,
  token: string,
  baseUrl: string,
  messages: CopilotMessage[],
) {
  const tools = buildRegistry();
  const callModel = makeCallModel(env, tools);
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
    const out = await runCopilotChat(c.env, user, token, baseUrl, body.messages as CopilotMessage[]);
    return c.json(out);
  },
);

export default app;
