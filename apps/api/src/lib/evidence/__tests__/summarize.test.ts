import { describe, it, expect, vi } from "vitest";
import { buildSummaryPrompt, summarizeArticles, resolveSummaryModel } from "../summarize";
import { WORKERS_AI_MODELS } from "../../workersAi";

describe("buildSummaryPrompt", () => {
  it("includes titles and asks for PT-BR + evidence level", () => {
    const prompt = buildSummaryPrompt([{ pmid: "1", title: "Knee OA exercise", abstract: "abc" }]);
    expect(prompt).toContain("Knee OA exercise");
    expect(prompt.toLowerCase()).toContain("português");
    expect(prompt.toLowerCase()).toContain("nível de evidência");
  });

  it("includes full text when provided, truncated to the char budget", () => {
    const fullText = "F".repeat(50_000);
    const prompt = buildSummaryPrompt(
      [{ pmid: "1", title: "t", abstract: "a", fullText }],
      { charBudget: 10_000 },
    );
    expect(prompt).toContain("FFFF");
    expect(prompt.length).toBeLessThan(15_000);
  });
});

describe("resolveSummaryModel", () => {
  it("defaults to Llama 3.3 70B", () => {
    expect(resolveSummaryModel(undefined)).toBe(WORKERS_AI_MODELS.llama_3_3_70b);
  });
  it("maps glm-5.2 to the Workers AI hosted model", () => {
    expect(resolveSummaryModel("glm-5.2")).toBe("@cf/zai-org/glm-5.2");
  });
});

describe("summarizeArticles", () => {
  const articles = [{ pmid: "1", title: "t", abstract: "a" }];

  it("reads classic .response format", async () => {
    const env = { AI: { run: vi.fn(async () => ({ response: "Resumo PT-BR" })) } } as any;
    const out = await summarizeArticles(env, articles);
    expect(out.summary).toBe("Resumo PT-BR");
  });

  it("reads OpenAI choices format returned by -fast/vLLM models", async () => {
    const env = {
      AI: { run: vi.fn(async () => ({ choices: [{ message: { content: "Resumo GLM" } }] })) },
    } as any;
    const out = await summarizeArticles(env, articles, { model: "glm-5.2" });
    expect(out.summary).toBe("Resumo GLM");
    expect(out.model).toBe("@cf/zai-org/glm-5.2");
    expect(env.AI.run).toHaveBeenCalledWith(
      "@cf/zai-org/glm-5.2",
      expect.anything(),
      expect.objectContaining({ gateway: expect.objectContaining({ id: "fisioflow-gateway" }) }),
    );
  });

  it("routes through the AI Gateway by default", async () => {
    const env = { AI: { run: vi.fn(async () => ({ response: "ok" })) } } as any;
    await summarizeArticles(env, articles);
    expect(env.AI.run).toHaveBeenCalledWith(
      WORKERS_AI_MODELS.llama_3_3_70b,
      expect.anything(),
      expect.objectContaining({ gateway: expect.objectContaining({ id: "fisioflow-gateway" }) }),
    );
  });
});
