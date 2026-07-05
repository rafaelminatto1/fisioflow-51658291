import { describe, it, expect, vi } from "vitest";
import { AIRouter } from "./aiRouter";
import { AIRouterError } from "./aiErrors";
import * as aiProviders from "./aiProviders";
import * as aiCost from "./aiCost";

describe("AIRouter", () => {
  const mockEnv = {
    AI_DAILY_BUDGET_BRL: "50.00",
    AI_MONTHLY_BUDGET_BRL: "500.00",
    AI_DEFAULT_CHEAP_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
    AI_GATEWAY_ENABLED: "true"
  };

  it("should block unknown taskType", async () => {
    const router = new AIRouter({
      env: mockEnv,
      organizationId: "org-1",
      userId: "user-1",
      taskType: "invalid_task" as any
    });
    
    await expect(router.run("hello")).rejects.toThrowError("Unknown taskType: invalid_task");
  });

  it("should throw error if GLM 5.2 is forced", async () => {
    const router = new AIRouter({
      env: mockEnv,
      organizationId: "org-1",
      userId: "user-1",
      taskType: "soap_draft"
    });
    
    await expect(router.run("hello", "glm-5.2-pro")).rejects.toThrowError("proibido para uso no ambiente de produção");
  });

  it("should trigger fallback when primary provider fails", async () => {
    vi.spyOn(aiProviders, "runGemini").mockRejectedValue(new Error("Gemini down"));
    const workersAiSpy = vi.spyOn(aiProviders, "runWorkersAI").mockResolvedValue({
      text: "fallback success",
      inputTokens: 10,
      outputTokens: 20
    });

    const router = new AIRouter({
      env: mockEnv,
      organizationId: "org-1",
      userId: "user-1",
      taskType: "soap_draft"
    });
    
    const result = await router.run("hello", "gemini-1.5-flash");
    expect(result).toBe("fallback success");
    expect(workersAiSpy).toHaveBeenCalled();
  });
});
