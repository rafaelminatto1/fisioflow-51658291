import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", { uid: "admin-1", organizationId: "org-1", role: "admin", email: "a@x.com" });
    await next();
  }),
  requireRole: () => vi.fn(async (_c: any, next: any) => {
    await next();
  }),
}));

const uploadAndPoll = vi.fn();
const itemsList = vi.fn();
const itemsDelete = vi.fn();
const r2Put = vi.fn();
const r2Delete = vi.fn();

function env() {
  return {
    AI_SEARCH: { items: { uploadAndPoll, upload: vi.fn(), delete: itemsDelete, list: itemsList } },
    CLINICAL_DOCS_BUCKET: { put: r2Put, delete: r2Delete },
    ANALYTICS: { writeDataPoint: vi.fn() },
    ALLOWED_ORIGINS: "*",
    ENVIRONMENT: "development",
  } as any;
}

async function buildApp() {
  const { Hono } = await import("hono");
  const { clinicalDocsRoutes } = await import("../clinicalDocs");
  const app = new Hono<any>();
  app.route("/api/clinical-docs", clinicalDocsRoutes);
  return app;
}

function pdfFile(name = "doc.pdf") {
  // Bytes começando com %PDF-
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x41]);
  return new File([bytes], name, { type: "application/pdf" });
}

function postForm(file: File | null, title: string | null) {
  const fd = new FormData();
  if (file) fd.set("file", file);
  if (title !== null) fd.set("title", title);
  return new Request("http://localhost/api/clinical-docs", { method: "POST", body: fd });
}

describe("clinical docs ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadAndPoll.mockResolvedValue({ id: "item-1", filename: "f", status: "indexed" });
    itemsList.mockResolvedValue({ result: [] });
    itemsDelete.mockResolvedValue(undefined);
    r2Put.mockResolvedValue(undefined);
    r2Delete.mockResolvedValue(undefined);
  });

  it("indexa um PDF válido e guarda no R2", async () => {
    const app = await buildApp();
    const res = await app.fetch(postForm(pdfFile(), "Diretriz de joelho"), env());
    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.title).toBe("Diretriz de joelho");
    expect(r2Put).toHaveBeenCalledTimes(1);
    expect(uploadAndPoll).toHaveBeenCalledTimes(1);
    const [filename, , options] = uploadAndPoll.mock.calls[0];
    expect(String(filename)).toMatch(/^clinical-doc\/.*\.pdf$/);
    expect(options.metadata.source).toBe("clinical-doc");
  });

  it("rejeita arquivo que não é PDF", async () => {
    const app = await buildApp();
    const notPdf = new File([new Uint8Array([1, 2, 3, 4, 5])], "x.pdf", { type: "application/pdf" });
    const res = await app.fetch(postForm(notPdf, "Qualquer"), env());
    expect(res.status).toBe(400);
    expect(uploadAndPoll).not.toHaveBeenCalled();
    expect(r2Put).not.toHaveBeenCalled();
  });

  it("exige título", async () => {
    const app = await buildApp();
    const res = await app.fetch(postForm(pdfFile(), ""), env());
    expect(res.status).toBe(400);
  });

  it("reverte o R2 se a indexação falhar", async () => {
    uploadAndPoll.mockRejectedValue(new Error("index down"));
    const app = await buildApp();
    const res = await app.fetch(postForm(pdfFile(), "Diretriz"), env());
    expect(res.status).toBe(500);
    expect(r2Put).toHaveBeenCalledTimes(1);
    expect(r2Delete).toHaveBeenCalledTimes(1); // rollback
  });

  it("lista documentos via metadata filter", async () => {
    itemsList.mockResolvedValue({
      result: [
        { id: "i1", key: "clinical-doc/abc.pdf", status: "indexed", metadata: { doc_id: "abc", title: "Protocolo X", source: "clinical-doc" } },
      ],
    });
    const app = await buildApp();
    const res = await app.fetch(new Request("http://localhost/api/clinical-docs"), env());
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toEqual([{ id: "abc", title: "Protocolo X", status: "indexed" }]);
  });

  it("remove do índice e do R2", async () => {
    itemsList.mockResolvedValue({
      result: [{ id: "i1", key: "clinical-doc/abc.pdf", status: "indexed" }],
    });
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/clinical-docs/abc", { method: "DELETE" }),
      env(),
    );
    expect(res.status).toBe(200);
    expect(itemsDelete).toHaveBeenCalledWith("i1");
    expect(r2Delete).toHaveBeenCalledTimes(1);
  });
});
