import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasColumn(
  pool: ReturnType<typeof createPool>,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [table, column],
  );
  return result.rows.length > 0;
}

function normalizeGender(value: unknown): 'M' | 'F' | 'O' | null {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'm' || raw === 'masculino' || raw === 'male') return 'M';
  if (raw === 'f' || raw === 'feminino' || raw === 'female') return 'F';
  if (raw === 'o' || raw === 'outro' || raw === 'other' || raw === 'nao_informado') return 'O';
  return null;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizePatientRow(row: Record<string, unknown>) {
  const address = asRecord(row.address);
  const emergencyContact = asRecord(row.emergency_contact);
  const insurance = asRecord(row.insurance);

  return {
    ...row,
    name: row.name ?? row.full_name ?? null,
    full_name: row.full_name ?? row.name ?? null,
    address: address?.street ?? null,
    city: address?.city ?? null,
    state: address?.state ?? null,
    zip_code: address?.cep ?? null,
    emergency_contact: emergencyContact?.name ?? null,
    emergency_phone: emergencyContact?.phone ?? null,
    emergency_contact_relationship: emergencyContact?.relationship ?? null,
    health_insurance: insurance?.plan ?? insurance?.provider ?? null,
    insurance_number: insurance?.cardNumber ?? null,
    observations: row.notes ?? null,
    profession: row.profession ?? null,
  };
}

function mapMedicalRecordRow(row: Record<string, unknown>) {
  const medications = Array.isArray(row.medications)
    ? row.medications
        .map((entry) => {
          if (typeof entry === 'string') return entry.trim();
          if (entry && typeof entry === 'object' && 'name' in entry) {
            const name = (entry as { name?: unknown }).name;
            return typeof name === 'string' ? name.trim() : '';
          }
          return '';
        })
        .filter(Boolean)
    : [];

  const allergies = Array.isArray(row.allergies)
    ? row.allergies
        .map((entry) => {
          if (typeof entry === 'string') return entry.trim();
          if (entry && typeof entry === 'object' && 'allergen' in entry) {
            const allergen = (entry as { allergen?: unknown }).allergen;
            return typeof allergen === 'string' ? allergen.trim() : '';
          }
          return '';
        })
        .filter(Boolean)
    : [];

  return {
    id: row.id,
    patient_id: row.patient_id,
    chief_complaint: row.chief_complaint ?? null,
    medical_history: row.past_history ?? null,
    current_medications: medications.join(', '),
    allergies: allergies.join(', '),
    previous_surgeries: row.previous_surgeries ?? null,
    family_history: row.family_history ?? null,
    lifestyle_habits: row.physical_activity ?? null,
    record_date:
      row.record_date ??
      row.updated_at ??
      row.created_at ??
      new Date().toISOString().slice(0, 10),
    created_by: row.created_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function mapPhysicalExaminationRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    patient_id: row.patient_id,
    record_date: row.record_date ?? row.updated_at ?? row.created_at ?? new Date().toISOString().slice(0, 10),
    created_by: row.created_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    vital_signs: row.vital_signs ?? {},
    general_appearance: row.general_appearance ?? null,
    heent: row.heent ?? null,
    cardiovascular: row.cardiovascular ?? null,
    respiratory: row.respiratory ?? null,
    gastrointestinal: row.gastrointestinal ?? null,
    musculoskeletal: row.musculoskeletal ?? null,
    neurological: row.neurological ?? null,
    integumentary: row.integumentary ?? null,
    psychological: row.psychological ?? null,
  };
}

function mapTreatmentPlanRow(row: Record<string, unknown>) {
  const asList = (value: unknown) => (Array.isArray(value) ? value : []);

  return {
    id: row.id,
    patient_id: row.patient_id,
    record_date: row.record_date ?? row.updated_at ?? row.created_at ?? new Date().toISOString().slice(0, 10),
    created_by: row.created_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    diagnosis: asList(row.diagnosis),
    objectives: asList(row.objectives),
    procedures: asList(row.procedures),
    exercises: asList(row.exercises),
    recommendations: asList(row.recommendations),
    follow_up_date: row.follow_up_date ?? null,
  };
}

function mapMedicalAttachmentRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    record_id: row.record_id ?? null,
    patient_id: row.patient_id,
    file_name: row.file_name,
    file_url: row.file_url,
    file_type: row.file_type,
    file_size: row.file_size ?? null,
    uploaded_at: row.uploaded_at ?? row.created_at ?? null,
    uploaded_by: row.uploaded_by ?? null,
    category: row.category ?? 'other',
    description: row.description ?? null,
  };
}

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const {
    status,
    search,
    createdFrom,
    createdTo,
    incompleteRegistration,
    sortBy,
    limit = '50',
    offset = '0',
  } = c.req.query();
  const limitNum = Math.min(1000, Math.max(1, Number.parseInt(limit, 10) || 50));
  const offsetNum = Math.max(0, Number.parseInt(offset, 10) || 0);

  const hasIncompleteRegistration = await hasColumn(pool, 'patients', 'incomplete_registration');
  const hasProfession = await hasColumn(pool, 'patients', 'profession');
  const hasAddress = await hasColumn(pool, 'patients', 'address');
  const hasEmergencyContact = await hasColumn(pool, 'patients', 'emergency_contact');
  const hasInsurance = await hasColumn(pool, 'patients', 'insurance');
  const hasNotes = await hasColumn(pool, 'patients', 'notes');

  const params: Array<string | number | boolean> = [user.organizationId];
  let where = 'WHERE organization_id = $1 AND is_active = true';

  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (full_name ILIKE $${params.length} OR cpf ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  if (createdFrom) {
    params.push(createdFrom);
    where += ` AND created_at >= $${params.length}`;
  }

  if (createdTo) {
    params.push(createdTo);
    where += ` AND created_at <= $${params.length}`;
  }

  if (incompleteRegistration !== undefined) {
    const shouldBeIncomplete = incompleteRegistration === 'true' || incompleteRegistration === '1';
    if (hasIncompleteRegistration) {
      params.push(shouldBeIncomplete);
      where += ` AND incomplete_registration = $${params.length}`;
    } else if (shouldBeIncomplete) {
      where += ' AND 1 = 0';
    }
  }

  const orderByClause =
    sortBy === 'created_at_desc'
      ? 'created_at DESC'
      : sortBy === 'created_at_asc'
        ? 'created_at ASC'
        : 'full_name ASC';

  const incompleteSelect = hasIncompleteRegistration
    ? 'COALESCE(incomplete_registration, false) AS incomplete_registration'
    : 'false AS incomplete_registration';

  const dataParams = [...params, limitNum, offsetNum];
  const dataQuery = `
    SELECT
      id,
      full_name AS name,
      full_name,
      cpf,
      email,
      phone,
      birth_date,
      gender,
      main_condition,
      ${hasProfession ? 'profession,' : 'NULL::text AS profession,'}
      ${hasAddress ? 'address,' : 'NULL::jsonb AS address,'}
      ${hasEmergencyContact ? 'emergency_contact,' : 'NULL::jsonb AS emergency_contact,'}
      ${hasInsurance ? 'insurance,' : 'NULL::jsonb AS insurance,'}
      ${hasNotes ? 'notes,' : 'NULL::text AS notes,'}
      status,
      progress,
      ${incompleteSelect},
      is_active,
      created_at,
      updated_at
    FROM patients
    ${where}
    ORDER BY ${orderByClause}
    LIMIT $${dataParams.length - 1}
    OFFSET $${dataParams.length}
  `;

  const countQuery = `SELECT COUNT(*)::int AS total FROM patients ${where}`;
  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQuery, dataParams),
    pool.query(countQuery, params),
  ]);

  return c.json({
    data: dataRes.rows.map((row) => normalizePatientRow(row as Record<string, unknown>)),
    total: countRes.rows[0]?.total ?? 0,
    page: Math.floor(offsetNum / limitNum) + 1,
    perPage: limitNum,
  });
});

app.get('/by-profile/:profileId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { profileId } = c.req.param();

  if (!(await hasColumn(pool, 'patients', 'profile_id'))) {
    return c.json({ data: null });
  }

  const hasProfession = await hasColumn(pool, 'patients', 'profession');
  const hasAddress = await hasColumn(pool, 'patients', 'address');
  const hasEmergencyContact = await hasColumn(pool, 'patients', 'emergency_contact');
  const hasInsurance = await hasColumn(pool, 'patients', 'insurance');
  const hasNotes = await hasColumn(pool, 'patients', 'notes');

  const result = await pool.query(
    `
      SELECT
        id,
        full_name AS name,
        full_name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        ${hasProfession ? 'profession,' : 'NULL::text AS profession,'}
        ${hasAddress ? 'address,' : 'NULL::jsonb AS address,'}
        ${hasEmergencyContact ? 'emergency_contact,' : 'NULL::jsonb AS emergency_contact,'}
        ${hasInsurance ? 'insurance,' : 'NULL::jsonb AS insurance,'}
        ${hasNotes ? 'notes,' : 'NULL::text AS notes,'}
        status,
        progress,
        is_active,
        created_at,
        updated_at
      FROM patients
      WHERE profile_id = $1 AND organization_id = $2
      LIMIT 1
    `,
    [profileId, user.organizationId],
  );

  return c.json({
    data: result.rows[0] ? normalizePatientRow(result.rows[0] as Record<string, unknown>) : null,
  });
});

app.get('/:id/surgeries', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        s.id,
        s.name,
        s.surgery_date,
        s.surgeon,
        s.hospital,
        s.post_op_protocol,
        ${await hasColumn(pool, 'surgeries', 'affected_side') ? 's.affected_side,' : 'NULL::text AS affected_side,'}
        ${await hasColumn(pool, 'surgeries', 'complications') ? 's.complications,' : 'NULL::text AS complications,'}
        s.notes,
        s.created_at,
        s.updated_at
        , p.id AS patient_id
      FROM surgeries s
      JOIN medical_records mr ON mr.id = s.medical_record_id
      JOIN patients p ON p.id = mr.patient_id
      WHERE p.id = $1 AND p.organization_id = $2
      ORDER BY s.surgery_date DESC NULLS LAST, s.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/:id/surgeries', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const name = String(body.surgery_name ?? body.name ?? '').trim();

  if (!name) return c.json({ error: 'surgery_name é obrigatório' }, 400);

  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [patientId, user.organizationId],
  );
  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);

  let medicalRecordId: string;
  const medicalRecordRes = await pool.query(
    'SELECT id FROM medical_records WHERE patient_id = $1 LIMIT 1',
    [patientId],
  );
  if (medicalRecordRes.rows.length) {
    medicalRecordId = String(medicalRecordRes.rows[0].id);
  } else {
    const createdMedicalRecord = await pool.query(
      `
        INSERT INTO medical_records (patient_id, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id
      `,
      [patientId],
    );
    medicalRecordId = String(createdMedicalRecord.rows[0].id);
  }

  const hasAffectedSide = await hasColumn(pool, 'surgeries', 'affected_side');
  const hasComplications = await hasColumn(pool, 'surgeries', 'complications');
  const insertColumns = [
    'medical_record_id',
    'name',
    'surgery_date',
    'surgeon',
    'hospital',
    'post_op_protocol',
    'notes',
    'created_at',
    'updated_at',
  ];
  const values: Array<unknown> = [
    medicalRecordId,
    name,
    body.surgery_date ?? null,
    body.surgeon_name ?? null,
    body.hospital ?? null,
    body.surgery_type ?? null,
    body.notes ?? null,
    new Date().toISOString(),
    new Date().toISOString(),
  ];

  if (hasAffectedSide) {
    insertColumns.splice(6, 0, 'affected_side');
    values.splice(6, 0, body.affected_side ?? null);
  }
  if (hasComplications) {
    const index = hasAffectedSide ? 7 : 6;
    insertColumns.splice(index, 0, 'complications');
    values.splice(index, 0, body.complications ?? null);
  }

  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `INSERT INTO surgeries (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  );

  return c.json({ data: { ...result.rows[0], patient_id: patientId } });
});

app.put('/:id/surgeries/:surgeryId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, surgeryId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const hasAffectedSide = await hasColumn(pool, 'surgeries', 'affected_side');
  const hasComplications = await hasColumn(pool, 'surgeries', 'complications');

  const updates: string[] = [];
  const values: Array<unknown> = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (body.surgery_name !== undefined) assign('name', body.surgery_name);
  if (body.surgery_date !== undefined) assign('surgery_date', body.surgery_date);
  if (body.surgeon_name !== undefined) assign('surgeon', body.surgeon_name);
  if (body.hospital !== undefined) assign('hospital', body.hospital);
  if (body.surgery_type !== undefined) assign('post_op_protocol', body.surgery_type);
  if (body.notes !== undefined) assign('notes', body.notes);
  if (hasAffectedSide && body.affected_side !== undefined) assign('affected_side', body.affected_side);
  if (hasComplications && body.complications !== undefined) assign('complications', body.complications);
  assign('updated_at', new Date().toISOString());

  if (updates.length === 1) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

  values.push(surgeryId, patientId, user.organizationId);
  const result = await pool.query(
    `
      UPDATE surgeries s
      SET ${updates.join(', ')}
      FROM medical_records mr, patients p
      WHERE s.id = $${values.length - 2}
        AND mr.id = s.medical_record_id
        AND p.id = mr.patient_id
        AND p.id = $${values.length - 1}
        AND p.organization_id = $${values.length}
      RETURNING s.*, p.id AS patient_id
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Cirurgia não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id/surgeries/:surgeryId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, surgeryId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM surgeries s
      USING medical_records mr, patients p
      WHERE s.id = $1
        AND mr.id = s.medical_record_id
        AND p.id = mr.patient_id
        AND p.id = $2
        AND p.organization_id = $3
      RETURNING s.id
    `,
    [surgeryId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Cirurgia não encontrada' }, 404);
  return c.json({ ok: true });
});

app.get('/:id/pathologies', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        pth.id,
        pth.name,
        pth.icd_code,
        pth.status,
        pth.diagnosed_at,
        pth.treated_at,
        ${await hasColumn(pool, 'pathologies', 'severity') ? 'pth.severity,' : 'NULL::text AS severity,'}
        ${await hasColumn(pool, 'pathologies', 'affected_region') ? 'pth.affected_region,' : 'NULL::text AS affected_region,'}
        pth.notes,
        pth.created_at,
        pth.updated_at
        , p.id AS patient_id
      FROM pathologies pth
      JOIN medical_records mr ON mr.id = pth.medical_record_id
      JOIN patients p ON p.id = mr.patient_id
      WHERE p.id = $1 AND p.organization_id = $2
      ORDER BY pth.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/:id/pathologies', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const name = String(body.pathology_name ?? body.name ?? '').trim();

  if (!name) return c.json({ error: 'pathology_name é obrigatório' }, 400);

  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [patientId, user.organizationId],
  );
  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);

  let medicalRecordId: string | null = null;
  const medicalRecordRes = await pool.query(
    'SELECT id FROM medical_records WHERE patient_id = $1 LIMIT 1',
    [patientId],
  );
  if (medicalRecordRes.rows.length) {
    medicalRecordId = String(medicalRecordRes.rows[0].id);
  } else {
    const createdMedicalRecord = await pool.query(
      `
        INSERT INTO medical_records (patient_id, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id
      `,
      [patientId],
    );
    medicalRecordId = String(createdMedicalRecord.rows[0].id);
  }

  const hasSeverity = await hasColumn(pool, 'pathologies', 'severity');
  const hasAffectedRegion = await hasColumn(pool, 'pathologies', 'affected_region');
  const insertColumns = [
    'medical_record_id',
    'name',
    'icd_code',
    'status',
    'diagnosed_at',
    'treated_at',
    'notes',
    'created_at',
    'updated_at',
  ];
  const values: Array<unknown> = [
    medicalRecordId,
    name,
    body.cid_code ?? null,
    body.status === 'em_tratamento' ? 'active' : body.status === 'tratada' ? 'treated' : body.status ?? 'active',
    body.diagnosis_date ?? null,
    body.status === 'tratada' ? new Date().toISOString() : null,
    body.notes ?? null,
    new Date().toISOString(),
    new Date().toISOString(),
  ];

  if (hasSeverity) {
    insertColumns.splice(6, 0, 'severity');
    values.splice(6, 0, body.severity ?? null);
  }
  if (hasAffectedRegion) {
    const index = hasSeverity ? 7 : 6;
    insertColumns.splice(index, 0, 'affected_region');
    values.splice(index, 0, body.affected_region ?? null);
  }

  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `
      INSERT INTO pathologies (${insertColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `,
    values,
  );

  return c.json({
    data: {
      ...result.rows[0],
      patient_id: patientId,
    },
  });
});

app.put('/:id/pathologies/:pathologyId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, pathologyId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const hasSeverity = await hasColumn(pool, 'pathologies', 'severity');
  const hasAffectedRegion = await hasColumn(pool, 'pathologies', 'affected_region');

  const updates: string[] = [];
  const values: Array<unknown> = [];

  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (body.pathology_name !== undefined) assign('name', body.pathology_name);
  if (body.cid_code !== undefined) assign('icd_code', body.cid_code);
  if (body.status !== undefined) {
    const normalizedStatus =
      body.status === 'em_tratamento' ? 'active' : body.status === 'tratada' ? 'treated' : body.status;
    assign('status', normalizedStatus);
    if (normalizedStatus === 'treated') {
      assign('treated_at', body.treated_at ?? new Date().toISOString());
    }
  }
  if (body.diagnosis_date !== undefined) assign('diagnosed_at', body.diagnosis_date);
  if (body.notes !== undefined) assign('notes', body.notes);
  if (hasSeverity && body.severity !== undefined) assign('severity', body.severity);
  if (hasAffectedRegion && body.affected_region !== undefined) assign('affected_region', body.affected_region);
  assign('updated_at', new Date().toISOString());

  if (updates.length === 1) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

  values.push(pathologyId, patientId, user.organizationId);
  const result = await pool.query(
    `
      UPDATE pathologies pth
      SET ${updates.join(', ')}
      FROM medical_records mr, patients p
      WHERE pth.id = $${values.length - 2}
        AND mr.id = pth.medical_record_id
        AND p.id = mr.patient_id
        AND p.id = $${values.length - 1}
        AND p.organization_id = $${values.length}
      RETURNING pth.*, p.id AS patient_id
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Patologia não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id/pathologies/:pathologyId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, pathologyId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM pathologies pth
      USING medical_records mr, patients p
      WHERE pth.id = $1
        AND mr.id = pth.medical_record_id
        AND p.id = mr.patient_id
        AND p.id = $2
        AND p.organization_id = $3
      RETURNING pth.id
    `,
    [pathologyId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Patologia não encontrada' }, 404);
  return c.json({ ok: true });
});

app.get('/:id/medical-returns', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT
        id,
        patient_id,
        doctor_name,
        doctor_phone,
        return_date,
        return_period,
        notes,
        report_done,
        report_sent,
        created_at,
        updated_at
      FROM patient_medical_returns
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY return_date DESC NULLS LAST, created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows });
});

app.post('/:id/medical-returns', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `
      INSERT INTO patient_medical_returns (
        patient_id,
        organization_id,
        doctor_name,
        doctor_phone,
        return_date,
        return_period,
        notes,
        report_done,
        report_sent,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `,
    [
      patientId,
      user.organizationId,
      body.doctor_name ?? null,
      body.doctor_phone ?? null,
      body.return_date ?? null,
      body.return_period ?? null,
      body.notes ?? null,
      Boolean(body.report_done),
      Boolean(body.report_sent),
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.put('/:id/medical-returns/:medicalReturnId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, medicalReturnId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const updates: string[] = [];
  const values: Array<unknown> = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (body.doctor_name !== undefined) assign('doctor_name', body.doctor_name);
  if (body.doctor_phone !== undefined) assign('doctor_phone', body.doctor_phone);
  if (body.return_date !== undefined) assign('return_date', body.return_date);
  if (body.return_period !== undefined) assign('return_period', body.return_period);
  if (body.notes !== undefined) assign('notes', body.notes);
  if (body.report_done !== undefined) assign('report_done', Boolean(body.report_done));
  if (body.report_sent !== undefined) assign('report_sent', Boolean(body.report_sent));
  assign('updated_at', new Date().toISOString());

  if (updates.length === 1) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

  values.push(medicalReturnId, patientId, user.organizationId);
  const result = await pool.query(
    `
      UPDATE patient_medical_returns
      SET ${updates.join(', ')}
      WHERE id = $${values.length - 2}
        AND patient_id = $${values.length - 1}
        AND organization_id = $${values.length}
      RETURNING *
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Retorno médico não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id/medical-returns/:medicalReturnId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, medicalReturnId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM patient_medical_returns
      WHERE id = $1 AND patient_id = $2 AND organization_id = $3
      RETURNING id
    `,
    [medicalReturnId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Retorno médico não encontrado' }, 404);
  return c.json({ ok: true });
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const hasProfession = await hasColumn(pool, 'patients', 'profession');
  const hasAddress = await hasColumn(pool, 'patients', 'address');
  const hasEmergencyContact = await hasColumn(pool, 'patients', 'emergency_contact');
  const hasInsurance = await hasColumn(pool, 'patients', 'insurance');
  const hasNotes = await hasColumn(pool, 'patients', 'notes');

  const result = await pool.query(
    `
      SELECT
        id,
        full_name AS name,
        full_name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        ${hasProfession ? 'profession,' : 'NULL::text AS profession,'}
        ${hasAddress ? 'address,' : 'NULL::jsonb AS address,'}
        ${hasEmergencyContact ? 'emergency_contact,' : 'NULL::jsonb AS emergency_contact,'}
        ${hasInsurance ? 'insurance,' : 'NULL::jsonb AS insurance,'}
        ${hasNotes ? 'notes,' : 'NULL::text AS notes,'}
        status,
        progress,
        is_active,
        created_at,
        updated_at
      FROM patients
      WHERE id = $1 AND organization_id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  return c.json({ data: normalizePatientRow(result.rows[0] as Record<string, unknown>) });
});

app.get('/:id/stats', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const [patientRes, statsRes] = await Promise.all([
    pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1', [id, user.organizationId]),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS total_sessions,
        COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND status IN ('scheduled', 'confirmed'))::int AS upcoming_appointments,
        MAX(date)::text AS last_visit
      FROM appointments
      WHERE patient_id = $1 AND organization_id = $2
      `,
      [id, user.organizationId],
    ),
  ]);

  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  const row = statsRes.rows[0] ?? {};
  return c.json({
    data: {
      totalSessions: row.total_sessions ?? 0,
      upcomingAppointments: row.upcoming_appointments ?? 0,
      lastVisit: row.last_visit ?? undefined,
    },
  });
});

app.get('/last-updated', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const result = await pool.query(
    'SELECT MAX(updated_at)::text AS last_updated_at FROM patients WHERE organization_id = $1',
    [user.organizationId],
  );
  return c.json({ data: { last_updated_at: result.rows[0]?.last_updated_at ?? null } });
});

app.get('/:id/medical-records', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const hasPreviousSurgeries = await hasColumn(pool, 'medical_records', 'previous_surgeries');
  const hasCreatedBy = await hasColumn(pool, 'medical_records', 'created_by');
  const hasRecordDate = await hasColumn(pool, 'medical_records', 'record_date');

  const result = await pool.query(
    `
      SELECT
        mr.id,
        mr.patient_id,
        mr.chief_complaint,
        mr.past_history,
        mr.family_history,
        mr.medications,
        mr.allergies,
        mr.physical_activity,
        ${hasPreviousSurgeries ? 'mr.previous_surgeries,' : 'NULL::text AS previous_surgeries,'}
        ${hasCreatedBy ? 'mr.created_by,' : 'NULL::text AS created_by,'}
        ${hasRecordDate ? 'mr.record_date::text,' : 'NULL::text AS record_date,'}
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      WHERE mr.patient_id = $1 AND p.organization_id = $2
      ORDER BY mr.updated_at DESC, mr.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows.map(mapMedicalRecordRow) });
});

app.post('/:id/medical-records', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [patientId, user.organizationId],
  );
  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);

  const existingRes = await pool.query(
    'SELECT id FROM medical_records WHERE patient_id = $1 LIMIT 1',
    [patientId],
  );
  if (existingRes.rows.length) return c.json({ error: 'Prontuário já existe para este paciente' }, 409);

  const hasPreviousSurgeries = await hasColumn(pool, 'medical_records', 'previous_surgeries');
  const hasCreatedBy = await hasColumn(pool, 'medical_records', 'created_by');
  const hasRecordDate = await hasColumn(pool, 'medical_records', 'record_date');

  const columns = [
    'patient_id',
    'chief_complaint',
    'past_history',
    'family_history',
    'medications',
    'allergies',
    'physical_activity',
    'created_at',
    'updated_at',
  ];
  const values: unknown[] = [
    patientId,
    body.chief_complaint ?? null,
    body.medical_history ?? null,
    body.family_history ?? null,
    JSON.stringify(parseStringList(body.current_medications).map((name) => ({ name }))),
    JSON.stringify(parseStringList(body.allergies).map((allergen) => ({ allergen }))),
    body.lifestyle_habits ?? null,
    new Date().toISOString(),
    new Date().toISOString(),
  ];

  if (hasPreviousSurgeries) {
    columns.splice(7, 0, 'previous_surgeries');
    values.splice(7, 0, body.previous_surgeries ?? null);
  }
  if (hasCreatedBy) {
    const index = hasPreviousSurgeries ? 8 : 7;
    columns.splice(index, 0, 'created_by');
    values.splice(index, 0, user.uid ?? null);
  }
  if (hasRecordDate) {
    const index = hasPreviousSurgeries && hasCreatedBy ? 9 : hasPreviousSurgeries || hasCreatedBy ? 8 : 7;
    columns.splice(index, 0, 'record_date');
    values.splice(index, 0, body.record_date ?? new Date().toISOString().slice(0, 10));
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `INSERT INTO medical_records (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  );

  return c.json({ data: mapMedicalRecordRow(result.rows[0]) }, 201);
});

app.put('/:id/medical-records/:recordId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, recordId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const hasPreviousSurgeries = await hasColumn(pool, 'medical_records', 'previous_surgeries');
  const hasRecordDate = await hasColumn(pool, 'medical_records', 'record_date');

  const updates: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (body.chief_complaint !== undefined) assign('chief_complaint', body.chief_complaint ?? null);
  if (body.medical_history !== undefined) assign('past_history', body.medical_history ?? null);
  if (body.family_history !== undefined) assign('family_history', body.family_history ?? null);
  if (body.current_medications !== undefined) {
    assign('medications', JSON.stringify(parseStringList(body.current_medications).map((name) => ({ name }))));
  }
  if (body.allergies !== undefined) {
    assign('allergies', JSON.stringify(parseStringList(body.allergies).map((allergen) => ({ allergen }))));
  }
  if (body.lifestyle_habits !== undefined) assign('physical_activity', body.lifestyle_habits ?? null);
  if (hasPreviousSurgeries && body.previous_surgeries !== undefined) {
    assign('previous_surgeries', body.previous_surgeries ?? null);
  }
  if (hasRecordDate && body.record_date !== undefined) assign('record_date', body.record_date ?? null);
  assign('updated_at', new Date().toISOString());

  if (updates.length === 1) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

  values.push(recordId, patientId, user.organizationId);
  const result = await pool.query(
    `
      UPDATE medical_records mr
      SET ${updates.join(', ')}
      FROM patients p
      WHERE mr.id = $${values.length - 2}
        AND mr.patient_id = p.id
        AND p.id = $${values.length - 1}
        AND p.organization_id = $${values.length}
      RETURNING mr.*
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Prontuário não encontrado' }, 404);
  return c.json({ data: mapMedicalRecordRow(result.rows[0]) });
});

app.delete('/:id/medical-records/:recordId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, recordId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM medical_records mr
      USING patients p
      WHERE mr.id = $1
        AND mr.patient_id = p.id
        AND p.id = $2
        AND p.organization_id = $3
      RETURNING mr.id
    `,
    [recordId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Prontuário não encontrado' }, 404);
  return c.json({ ok: true });
});

app.get('/:id/physical-examinations', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT pe.*
      FROM physical_examinations pe
      JOIN patients p ON p.id = pe.patient_id
      WHERE pe.patient_id = $1 AND p.organization_id = $2
      ORDER BY pe.record_date DESC, pe.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows.map(mapPhysicalExaminationRow) });
});

app.post('/:id/physical-examinations', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [patientId, user.organizationId],
  );
  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);

  const result = await pool.query(
    `
      INSERT INTO physical_examinations (
        organization_id, patient_id, record_date, created_by, vital_signs,
        general_appearance, heent, cardiovascular, respiratory, gastrointestinal,
        musculoskeletal, neurological, integumentary, psychological, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      patientId,
      body.record_date ?? new Date().toISOString().slice(0, 10),
      body.created_by ?? user.uid ?? null,
      JSON.stringify((body.vital_signs as Record<string, unknown> | undefined) ?? {}),
      body.general_appearance ?? null,
      body.heent ?? null,
      body.cardiovascular ?? null,
      body.respiratory ?? null,
      body.gastrointestinal ?? null,
      body.musculoskeletal ?? null,
      body.neurological ?? null,
      body.integumentary ?? null,
      body.psychological ?? null,
    ],
  );

  return c.json({ data: mapPhysicalExaminationRow(result.rows[0]) }, 201);
});

app.put('/:id/physical-examinations/:examId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, examId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const updates: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (body.record_date !== undefined) assign('record_date', body.record_date ?? null);
  if (body.created_by !== undefined) assign('created_by', body.created_by ?? null);
  if (body.vital_signs !== undefined) assign('vital_signs', JSON.stringify(body.vital_signs ?? {}));
  if (body.general_appearance !== undefined) assign('general_appearance', body.general_appearance ?? null);
  if (body.heent !== undefined) assign('heent', body.heent ?? null);
  if (body.cardiovascular !== undefined) assign('cardiovascular', body.cardiovascular ?? null);
  if (body.respiratory !== undefined) assign('respiratory', body.respiratory ?? null);
  if (body.gastrointestinal !== undefined) assign('gastrointestinal', body.gastrointestinal ?? null);
  if (body.musculoskeletal !== undefined) assign('musculoskeletal', body.musculoskeletal ?? null);
  if (body.neurological !== undefined) assign('neurological', body.neurological ?? null);
  if (body.integumentary !== undefined) assign('integumentary', body.integumentary ?? null);
  if (body.psychological !== undefined) assign('psychological', body.psychological ?? null);
  assign('updated_at', new Date().toISOString());

  values.push(examId, patientId, user.organizationId);
  const result = await pool.query(
    `
      UPDATE physical_examinations pe
      SET ${updates.join(', ')}
      FROM patients p
      WHERE pe.id = $${values.length - 2}
        AND pe.patient_id = p.id
        AND p.id = $${values.length - 1}
        AND p.organization_id = $${values.length}
      RETURNING pe.*
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Exame físico não encontrado' }, 404);
  return c.json({ data: mapPhysicalExaminationRow(result.rows[0]) });
});

app.delete('/:id/physical-examinations/:examId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, examId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM physical_examinations pe
      USING patients p
      WHERE pe.id = $1
        AND pe.patient_id = p.id
        AND p.id = $2
        AND p.organization_id = $3
      RETURNING pe.id
    `,
    [examId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Exame físico não encontrado' }, 404);
  return c.json({ ok: true });
});

app.get('/:id/treatment-plans', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();

  const result = await pool.query(
    `
      SELECT tp.*
      FROM treatment_plans tp
      JOIN patients p ON p.id = tp.patient_id
      WHERE tp.patient_id = $1 AND p.organization_id = $2
      ORDER BY tp.record_date DESC, tp.created_at DESC
    `,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows.map(mapTreatmentPlanRow) });
});

app.post('/:id/treatment-plans', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [patientId, user.organizationId],
  );
  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);

  const result = await pool.query(
    `
      INSERT INTO treatment_plans (
        organization_id, patient_id, record_date, created_by, diagnosis, objectives,
        procedures, exercises, recommendations, follow_up_date, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      patientId,
      body.record_date ?? new Date().toISOString().slice(0, 10),
      body.created_by ?? user.uid ?? null,
      JSON.stringify(Array.isArray(body.diagnosis) ? body.diagnosis : []),
      JSON.stringify(Array.isArray(body.objectives) ? body.objectives : []),
      JSON.stringify(Array.isArray(body.procedures) ? body.procedures : []),
      JSON.stringify(Array.isArray(body.exercises) ? body.exercises : []),
      JSON.stringify(Array.isArray(body.recommendations) ? body.recommendations : []),
      body.follow_up_date ?? null,
    ],
  );

  return c.json({ data: mapTreatmentPlanRow(result.rows[0]) }, 201);
});

app.put('/:id/treatment-plans/:planId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, planId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const updates: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (body.record_date !== undefined) assign('record_date', body.record_date ?? null);
  if (body.created_by !== undefined) assign('created_by', body.created_by ?? null);
  if (body.diagnosis !== undefined) assign('diagnosis', JSON.stringify(Array.isArray(body.diagnosis) ? body.diagnosis : []));
  if (body.objectives !== undefined) assign('objectives', JSON.stringify(Array.isArray(body.objectives) ? body.objectives : []));
  if (body.procedures !== undefined) assign('procedures', JSON.stringify(Array.isArray(body.procedures) ? body.procedures : []));
  if (body.exercises !== undefined) assign('exercises', JSON.stringify(Array.isArray(body.exercises) ? body.exercises : []));
  if (body.recommendations !== undefined) assign('recommendations', JSON.stringify(Array.isArray(body.recommendations) ? body.recommendations : []));
  if (body.follow_up_date !== undefined) assign('follow_up_date', body.follow_up_date ?? null);
  assign('updated_at', new Date().toISOString());

  values.push(planId, patientId, user.organizationId);
  const result = await pool.query(
    `
      UPDATE treatment_plans tp
      SET ${updates.join(', ')}
      FROM patients p
      WHERE tp.id = $${values.length - 2}
        AND tp.patient_id = p.id
        AND p.id = $${values.length - 1}
        AND p.organization_id = $${values.length}
      RETURNING tp.*
    `,
    values,
  );

  if (!result.rows.length) return c.json({ error: 'Plano de tratamento não encontrado' }, 404);
  return c.json({ data: mapTreatmentPlanRow(result.rows[0]) });
});

app.delete('/:id/treatment-plans/:planId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, planId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM treatment_plans tp
      USING patients p
      WHERE tp.id = $1
        AND tp.patient_id = p.id
        AND p.id = $2
        AND p.organization_id = $3
      RETURNING tp.id
    `,
    [planId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Plano de tratamento não encontrado' }, 404);
  return c.json({ ok: true });
});

app.get('/:id/attachments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const { recordId } = c.req.query();

  const params: unknown[] = [patientId, user.organizationId];
  let where = 'ma.patient_id = $1 AND p.organization_id = $2';
  if (recordId) {
    params.push(recordId);
    where += ` AND ma.record_id = $${params.length}`;
  }

  const result = await pool.query(
    `
      SELECT ma.*
      FROM medical_attachments ma
      JOIN patients p ON p.id = ma.patient_id
      WHERE ${where}
      ORDER BY ma.uploaded_at DESC, ma.created_at DESC
    `,
    params,
  );

  return c.json({ data: result.rows.map(mapMedicalAttachmentRow) });
});

app.post('/:id/attachments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [patientId, user.organizationId],
  );
  if (!patientRes.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);

  const result = await pool.query(
    `
      INSERT INTO medical_attachments (
        organization_id, patient_id, record_id, file_name, file_url, file_type,
        file_size, uploaded_at, uploaded_by, category, description, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      patientId,
      body.record_id ?? null,
      body.file_name,
      body.file_url,
      body.file_type,
      body.file_size ?? null,
      body.uploaded_by ?? user.uid ?? null,
      body.category ?? 'other',
      body.description ?? null,
    ],
  );

  return c.json({ data: mapMedicalAttachmentRow(result.rows[0]) }, 201);
});

app.delete('/:id/attachments/:attachmentId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id: patientId, attachmentId } = c.req.param();

  const result = await pool.query(
    `
      DELETE FROM medical_attachments ma
      USING patients p
      WHERE ma.id = $1
        AND ma.patient_id = p.id
        AND p.id = $2
        AND p.organization_id = $3
      RETURNING ma.id
    `,
    [attachmentId, patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Anexo não encontrado' }, 404);
  return c.json({ ok: true });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const name = String(body.name ?? body.full_name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  if (!name) return c.json({ error: 'Nome é obrigatório' }, 400);

  const hasProfession = await hasColumn(pool, 'patients', 'profession');
  const hasAddress = await hasColumn(pool, 'patients', 'address');
  const hasEmergencyContact = await hasColumn(pool, 'patients', 'emergency_contact');
  const hasInsurance = await hasColumn(pool, 'patients', 'insurance');
  const hasNotes = await hasColumn(pool, 'patients', 'notes');
  const hasIncompleteRegistration = await hasColumn(pool, 'patients', 'incomplete_registration');

  const columns = [
    'organization_id',
    'full_name',
    'cpf',
    'email',
    'phone',
    'birth_date',
    'gender',
    'main_condition',
    'status',
    'progress',
    'is_active',
    'created_at',
    'updated_at',
  ];
  const values: unknown[] = [
    user.organizationId,
    name,
    body.cpf ? String(body.cpf) : null,
    body.email ? String(body.email) : null,
    phone ? phone : null,
    body.birth_date ? String(body.birth_date) : null,
    normalizeGender(body.gender),
    body.main_condition ? String(body.main_condition) : null,
    body.status ? String(body.status) : 'Inicial',
    Number.isFinite(Number(body.progress)) ? Number(body.progress) : 0,
    body.is_active !== undefined ? Boolean(body.is_active) : true,
    new Date().toISOString(),
    new Date().toISOString(),
  ];

  if (hasProfession) {
    columns.splice(8, 0, 'profession');
    values.splice(8, 0, body.profession ? String(body.profession) : null);
  }

  if (hasAddress) {
    columns.splice(9, 0, 'address');
    values.splice(
      9,
      0,
      JSON.stringify({
        street: body.address ? String(body.address) : null,
        city: body.city ? String(body.city) : null,
        state: body.state ? String(body.state) : null,
        cep: body.zip_code ? String(body.zip_code) : null,
      }),
    );
  }

  if (hasEmergencyContact) {
    columns.splice(10, 0, 'emergency_contact');
    values.splice(
      10,
      0,
      JSON.stringify({
        name: body.emergency_contact ? String(body.emergency_contact) : null,
        phone: body.emergency_phone ? String(body.emergency_phone) : null,
        relationship: body.emergency_contact_relationship
          ? String(body.emergency_contact_relationship)
          : null,
      }),
    );
  }

  if (hasInsurance) {
    columns.splice(11, 0, 'insurance');
    values.splice(
      11,
      0,
      JSON.stringify({
        plan: body.insurance_plan ? String(body.insurance_plan) : body.health_insurance ? String(body.health_insurance) : null,
        provider: body.health_insurance ? String(body.health_insurance) : body.insurance_plan ? String(body.insurance_plan) : null,
        cardNumber: body.insurance_number ? String(body.insurance_number) : null,
      }),
    );
  }

  if (hasNotes) {
    columns.splice(12, 0, 'notes');
    values.splice(12, 0, body.observations ? String(body.observations) : null);
  }

  if (hasIncompleteRegistration) {
    columns.splice(15, 0, 'incomplete_registration');
    values.splice(15, 0, body.incomplete_registration !== undefined ? Boolean(body.incomplete_registration) : false);
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

  const result = await pool.query(
    `
      INSERT INTO patients (${columns.join(', ')}) VALUES (${placeholders})
      RETURNING
        id,
        full_name AS name,
        full_name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        ${hasProfession ? 'profession,' : 'NULL::text AS profession,'}
        ${hasAddress ? 'address,' : 'NULL::jsonb AS address,'}
        ${hasEmergencyContact ? 'emergency_contact,' : 'NULL::jsonb AS emergency_contact,'}
        ${hasInsurance ? 'insurance,' : 'NULL::jsonb AS insurance,'}
        ${hasNotes ? 'notes,' : 'NULL::text AS notes,'}
        status,
        progress,
        ${hasIncompleteRegistration ? 'COALESCE(incomplete_registration, false) AS incomplete_registration,' : 'false AS incomplete_registration,'}
        is_active,
        created_at,
        updated_at
    `,
    values,
  );

  return c.json({ data: normalizePatientRow(result.rows[0] as Record<string, unknown>) }, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const hasProfession = await hasColumn(pool, 'patients', 'profession');
  const hasAddress = await hasColumn(pool, 'patients', 'address');
  const hasEmergencyContact = await hasColumn(pool, 'patients', 'emergency_contact');
  const hasInsurance = await hasColumn(pool, 'patients', 'insurance');
  const hasNotes = await hasColumn(pool, 'patients', 'notes');
  const hasIncompleteRegistration = await hasColumn(pool, 'patients', 'incomplete_registration');

  const current = await pool.query(
    `
      SELECT
        id,
        full_name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        status,
        progress,
        is_active,
        ${hasProfession ? 'profession,' : 'NULL::text AS profession,'}
        ${hasAddress ? 'address,' : 'NULL::jsonb AS address,'}
        ${hasEmergencyContact ? 'emergency_contact,' : 'NULL::jsonb AS emergency_contact,'}
        ${hasInsurance ? 'insurance,' : 'NULL::jsonb AS insurance,'}
        ${hasNotes ? 'notes,' : 'NULL::text AS notes,'}
        ${hasIncompleteRegistration ? 'COALESCE(incomplete_registration, false) AS incomplete_registration' : 'false AS incomplete_registration'}
      FROM patients
      WHERE id = $1 AND organization_id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );
  if (!current.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  const p = current.rows[0] as Record<string, unknown>;

  const nameRaw = body.name ?? body.full_name;
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : String(p.full_name ?? '');
  const currentAddress = asRecord(p.address);
  const currentEmergencyContact = asRecord(p.emergency_contact);
  const currentInsurance = asRecord(p.insurance);

  const updates: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  assign('full_name', name);
  assign('cpf', body.cpf !== undefined ? (body.cpf ? String(body.cpf) : null) : p.cpf);
  assign('email', body.email !== undefined ? (body.email ? String(body.email) : null) : p.email);
  assign('phone', body.phone !== undefined ? (body.phone ? String(body.phone) : null) : p.phone);
  assign('birth_date', body.birth_date !== undefined ? (body.birth_date ? String(body.birth_date) : null) : p.birth_date);
  assign('gender', body.gender !== undefined ? normalizeGender(body.gender) : p.gender);
  assign(
    'main_condition',
    body.main_condition !== undefined ? (body.main_condition ? String(body.main_condition) : null) : p.main_condition,
  );
  assign('status', body.status !== undefined ? String(body.status) : p.status);
  assign('progress', body.progress !== undefined ? Number(body.progress) : p.progress);
  assign('is_active', body.is_active !== undefined ? Boolean(body.is_active) : p.is_active);

  if (hasProfession) {
    assign('profession', body.profession !== undefined ? (body.profession ? String(body.profession) : null) : p.profession);
  }
  if (hasAddress) {
    assign(
      'address',
      JSON.stringify({
        street: body.address !== undefined ? (body.address ? String(body.address) : null) : currentAddress?.street ?? null,
        city: body.city !== undefined ? (body.city ? String(body.city) : null) : currentAddress?.city ?? null,
        state: body.state !== undefined ? (body.state ? String(body.state) : null) : currentAddress?.state ?? null,
        cep: body.zip_code !== undefined ? (body.zip_code ? String(body.zip_code) : null) : currentAddress?.cep ?? null,
      }),
    );
  }
  if (hasEmergencyContact) {
    assign(
      'emergency_contact',
      JSON.stringify({
        name: body.emergency_contact !== undefined ? (body.emergency_contact ? String(body.emergency_contact) : null) : currentEmergencyContact?.name ?? null,
        phone: body.emergency_phone !== undefined ? (body.emergency_phone ? String(body.emergency_phone) : null) : currentEmergencyContact?.phone ?? null,
        relationship:
          body.emergency_contact_relationship !== undefined
            ? (body.emergency_contact_relationship ? String(body.emergency_contact_relationship) : null)
            : currentEmergencyContact?.relationship ?? null,
      }),
    );
  }
  if (hasInsurance) {
    assign(
      'insurance',
      JSON.stringify({
        plan:
          body.insurance_plan !== undefined
            ? (body.insurance_plan ? String(body.insurance_plan) : null)
            : body.health_insurance !== undefined
              ? (body.health_insurance ? String(body.health_insurance) : null)
              : currentInsurance?.plan ?? currentInsurance?.provider ?? null,
        provider:
          body.health_insurance !== undefined
            ? (body.health_insurance ? String(body.health_insurance) : null)
            : body.insurance_plan !== undefined
              ? (body.insurance_plan ? String(body.insurance_plan) : null)
              : currentInsurance?.provider ?? currentInsurance?.plan ?? null,
        cardNumber:
          body.insurance_number !== undefined
            ? (body.insurance_number ? String(body.insurance_number) : null)
            : currentInsurance?.cardNumber ?? null,
      }),
    );
  }
  if (hasNotes) {
    assign('notes', body.observations !== undefined ? (body.observations ? String(body.observations) : null) : p.notes);
  }
  if (hasIncompleteRegistration) {
    assign(
      'incomplete_registration',
      body.incomplete_registration !== undefined ? Boolean(body.incomplete_registration) : p.incomplete_registration,
    );
  }

  values.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE patients
      SET
        ${updates.join(', ')},
        updated_at = NOW()
      WHERE id = $${values.length - 1} AND organization_id = $${values.length}
      RETURNING
        id,
        full_name AS name,
        full_name,
        cpf,
        email,
        phone,
        birth_date,
        gender,
        main_condition,
        ${hasProfession ? 'profession,' : 'NULL::text AS profession,'}
        ${hasAddress ? 'address,' : 'NULL::jsonb AS address,'}
        ${hasEmergencyContact ? 'emergency_contact,' : 'NULL::jsonb AS emergency_contact,'}
        ${hasInsurance ? 'insurance,' : 'NULL::jsonb AS insurance,'}
        ${hasNotes ? 'notes,' : 'NULL::text AS notes,'}
        status,
        progress,
        ${hasIncompleteRegistration ? 'COALESCE(incomplete_registration, false) AS incomplete_registration,' : 'false AS incomplete_registration,'}
        is_active,
        created_at,
        updated_at
    `,
    values,
  );

  return c.json({ data: normalizePatientRow(result.rows[0] as Record<string, unknown>) });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      UPDATE patients
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
  return c.json({ success: true });
});

export { app as patientsRoutes };
