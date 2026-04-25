import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();
const getNeonAccessTokenMock = vi.fn();

vi.mock("../base", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: (...args: unknown[]) => getNeonAccessTokenMock(...args),
}));

describe("api v2 exercises", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getNeonAccessTokenMock.mockResolvedValue("jwt-token");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("monta query string apenas com parâmetros definidos em list()", async () => {
    requestMock.mockResolvedValueOnce({ data: [] });

    const { exercisesApi } = await import("../exercises");

    await exercisesApi.list({
      q: "ombro",
      category: "mobilidade",
      difficulty: undefined,
      page: 2,
      limit: 20,
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/api/exercises?q=ombro&category=mobilidade&page=2&limit=20",
    );
  });

  it("faz encoding da query no searchSemantic()", async () => {
    requestMock.mockResolvedValueOnce({ data: [] });

    const { exercisesApi } = await import("../exercises");

    await exercisesApi.searchSemantic("dor lombar + ciático", 5);

    expect(requestMock).toHaveBeenCalledWith(
      "/api/exercises/search/semantic?q=dor%20lombar%20%2B%20ci%C3%A1tico&limit=5",
    );
  });

  it("analyzeImage usa o endpoint configurado e envia Bearer token", async () => {
    vi.stubEnv("VITE_EXERCISE_ANALYSIS_API_URL", "https://analysis.example.com/");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ labels: ["agachamento"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { exercisesApi } = await import("../exercises");

    await expect(
      exercisesApi.analyzeImage("https://cdn.example.com/exercise.png"),
    ).resolves.toEqual({ labels: ["agachamento"] });
    expect(getNeonAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://analysis.example.com/api/exercises/analyze",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token",
        },
        body: JSON.stringify({
          imageUrl: "https://cdn.example.com/exercise.png",
        }),
      }),
    );
  });

  it("analyzeImage falha com erro claro quando a env não está configurada", async () => {
    vi.stubEnv("VITE_EXERCISE_ANALYSIS_API_URL", "");

    const { exercisesApi } = await import("../exercises");

    await expect(exercisesApi.analyzeImage("https://cdn.example.com/exercise.png")).rejects.toThrow(
      "VITE_EXERCISE_ANALYSIS_API_URL não configurada",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
