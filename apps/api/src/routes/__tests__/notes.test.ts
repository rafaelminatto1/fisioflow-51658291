import { beforeEach, describe, expect, it, vi } from "vitest";

const NOTE_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

const { mockCreateDb, mockSelect } = vi.hoisted(() => ({
  mockCreateDb: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: USER_ID,
      organizationId: ORG_ID,
      role: "admin",
      email: "notes@test.com",
    });
    await next();
  }),
}));

vi.mock("../../lib/db", () => ({
  createDb: mockCreateDb,
}));

function selectReturning(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => rows),
      })),
    })),
  };
}

function request(method: string, path: string, body?: unknown, headers: HeadersInit = {}) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function formRequest(path: string, file: File) {
  const body = new FormData();
  body.set("file", file);
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
    body,
  });
}

async function buildApp() {
  const { Hono } = await import("hono");
  const { notesRoutes } = await import("../notes");
  const app = new Hono<any>();
  app.route("/api/notes", notesRoutes);
  return app;
}

const ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "test" };

describe("notes routes validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockImplementation(() => selectReturning([]));
    mockCreateDb.mockImplementation(() => ({ select: mockSelect }));
  });

  it("rejects an invalid note type before accessing the database", async () => {
    const app = await buildApp();

    const response = await app.fetch(
      request("POST", "/api/notes", { type: "unsupported_type" }),
      ENV as any,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Tipo de nota inválido" });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });

  it("does not query mentionable entities for a too-short @ search", async () => {
    const app = await buildApp();

    const response = await app.fetch(request("GET", "/api/notes/mentionables?q=a"), ENV as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });

  it("returns not found for a GET using an invalid UUID", async () => {
    const app = await buildApp();

    const response = await app.fetch(request("GET", "/api/notes/not-a-uuid"), ENV as any);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Nota não encontrada" });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });

  it("rejects a favorite request with an invalid UUID before accessing the database", async () => {
    const app = await buildApp();

    const response = await app.fetch(request("PUT", "/api/notes/not-a-uuid/favorite"), ENV as any);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Nota não encontrada" });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });

  it("rejects an invalid appointment id before reading or creating a preparation note", async () => {
    const app = await buildApp();

    const response = await app.fetch(
      request("POST", "/api/notes/from-appointment/not-a-uuid"),
      ENV as any,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Agendamento não encontrado" });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });

  it("rejects an invalid session id before reading or creating a preparation note", async () => {
    const app = await buildApp();

    const response = await app.fetch(
      request("POST", "/api/notes/from-session/not-a-uuid"),
      ENV as any,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Evolução não encontrada" });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });

  it("rejects PATCH when If-Match does not match the current metadata version", async () => {
    mockSelect.mockImplementation(() =>
      selectReturning([
        {
          id: NOTE_ID,
          ownerId: USER_ID,
          organizationId: ORG_ID,
          metadataVersion: 4,
        },
      ]),
    );
    const app = await buildApp();

    const response = await app.fetch(
      request("PATCH", `/api/notes/${NOTE_ID}`, { title: "Novo título" }, { "If-Match": '"3"' }),
      ENV as any,
    );

    expect(response.status).toBe(412);
    await expect(response.json()).resolves.toEqual({
      error: "A nota foi alterada por outra pessoa. Atualize e tente novamente.",
    });
    expect(mockCreateDb).toHaveBeenCalledTimes(1);
  });

  it("rejects organization-wide sharing for a clinical note", async () => {
    mockSelect.mockImplementation(() =>
      selectReturning([
        {
          id: NOTE_ID,
          ownerId: USER_ID,
          organizationId: ORG_ID,
          classification: "clinical",
          metadataVersion: 1,
        },
      ]),
    );
    const app = await buildApp();

    const response = await app.fetch(
      request("PUT", `/api/notes/${NOTE_ID}/permissions`, {
        subjectType: "organization",
        subjectId: ORG_ID,
        accessRole: "viewer",
        capabilities: ["view"],
      }),
      ENV as any,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Notas clínicas não podem ser compartilhadas com toda a organização",
    });
  });

  it("rejects an unknown role before creating a permission", async () => {
    mockSelect.mockImplementation(() =>
      selectReturning([
        {
          id: NOTE_ID,
          ownerId: USER_ID,
          organizationId: ORG_ID,
          classification: "team",
          metadataVersion: 1,
        },
      ]),
    );
    const app = await buildApp();

    const response = await app.fetch(
      request("PUT", `/api/notes/${NOTE_ID}/permissions`, {
        subjectType: "role",
        subjectId: "cargo-inventado",
        accessRole: "viewer",
        capabilities: ["view"],
      }),
      ENV as any,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Cargo destinatário inválido" });
  });

  it("rejects a status other than open or resolved for a comment", async () => {
    mockSelect.mockImplementation(() =>
      selectReturning([{ id: NOTE_ID, ownerId: USER_ID, organizationId: ORG_ID, metadataVersion: 1 }]),
    );
    const app = await buildApp();

    const response = await app.fetch(
      request("PATCH", `/api/notes/${NOTE_ID}/comments/${NOTE_ID}`, { status: "deleted" }),
      ENV as any,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Status do comentário inválido" });
  });

  it("rejects a disallowed attachment content type before writing to R2", async () => {
    mockSelect.mockImplementation(() =>
      selectReturning([{ id: NOTE_ID, ownerId: USER_ID, organizationId: ORG_ID, metadataVersion: 1 }]),
    );
    const app = await buildApp();

    const response = await app.fetch(
      formRequest(`/api/notes/${NOTE_ID}/attachments`, new File(["binary"], "arquivo.exe", { type: "application/x-msdownload" })),
      ENV as any,
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toEqual({ error: "Tipo de arquivo não permitido" });
  });

  it("does not send clinical notes to the Notes AI summary endpoint", async () => {
    mockSelect.mockImplementation(() =>
      selectReturning([{ id: NOTE_ID, ownerId: USER_ID, organizationId: ORG_ID, classification: "clinical", sensitivity: "restricted", patientId: null, metadataVersion: 1 }]),
    );
    const app = await buildApp();

    const response = await app.fetch(request("POST", `/api/notes/${NOTE_ID}/ai/summary`), ENV as any);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "IA disponível apenas para notas internas não clínicas" });
  });
});
