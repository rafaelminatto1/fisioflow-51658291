import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: vi.fn() })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: (_c: any, next: any) => next(),
}));

const adminUser = {
  uid: "admin-1",
  email: "admin@example.com",
  organizationId: "org-1",
  role: "admin",
};

const memberUser = {
  uid: "member-1",
  email: "member@example.com",
  organizationId: "org-1",
  role: "member",
};

async function buildApp(userOverride?: any) {
  const { Hono } = await import("hono");
  const { dlqReplayRoutes } = await import("../admin/dlq-replay");  const app = new Hono<any>();
  app.use("/*", async (c, next) => {
    c.set("user", userOverride ?? adminUser);
    await next();
  });
  app.route("/api/admin/dlq", dlqReplayRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeEnv(user: any, queueSend?: ReturnType<typeof vi.fn>) {
  return {
    ENVIRONMENT: "development" as const,
    ALLOWED_ORIGINS: "*",
    ANALYTICS: { writeDataPoint: vi.fn() },
    BACKGROUND_QUEUE: { send: queueSend ?? vi.fn().mockResolvedValue(undefined) },
    _user: user,
  } as any;
}

describe("DLQ replay route", () => {
  it("rejects non-admin users with 403", async () => {
    const app = await buildApp(memberUser);
    const res = await app.fetch(makeRequest("GET", "/api/admin/dlq"), makeEnv(memberUser));

    expect(res.status).toBe(403);
  });

  it("returns DLQ info for admin users", async () => {
    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/admin/dlq"), makeEnv(adminUser));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { dlqQueues: string[] };
    expect(body.dlqQueues).toBeDefined();
  });

  it("emits audit event on DLQ list view", async () => {
    const writeDataPoint = vi.fn();
    const env = makeEnv(adminUser);
    env.ANALYTICS = { writeDataPoint };

    const app = await buildApp();
    await app.fetch(makeRequest("GET", "/api/admin/dlq"), env);

    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: expect.arrayContaining([expect.stringContaining("dlq_list_viewed")]),
      }),
    );
  });

  it("re-enqueues a replayable task", async () => {
    const queueSend = vi.fn().mockResolvedValue(undefined);
    const env = makeEnv(adminUser, queueSend);
    const app = await buildApp();

    const task = {
      type: "SEND_WHATSAPP",
      payload: {
        to: "+5511999999999",
        templateName: "lembrete_sessao",
        languageCode: "pt_BR",
        bodyParameters: [],
        organizationId: "org-1",
        patientId: "patient-1",
        messageText: "test message",
        appointmentId: "apt-1",
      },
    };

    const res = await app.fetch(
      makeRequest("POST", "/api/admin/dlq/replay", { task }),
      env,
    );

    expect(res.status).toBe(200);
    expect(queueSend).toHaveBeenCalled();
    const sentPayload = queueSend.mock.calls[0][0];
    expect(sentPayload.payload._replay).toBeDefined();
    expect(sentPayload.payload._replay.replayedBy).toBe("admin-1");
  });

  it("rejects replay of non-replayable tasks", async () => {
    const app = await buildApp();
    const task = { type: "CLEANUP_LOGS", payload: { organizationId: "org-1" } };

    const res = await app.fetch(
      makeRequest("POST", "/api/admin/dlq/replay", { task }),
      makeEnv(adminUser),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not replayable");
  });

  it("rejects requests without task body", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/admin/dlq/replay", {}),
      makeEnv(adminUser),
    );

    expect(res.status).toBe(400);
  });

  it("emits audit event on successful replay", async () => {
    const writeDataPoint = vi.fn();
    const env = makeEnv(adminUser);
    env.ANALYTICS = { writeDataPoint };

    const app = await buildApp();
    const task = {
      type: "PROCESS_EXAM",
      payload: { examId: "exam-1", r2Key: "test.pdf", organizationId: "org-1", patientId: "p1", fileType: "image" },
    };

    await app.fetch(
      makeRequest("POST", "/api/admin/dlq/replay", { task }),
      env,
    );

    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: expect.arrayContaining([expect.stringContaining("dlq_replay_queued")]),
      }),
    );
  });

  it("emits audit event on replay failure", async () => {
    const writeDataPoint = vi.fn();
    const queueSend = vi.fn().mockRejectedValue(new Error("Queue unavailable"));
    const env = makeEnv(adminUser, queueSend);
    env.ANALYTICS = { writeDataPoint };

    const app = await buildApp();
    const task = {
      type: "SEND_WHATSAPP",
      payload: { to: "+5511", templateName: "test", languageCode: "pt_BR", bodyParameters: [], organizationId: "org-1", patientId: "p1", messageText: "msg", appointmentId: "a1" },
    };

    const res = await app.fetch(
      makeRequest("POST", "/api/admin/dlq/replay", { task }),
      env,
    );

    expect(res.status).toBe(500);
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: expect.arrayContaining([expect.stringContaining("dlq_replay_failed")]),
      }),
    );
  });
});
