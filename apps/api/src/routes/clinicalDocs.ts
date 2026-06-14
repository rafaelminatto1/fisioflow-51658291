import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, requireRole, type AuthVariables } from "../lib/auth";
import { writeEvent } from "../lib/analytics";
import {
  clinicalDocR2Key,
  indexClinicalDoc,
  isPdf,
  listClinicalDocs,
  removeClinicalDocFromIndex,
} from "../lib/clinicalDocsIndexing";

const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB — limite de arquivo do AI Search

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Curadoria: só admin/owner pode ingerir documentos no RAG compartilhado, para
// evitar que PDFs de paciente (sem RLS no índice) acabem pesquisáveis por todos.
app.use("*", requireAuth);
app.use("*", requireRole(["admin", "owner"]));

// Lista os documentos de referência indexados.
app.get("/", async (c) => {
  const docs = await listClinicalDocs(c.env);
  return c.json({ data: docs });
});

// Upload de um PDF de referência (diretriz, protocolo, material) → R2 + índice.
app.post("/", async (c) => {
  const user = c.get("user");
  if (!c.env.AI_SEARCH) return c.json({ error: "AI Search indisponível" }, 503);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  const title = String(form?.get("title") ?? "").trim();

  if (!(file instanceof File)) return c.json({ error: "Arquivo (file) é obrigatório" }, 400);
  if (!title) return c.json({ error: "Título é obrigatório" }, 400);

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) return c.json({ error: "Arquivo vazio" }, 400);
  if (bytes.byteLength > MAX_PDF_BYTES) return c.json({ error: "PDF acima de 4 MB" }, 413);
  if (!isPdf(bytes)) return c.json({ error: "O arquivo precisa ser um PDF" }, 400);

  const id = crypto.randomUUID();

  // 1. Fonte da verdade no R2 (bucket dedicado).
  if (c.env.CLINICAL_DOCS_BUCKET) {
    await c.env.CLINICAL_DOCS_BUCKET.put(clinicalDocR2Key(id), bytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { title, org_id: user.organizationId ?? "", created_by: user.uid ?? "" },
    });
  }

  // 2. Índice no AI Search (instância interna; PDF é parseado nativamente).
  const result = await indexClinicalDoc(c.env, bytes, {
    id,
    title,
    organizationId: user.organizationId,
    createdBy: user.uid,
  });

  if (!result.ok) {
    if (c.env.CLINICAL_DOCS_BUCKET) {
      await c.env.CLINICAL_DOCS_BUCKET.delete(clinicalDocR2Key(id)).catch(() => {});
    }
    return c.json({ error: "Falha ao indexar o documento", details: result.error }, 500);
  }

  writeEvent(c.env, {
    route: "/api/clinical-docs",
    method: "POST",
    orgId: user.organizationId,
    event: "clinical_doc_indexed",
    detail: title.slice(0, 120),
  });

  return c.json({ id, title, status: result.status ?? "queued" }, 201);
});

// Remove do índice e do R2.
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const removed = await removeClinicalDocFromIndex(c.env, id);
  if (c.env.CLINICAL_DOCS_BUCKET) {
    await c.env.CLINICAL_DOCS_BUCKET.delete(clinicalDocR2Key(id)).catch(() => {});
  }

  writeEvent(c.env, {
    route: "/api/clinical-docs",
    method: "DELETE",
    orgId: user.organizationId,
    event: "clinical_doc_removed",
  });

  return c.json({ ok: true, deleted: removed.deleted });
});

export { app as clinicalDocsRoutes };
