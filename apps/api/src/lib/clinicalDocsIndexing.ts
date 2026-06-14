import type { Env } from "../types/env";

export const CLINICAL_DOC_PREFIX = "clinical-doc";
export const CLINICAL_DOC_R2_PREFIX = "reference";

export function clinicalDocIndexFilename(id: string): string {
  return `${CLINICAL_DOC_PREFIX}/${id}.pdf`;
}

export function clinicalDocR2Key(id: string): string {
  return `${CLINICAL_DOC_R2_PREFIX}/${id}.pdf`;
}

// PDFs começam com "%PDF-". Evita indexar arquivos que não são PDF de verdade.
export function isPdf(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes.slice(0, 5));
  return (
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d
  );
}

export type ClinicalDocMeta = {
  id: string;
  title: string;
  organizationId?: string;
  createdBy?: string;
};

export async function indexClinicalDoc(
  env: Env,
  bytes: ArrayBuffer,
  meta: ClinicalDocMeta,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (!env.AI_SEARCH?.items) return { ok: false, error: "AI_SEARCH não configurado" };

  try {
    const metadata = {
      source: "clinical-doc",
      type: "clinical-doc",
      doc_id: meta.id,
      title: meta.title,
      org_id: meta.organizationId ?? "",
    };
    // Enfileira (queued) e retorna na hora — a indexação do PDF roda em background.
    // NÃO usar uploadAndPoll: o poll bloquearia o request além do limite do Worker.
    const result = await env.AI_SEARCH.items.upload(clinicalDocIndexFilename(meta.id), bytes, {
      metadata,
    });
    return { ok: true, status: result?.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[clinicalDocs] index failed for ${meta.id}:`, message);
    return { ok: false, error: message };
  }
}

// Remove do índice. O `items.list` com `search` casa por prefixo/token; por isso
// buscamos pelo id e confirmamos a chave exata antes de deletar.
export async function removeClinicalDocFromIndex(env: Env, id: string): Promise<{ deleted: number }> {
  if (!env.AI_SEARCH?.items) return { deleted: 0 };
  const key = clinicalDocIndexFilename(id);
  let deleted = 0;
  try {
    const listing = await env.AI_SEARCH.items.list({ search: id, per_page: 25 });
    const items: Array<{ id: string; key?: string; filename?: string }> =
      listing?.result ?? listing?.items ?? [];
    for (const item of items) {
      if ((item.key ?? item.filename ?? "") !== key) continue;
      await env.AI_SEARCH.items.delete(item.id);
      deleted++;
    }
  } catch (error) {
    console.warn(`[clinicalDocs] remove failed for ${id}:`, error);
  }
  return { deleted };
}

export type ClinicalDocListItem = {
  id: string;
  title: string;
};

// Fonte da verdade para a lista é o R2 (a metadata customizada do AI Search não
// fica consultável sem declarar campos). `include: customMetadata` traz o título.
export async function listClinicalDocs(env: Env): Promise<ClinicalDocListItem[]> {
  if (!env.CLINICAL_DOCS_BUCKET) return [];
  try {
    const listed = await env.CLINICAL_DOCS_BUCKET.list({
      prefix: `${CLINICAL_DOC_R2_PREFIX}/`,
      include: ["customMetadata"],
    } as R2ListOptions);
    return listed.objects
      .map((obj) => {
        const id = extractIdFromR2Key(obj.key);
        return { id, title: String(obj.customMetadata?.title ?? id) };
      })
      .filter((d) => d.id)
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error("[clinicalDocs] list failed:", error);
    return [];
  }
}

function extractIdFromR2Key(key: string): string {
  const m = key.match(/reference\/(.+)\.pdf$/);
  return m ? m[1] : "";
}
