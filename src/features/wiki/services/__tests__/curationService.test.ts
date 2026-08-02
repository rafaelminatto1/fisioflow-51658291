import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/api/v2/base";
import { curationService } from "../curationService";

vi.mock("@/api/v2/base", () => ({ request: vi.fn() }));
const requestMock = vi.mocked(request);

beforeEach(() => requestMock.mockReset());

describe("curationService", () => {
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
