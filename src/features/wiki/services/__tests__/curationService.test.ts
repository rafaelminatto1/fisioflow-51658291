import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/api/v2/base";
import {
  curationService,
  normalizeCurationDetail,
  normalizeCurationQueueItem,
} from "../curationService";

vi.mock("@/api/v2/base", () => ({ request: vi.fn() }));
const requestMock = vi.mocked(request);

beforeEach(() => requestMock.mockReset());

describe("curationService", () => {
  it("normaliza DTO snake_case, responsável e proveniência da fila", () => {
    expect(
      normalizeCurationQueueItem({
        id: "item-1",
        version_id: "version-1",
        row_version: 3,
        title: "Diretriz",
        kind: "guidance",
        editorial_status: "triage",
        technical_status: "indexed",
        assignee: "user-1",
        provenance: [
          { type: "evidence_resources", title: "PubMed", url: "https://example.test" },
        ],
        allowedActions: ["start_review"],
      }),
    ).toMatchObject({
      versionId: "version-1",
      rowVersion: 3,
      editorialStatus: "triage",
      assignee: { id: "user-1", name: "user-1" },
      provenance: {
        sourceType: "evidence_resources",
        sourceTitle: "PubMed",
        sourceUrl: "https://example.test",
      },
    });
  });

  it("normaliza detalhe, fontes, revisão e atribuição ativas", () => {
    expect(
      normalizeCurationDetail({
        id: "item-1",
        version_id: "version-2",
        row_version: 4,
        title: "Protocolo",
        editorial_status: "clinical_review",
        allowedActions: ["approve"],
        metadata: { summary: "Resumo" },
        sources: [{ source_type: "paper", title: "Fonte A", doi: "10.1/a" }],
        assignments: [
          { id: "a1", assignment_type: "owner", assignee_id: "reviewer-1", priority: "high" },
        ],
        reviews: [
          { reviewer_id: "reviewer-1", action: "start_review", created_at: "2026-08-02" },
        ],
      }),
    ).toMatchObject({
      versionId: "version-2",
      rowVersion: 4,
      summary: "Resumo",
      assignee: { id: "reviewer-1" },
      priority: "high",
      sources: [{ sourceTitle: "Fonte A", doi: "10.1/a" }],
      review: { reviewer: { id: "reviewer-1" }, decision: "start_review" },
    });
  });

  it("serializa filtros e limita a primeira página a 20 itens", async () => {
    requestMock.mockResolvedValue({ data: [], meta: { counts: {} } } as never);
    await curationService.queue({
      status: "triage",
      technicalStatus: "failed",
      q: "joelho",
    });
    const url = String(requestMock.mock.calls[0]?.[0]);
    expect(url).toContain("limit=20");
    expect(url).toContain("status=triage");
    expect(url).toContain("technicalStatus=failed");
    expect(url).toContain("q=joelho");
  });

  it("envia versão esperada e chave idempotente em transições", async () => {
    requestMock.mockResolvedValue({ data: {} } as never);
    await curationService.transition({
      item: {
        id: "item-1",
        versionId: "version-2",
        rowVersion: 7,
        title: "Diretriz",
        kind: "guideline",
        editorialStatus: "clinical_review",
        allowedActions: ["approve"],
      },
      action: "approve",
      validUntil: "2027-08-02",
    });

    const [, init] = requestMock.mock.calls[0]!;
    expect(init?.headers).toMatchObject({
      "Idempotency-Key": expect.any(String),
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      action: "approve",
      versionId: "version-2",
      expectedVersion: 7,
      validUntil: "2027-08-02",
    });
  });
});
