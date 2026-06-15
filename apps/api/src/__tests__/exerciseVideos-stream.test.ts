import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { exerciseVideosRoutes } from "../routes/exerciseVideos";

// Mock DB
vi.mock("../lib/db", () => ({
  createPool: vi.fn(async () => ({
    query: vi.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO exercise_videos")) {
        return { rows: [{ id: "vid-1", stream_id: "stream-uid-abc" }] };
      }
      if (sql.includes("UPDATE exercise_videos")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    }),
  })),
}));

vi.mock("../lib/auth", () => ({
  requireAuth: (c: any, next: any) => {
    c.set("user", { uid: "user-1", organizationId: "org-1" });
    return next();
  },
}));

function buildApp(env: Partial<{ STREAM: unknown; STREAM_WEBHOOK_SECRET: string }>) {
  const app = new Hono();
  app.route("/api/exercise-videos", exerciseVideosRoutes as any);
  return { app, env: env as any };
}

describe("Stream upload-url", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 503 quando STREAM binding ausente", async () => {
    const { app, env } = buildApp({});
    const res = await app.request(
      "/api/exercise-videos/upload-url",
      { method: "POST", body: JSON.stringify({ title: "Squat" }) },
      env,
    );
    expect(res.status).toBe(503);
  });

  it("cria upload URL e persiste linha quando STREAM disponível", async () => {
    const directUpload = vi.fn(async () => ({
      uploadURL: "https://upload.videodelivery.net/abc",
      uid: "stream-uid-abc",
    }));
    const { app, env } = buildApp({ STREAM: { directUpload } });
    const res = await app.request(
      "/api/exercise-videos/upload-url",
      {
        method: "POST",
        body: JSON.stringify({ title: "Squat", exercise_id: "ex-1" }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.upload_url).toContain("upload.videodelivery.net");
    expect(body.data.stream_id).toBe("stream-uid-abc");
    expect(directUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        creator: "user-1",
        meta: expect.objectContaining({ org_id: "org-1", title: "Squat", exercise_id: "ex-1" }),
      }),
    );
  });

  it("rejeita title vazio", async () => {
    const { app, env } = buildApp({ STREAM: { directUpload: vi.fn() } });
    const res = await app.request(
      "/api/exercise-videos/upload-url",
      {
        method: "POST",
        body: JSON.stringify({ title: "  " }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("Stream webhook", () => {
  const SECRET = "test-secret";

  async function sign(time: string, body: string) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${time}.${body}`));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  it("503 sem STREAM_WEBHOOK_SECRET", async () => {
    const { app, env } = buildApp({});
    const res = await app.request(
      "/api/exercise-videos/stream-webhook",
      { method: "POST", body: "{}" },
      env,
    );
    expect(res.status).toBe(503);
  });

  it("401 com assinatura inválida", async () => {
    const { app, env } = buildApp({ STREAM_WEBHOOK_SECRET: SECRET });
    const res = await app.request(
      "/api/exercise-videos/stream-webhook",
      {
        method: "POST",
        body: JSON.stringify({ uid: "abc" }),
        headers: { "Webhook-Signature": `time=${Math.floor(Date.now() / 1000)},sig1=deadbeef` },
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("aceita payload válido e retorna ok", async () => {
    const { app, env } = buildApp({ STREAM_WEBHOOK_SECRET: SECRET });
    const time = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify({
      uid: "stream-uid-abc",
      readyToStream: true,
      status: { state: "ready" },
      thumbnail: "https://videodelivery.net/abc/thumbnails/thumbnail.jpg",
      playback: { hls: "https://videodelivery.net/abc/manifest/video.m3u8" },
      duration: 12.5,
    });
    const sig1 = await sign(time, payload);
    const res = await app.request(
      "/api/exercise-videos/stream-webhook",
      {
        method: "POST",
        body: payload,
        headers: { "Webhook-Signature": `time=${time},sig1=${sig1}` },
      },
      env,
    );
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.ok).toBe(true);
  });

  it("401 com timestamp fora da janela", async () => {
    const { app, env } = buildApp({ STREAM_WEBHOOK_SECRET: SECRET });
    const stale = String(Math.floor(Date.now() / 1000) - 600);
    const payload = JSON.stringify({ uid: "x" });
    const sig1 = await sign(stale, payload);
    const res = await app.request(
      "/api/exercise-videos/stream-webhook",
      {
        method: "POST",
        body: payload,
        headers: { "Webhook-Signature": `time=${stale},sig1=${sig1}` },
      },
      env,
    );
    expect(res.status).toBe(401);
  });
});
