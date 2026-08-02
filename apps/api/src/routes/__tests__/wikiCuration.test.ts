import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("../../lib/auth", () => ({
  requireAuth: async (c: any, next: () => Promise<void>) => {
    c.set("user", {
      uid: "curator-1",
      organizationId: "11111111-1111-4111-8111-111111111111",
    });
    await next();
  },
}));
vi.mock("../../lib/db", () => ({
  createPool: () => ({ query, transaction: vi.fn() }),
}));

import { wikiCurationRoutes } from "../wikiCuration";

describe("wiki curation routes", () => {
  beforeEach(() => query.mockReset());

  it("returns persisted capabilities", async () => {
    query.mockResolvedValueOnce({ rows: [{ capability: "manage_library" }] });
    const response = await wikiCurationRoutes.request(
      "/capabilities",
      {},
      {} as never,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { capabilities: ["manage_library"] },
    });
  });

  it("returns a tenant-scoped cursor queue and server-calculated actions", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ capability: "clinical_review" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            version_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            row_version: 2,
            title: "LCA",
            kind: "guidance",
            editorial_status: "clinical_review",
            technical_status: "indexed",
            submitted_by: "author-1",
            updated_at: "2026-08-02T10:00:00.000Z",
            provenance: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            editorial_status: "clinical_review",
            technical_status: "indexed",
            count: 1,
          },
        ],
      });
    const response = await wikiCurationRoutes.request(
      "/queue?limit=20",
      {},
      {} as never,
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.data[0]).toMatchObject({
      title: "LCA",
      allowedActions: expect.arrayContaining(["approve", "request_changes"]),
    });
    expect(payload.meta.counts).toEqual({ clinical_review: 1 });
    expect(query.mock.calls[1][1][0]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(query.mock.calls[1][0]).toContain("i.organization_id = $1");
  });

  it("accepts the inbox queue tab and calculates operational counts", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ capability: "manage_library" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { editorial_status: "draft", technical_status: "not_started", count: 2 },
          { editorial_status: "triage", technical_status: "failed", count: 3 },
        ],
      });
    const response = await wikiCurationRoutes.request(
      "/queue?status=inbox&limit=20",
      {},
      {} as never,
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.meta.counts).toMatchObject({
      inbox: 5,
      draft: 2,
      triage: 3,
      technical_failures: 3,
    });
    expect(query.mock.calls[1][1][1]).toBe("inbox");
  });

  it("requires an idempotency key before a transition", async () => {
    const response = await wikiCurationRoutes.request(
      "/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/transitions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          versionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          expectedVersion: 1,
        }),
      },
      {} as never,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "IDEMPOTENCY_KEY_REQUIRED" },
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("reopens by creating a new triage version without updating the old version", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ capability: "manage_library" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            row_version: 4,
            editorial_status: "approved",
            submitted_by: "author-1",
            approved_version_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            published_version_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }],
      });

    const response = await wikiCurationRoutes.request(
      "/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/transitions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "reopen-1",
        },
        body: JSON.stringify({
          action: "reopen",
          versionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          expectedVersion: 4,
          reason: "Nova revisão periódica",
        }),
      },
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { editorialStatus: "triage", rowVersion: 5 },
    });
    const mutationSql = query.mock.calls[3][0] as string;
    expect(mutationSql).toContain("INSERT INTO knowledge_item_versions");
    expect(mutationSql).toContain("old.version_number + 1");
    expect(mutationSql).not.toContain(
      "UPDATE knowledge_item_versions SET editorial_status = 'triage'",
    );
  });

  it("publishes and supersedes the previously published version atomically", async () => {
    const previousVersionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    query
      .mockResolvedValueOnce({ rows: [{ capability: "publish_knowledge" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            row_version: 7,
            editorial_status: "approved",
            submitted_by: "author-1",
            approved_version_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            published_version_id: previousVersionId,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
      });

    const response = await wikiCurationRoutes.request(
      "/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/transitions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "publish-1",
        },
        body: JSON.stringify({
          action: "publish",
          versionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          expectedVersion: 7,
        }),
      },
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { editorialStatus: "published", rowVersion: 8 },
    });
    const mutationSql = query.mock.calls[3][0] as string;
    expect(mutationSql).toContain("published_version_id = $5");
    expect(mutationSql).toContain("editorial_status = 'superseded'");
    expect(query.mock.calls[3][1][19]).toBe(previousVersionId);
  });
});
