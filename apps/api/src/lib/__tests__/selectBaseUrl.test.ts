import { describe, it, expect } from "vitest";
import { selectBaseUrl } from "../db";

const REPLICA = "postgres://replica.neon.tech/db";
const HYPER = "postgres://hyperdrive.internal/db";
const DIRECT = "postgres://primary.neon.tech/db";

function env(over: Record<string, unknown> = {}) {
  return {
    ENVIRONMENT: "production",
    HYPERDRIVE: { connectionString: HYPER },
    NEON_URL: DIRECT,
    ...over,
  } as any;
}

describe("selectBaseUrl (roteamento de read replica)", () => {
  it("modo replica + NEON_REPLICA_URL setada → usa a réplica", () => {
    expect(selectBaseUrl(env({ NEON_REPLICA_URL: REPLICA }), "replica")).toBe(REPLICA);
  });
  it("modo replica SEM NEON_REPLICA_URL → cai no primário (Hyperdrive)", () => {
    expect(selectBaseUrl(env(), "replica")).toBe(HYPER);
  });
  it("modo read/write nunca usa a réplica, mesmo com NEON_REPLICA_URL setada", () => {
    const e = env({ NEON_REPLICA_URL: REPLICA });
    expect(selectBaseUrl(e, "read")).toBe(HYPER);
    expect(selectBaseUrl(e, "write")).toBe(HYPER);
  });
  it("em produção prefere Hyperdrive sobre o NEON_URL direto", () => {
    expect(selectBaseUrl(env(), "write")).toBe(HYPER);
  });
});
