/**
 * Integration tests for GET/PUT /api/v1/user/agenda-appearance
 *
 * Requirements: 3.1, 3.2
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { agendaAppearanceRoutes } from "../routes/agendaAppearance";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the auth middleware so we can control the user context
vi.mock("../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-uid-123",
      profileId: "profile-uuid-456",
      organizationId: "org-uuid-789",
      role: "admin",
    });
    await next();
  }),
}));

// Mock createPool to return a controllable query function
const mockQuery = vi.fn();
vi.mock("../lib/db", () => ({
  createPool: vi.fn(() => ({
    query: mockQuery,
    transaction: vi.fn(),
    end: vi.fn(),
  })),
  runWithOrg: vi.fn((_orgId: string, fn: () => Promise<any>) => fn()),
  getOrgContext: vi.fn(() => "org-uuid-789"),
}));

// ─── Test App Setup ───────────────────────────────────────────────────────────

function buildTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
  app.route("/api/v1/user", agendaAppearanceRoutes);
  return app;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validAppearanceState = {
  global: {
    cardSize: "small" as const,
    heightScale: 6,
    fontScale: 5,
    opacity: 100,
  },
  day: {
    cardSize: "medium" as const,
    heightScale: 7,
    fontScale: 6,
  },
  week: {
    cardSize: "small" as const,
    heightScale: 5,
    fontScale: 5,
  },
  month: {
    cardSize: "extra_small" as const,
    heightScale: 3,
    fontScale: 4,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/v1/user/agenda-appearance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { data: appearanceData } with 200 when profile exists", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ appearance_data: validAppearanceState }],
      rowCount: 1,
      fields: [],
      command: "SELECT",
    });

    const app = buildTestApp();
    const res = await app.request("/api/v1/user/agenda-appearance", {
      method: "GET",
      headers: { Authorization: "Bearer fake-token" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: validAppearanceState });
  });

  it("returns { data: null } with 200 when profile does not exist", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      fields: [],
      command: "SELECT",
    });

    const app = buildTestApp();
    const res = await app.request("/api/v1/user/agenda-appearance", {
      method: "GET",
      headers: { Authorization: "Bearer fake-token" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: null });
  });

  it("queries with the correct profileId and organizationId", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      fields: [],
      command: "SELECT",
    });

    const app = buildTestApp();
    await app.request("/api/v1/user/agenda-appearance", {
      method: "GET",
      headers: { Authorization: "Bearer fake-token" },
    });

    expect(mockQuery).toHaveBeenCalledOnce();
    const [_sql, params] = mockQuery.mock.calls[0];
    expect(params).toEqual(["profile-uuid-456", "org-uuid-789"]);
  });
});

describe("PUT /api/v1/user/agenda-appearance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { data: { updatedAt } } with 200 for a valid body", async () => {
    const updatedAt = "2026-04-27T10:30:00.000Z";
    mockQuery.mockResolvedValueOnce({
      rows: [{ updated_at: updatedAt }],
      rowCount: 1,
      fields: [],
      command: "INSERT",
    });

    const app = buildTestApp();
    const res = await app.request("/api/v1/user/agenda-appearance", {
      method: "PUT",
      headers: {
        Authorization: "Bearer fake-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validAppearanceState),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { updatedAt } });
  });

  it("clamps heightScale values out of range (> 10) before persisting", async () => {
    const updatedAt = "2026-04-27T10:30:00.000Z";
    mockQuery.mockResolvedValueOnce({
      rows: [{ updated_at: updatedAt }],
      rowCount: 1,
      fields: [],
      command: "INSERT",
    });

    const outOfRangeBody = {
      global: {
        cardSize: "small",
        heightScale: 15, // out of range — should be clamped to 10
        fontScale: -3,   // out of range — should be clamped to 0
        opacity: 150,    // out of range — should be clamped to 100
      },
    };

    const app = buildTestApp();
    const res = await app.request("/api/v1/user/agenda-appearance", {
      method: "PUT",
      headers: {
        Authorization: "Bearer fake-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(outOfRangeBody),
    });

    expect(res.status).toBe(200);

    // Verify the clamped values were passed to the DB
    expect(mockQuery).toHaveBeenCalledOnce();
    const [_sql, params] = mockQuery.mock.calls[0];
    const persistedData = JSON.parse(params[2]);

    expect(persistedData.global.heightScale).toBe(10);
    expect(persistedData.global.fontScale).toBe(0);
    expect(persistedData.global.opacity).toBe(100);
  });

  it("clamps per-view values out of range before persisting", async () => {
    const updatedAt = "2026-04-27T10:30:00.000Z";
    mockQuery.mockResolvedValueOnce({
      rows: [{ updated_at: updatedAt }],
      rowCount: 1,
      fields: [],
      command: "INSERT",
    });

    const bodyWithOutOfRangeViewOverrides = {
      global: {
        cardSize: "small",
        heightScale: 6,
        fontScale: 5,
        opacity: 100,
      },
      day: {
        heightScale: 99, // should be clamped to 10
        opacity: -10,    // should be clamped to 0
      },
    };

    const app = buildTestApp();
    await app.request("/api/v1/user/agenda-appearance", {
      method: "PUT",
      headers: {
        Authorization: "Bearer fake-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyWithOutOfRangeViewOverrides),
    });

    const [_sql, params] = mockQuery.mock.calls[0];
    const persistedData = JSON.parse(params[2]);

    expect(persistedData.day.heightScale).toBe(10);
    expect(persistedData.day.opacity).toBe(0);
  });

  it("returns 400 for an invalid body (missing global)", async () => {
    const app = buildTestApp();
    const res = await app.request("/api/v1/user/agenda-appearance", {
      method: "PUT",
      headers: {
        Authorization: "Bearer fake-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ day: { heightScale: 5 } }), // missing required `global`
    });

    expect(res.status).toBe(400);
    // DB should not have been called
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("uses profileId from user context as the DB key", async () => {
    const updatedAt = "2026-04-27T10:30:00.000Z";
    mockQuery.mockResolvedValueOnce({
      rows: [{ updated_at: updatedAt }],
      rowCount: 1,
      fields: [],
      command: "INSERT",
    });

    const app = buildTestApp();
    await app.request("/api/v1/user/agenda-appearance", {
      method: "PUT",
      headers: {
        Authorization: "Bearer fake-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validAppearanceState),
    });

    const [_sql, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe("profile-uuid-456"); // profileId
    expect(params[1]).toBe("org-uuid-789");      // organizationId
  });
});

describe("GET /api/v1/user/agenda-appearance — profileId fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to uid when profileId is undefined (new user)", async () => {
    // Override the global requireAuth mock for this single test
    const { requireAuth } = await import("../lib/auth");
    vi.mocked(requireAuth).mockImplementationOnce(async (c: any, next: any) => {
      c.set("user", {
        uid: "user-uid-fallback",
        profileId: undefined, // new user — no profileId yet
        organizationId: "org-uuid-789",
        role: "viewer",
      });
      await next();
    });

    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      fields: [],
      command: "SELECT",
    });

    const app = buildTestApp();
    await app.request("/api/v1/user/agenda-appearance", {
      method: "GET",
      headers: { Authorization: "Bearer fake-token" },
    });

    expect(mockQuery).toHaveBeenCalledOnce();
    const [_sql, params] = mockQuery.mock.calls[0];
    // Should use uid as fallback when profileId is undefined
    expect(params[0]).toBe("user-uid-fallback");
  });
});
