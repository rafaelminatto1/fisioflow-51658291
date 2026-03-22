import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeMedicalTemplate(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ''),
    nome: String(row.nome ?? ''),
    descricao: row.descricao == null ? '' : String(row.descricao),
    tipo_relatorio: String(row.tipo_relatorio ?? 'inicial'),
    campos: asArray(row.campos).map(String),
    organization_id: row.organization_id == null ? null : String(row.organization_id),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeMedicalReport(row: Record<string, unknown>) {
  const payload = asObject(row.payload);
  return {
    id: String(row.id ?? ''),
    ...payload,
    patientId:
      typeof payload.patientId === 'string'
        ? payload.patientId
        : (row.patient_id == null ? undefined : String(row.patient_id)),
    tipo_relatorio:
      typeof payload.tipo_relatorio === 'string'
        ? payload.tipo_relatorio
        : String(row.report_type ?? 'inicial'),
    data_emissao:
      typeof payload.data_emissao === 'string'
        ? payload.data_emissao
        : String(row.data_emissao ?? new Date().toISOString()),
  };
}

function normalizeConvenioReport(row: Record<string, unknown>) {
  const payload = asObject(row.payload);
  return {
    id: String(row.id ?? ''),
    ...payload,
    data_emissao:
      typeof payload.data_emissao === 'string'
        ? payload.data_emissao
        : String(row.data_emissao ?? new Date().toISOString()),
  };
}

app.get('/medical-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'medical_report_templates'))) return c.json({ data: [] });

  const result = await pool.query(
    `
      SELECT *
      FROM medical_report_templates
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeMedicalTemplate(row as Record<string, unknown>)) });
});

app.post('/medical-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'medical_report_templates'))) {
    return c.json({ error: 'Tabela medical_report_templates indisponível' }, 501);
  }

  const body = (await c.req.json()) as Record<string, unknown>;
  const nome = String(body.nome ?? '').trim();
  if (!nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `
      INSERT INTO medical_report_templates (
        organization_id, nome, descricao, tipo_relatorio, campos, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      nome,
      body.descricao ? String(body.descricao) : null,
      String(body.tipo_relatorio ?? 'inicial'),
      JSON.stringify(asArray(body.campos).map(String)),
      user.uid,
    ],
  );

  return c.json({ data: normalizeMedicalTemplate(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/medical-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  if (!(await hasTable(pool, 'medical_report_templates'))) {
    return c.json({ error: 'Tabela medical_report_templates indisponível' }, 501);
  }

  const result = await pool.query(
    `
      UPDATE medical_report_templates
      SET
        nome = COALESCE($3, nome),
        descricao = COALESCE($4, descricao),
        tipo_relatorio = COALESCE($5, tipo_relatorio),
        campos = COALESCE($6, campos),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      body.nome ? String(body.nome) : null,
      body.descricao !== undefined ? String(body.descricao ?? '') : null,
      body.tipo_relatorio ? String(body.tipo_relatorio) : null,
      body.campos !== undefined ? JSON.stringify(asArray(body.campos).map(String)) : null,
    ],
  );

  if (!result.rows.length) return c.json({ error: 'Modelo não encontrado' }, 404);
  return c.json({ data: normalizeMedicalTemplate(result.rows[0] as Record<string, unknown>) });
});

app.delete('/medical-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  if (!(await hasTable(pool, 'medical_report_templates'))) return c.json({ ok: true });

  await pool.query(
    'DELETE FROM medical_report_templates WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  return c.json({ ok: true });
});

app.get('/medical', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'medical_reports'))) return c.json({ data: [] });

  const result = await pool.query(
    `
      SELECT *
      FROM medical_reports
      WHERE organization_id = $1
      ORDER BY data_emissao DESC, created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeMedicalReport(row as Record<string, unknown>)) });
});

app.post('/medical', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'medical_reports'))) {
    return c.json({ error: 'Tabela medical_reports indisponível' }, 501);
  }

  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `
      INSERT INTO medical_reports (
        organization_id, patient_id, report_type, data_emissao, payload, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      body.patientId ? String(body.patientId) : null,
      String(body.tipo_relatorio ?? 'inicial'),
      body.data_emissao ? String(body.data_emissao) : new Date().toISOString(),
      JSON.stringify(body),
      user.uid,
    ],
  );

  return c.json({ data: normalizeMedicalReport(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/medical/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  if (!(await hasTable(pool, 'medical_reports'))) {
    return c.json({ error: 'Tabela medical_reports indisponível' }, 501);
  }

  const body = (await c.req.json()) as Record<string, unknown>;
  const result = await pool.query(
    `
      UPDATE medical_reports
      SET
        patient_id = $3,
        report_type = $4,
        data_emissao = $5,
        payload = $6,
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      body.patientId ? String(body.patientId) : null,
      String(body.tipo_relatorio ?? 'inicial'),
      body.data_emissao ? String(body.data_emissao) : new Date().toISOString(),
      JSON.stringify(body),
    ],
  );

  if (!result.rows.length) return c.json({ error: 'Relatório não encontrado' }, 404);
  return c.json({ data: normalizeMedicalReport(result.rows[0] as Record<string, unknown>) });
});

app.delete('/medical/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  if (!(await hasTable(pool, 'medical_reports'))) return c.json({ ok: true });

  await pool.query('DELETE FROM medical_reports WHERE id = $1 AND organization_id = $2', [id, user.organizationId]);
  return c.json({ ok: true });
});

app.get('/convenio', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'convenio_reports'))) return c.json({ data: [] });

  const result = await pool.query(
    `
      SELECT *
      FROM convenio_reports
      WHERE organization_id = $1
      ORDER BY data_emissao DESC, created_at DESC
    `,
    [user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeConvenioReport(row as Record<string, unknown>)) });
});

app.post('/convenio', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'convenio_reports'))) {
    return c.json({ error: 'Tabela convenio_reports indisponível' }, 501);
  }

  const body = (await c.req.json()) as Record<string, unknown>;
  const paciente = asObject(body.paciente);
  const convenio = asObject(body.convenio);
  const result = await pool.query(
    `
      INSERT INTO convenio_reports (
        organization_id, patient_id, convenio_id, data_emissao, payload, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      body.patientId ? String(body.patientId) : null,
      typeof convenio.id === 'string' ? convenio.id : null,
      body.data_emissao ? String(body.data_emissao) : new Date().toISOString(),
      JSON.stringify({ ...body, patientId: body.patientId ?? paciente.id ?? null }),
      user.uid,
    ],
  );

  return c.json({ data: normalizeConvenioReport(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/convenio/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  if (!(await hasTable(pool, 'convenio_reports'))) {
    return c.json({ error: 'Tabela convenio_reports indisponível' }, 501);
  }

  const body = (await c.req.json()) as Record<string, unknown>;
  const paciente = asObject(body.paciente);
  const convenio = asObject(body.convenio);
  const result = await pool.query(
    `
      UPDATE convenio_reports
      SET
        patient_id = $3,
        convenio_id = $4,
        data_emissao = $5,
        payload = $6,
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      body.patientId ? String(body.patientId) : (typeof paciente.id === 'string' ? paciente.id : null),
      typeof convenio.id === 'string' ? convenio.id : null,
      body.data_emissao ? String(body.data_emissao) : new Date().toISOString(),
      JSON.stringify({ ...body, patientId: body.patientId ?? paciente.id ?? null }),
    ],
  );

  if (!result.rows.length) return c.json({ error: 'Relatório não encontrado' }, 404);
  return c.json({ data: normalizeConvenioReport(result.rows[0] as Record<string, unknown>) });
});

app.delete('/convenio/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  if (!(await hasTable(pool, 'convenio_reports'))) return c.json({ ok: true });

  await pool.query('DELETE FROM convenio_reports WHERE id = $1 AND organization_id = $2', [id, user.organizationId]);
  return c.json({ ok: true });
});

export { app as reportsRoutes };
