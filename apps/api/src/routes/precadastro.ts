import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

function normalizeFields(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

type NormalizedToken = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  token?: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  required_fields: string[];
  optional_fields: string[];
  ui_style: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

function normalizeToken(row: Record<string, unknown>): NormalizedToken {
  return {
    id: String(row.id ?? ""),
    organization_id: String(row.organization_id ?? ""),
    name: String(row.name ?? row.nome ?? ""),
    description:
      (row.description ?? row.descricao) == null ? null : String(row.description ?? row.descricao),
    token: row.token == null ? undefined : String(row.token),
    is_active: (row.is_active ?? row.ativo) !== false,
    max_uses: (row.max_uses ?? row.max_usos) == null ? null : Number(row.max_uses ?? row.max_usos),
    current_uses: Number(row.current_uses ?? row.usos_atuais ?? 0),
    expires_at: row.expires_at == null ? null : String(row.expires_at),
    required_fields: normalizeFields(row.required_fields ?? row.campos_obrigatorios, [
      "name",
      "email",
    ]),
    optional_fields: normalizeFields(row.optional_fields ?? row.campos_opcionais, ["phone"]),
    ui_style: (typeof row.ui_style === "string" ? JSON.parse(row.ui_style) : row.ui_style) || {},
    created_at: row.created_at == null ? undefined : String(row.created_at),
    updated_at: row.updated_at == null ? undefined : String(row.updated_at),
  };
}

function normalizePrecadastro(row: Record<string, unknown>) {
  const additionalData =
    (row.additional_data ?? row.dados_adicionais) &&
    typeof (row.additional_data ?? row.dados_adicionais) === "string"
      ? JSON.parse(String(row.additional_data ?? row.dados_adicionais))
      : (row.additional_data ?? row.dados_adicionais);

  const typed = (
    additionalData && typeof additionalData === "object" ? additionalData : {}
  ) as Record<string, unknown>;

  return {
    ...row,
    additional_data: typed,
    cpf: typeof typed.cpf === "string" ? typed.cpf : undefined,
    health_insurance:
      typeof (typed.health_insurance ?? typed.convenio) === "string"
        ? (typed.health_insurance ?? typed.convenio)
        : undefined,
    main_complaint:
      typeof (typed.main_complaint ?? typed.queixa_principal) === "string"
        ? (typed.main_complaint ?? typed.queixa_principal)
        : undefined,
  };
}

app.get("/public/:token", async (c) => {
  const pool = await createPool(c.env);
  const { token } = c.req.param();

  if (!(await hasTable(pool, "pre_registration_tokens"))) {
    return c.json({ error: "Pré-cadastro não disponível" }, 501);
  }

  const result = await pool.query(
    `
      SELECT id, organization_id, name, description, is_active, max_uses, current_uses, expires_at,
             required_fields, optional_fields, ui_style, created_at, updated_at
      FROM pre_registration_tokens
      WHERE token = $1 AND is_active = true
      LIMIT 1
    `,
    [token],
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: "Link expirado ou inválido" }, 404);

  const normalized = normalizeToken(row);
  if (normalized.max_uses != null && normalized.current_uses >= normalized.max_uses) {
    return c.json({ error: "Este link atingiu o limite máximo de usos" }, 400);
  }

  if (normalized.expires_at && new Date(String(normalized.expires_at)) < new Date()) {
    return c.json({ error: "Este link expirou" }, 400);
  }

  return c.json({ data: normalized });
});

app.post("/public/:token/submissions", async (c) => {
  const pool = await createPool(c.env);
  const { token } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (
    !(await hasTable(pool, "pre_registration_tokens")) ||
    !(await hasTable(pool, "pre_registrations"))
  ) {
    return c.json({ error: "Pré-cadastro não disponível" }, 501);
  }

  const tokenResult = await pool.query(
    `
      SELECT id, organization_id, name, description, is_active, max_uses, current_uses, expires_at,
             required_fields, optional_fields, ui_style, created_at, updated_at
      FROM pre_registration_tokens
      WHERE token = $1 AND is_active = true
      LIMIT 1
    `,
    [token],
  );

  const tokenRow = tokenResult.rows[0] as Record<string, unknown> | undefined;
  if (!tokenRow) return c.json({ error: "Link expirado ou inválido" }, 404);

  const normalizedToken = normalizeToken(tokenRow);
  if (
    normalizedToken.max_uses != null &&
    normalizedToken.current_uses >= normalizedToken.max_uses
  ) {
    return c.json({ error: "Este link atingiu o limite máximo de usos" }, 400);
  }

  if (normalizedToken.expires_at && new Date(String(normalizedToken.expires_at)) < new Date()) {
    return c.json({ error: "Este link expirou" }, 400);
  }

  const requiredFields = normalizedToken.required_fields ?? ["name", "email"];
  for (const field of requiredFields) {
    const value = body[field] ?? body[field === "name" ? "nome" : field];
    if (value == null || String(value).trim() === "") {
      return c.json({ error: `O campo ${field} é obrigatório` }, 400);
    }
  }

  const additionalData: Record<string, unknown> = {};
  if (body.cpf) additionalData.cpf = body.cpf;
  if (body.health_insurance ?? body.convenio)
    additionalData.health_insurance = body.health_insurance ?? body.convenio;
  if (body.main_complaint ?? body.queixa_principal)
    additionalData.main_complaint = body.main_complaint ?? body.queixa_principal;

  await pool.query("BEGIN");
  try {
    const insertResult = await pool.query(
      `
        INSERT INTO pre_registrations (
          token_id, organization_id, name, email, phone, birth_date, address,
          notes, status, additional_data, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendente',$9,NOW(),NOW())
        RETURNING *
      `,
      [
        normalizedToken.id,
        normalizedToken.organization_id,
        String(body.name ?? body.nome ?? ""),
        body.email ? String(body.email) : null,
        (body.phone ?? body.telefone) ? String(body.phone ?? body.telefone) : null,
        (body.birth_date ?? body.data_nascimento)
          ? String(body.birth_date ?? body.data_nascimento)
          : null,
        (body.address ?? body.endereco) ? String(body.address ?? body.endereco) : null,
        (body.notes ?? body.observacoes) ? String(body.notes ?? body.observacoes) : null,
        Object.keys(additionalData).length > 0 ? JSON.stringify(additionalData) : null,
      ],
    );

    await pool.query(
      `
        UPDATE pre_registration_tokens
        SET current_uses = current_uses + 1, updated_at = NOW()
        WHERE id = $1
      `,
      [normalizedToken.id],
    );

    await pool.query("COMMIT");
    return c.json(
      { data: normalizePrecadastro(insertResult.rows[0] as Record<string, unknown>) },
      201,
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
});

app.get("/tokens", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "pre_registration_tokens"))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT *
      FROM pre_registration_tokens
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeToken(row as Record<string, unknown>)) });
});

app.post("/tokens", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, "pre_registration_tokens"))) {
    return c.json({ error: "Pré-cadastro não disponível" }, 501);
  }

  const name = String(body.name ?? body.nome ?? "").trim() || "Link de Pré-cadastro";
  const token = String(body.token ?? crypto.randomUUID().replace(/-/g, "").slice(0, 12));
  const requiredFields = normalizeFields(body.required_fields ?? body.campos_obrigatorios, [
    "name",
    "email",
    "phone",
  ]);
  const optionalFields = normalizeFields(body.optional_fields ?? body.campos_opcionais, []);
  const maxUses =
    (body.max_uses ?? body.max_usos) == null || (body.max_uses ?? body.max_usos) === ""
      ? null
      : Number(body.max_uses ?? body.max_usos);

  const result = await pool.query(
    `
      INSERT INTO pre_registration_tokens (
        organization_id, name, description, token, is_active, max_uses, current_uses,
        expires_at, required_fields, optional_fields, ui_style, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8::text[],$9::text[],$10,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      name,
      (body.description ?? body.descricao) ? String(body.description ?? body.descricao) : null,
      token,
      (body.is_active ?? body.ativo) !== false,
      Number.isFinite(maxUses) ? maxUses : null,
      body.expires_at ? String(body.expires_at) : null,
      requiredFields,
      optionalFields,
      body.ui_style
        ? typeof body.ui_style === "object"
          ? JSON.stringify(body.ui_style)
          : String(body.ui_style)
        : "{}",
    ],
  );

  return c.json({ data: normalizeToken(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put("/tokens/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, "pre_registration_tokens"))) {
    return c.json({ error: "Pré-cadastro não disponível" }, 501);
  }

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];

  if (body.name !== undefined || body.nome !== undefined) {
    params.push(String(body.name ?? body.nome));
    sets.push(`name = $${params.length}`);
  }
  if (body.description !== undefined || body.descricao !== undefined) {
    params.push(
      (body.description ?? body.descricao) ? String(body.description ?? body.descricao) : null,
    );
    sets.push(`description = $${params.length}`);
  }
  if (body.is_active !== undefined || body.ativo !== undefined) {
    params.push(Boolean(body.is_active ?? body.ativo));
    sets.push(`is_active = $${params.length}`);
  }
  if (body.max_uses !== undefined || body.max_usos !== undefined) {
    params.push(
      (body.max_uses ?? body.max_usos) == null || (body.max_uses ?? body.max_usos) === ""
        ? null
        : Number(body.max_uses ?? body.max_usos),
    );
    sets.push(`max_uses = $${params.length}`);
  }
  if (body.expires_at !== undefined) {
    params.push(body.expires_at ? String(body.expires_at) : null);
    sets.push(`expires_at = $${params.length}`);
  }
  if (body.required_fields !== undefined || body.campos_obrigatorios !== undefined) {
    params.push(
      normalizeFields(body.required_fields ?? body.campos_obrigatorios, ["name", "email"]),
    );
    sets.push(`required_fields = $${params.length}::text[]`);
  }
  if (body.optional_fields !== undefined || body.campos_opcionais !== undefined) {
    params.push(normalizeFields(body.optional_fields ?? body.campos_opcionais, []));
    sets.push(`optional_fields = $${params.length}::text[]`);
  }
  if (body.ui_style !== undefined) {
    params.push(
      body.ui_style
        ? typeof body.ui_style === "object"
          ? JSON.stringify(body.ui_style)
          : String(body.ui_style)
        : "{}",
    );
    sets.push(`ui_style = $${params.length}`);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE pre_registration_tokens
      SET ${sets.join(", ")}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: "Link não encontrado" }, 404);
  return c.json({ data: normalizeToken(result.rows[0] as Record<string, unknown>) });
});

app.get("/submissions", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "pre_registrations"))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT
        p.*,
        t.name AS token_name
      FROM pre_registrations p
      LEFT JOIN pre_registration_tokens t ON t.id = p.token_id
      WHERE p.organization_id = $1
      ORDER BY p.created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({
    data: result.rows.map((row) => normalizePrecadastro(row as Record<string, unknown>)),
  });
});

app.put("/submissions/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, "pre_registrations"))) {
    return c.json({ error: "Pré-cadastro não disponível" }, 501);
  }

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];

  if (body.status !== undefined) {
    params.push(String(body.status));
    sets.push(`status = $${params.length}`);
  }
  if (body.converted_at !== undefined) {
    params.push(body.converted_at ? String(body.converted_at) : null);
    sets.push(`converted_at = $${params.length}`);
  }
  if (body.patient_id !== undefined) {
    params.push(body.patient_id ? String(body.patient_id) : null);
    sets.push(`patient_id = $${params.length}`);
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE pre_registrations
      SET ${sets.join(", ")}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: "Pré-cadastro não encontrado" }, 404);
  return c.json({ data: normalizePrecadastro(result.rows[0] as Record<string, unknown>) });
});

export const precadastroRoutes = app;
