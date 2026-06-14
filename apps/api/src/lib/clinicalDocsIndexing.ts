import type { Env } from "../types/env";
import { deleteIndexedItemsByFilenames } from "./wikiIndexing";

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
    head[0] === 0x25 && // %
    head[1] === 0x50 && // P
    head[2] === 0x44 && // D
    head[3] === 0x46 && // F
    head[4] === 0x2d // -
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
    const items = env.AI_SEARCH.items;
    const metadata = {
      source: "clinical-doc",
      type: "clinical-doc",
      doc_id: meta.id,
      title: meta.title,
      org_id: meta.organizationId ?? "",
    };
    // Enfileira (queued) e retorna na hora — a indexação do PDF roda em background.
    // NÃO usar uploadAndPoll aqui: o poll bloquearia o request além do limite do Worker.
    const result = await items.upload(clinicalDocIndexFilename(meta.id), bytes, { metadata });
    return { ok: true, status: result?.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[clinicalDocs] index failed for ${meta.id}:`, message);
    return { ok: false, error: message };
  }
}

export async function removeClinicalDoc(env: Env, id: string): Promise<{ deleted: number }> {
  return deleteIndexedItemsByFilenames(env, [clinicalDocIndexFilename(id)]);
}

export type ClinicalDocListItem = {
  id: string;
  title: string;
  status: string;
};

// Lista os documentos de referência a partir do índice (metadata source=clinical-doc).
export async function listClinicalDocs(env: Env): Promise<ClinicalDocListItem[]> {
  if (!env.AI_SEARCH?.items) return [];
  try {
    const listing = await env.AI_SEARCH.items.list({
      per_page: 100,
      metadata_filter: JSON.stringify({ source: { $eq: "clinical-doc" } }),
    });
    const items: Array<{ id: string; key?: string; filename?: string; status: string; metadata?: Record<string, unknown> }> =
      listing?.result ?? listing?.items ?? [];
    return items
      .filter((it) => String(it.key ?? it.filename ?? "").startsWith(`${CLINICAL_DOC_PREFIX}/`))
      .map((it) => ({
        id: String(it.metadata?.doc_id ?? "").trim() || extractDocId(it.key ?? it.filename ?? ""),
        title: String(it.metadata?.title ?? it.key ?? "documento"),
        status: it.status,
      }))
      .filter((it) => it.id);
  } catch (error) {
    console.error("[clinicalDocs] list failed:", error);
    return [];
  }
}

function extractDocId(key: string): string {
  const m = key.match(/clinical-doc\/(.+)\.pdf$/);
  return m ? m[1] : "";
}
