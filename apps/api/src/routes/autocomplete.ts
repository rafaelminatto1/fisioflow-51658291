import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, verifyToken, type AuthVariables } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { autocompleteCatalog } from "@fisioflow/db/schema/clinical";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// 1. GET /api/autocomplete (Público com rate limit ou validando token de pré-cadastro)
app.get("/", async (c) => {
  const db = createDb(c.env, "read");
  const type = c.req.query("type");
  const search = c.req.query("search") || "";
  const precadastroToken = c.req.query("token");

  let orgId: string | null = null;

  // Tentar extrair orgId de usuário logado caso exista Authorization Header
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    try {
      const authUser = await verifyToken(c, c.env);
      if (authUser) {
        orgId = authUser.organizationId;
      }
    } catch {
      // Ignora erro de auth para requisições de pré-cadastro que passam auth vazia
    }
  }

  // Tentar extrair orgId validando o token do pré-cadastro
  if (!orgId && precadastroToken) {
    const pool = createPool(c.env);
    const tokenResult = await pool.query(
      "SELECT organization_id FROM pre_registration_tokens WHERE token = $1 AND is_active = true LIMIT 1",
      [precadastroToken]
    );
    if (tokenResult.rows.length > 0) {
      orgId = String(tokenResult.rows[0].organization_id);
    }
  }

  const conditions = [];

  if (type) {
    conditions.push(eq(autocompleteCatalog.type, type));
  }

  if (search) {
    conditions.push(ilike(autocompleteCatalog.name, `%${search.trim()}%`));
  }

  // Filtra itens globais aprovados OU itens específicos desta clínica que ainda estão sob moderação
  const orgCondition = orgId
    ? or(
        eq(autocompleteCatalog.isApproved, true),
        and(eq(autocompleteCatalog.isApproved, false), eq(autocompleteCatalog.organizationId, orgId))
      )
    : eq(autocompleteCatalog.isApproved, true);

  conditions.push(orgCondition);

  try {
    const results = await db
      .select()
      .from(autocompleteCatalog)
      .where(and(...conditions))
      .orderBy(autocompleteCatalog.name)
      .limit(30);

    return c.json({ data: results });
  } catch (error: any) {
    console.error("[Autocomplete Search Error]", error);
    return c.json({ error: "Erro ao buscar dados de autocomplete" }, 500);
  }
});

// 2. GET /api/autocomplete/pending (Listar sugestões pendentes da clínica)
app.get("/pending", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env, "read");

  try {
    const pending = await db
      .select()
      .from(autocompleteCatalog)
      .where(
        and(
          eq(autocompleteCatalog.isApproved, false),
          eq(autocompleteCatalog.organizationId, user.organizationId)
        )
      )
      .orderBy(autocompleteCatalog.createdAt);

    return c.json({ data: pending });
  } catch (error) {
    console.error("[Autocomplete Pending Error]", error);
    return c.json({ error: "Erro ao buscar itens pendentes" }, 500);
  }
});

// 3. POST /api/autocomplete/suggest (Sugerir nova tag que não existe no autocomplete)
app.post("/suggest", async (c) => {
  const body = await c.req.json();
  const { type, name, token } = body;

  if (!type || !name || String(name).trim() === "") {
    return c.json({ error: "Campos obrigatórios: type, name" }, 400);
  }

  let orgId: string | null = null;

  // Tentar obter orgId do usuário logado
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    try {
      const authUser = await verifyToken(c, c.env);
      if (authUser) {
        orgId = authUser.organizationId;
      }
    } catch {}
  }

  // Tentar obter orgId do token de pré-cadastro
  if (!orgId && token) {
    const pool = createPool(c.env);
    const tokenResult = await pool.query(
      "SELECT organization_id FROM pre_registration_tokens WHERE token = $1 AND is_active = true LIMIT 1",
      [token]
    );
    if (tokenResult.rows.length > 0) {
      orgId = String(tokenResult.rows[0].organization_id);
    }
  }

  if (!orgId) {
    return c.json({ error: "Sessão expirada ou token de pré-cadastro inválido" }, 401);
  }

  const db = createDb(c.env, "write");
  const trimmedName = String(name).trim();

  try {
    // 1. Inserir no catálogo como não-aprovado e vinculando a org da clínica
    const [inserted] = await db
      .insert(autocompleteCatalog)
      .values({
        type,
        name: trimmedName,
        isApproved: false,
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: [autocompleteCatalog.type, autocompleteCatalog.name] })
      .returning();

    // 2. Enviar notificação aos membros ativos da organização
    const pool = createPool(c.env);
    const adminsResult = await pool.query(
      "SELECT user_id FROM profiles WHERE organization_id = $1 AND is_active = true",
      [orgId]
    );

    const typeLabelMap: Record<string, string> = {
      medication: "Medicamento",
      allergy_general: "Alergia Geral",
      allergy_medicine: "Alergia a Medicamento",
      pathology: "Patologia",
    };

    const label = typeLabelMap[type] || type;

    for (const row of adminsResult.rows) {
      const adminUserId = String(row.user_id);
      await pool.query(
        `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata, is_read, created_at)
         VALUES ($1, $2, 'moderation', $3, $4, '/dashboard/precadastro', $5, false, NOW())`,
        [
          orgId,
          adminUserId,
          "Nova sugestão de termo clínico",
          `Um paciente sugeriu cadastrar "${trimmedName}" como "${label}".`,
          JSON.stringify({ type, name: trimmedName, itemId: inserted?.id || null }),
        ]
      );
    }

    return c.json({ data: inserted || { type, name: trimmedName, isApproved: false } }, 201);
  } catch (error) {
    console.error("[Autocomplete Suggest Error]", error);
    return c.json({ error: "Erro ao cadastrar sugestão" }, 500);
  }
});

// 4. POST /api/autocomplete/moderate (Administrador aprova ou rejeita a sugestão)
app.post("/moderate", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env, "write");
  const body = await c.req.json();
  const { id, action } = body; // action: 'approve' ou 'reject'

  if (!id || !action) {
    return c.json({ error: "Campos obrigatórios: id, action" }, 400);
  }

  try {
    const [item] = await db
      .select()
      .from(autocompleteCatalog)
      .where(eq(autocompleteCatalog.id, id));

    if (!item) {
      return c.json({ error: "Sugestão não encontrada" }, 404);
    }

    // Apenas membros da mesma organização que inseriu podem moderar
    if (item.organizationId && item.organizationId !== user.organizationId) {
      return c.json({ error: "Você não tem permissão para moderar este item" }, 403);
    }

    if (action === "approve") {
      const [updated] = await db
        .update(autocompleteCatalog)
        .set({ isApproved: true, updatedAt: new Date() })
        .where(eq(autocompleteCatalog.id, id))
        .returning();

      return c.json({ data: updated });
    } else if (action === "reject") {
      await db.delete(autocompleteCatalog).where(eq(autocompleteCatalog.id, id));
      return c.json({ success: true, message: "Sugestão rejeitada e removida" });
    } else {
      return c.json({ error: "Ação inválida. Use 'approve' ou 'reject'" }, 400);
    }
  } catch (error) {
    console.error("[Autocomplete Moderate Error]", error);
    return c.json({ error: "Erro ao moderar sugestão" }, 500);
  }
});

export { app as autocompleteRoutes };
