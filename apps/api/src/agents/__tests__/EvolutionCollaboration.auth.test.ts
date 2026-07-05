/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

// Mocks sem `importOriginal`: o módulo real de "../../lib/db" carrega o
// driver `pg`, que não roda no bundler do vitest-pool-workers, então nunca
// pode ser importado de verdade nesse teste (nem indiretamente via auth.ts).
vi.mock("../../lib/auth", () => ({
  resolveJwtCandidate: vi.fn(async (_env: unknown, token: string) => {
    if (token === "token-org-a-fisio") {
      return {
        uid: "user-org-a",
        organizationId: "org-a",
        role: "fisioterapeuta",
      };
    }
    if (token === "token-org-b-fisio") {
      return {
        uid: "user-org-b",
        organizationId: "org-b",
        role: "fisioterapeuta",
      };
    }
    return null;
  }),
  userHasRole: (user: { role?: string } | null, roles: string[]) =>
    Boolean(user?.role && roles.includes(user.role)),
}));

vi.mock("../../lib/db", () => ({
  getRawSql: vi.fn(() => async (_text: string, _params?: unknown[]) => ({
    rows: [{ org_id: "org-a" }],
    rowCount: 1,
  })),
}));

async function openSocket(
  sessionId: string,
  token?: string,
): Promise<{ res: Response; ws: WebSocket }> {
  const url = new URL(`https://collab.test/api/sessions/${sessionId}/collaboration`);
  if (token) url.searchParams.set("token", token);
  const res = await SELF.fetch(url.toString(), { headers: { Upgrade: "websocket" } });
  expect(res.status).toBe(101);
  const ws = res.webSocket;
  if (!ws) throw new Error("no webSocket on 101 response");
  return { res, ws };
}

function waitForClose(ws: WebSocket, timeout = 2000): Promise<{ code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for close")), timeout);
    ws.addEventListener("close", (event) => {
      clearTimeout(timer);
      resolve({ code: (event as CloseEvent).code });
    });
    ws.accept();
  });
}

function waitForOpenSync(ws: WebSocket, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for sync message")), timeout);
    ws.addEventListener("message", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("close", (event) => {
      clearTimeout(timer);
      reject(new Error(`connection closed unexpectedly: ${(event as CloseEvent).code}`));
    });
    ws.accept();
  });
}

describe("EvolutionCollaboration — auth no upgrade do WebSocket", () => {
  it("recusa conexão sem token", async () => {
    const { ws } = await openSocket("auth-no-token");
    const closed = await waitForClose(ws);
    expect(closed.code).toBe(4401);
  });

  it("recusa conexão com token válido de outra organização", async () => {
    const { ws } = await openSocket("auth-cross-org", "token-org-b-fisio");
    const closed = await waitForClose(ws);
    expect(closed.code).toBe(4403);
  });

  it("aceita conexão com token válido, mesma org, papel fisioterapeuta", async () => {
    const { ws } = await openSocket("auth-happy-path", "token-org-a-fisio");
    await waitForOpenSync(ws);
  });
});
