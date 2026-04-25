import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkersApiUrl } from "../config";

const FALLBACK_URL = "https://fisioflow-api.rafalegollas.workers.dev";

describe("getWorkersApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("usa a env configurada quando ela é válida", () => {
    vi.stubEnv("VITE_WORKERS_API_URL", "https://api.lab.moocafisio.com.br/");

    expect(getWorkersApiUrl()).toBe("https://api.lab.moocafisio.com.br");
  });

  it("usa o domínio de produção quando ele vem da env", () => {
    vi.stubEnv("VITE_WORKERS_API_URL", "https://api-pro.moocafisio.com.br");

    expect(getWorkersApiUrl()).toBe("https://api-pro.moocafisio.com.br");
  });

  it("faz fallback para workers.dev quando a env está ausente", () => {
    vi.stubEnv("VITE_WORKERS_API_URL", "");

    expect(getWorkersApiUrl()).toBe(FALLBACK_URL);
  });

  it("prefere workers.dev quando a aplicação já roda nesse host", () => {
    vi.stubEnv("VITE_WORKERS_API_URL", "https://api.lab.moocafisio.com.br");
    vi.stubGlobal("window", {
      location: {
        hostname: "fisioflow-web.rafalegollas.workers.dev",
      },
    });

    expect(getWorkersApiUrl()).toBe(FALLBACK_URL);
  });
});
