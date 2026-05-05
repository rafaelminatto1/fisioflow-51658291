import { beforeEach, describe, expect, it, vi } from "vitest";
import { runHealthMonitor } from "../monitor";
import type { Env } from "../../types/env";

function makeEnv(overrides: Partial<Env> = {}): Env {
  const kv = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ENVIRONMENT: "production",
    ALLOWED_ORIGINS: "*",
    FISIOFLOW_CONFIG: kv as any,
    ...overrides,
  } as Env;
}

describe("runHealthMonitor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the lightweight API health endpoint by default", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await runHealthMonitor(makeEnv());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-pro.moocafisio.com.br/api/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("respects MONITOR_HEALTH_URL overrides", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await runHealthMonitor(makeEnv({ MONITOR_HEALTH_URL: "https://example.com/api/health" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
