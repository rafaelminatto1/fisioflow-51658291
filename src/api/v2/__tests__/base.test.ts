import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getWorkersApiUrlMock = vi.fn();
const getNeonAccessTokenMock = vi.fn();
const enqueueActionMock = vi.fn();

vi.mock("@/lib/api/config", () => ({
  getWorkersApiUrl: () => getWorkersApiUrlMock(),
}));

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: (...args: unknown[]) => getNeonAccessTokenMock(...args),
}));

vi.mock("@/services/offlineSync", () => ({
  getOfflineSyncService: vi.fn().mockReturnValue({
    enqueueAction: (...args: any[]) => enqueueActionMock(...args),
  }),
  enqueueAction: (...args: any[]) => enqueueActionMock(...args),
}));

describe("api v2 base request", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getWorkersApiUrlMock.mockReturnValue("https://workers.example.com");
    getNeonAccessTokenMock.mockResolvedValue("jwt-token");
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("anexa Authorization header e parseia JSON em sucesso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { request } = await import("../base");

    await expect(request("/api/test")).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://workers.example.com/api/test",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token",
        },
      }),
    );
  });

  it("refaz a chamada com token recarregado quando recebe 401", async () => {
    getNeonAccessTokenMock
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("fresh-token");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { request } = await import("../base");

    await expect(request("/api/test")).resolves.toEqual({ ok: true });
    expect(getNeonAccessTokenMock).toHaveBeenNthCalledWith(2, {
      forceSessionReload: true,
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://workers.example.com/api/test",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fresh-token",
        },
      }),
    );
  });

  it("propaga status e payload quando a resposta falha", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "forbidden", code: "ACL_DENIED" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { request } = await import("../base");

    await expect(request("/api/forbidden")).rejects.toMatchObject({
      message: "forbidden",
      status: 403,
      payload: { error: "forbidden", code: "ACL_DENIED" },
    });
  });

  it("retorna blob quando o content-type é PDF", async () => {
    const pdfBody = "pdf-data";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(pdfBody, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );

    const { request } = await import("../base");

    const result = await request<Blob>("/api/reports/file");
    expect(typeof (result as any).size).toBe("number");
    expect((result as any).type).toBe("application/pdf");
  });

  it("requestPublic não envia Authorization e falha com erro útil", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { requestPublic } = await import("../base");

    await expect(requestPublic("/api/public/resource")).rejects.toThrow("not found");
    expect(getNeonAccessTokenMock).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "https://workers.example.com/api/public/resource",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("intercepta erro de rede em POST quando offline e enfileira ação", async () => {
    // Simular offline
    vi.stubGlobal("navigator", { onLine: false });

    // Simular falha de rede
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const { request } = await import("../base");

    const payload = { title: "New Event" };
    const result = await request("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Deve retornar sucesso simulado
    expect(result).toEqual({ success: true, offline: true });
  });
});
