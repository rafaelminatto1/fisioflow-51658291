import { describe, expect, it, vi } from "vitest";
import {
  buildWikiIndexFilename,
  legacyWikiIndexFilenames,
  serializeWikiPageForIndex,
  removeWikiPageFromIndex,
  upsertWikiPageInIndex,
} from "../wikiIndexing";

const page = {
  id: "11111111-2222-3333-4444-555555555555",
  slug: "protocolo-lca",
  title: "Protocolo LCA",
  content: "Reabilitação pós-operatória de LCA.",
  htmlContent: "<p>Reabilitação pós-operatória de LCA.</p>",
  category: "protocolos",
  tags: ["joelho", "lca"],
};

describe("buildWikiIndexFilename", () => {
  it("gera nome canônico estável baseado apenas no id", () => {
    expect(buildWikiIndexFilename(page.id)).toBe("wiki/11111111-2222-3333-4444-555555555555.md");
  });
});

describe("legacyWikiIndexFilenames", () => {
  it("cobre as três convenções antigas", () => {
    expect(legacyWikiIndexFilenames(page.id, page.slug)).toEqual([
      "wiki/11111111-2222-3333-4444-555555555555_protocolo-lca.md",
      "wiki_11111111-2222-3333-4444-555555555555.md",
      "wiki-11111111-2222-3333-4444-555555555555.md",
    ]);
  });

  it("omite a variante com slug quando slug ausente", () => {
    expect(legacyWikiIndexFilenames(page.id)).toEqual([
      "wiki_11111111-2222-3333-4444-555555555555.md",
      "wiki-11111111-2222-3333-4444-555555555555.md",
    ]);
  });
});

describe("serializeWikiPageForIndex", () => {
  it("produz markdown determinístico com título, categoria e tags", () => {
    const doc = serializeWikiPageForIndex(page);
    expect(doc.filename).toBe("wiki/11111111-2222-3333-4444-555555555555.md");
    expect(doc.markdown).toContain("# Protocolo LCA");
    expect(doc.markdown).toContain("**Categoria:** protocolos");
    expect(doc.markdown).toContain("**Tags:** joelho, lca");
    expect(doc.markdown).toContain("Reabilitação pós-operatória de LCA.");
    expect(doc.metadata).toMatchObject({
      source: "wiki",
      type: "wiki",
      wiki_id: page.id,
      slug: "protocolo-lca",
      title: "Protocolo LCA",
      category: "protocolos",
    });
  });

  it("prefere content cru a htmlContent e trunca conteúdo gigante", () => {
    const doc = serializeWikiPageForIndex({ ...page, content: "x".repeat(50000) });
    expect(doc.markdown.length).toBeLessThanOrEqual(24000);
    expect(doc.markdown).not.toContain("<p>");
  });

  it("usa htmlContent quando content vazio", () => {
    const doc = serializeWikiPageForIndex({ ...page, content: null });
    expect(doc.markdown).toContain("Reabilitação pós-operatória de LCA.");
  });
});

function mockAiSearchEnv() {
  const uploadAndPoll = vi
    .fn()
    .mockResolvedValue({ id: "item-1", filename: "f", status: "indexed" });
  const upload = vi.fn().mockResolvedValue({ id: "item-1", filename: "f", status: "queued" });
  const del = vi.fn().mockResolvedValue(undefined);
  const list = vi.fn().mockResolvedValue({
    result: [
      { id: "item-1", key: "wiki/11111111-2222-3333-4444-555555555555.md", status: "indexed" },
    ],
  });
  return {
    env: {
      AI_SEARCH: { search: vi.fn(), items: { uploadAndPoll, upload, delete: del, list } },
    } as any,
    uploadAndPoll,
    upload,
    del,
    list,
  };
}

describe("upsertWikiPageInIndex", () => {
  it("usa uploadAndPoll com filename canônico e metadata", async () => {
    const { env, uploadAndPoll } = mockAiSearchEnv();
    const result = await upsertWikiPageInIndex(env, page);
    expect(result.ok).toBe(true);
    expect(uploadAndPoll).toHaveBeenCalledTimes(1);
    const [filename, markdown, options] = uploadAndPoll.mock.calls[0];
    expect(filename).toBe("wiki/11111111-2222-3333-4444-555555555555.md");
    expect(String(markdown)).toContain("# Protocolo LCA");
    expect(options.metadata.source).toBe("wiki");
  });

  it("cai para upload simples quando uploadAndPoll indisponível", async () => {
    const { env, upload } = mockAiSearchEnv();
    delete env.AI_SEARCH.items.uploadAndPoll;
    const result = await upsertWikiPageInIndex(env, page);
    expect(result.ok).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("retorna ok=false sem binding em vez de lançar", async () => {
    const result = await upsertWikiPageInIndex({} as any, page);
    expect(result.ok).toBe(false);
  });
});

describe("removeWikiPageFromIndex", () => {
  it("procura canônico + legados e deleta os encontrados", async () => {
    const { env, del, list } = mockAiSearchEnv();
    const result = await removeWikiPageFromIndex(env, page.id, page.slug);
    expect(result.deleted).toBe(1);
    expect(list).toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith("item-1");
  });

  it("não lança quando nada encontrado", async () => {
    const { env, list } = mockAiSearchEnv();
    list.mockResolvedValue({ result: [] });
    const result = await removeWikiPageFromIndex(env, page.id, page.slug);
    expect(result.deleted).toBe(0);
  });
});
