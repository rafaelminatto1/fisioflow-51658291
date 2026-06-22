import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { legacyImportSchema } from "../import";
import { appointments, patients, profiles, sessions } from "@fisioflow/db";

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
    insert: createTx().insert,
    execute: mockExecute,
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
  let apptCounter = 0;
  return {
    execute: mockExecute,
    insert: (table: unknown) => ({
      values: (value: any) => ({
        returning: async (..._args: unknown[]) => {
          if (table === patients) {
            return [{ id: "patient-created-id", ...value }];
          }
          if (table === appointments) {
            apptCounter++;
            return [{ id: `appointment-${apptCounter}`, ...value }];
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

describe("legacyImportSchema (estendido)", () => {
  const base = { replaceExisting: true as const, patients: [] as unknown[] };
  it("aceita evolução só com appointmentStatus (sem observacao)", () => {
    const r = legacyImportSchema.safeParse({
      ...base,
      patients: [{ fullName: "X", legacyId: "1", evolutions: [{ date: "2024-08-30", appointmentStatus: "faltou", appointmentType: "session" }] }],
    });
    expect(r.success).toBe(true);
  });
  it("aceita evolução com observacao e status atendido", () => {
    const r = legacyImportSchema.safeParse({
      ...base,
      patients: [{ fullName: "X", legacyId: "1", evolutions: [{ date: "2024-08-30", observacao: "texto", appointmentStatus: "atendido", appointmentType: "session" }] }],
    });
    expect(r.success).toBe(true);
  });
  it("rejeita evolução sem observacao e sem appointmentStatus", () => {
    const r = legacyImportSchema.safeParse({
      ...base,
      patients: [{ fullName: "X", legacyId: "1", evolutions: [{ date: "2024-08-30", appointmentType: "session" }] }],
    });
    expect(r.success).toBe(false);
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

  it("permite append sem limpar a organização quando replaceExisting=false", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: false,
        patients: [{ fullName: "Maria", evolutions: [{ observacao: "ok" }] }],
      }),
      ENV as any,
    );

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.replaceExisting).toBe(false);
    expect(json.summary.importedPatients).toBe(1);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
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

  it("faz fallback quando o driver não suporta transaction()", async () => {
    mockTransaction
      .mockRejectedValueOnce(new Error("No transactions support in neon-http driver"))
      .mockRejectedValueOnce(new Error("No transactions support in neon-http driver"));

    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: true,
        patients: [
          {
            fullName: "Maria Fallback",
            evolutions: [{ observacao: "Paciente evoluindo bem", appointmentStatus: "atendido" }],
          },
        ],
      }),
      ENV as any,
    );

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.summary.importedPatients).toBe(1);
    expect(json.summary.importedAppointments).toBe(1);
    expect(json.summary.importedSessions).toBe(1);
    expect(json.results[0].status).toBe("imported");
  });

  it("vincula sessão ao appointmentId correto (evolução mista: com e sem observacao)", async () => {
    const capturedSessionInserts: any[] = [];

    function createTxCapturing() {
      let apptCounter = 0;
      return {
        execute: mockExecute,
        insert: (table: unknown) => ({
          values: (value: any) => {
            if (table === sessions) {
              capturedSessionInserts.push(value);
            }
            return {
              returning: async (..._args: unknown[]) => {
                if (table === patients) {
                  return [{ id: "patient-mixed-id", ...value }];
                }
                if (table === appointments) {
                  apptCounter++;
                  return [{ id: `appt-mixed-${apptCounter}`, ...value }];
                }
                if (table === sessions) {
                  return [{ id: `session-mixed-1`, ...value }];
                }
                if (table === profiles) {
                  return [{ id: PROFILE_ID }];
                }
                return [];
              },
            };
          },
        }),
      };
    }

    mockTransaction.mockImplementation(async (callback: any) => callback(createTxCapturing()));

    const app = await buildApp();
    const res = await app.fetch(
      req({
        replaceExisting: true,
        patients: [
          {
            fullName: "João Misto",
            legacyId: "zen-42",
            evolutions: [
              {
                date: "2024-08-30",
                startTime: "15:00",
                observacao: "texto clínico",
                appointmentStatus: "atendido",
                appointmentType: "session",
              },
              {
                date: "2024-09-13",
                appointmentStatus: "faltou",
                appointmentType: "session",
              },
            ],
          },
        ],
      }),
      ENV as any,
    );

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // 2 appointments must have been imported (one per evolution)
    expect(json.summary.importedAppointments).toBe(2);

    // Only evolution A has observacao → only 1 session
    expect(json.summary.importedSessions).toBe(1);

    // legacyId surfaces in the result for traceability
    expect(json.results[0].legacyId).toBe("zen-42");

    // The session insert must carry a truthy appointmentId (linked to the first appointment)
    expect(capturedSessionInserts).toHaveLength(1);
    expect(capturedSessionInserts[0].appointmentId).toBeTruthy();
    expect(capturedSessionInserts[0].appointmentId).toBe("appt-mixed-1");
  });
});
