import { describe, it, expect, vi } from "vitest";
import { buildSummaryPrompt, summarizeArticles } from "../summarize";

describe("buildSummaryPrompt", () => {
  it("includes titles and asks for PT-BR + evidence level", () => {
    const prompt = buildSummaryPrompt([{ pmid: "1", title: "Knee OA exercise", abstract: "abc" }]);
    expect(prompt).toContain("Knee OA exercise");
    expect(prompt.toLowerCase()).toContain("português");
    expect(prompt.toLowerCase()).toContain("nível de evidência");
  });
});

describe("summarizeArticles", () => {
  it("calls Workers AI and returns the response text", async () => {
    const env = { AI: { run: vi.fn(async () => ({ response: "Resumo PT-BR" })) } } as any;
    const out = await summarizeArticles(env, [{ pmid: "1", title: "t", abstract: "a" }]);
    expect(out).toBe("Resumo PT-BR");
    expect(env.AI.run).toHaveBeenCalled();
  });
});
