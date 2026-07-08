import { TaskType, AI_TASK_LIMITS, AI_TASK_PRIVACY_LEVELS } from "./aiTasks";
import { calculateCost } from "./aiCost";
import { AIRouterError } from "./aiErrors";
import { runWorkersAI, runGemini } from "./aiProviders";
import { sanitizePrompt } from "./sanitizeClinicalPrompt";
import { validateModelPolicy } from "./modelPolicy";
// Stubbing db import - would normally be imported from @fisioflow/db
// import { db } from "@fisioflow/db";
// import { aiUsageEvents } from "@fisioflow/db/schema";

export interface AIRouterConfig {
  env: any;
  organizationId: string;
  userId: string;
  patientId?: string;
  patientName?: string; // Usado para sanitização
  taskType: TaskType;
}

export class AIRouter {
  constructor(private config: AIRouterConfig) {}

  async checkBudget() {
    // In a real implementation, query `ai_usage_events` via Drizzle:
    // SELECT SUM(estimated_cost_brl) FROM ai_usage_events WHERE orgId = ? AND date = today
    // if sum > env.AI_DAILY_BUDGET_BRL throw Error
    
    if (this.config.env.AI_ROUTER_ENABLED === "false" || this.config.env.AI_ROUTER_ENABLED === false) {
      throw new AIRouterError("AI Router está desativado por feature flag.", "FEATURE_DISABLED");
    }

    const dailyLimit = parseFloat(this.config.env.AI_DAILY_BUDGET_BRL || "50.00");

    // TODO(PRODUCTION-STUB): Implement real budget check querying ai_usage_events via Drizzle
    const currentDailyUsage = 0; 
    if (currentDailyUsage >= dailyLimit) {
      throw new AIRouterError("Daily AI budget exceeded", "BUDGET_EXCEEDED");
    }
  }

  async run(prompt: string, forceModel?: string): Promise<string> {
    const { env, taskType, organizationId } = this.config;

    // 1. TaskType Check
    const tokenLimit = AI_TASK_LIMITS[taskType];
    if (!tokenLimit) {
      throw new AIRouterError(`Unknown taskType: ${taskType}`, "UNKNOWN_TASK");
    }
    
    if (prompt.length / 4 > tokenLimit) {
      throw new AIRouterError(`Estimated tokens exceed limit for task ${taskType}`, "TOKEN_LIMIT_EXCEEDED");
    }

    // 2. Budget check
    await this.checkBudget();

    // 3. Model selection & Fallback
    const primaryModel = forceModel || env.AI_DEFAULT_CHEAP_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";
    
    // Enforcement da Política de Modelos (Lança erro se GLM 5.2 ou classe proibida)
    validateModelPolicy(primaryModel, taskType as any);

    let provider = primaryModel.includes("gemini") ? "google" : "workers-ai";
    let responseText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;
    let redactedLog: string[] = [];

    // 4. Sanitização LGPD (Falha Seguro - Aborta se der erro)
    const exposureLevel = AI_TASK_PRIVACY_LEVELS[taskType];
    const { sanitizedPrompt, redactedEntities } = sanitizePrompt(prompt, {
      level: exposureLevel,
      patientName: this.config.patientName,
      provider
    });
    
    redactedLog = redactedEntities;

    const startTime = Date.now();
    try {
      if (provider === "google") {
        const res = await runGemini(env, primaryModel, sanitizedPrompt);
        responseText = res.text;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
      } else {
        const res = await runWorkersAI(env, primaryModel, sanitizedPrompt);
        responseText = res.text;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
      }
    } catch {
      // Fallback
      const fallbackModel = env.AI_DEFAULT_CHEAP_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";
      try {
        // Redo sanitization check just in case the provider changed and blocked full_internal_only
        const fallbackProvider = "workers-ai";
        const fbSanitize = sanitizePrompt(prompt, {
          level: exposureLevel,
          patientName: this.config.patientName,
          provider: fallbackProvider
        });
        
        const res = await runWorkersAI(env, fallbackModel, fbSanitize.sanitizedPrompt);
        provider = fallbackProvider; // update provider
        responseText = res.text;
        inputTokens = res.inputTokens;
        outputTokens = res.outputTokens;
      } catch (fallbackError: any) {
        throw new AIRouterError("All AI providers failed", "PROVIDERS_FAILED", fallbackError);
      }
    } finally {
      latencyMs = Date.now() - startTime;
      
      // 4. Calculate cost
      const { estimatedCostBrl } = calculateCost(primaryModel, inputTokens, outputTokens);

      // TODO(PRODUCTION-STUB): Async Log to DB
      // env.ctx.waitUntil(db.insert(aiUsageEvents).values({...}))
      console.log(`[AI_ROUTER] Logged usage: Org=${organizationId}, Task=${taskType}, CostBRL=${estimatedCostBrl}, Latency=${latencyMs}ms, Redacted=[${redactedLog.join(",")}]`);
    }

    return responseText;
  }
}
