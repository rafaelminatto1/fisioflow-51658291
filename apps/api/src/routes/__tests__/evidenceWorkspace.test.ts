import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const searchPubmedMock = vi.fn();
const capabilitiesMock = vi.fn();

vi.mock("../../lib/auth", () => ({
  requireAuth: async (c: any, next: () => Promise<void>) => {
    c.set("user", {
      uid: "user-1",
      organizationId: "11111111-1111-4111-8111-111111111111",
      role: "fisioterapeuta",
    });
    await next();
  },
  userHasRole: (user: { role?: string }, roles: string[]) =>
    roles.includes(user.role ?? ""),
}));

vi.mock("../../lib/db", () => ({
  getRawSql: () => queryMock,
}));

vi.mock("../../lib/knowledgeCapabilities", () => ({
  resolveKnowledgeCapabilities: (...args: unknown[]) => capabilitiesMock(...args),
}));

vi.mock("../../lib/evidence/sources/pubmed", () => ({
  searchPubmed: (...args: unknown[]) => searchPubmedMock(...args),
}));

vi.mock("../../lib/evidence/cache", () => ({
  upsertArticles: async (
    sql: (query: string, params?: unknown[]) => Promise<unknown>,
    articles: unknown[],
  ) => sql("INSERT INTO evidence_articles mocked", articles),
}));

import app, { normalizeDoi, normalizePmid } from "../evidenceWorkspace";

const env = {} as any;
const articleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("evidence workspace", () => {
  beforeEach(() => {
    queryMock.mockReset();
    searchPubmedMock.mockReset();
    capabilitiesMock.mockReset();
    capabilitiesMock.mockResolvedValue([]);
  });

  it("normaliza DOI e valida PMID sem aceitar texto parcial", () => {
    expect(normalizeDoi(" HTTPS://doi.org/10.1000/ABC.Def ")).toBe(
      "10.1000/abc.def",
    );
    expect(normalizeDoi("doi: 10.1234/X Y")).toBe("10.1234/xy");
    expect(normalizeDoi("not-a-doi")).toBeNull();
    expect(normalizePmid(" 123456 ")).toBe("123456");
    expect(normalizePmid("PMID:123")).toBeNull();
  });

  it("lista o workspace com organização explícita e cursor determinístico", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          article_id: articleId,
          updated_at: "2026-08-01T12:00:00.000Z",
          title: "A",
        },
        {
          article_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          updated_at: "2026-08-01T11:00:00.000Z",
          title: "B",
        },
      ],
    });
    queryMock.mockResolvedValueOnce({ rows: [] });
    const response = await app.request("/workspace?limit=1", {}, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.data.articles).toHaveLength(1);
    expect(payload.data.capabilities).toMatchObject({
      import: true,
      collections: true,
      patientContext: false,
    });
    expect(payload.meta).toMatchObject({
      limit: 1,
      hasMore: true,
      nextCursor: { id: articleId },
    });
    expect(queryMock.mock.calls[0][1][0]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(queryMock.mock.calls[0][0]).toContain("oe.organization_id = $1");
    expect(queryMock.mock.calls[0][0]).toContain(
      "ORDER BY oe.updated_at DESC, oe.article_id DESC",
    );
  });

  it("retorna feature detection 503 quando o schema ainda não existe", async () => {
    queryMock.mockRejectedValueOnce(
      Object.assign(
        new Error('relation "organization_evidence" does not exist'),
        { code: "42P01" },
      ),
    );
    const response = await app.request("/workspace", {}, env);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "SCHEMA_UNAVAILABLE" },
    });
  });

  it("importa PMID, persiste a associação org-scoped e retorna 202", async () => {
    searchPubmedMock.mockResolvedValueOnce([
      {
        pmid: "12345",
        doi: "10.1000/test",
        source: "pubmed",
        title: "Trial",
        abstract: "Abstract",
        authors: ["Author"],
        journal: "Journal",
        pubDate: "2026",
        mesh: [],
        pmcId: null,
        oaStatus: "unknown",
        studyType: "Trial",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345/",
      },
    ]);
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // evidence_articles upsert mock
      .mockResolvedValueOnce({ rows: [] }) // identifier lookup
      .mockResolvedValueOnce({ rows: [] }) // resource insert
      .mockResolvedValueOnce({
        rows: [{ article_id: articleId, pmid: "12345", doi: "10.1000/test" }],
      })
      .mockResolvedValueOnce({ rows: [] }) // prior org association
      .mockResolvedValueOnce({ rows: [{ article_id: articleId }] });
    const response = await app.request(
      "/import",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "pmid", identifier: "12345" }),
      },
      env,
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      data: { articleId, pmid: "12345", duplicate: false },
    });
    expect(queryMock.mock.calls[5][1][0]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("compara somente metadados presentes e declara ausências", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          article_id: articleId,
          pmid: "1",
          doi: null,
          title: "One",
          abstract: null,
          authors: [],
          journal: null,
          pub_date: null,
          study_type: null,
          raw: {},
        },
        {
          article_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          pmid: "2",
          doi: null,
          title: "Two",
          abstract: "Known",
          authors: [],
          journal: "J",
          pub_date: "2025",
          study_type: "RCT",
          raw: { sample_size: 20 },
        },
      ],
    });
    const response = await app.request(
      "/compare",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          articleIds: [articleId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
        }),
      },
      env,
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.data[0]).toMatchObject({
      population: "Não informado",
      conclusion: "Não informado",
    });
    expect(payload.data[1]).toMatchObject({
      sampleSize: 20,
      studyDesign: "RCT",
    });
    expect(payload.meta).toMatchObject({
      generated: false,
      deterministic: true,
    });
  });

  it("rejeita comparação com artigo duplicado antes de consultar o banco", async () => {
    const response = await app.request(
      "/compare",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleIds: [articleId, articleId] }),
      },
      env,
    );
    expect(response.status).toBe(422);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("reserva reabertura de curadoria para manage_library", async () => {
    const response = await app.request(
      `/resources/${articleId}/review`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reopen" }),
      },
      env,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
