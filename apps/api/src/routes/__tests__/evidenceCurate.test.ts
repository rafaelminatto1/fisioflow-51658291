import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../../lib/db", () => ({
  getRawSql: vi.fn(() => {
    const fn = ((text: string, params?: unknown[]) => mockQuery(text, params)) as any;
    fn.transaction = (queries: { text: string; values?: unknown[] }[]) =>
      mockTransaction(queries);
    return fn;
  }),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: async (_c: any, next: any) => await next(),
  requireRole: (_role: string) => async (_c: any, next: any) => await next(),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const evidenceRoutes = (await import("../evidence")).default;
  const app = new Hono<any>();
  app.use("*", async (c: any, next: any) => {
    c.set("user", { uid: "user-1", organizationId: "00000000-0000-0000-0000-000000000001", role: "admin" });
    await next();
  });
  app.route("/api/evidence", evidenceRoutes);
  return app;
}

const EXERCISE_ID = "00000000-0000-0000-0000-000000000abc";

beforeEach(() => {
  mockQuery.mockReset();
  mockTransaction.mockReset();
});

describe("curadoria assistida — POST /api/evidence/exercises/:id/approve", () => {
  it("approves pending batch: returns count, persists references and icd10_codes, marks status=approved", async () => {
    const app = await buildApp();
    const pendingRows = [
      {
        id: "ev-1",
        pmid: null,
        doi: "10.1234/physio.2024.001",
        title: "Strength training for knee osteoarthritis",
        abstract: "RCT showing improvements in pain and function.",
        evidence_level: "1a",
        clinical_recommendation: "Recommended as adjunct therapy",
        icd10_codes: ["M17"],
        source_db: "pubmed",
      },
      {
        id: "ev-2",
        pmid: "12345678",
        doi: null,
        title: "Manual therapy for chronic low back pain",
        abstract: "Systematic review.",
        evidence_level: "1a",
        clinical_recommendation: "Conditional recommendation",
        icd10_codes: ["M54.5"],
        source_db: "pubmed",
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows: pendingRows, rowCount: 2 });
    mockTransaction.mockResolvedValueOnce([{ rowCount: 1 }, { rowCount: 2 }]);

    const res = await app.request(`/api/evidence/exercises/${EXERCISE_ID}/approve`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      approved: number;
      references: Array<Record<string, unknown>>;
      icd10_codes: string[];
    };
    expect(body.approved).toBe(2);
    expect(body.references).toHaveLength(2);
    expect(body.references[0]).toMatchObject({ doi: "10.1234/physio.2024.001", source: "pubmed", level: "1a" });
    expect(body.references[1]).toMatchObject({ pmid: "12345678", source: "pubmed", level: "1a" });
    expect(body.icd10_codes).toEqual(["M17", "M54.5"]);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const txCalls = mockTransaction.mock.calls[0][0] as Array<{ text: string; values?: unknown[] }>;
    expect(txCalls[0].text).toMatch(/UPDATE exercises SET references/);
    expect(txCalls[1].text).toMatch(/status = 'approved'/);
  });

  it("returns 400 when no pending evidence exists", async () => {
    const app = await buildApp();
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await app.request(`/api/evidence/exercises/${EXERCISE_ID}/approve`, { method: "POST" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "no_pending_evidence" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("deduplicates icd10_codes across multiple evidence rows", async () => {
    const app = await buildApp();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: "ev-1", pmid: null, doi: "10.1/a", title: "A", abstract: null, evidence_level: "1a", clinical_recommendation: null, icd10_codes: ["M17", "M54.5"], source_db: "pubmed" },
        { id: "ev-2", pmid: null, doi: "10.1/b", title: "B", abstract: null, evidence_level: "1b", clinical_recommendation: null, icd10_codes: ["M17", "S83"], source_db: "pubmed" },
      ],
      rowCount: 2,
    });
    mockTransaction.mockResolvedValueOnce([{ rowCount: 1 }, { rowCount: 2 }]);

    const res = await app.request(`/api/evidence/exercises/${EXERCISE_ID}/approve`, { method: "POST" });
    const body = (await res.json()) as { icd10_codes: string[] };
    expect(body.icd10_codes.sort()).toEqual(["M17", "M54.5", "S83"]);
  });

  it("handles null icd10_codes array gracefully", async () => {
    const app = await buildApp();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: "ev-1", pmid: "1", doi: null, title: "A", abstract: null, evidence_level: "1a", clinical_recommendation: null, icd10_codes: null, source_db: "pubmed" },
      ],
      rowCount: 1,
    });
    mockTransaction.mockResolvedValueOnce([{ rowCount: 1 }, { rowCount: 1 }]);

    const res = await app.request(`/api/evidence/exercises/${EXERCISE_ID}/approve`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { icd10_codes: string[] };
    expect(body.icd10_codes).toEqual([]);
  });
});
