import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { patients, profiles, sessions } from "@fisioflow/db";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const PROFILE_ID = "22222222-2222-2222-2222-222222222222";

let mockUserRole = "admin";
let mockProfileLookupIds = new Set<string>([PROFILE_ID]);
const mockTransaction = vi.fn();
const mockSelect = vi.fn();
const mockExecute = vi.fn();

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "auth-user-1",
      profileId: PROFILE_ID,
      organizationId: ORG_ID,
      role: mockUserRole,
      email: "import@test.com",
    });
    await next();
  }),
  normalizeRole: (value?: string | null) => value?.trim().toLowerCase() ?? null,
}));

vi.mock("../../lib/db", () => ({
  createDb: vi.fn(() => ({
    select: mockSelect,
    transaction: mockTransaction,
  })),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { importRoutes } = await import("../import");
  const app = new Hono<any>();
  app.route("/api/import", importRoutes);
  return app;
}

function req(body: unknown) {
  return new Request("http://localhost/api/import/legacy-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
    },
    body: JSON.stringify(body),
  });
}

const ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "test" };
let importHelpers: typeof import("../import");

function createSelectChain() {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => {
          const availableId = [...mockProfileLookupIds][0];
          return availableId ? [{ id: availableId }] : [];
        }),
      })),
    })),
  };
}

function createTx() {
  return {
    execute: mockExecute,
    insert: (table: unknown) => ({
      values: (value: any) => ({
        returning: async (..._args: unknown[]) => {
          if (table === patients) {
            return [{ id: "patient-created-id", ...value }];
          }
          if (table === sessions) {
            return Array.isArray(value)
              ? value.map((row, index) => ({ id: `session-${index + 1}`, ...row }))
              : [{ id: "session-created-id", ...value }];
          }
          if (table === profiles) {
            return [{ id: PROFILE_ID }];
          }
          return [];
        },
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRole = "admin";
  mockProfileLookupIds = new Set([PROFILE_ID]);
  mockSelect.mockImplementation(() => createSelectChain());
  mockTransaction.mockImplementation(async (callback: any) => callback(createTx()));
});

beforeAll(async () => {
  importHelpers = await import("../import");
});

describe("legacy import helpers", () => {
  it("normaliza espaços no nome completo", () => {
    expect(importHelpers.normalizeImportedName("  Maria   da   Silva  ")).toBe("Maria da Silva");
  });

  it("normaliza data YYYY-MM-DD para meio-dia UTC", () => {
    const parsed = importHelpers.parseLegacySessionDate(
      "2025-01-10",
      new Date("2026-06-19T03:00:00.000Z"),
    );
    expect(parsed.error).toBeUndefined();
    expect(parsed.date?.toISOString()).toBe("2025-01-10T12:00:00.000Z");
  });

  it("normaliza alias de status legado", () => {
    expect(importHelpers.normalizeLegacySessionStatus("concluído")).toEqual({
      status: "finalized",
    });
  });
});

describe("POST /api/import/legacy-data", () => {
  it("retorna 403 para papel não autorizado", async () => {
    mockUserRole = "fisioterapeuta";
    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: true,
        patients: [{ fullName: "Maria", evolutions: [{ observacao: "ok" }] }],
      }),
      ENV as any,
    );

    expect(res.status).toBe(403);
  });

  it("retorna 400 para payload sem replaceExisting true", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: false,
        patients: [{ fullName: "Maria", evolutions: [{ observacao: "ok" }] }],
      }),
      ENV as any,
    );

    expect(res.status).toBe(400);
  });

  it("faz dryRun sem gravar no banco", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: true,
        dryRun: true,
        patients: [{ fullName: "Maria", evolutions: [{ observacao: "ok" }] }],
      }),
      ENV as any,
    );

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.dryRun).toBe(true);
    expect(json.results[0].status).toBe("wouldImport");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("importa um paciente com uma evolução", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: true,
        patients: [
          {
            fullName: "Maria Silva",
            evolutions: [{ observacao: "Paciente evoluindo bem", status: "finalizado" }],
          },
        ],
      }),
      ENV as any,
    );

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.summary.importedPatients).toBe(1);
    expect(json.summary.importedSessions).toBe(1);
    expect(json.results[0].status).toBe("imported");
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });
});
