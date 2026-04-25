import { beforeEach, describe, expect, it, vi } from "vitest";

const getWorkersApiUrlMock = vi.fn();
const getNeonAccessTokenMock = vi.fn();

vi.mock("../../api/config", () => ({
  getWorkersApiUrl: () => getWorkersApiUrlMock(),
}));

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: (...args: unknown[]) => getNeonAccessTokenMock(...args),
}));

describe("function-http legacy workers bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
    getNeonAccessTokenMock.mockResolvedValue("jwt-token");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("mapeia listAppointments para a rota canonical da Workers API", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { callFunctionHttp } = await import("../function-http");

    await callFunctionHttp("listAppointments", {
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      patientId: "patient-123",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://workers.example.com/api/appointments?dateFrom=2026-04-01&dateTo=2026-04-30&patientId=patient-123",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer jwt-token",
        },
      }),
    );
  });

  it("refaz a requisição com token recarregado quando recebe 401", async () => {
    getNeonAccessTokenMock
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("fresh-token");

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { callFunctionHttp } = await import("../function-http");

    await expect(callFunctionHttp("getProfile", {})).resolves.toMatchObject({ ok: true });

    expect(getNeonAccessTokenMock).toHaveBeenNthCalledWith(1);
    expect(getNeonAccessTokenMock).toHaveBeenNthCalledWith(2, {
      forceSessionReload: true,
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://workers.example.com/api/profile/me",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer fresh-token",
        },
      }),
    );
  });

  it("falha com erro explícito quando a callable legacy não tem mapeamento", async () => {
    const { callFunctionHttp, FunctionCallError } = await import("../function-http");

    await expect(callFunctionHttp("nonexistentCallable", {})).rejects.toBeInstanceOf(
      FunctionCallError,
    );
    await expect(callFunctionHttp("nonexistentCallable", {})).rejects.toThrow(
      "Legacy callable mapping not configured",
    );
  });
});
