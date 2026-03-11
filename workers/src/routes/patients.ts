import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type DbPool = ReturnType<typeof createPool>;
type DbRow = Record<string, unknown>;
type PatientPayload = Record<string, unknown>;

const tableColumnsCache = new Map<string, Promise<Set<string>>>();

function cacheKey(table: string) {
  return `public.${table}`;
}

async function getTableColumns(pool: DbPool, table: string): Promise<Set<string>> {
  const key = cacheKey(table);
  const cached = tableColumnsCache.get(key);
  if (cached) return cached;

  const pending = pool
    .query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
      [table],
    )
    .then((result) => new Set(result.rows.map((row) => String((row as DbRow).column_name))));

  tableColumnsCache.set(key, pending);
  return pending;
}

async function hasColumn(pool: DbPool, table: string, column: string): Promise<boolean> {
  return (await getTableColumns(pool, table)).has(column);
}

async function hasTable(pool: DbPool, table: string): Promise<boolean> {
  return (await getTableColumns(pool, table)).size > 0;
}

function trimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function nullableString(value: unknown): string | null {
  return trimmedString(value) ?? null;
}

function nullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nao', 'não'].includes(normalized)) return false;
  }
  return null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { street: value };
    }
  }
  return null;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeGenderToDb(value: unknown): string | null {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return null;
  if (['m', 'masculino', 'male', 'homem'].includes(normalized)) return 'M';
  if (['f', 'feminino', 'female', 'mulher'].includes(normalized)) return 'F';
  if (['o', 'outro', 'other', 'nao informado', 'não informado'].includes(normalized)) return 'O';
  return normalized.toUpperCase();
}

function normalizeGenderFromDb(value: unknown): 'masculino' | 'feminino' | 'outro' | null {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return null;
  if (['m', 'masculino', 'male', 'homem'].includes(normalized)) return 'masculino';
  if (['f', 'feminino', 'female', 'mulher'].includes(normalized)) return 'feminino';
  return 'outro';
}

function normalizePatientStatus(value: unknown): string {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return 'Inicial';
  if (['active', 'ativo', 'em tratamento', 'em_tratamento', 'in_progress'].includes(normalized)) {
    return 'Em Tratamento';
  }
  if (['initial', 'inicial', 'novo', 'new'].includes(normalized)) {
    return 'Inicial';
  }
  if (['recuperacao', 'recuperação', 'recovery'].includes(normalized)) {
    return 'Recuperação';
  }
  if (['concluido', 'concluído', 'completed', 'complete'].includes(normalized)) {
    return 'Concluído';
  }
  if (['alta', 'discharged'].includes(normalized)) {
    return 'Alta';
  }
  if (['arquivado', 'archived'].includes(normalized)) {
    return 'Arquivado';
  }
  return trimmedString(value) ?? 'Inicial';
}

function deriveIsActive(body: PatientPayload): boolean {
  const explicit = nullableBoolean(body.is_active ?? body.isActive);
  if (explicit !== null) return explicit;

  const status = trimmedString(body.status)?.toLowerCase();
  if (!status) return true;
  if (['inactive', 'inativo', 'archived', 'arquivado', 'deleted', 'excluido', 'excluído'].includes(status)) {
    return false;
  }
  return true;
}

function buildAddressPayload(body: PatientPayload): Record<string, unknown> | null {
  const address = trimmedString(body.address);
  const city = trimmedString(body.city);
  const state = trimmedString(body.state);
  const zipCode = trimmedString(body.zip_code ?? body.zipCode);
  const number = trimmedString(body.address_number ?? body.number);
  const complement = trimmedString(body.address_complement ?? body.complement);
  const neighborhood = trimmedString(body.neighborhood);

  if (!address && !city && !state && !zipCode && !number && !complement && !neighborhood) {
    return null;
  }

  return {
    street: address ?? null,
    city: city ?? null,
    state: state ?? null,
    cep: zipCode ?? null,
    number: number ?? null,
    complement: complement ?? null,
    neighborhood: neighborhood ?? null,
  };
}

function buildEmergencyContactPayload(body: PatientPayload): Record<string, unknown> | null {
  const name = trimmedString(body.emergency_contact ?? body.emergencyContact);
  const phone = trimmedString(body.emergency_phone ?? body.emergencyPhone);
  const relationship = trimmedString(
    body.emergency_contact_relationship ?? body.emergencyContactRelationship,
  );

  if (!name && !phone && !relationship) return null;

  return {
    name: name ?? null,
    phone: phone ?? null,
    relationship: relationship ?? null,
  };
}

function buildInsurancePayload(body: PatientPayload): Record<string, unknown> | null {
  const provider = trimmedString(body.health_insurance ?? body.insurance_plan ?? body.insurancePlan);
  const plan = trimmedString(body.plan);
  const cardNumber = trimmedString(body.insurance_number ?? body.insuranceNumber);
  const validUntil = trimmedString(body.insurance_validity ?? body.insuranceValidity);

  if (!provider && !plan && !cardNumber && !validUntil) return null;

  return {
    provider: provider ?? null,
    plan: plan ?? null,
    cardNumber: cardNumber ?? null,
    validUntil: validUntil ?? null,
  };
}

function normalizePatientRow(row: DbRow) {
  const address = parseJsonObject(row.address);
  const emergencyContact = parseJsonObject(row.emergency_contact);
  const insurance = parseJsonObject(row.insurance);

  return {
    ...row,
    id: String(row.id),
    name: trimmedString(row.full_name) ?? trimmedString(row.name) ?? 'Sem nome',
    full_name: trimmedString(row.full_name) ?? trimmedString(row.name) ?? 'Sem nome',
    organization_id: trimmedString(row.organization_id) ?? '',
    organizationId: trimmedString(row.organization_id) ?? '',
    phone: trimmedString(row.phone) ?? null,
    phone_secondary: trimmedString(row.phone_secondary) ?? null,
    email: trimmedString(row.email) ?? null,
    cpf: trimmedString(row.cpf) ?? null,
    rg: trimmedString(row.rg) ?? null,
    birth_date: row.birth_date ? String(row.birth_date) : null,
    gender: normalizeGenderFromDb(row.gender),
    address: trimmedString(address?.street ?? row.address) ?? null,
    city: trimmedString(address?.city ?? row.city) ?? null,
    state: trimmedString(address?.state ?? row.state) ?? null,
    zip_code: trimmedString(address?.cep ?? row.zip_code) ?? null,
    emergency_contact: trimmedString(emergencyContact?.name ?? row.emergency_contact) ?? null,
    emergency_contact_relationship:
      trimmedString(emergencyContact?.relationship ?? row.emergency_contact_relationship) ?? null,
    emergency_phone: trimmedString(emergencyContact?.phone ?? row.emergency_phone) ?? null,
    health_insurance: trimmedString(insurance?.provider ?? row.health_insurance) ?? null,
    insurance_number: trimmedString(insurance?.cardNumber ?? row.insurance_number) ?? null,
    main_condition: trimmedString(row.main_condition) ?? null,
    profession: trimmedString(row.profession) ?? null,
    observations: trimmedString(row.observations ?? row.notes) ?? null,
    status: trimmedString(row.status) ?? 'Inicial',
    progress: nullableNumber(row.progress) ?? 0,
    blood_type: trimmedString(row.blood_type) ?? null,
    weight_kg: nullableNumber(row.weight_kg),
    height_cm: nullableNumber(row.height_cm),
    marital_status: trimmedString(row.marital_status) ?? null,
    education_level: trimmedString(row.education_level) ?? null,
    session_value: nullableNumber(row.session_value),
    consent_data: row.consent_data !== false,
    consent_image: Boolean(row.consent_image),
    incomplete_registration: Boolean(row.incomplete_registration),
    is_active: row.is_active !== false,
    isActive: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
  };
}

function normalizeMedicalRecordRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    chief_complaint: trimmedString(row.chief_complaint) ?? null,
    medical_history: trimmedString(row.medical_history) ?? null,
    current_medications: trimmedString(row.current_medications) ?? null,
    allergies: trimmedString(row.allergies) ?? null,
    previous_surgeries: trimmedString(row.previous_surgeries) ?? null,
    family_history: trimmedString(row.family_history) ?? null,
    lifestyle_habits: trimmedString(row.lifestyle_habits) ?? null,
    record_date: row.record_date ? String(row.record_date) : new Date().toISOString().slice(0, 10),
    created_by: trimmedString(row.created_by) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function normalizePhysicalExaminationRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    record_date: row.record_date ? String(row.record_date) : new Date().toISOString().slice(0, 10),
    created_by: trimmedString(row.created_by) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    vital_signs: parseJsonObject(row.vital_signs) ?? {},
    general_appearance: trimmedString(row.general_appearance) ?? null,
    heent: trimmedString(row.heent) ?? null,
    cardiovascular: trimmedString(row.cardiovascular) ?? null,
    respiratory: trimmedString(row.respiratory) ?? null,
    gastrointestinal: trimmedString(row.gastrointestinal) ?? null,
    musculoskeletal: trimmedString(row.musculoskeletal) ?? null,
    neurological: trimmedString(row.neurological) ?? null,
    integumentary: trimmedString(row.integumentary) ?? null,
    psychological: trimmedString(row.psychological) ?? null,
  };
}

function normalizeTreatmentPlanRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    record_date: row.record_date ? String(row.record_date) : new Date().toISOString().slice(0, 10),
    created_by: trimmedString(row.created_by) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    diagnosis: parseJsonArray(row.diagnosis),
    objectives: parseJsonArray(row.objectives),
    procedures: parseJsonArray(row.procedures),
    exercises: parseJsonArray(row.exercises),
    recommendations: parseJsonArray(row.recommendations),
    follow_up_date: row.follow_up_date ? String(row.follow_up_date) : null,
  };
}

function normalizeMedicalAttachmentRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    record_id: trimmedString(row.record_id) ?? null,
    file_name: trimmedString(row.file_name) ?? '',
    file_url: trimmedString(row.file_url) ?? '',
    file_type: trimmedString(row.file_type) ?? '',
    file_size: nullableNumber(row.file_size),
    uploaded_at: row.uploaded_at ? String(row.uploaded_at) : null,
    uploaded_by: trimmedString(row.uploaded_by) ?? null,
    category: trimmedString(row.category) ?? 'other',
    description: trimmedString(row.description) ?? null,
  };
}

function normalizePathologyRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    name: trimmedString(row.pathology_name ?? row.name) ?? '',
    pathology_name: trimmedString(row.pathology_name ?? row.name) ?? '',
    icd_code: trimmedString(row.icd_code ?? row.cid_code) ?? null,
    cid_code: trimmedString(row.cid_code ?? row.icd_code) ?? null,
    status: trimmedString(row.status) ?? 'ativo',
    diagnosed_at: row.diagnosis_date ?? row.diagnosed_at ? String(row.diagnosis_date ?? row.diagnosed_at) : null,
    diagnosis_date: row.diagnosis_date ?? row.diagnosed_at ? String(row.diagnosis_date ?? row.diagnosed_at) : null,
    treated_at: row.treated_at ? String(row.treated_at) : null,
    severity: trimmedString(row.severity) ?? null,
    affected_region: trimmedString(row.affected_region) ?? null,
    notes: trimmedString(row.notes) ?? null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function normalizeSurgeryRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    name: trimmedString(row.surgery_name ?? row.name) ?? '',
    surgery_name: trimmedString(row.surgery_name ?? row.name) ?? '',
    surgery_date: row.surgery_date ? String(row.surgery_date) : null,
    surgeon: trimmedString(row.surgeon_name ?? row.surgeon) ?? null,
    surgeon_name: trimmedString(row.surgeon_name ?? row.surgeon) ?? null,
    hospital: trimmedString(row.hospital) ?? null,
    post_op_protocol: trimmedString(row.post_op_protocol) ?? null,
    surgery_type: trimmedString(row.surgery_type) ?? null,
    affected_side: trimmedString(row.affected_side) ?? null,
    complications: trimmedString(row.complications) ?? null,
    notes: trimmedString(row.notes) ?? null,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function normalizeMedicalReturnRow(row: DbRow) {
  return {
    ...row,
    id: String(row.id),
    patient_id: String(row.patient_id),
    doctor_name: trimmedString(row.doctor_name) ?? '',
    doctor_phone: trimmedString(row.doctor_phone) ?? null,
    return_date: row.return_date ? String(row.return_date) : null,
    return_period: trimmedString(row.return_period) ?? null,
    notes: trimmedString(row.notes) ?? null,
    report_done: Boolean(row.report_done),
    report_sent: Boolean(row.report_sent),
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function buildPatientWritePayload(
  body: PatientPayload,
  availableColumns: Set<string>,
  organizationId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (isCreate && availableColumns.has('organization_id')) {
    payload.organization_id = organizationId;
  }

  if (body.full_name !== undefined || body.name !== undefined) {
    payload.full_name = trimmedString(body.full_name ?? body.name) ?? '';
  }

  if (availableColumns.has('email') && body.email !== undefined) {
    payload.email = nullableString(body.email);
  }
  if (availableColumns.has('phone') && (body.phone !== undefined || isCreate)) {
    payload.phone = nullableString(body.phone) ?? (isCreate ? '' : null);
  }
  if (availableColumns.has('phone_secondary') && body.phone_secondary !== undefined) {
    payload.phone_secondary = nullableString(body.phone_secondary);
  }
  if (availableColumns.has('cpf') && body.cpf !== undefined) {
    payload.cpf = nullableString(body.cpf);
  }
  if (availableColumns.has('rg') && body.rg !== undefined) {
    payload.rg = nullableString(body.rg);
  }
  if (availableColumns.has('birth_date') && body.birth_date !== undefined) {
    payload.birth_date = nullableString(body.birth_date);
  }
  if (availableColumns.has('gender') && body.gender !== undefined) {
    payload.gender = normalizeGenderToDb(body.gender);
  }
  if (availableColumns.has('address') && ['address', 'city', 'state', 'zip_code'].some((key) => body[key] !== undefined)) {
    payload.address = buildAddressPayload(body);
  }
  if (
    availableColumns.has('emergency_contact') &&
    ['emergency_contact', 'emergency_phone', 'emergency_contact_relationship'].some((key) => body[key] !== undefined)
  ) {
    payload.emergency_contact = buildEmergencyContactPayload(body);
  }
  if (
    availableColumns.has('insurance') &&
    ['health_insurance', 'insurance_plan', 'insurance_number', 'insurance_validity'].some((key) => body[key] !== undefined)
  ) {
    payload.insurance = buildInsurancePayload(body);
  }
  if (availableColumns.has('main_condition') && body.main_condition !== undefined) {
    payload.main_condition = nullableString(body.main_condition);
  }
  if (availableColumns.has('profession') && body.profession !== undefined) {
    payload.profession = nullableString(body.profession);
  }
  if (availableColumns.has('observations') && body.observations !== undefined) {
    payload.observations = nullableString(body.observations);
  }
  if (availableColumns.has('notes') && body.observations !== undefined) {
    payload.notes = nullableString(body.observations);
  }
  if (availableColumns.has('status') && (body.status !== undefined || isCreate)) {
    payload.status = normalizePatientStatus(body.status);
  }
  if (availableColumns.has('is_active') && (body.is_active !== undefined || body.status !== undefined || isCreate)) {
    payload.is_active = deriveIsActive(body);
  }
  if (availableColumns.has('progress') && (body.progress !== undefined || isCreate)) {
    payload.progress = nullableNumber(body.progress) ?? 0;
  }
  if (availableColumns.has('blood_type') && body.blood_type !== undefined) {
    payload.blood_type = nullableString(body.blood_type);
  }
  if (availableColumns.has('weight_kg') && body.weight_kg !== undefined) {
    payload.weight_kg = nullableNumber(body.weight_kg);
  }
  if (availableColumns.has('height_cm') && body.height_cm !== undefined) {
    payload.height_cm = nullableNumber(body.height_cm);
  }
  if (availableColumns.has('marital_status') && body.marital_status !== undefined) {
    payload.marital_status = nullableString(body.marital_status);
  }
  if (availableColumns.has('education_level') && body.education_level !== undefined) {
    payload.education_level = nullableString(body.education_level);
  }
  if (availableColumns.has('consent_data') && body.consent_data !== undefined) {
    payload.consent_data = nullableBoolean(body.consent_data);
  }
  if (availableColumns.has('consent_image') && body.consent_image !== undefined) {
    payload.consent_image = nullableBoolean(body.consent_image);
  }
  if (availableColumns.has('incomplete_registration') && body.incomplete_registration !== undefined) {
    payload.incomplete_registration = nullableBoolean(body.incomplete_registration);
  }
  if (availableColumns.has('origin') && body.origin !== undefined) {
    payload.origin = nullableString(body.origin);
  }
  if (availableColumns.has('referred_by') && body.referred_by !== undefined) {
    payload.referred_by = nullableString(body.referred_by);
  }
  if (availableColumns.has('photo_url') && body.photo_url !== undefined) {
    payload.photo_url = nullableString(body.photo_url);
  }
  if (availableColumns.has('session_value') && body.session_value !== undefined) {
    payload.session_value = nullableNumber(body.session_value);
  }
  if (availableColumns.has('updated_at')) {
    payload.updated_at = new Date().toISOString();
  }
  if (isCreate && availableColumns.has('created_at')) {
    payload.created_at = new Date().toISOString();
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function buildInsertStatement(table: string, values: Record<string, unknown>) {
  const entries = Object.entries(values);
  const columns = entries.map(([column]) => column);
  const placeholders = entries.map((_, index) => `$${index + 1}`);
  const params = entries.map(([, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value;
  });

  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    params,
  };
}

function buildUpdateStatement(
  table: string,
  idColumn: string,
  idValue: string,
  organizationId: string,
  values: Record<string, unknown>,
) {
  const entries = Object.entries(values);
  const sets = entries.map(([column], index) => `${column} = $${index + 1}`);
  const params = entries.map(([, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value;
  });

  params.push(idValue, organizationId);

  return {
    sql: `UPDATE ${table}
          SET ${sets.join(', ')}
          WHERE ${idColumn} = $${params.length - 1}::uuid
            AND organization_id = $${params.length}::uuid
          RETURNING *`,
    params,
  };
}

function getPatientOrderClause(sortBy: string | undefined): string {
  switch (sortBy) {
    case 'created_at_asc':
      return 'created_at ASC, full_name ASC';
    case 'created_at_desc':
      return 'created_at DESC, full_name ASC';
    case 'name_asc':
    default:
      return 'full_name ASC, created_at DESC';
  }
}

app.use('*', requireAuth);

app.get('/', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const columns = await getTableColumns(db, 'patients');

  if (columns.size === 0) {
    return c.json({ data: [], total: 0, page: 1, perPage: 0 });
  }

  const search = trimmedString(c.req.query('search'));
  const requestedStatus = trimmedString(c.req.query('status'));
  const createdFrom = trimmedString(c.req.query('createdFrom'));
  const createdTo = trimmedString(c.req.query('createdTo'));
  const sortBy = trimmedString(c.req.query('sortBy'));
  const incompleteRegistrationQuery = c.req.query('incompleteRegistration');

  const limit = Math.min(500, Math.max(1, Number.parseInt(c.req.query('limit') ?? '100', 10) || 100));
  const offset = Math.max(0, Number.parseInt(c.req.query('offset') ?? '0', 10) || 0);

  const filters: string[] = ['organization_id = $1::uuid'];
  const params: unknown[] = [user.organizationId];

  const normalizedStatus = requestedStatus?.toLowerCase();
  if (normalizedStatus) {
    if (columns.has('is_active') && ['active', 'ativo'].includes(normalizedStatus)) {
      filters.push('COALESCE(is_active, true) = true');
    } else if (columns.has('is_active') && ['inactive', 'inativo'].includes(normalizedStatus)) {
      filters.push('COALESCE(is_active, true) = false');
    } else if (columns.has('status')) {
      params.push(normalizePatientStatus(requestedStatus));
      filters.push(`status = $${params.length}`);
    }
  } else if (columns.has('is_active')) {
    filters.push('COALESCE(is_active, true) = true');
  }

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    filters.push(
      `(full_name ILIKE ${placeholder} OR COALESCE(email, '') ILIKE ${placeholder} OR COALESCE(cpf, '') ILIKE ${placeholder} OR COALESCE(phone, '') ILIKE ${placeholder})`,
    );
  }

  if (columns.has('incomplete_registration') && incompleteRegistrationQuery !== undefined) {
    params.push(Boolean(nullableBoolean(incompleteRegistrationQuery)));
    filters.push(`COALESCE(incomplete_registration, false) = $${params.length}`);
  }

  if (columns.has('created_at') && createdFrom) {
    params.push(createdFrom);
    filters.push(`created_at >= $${params.length}::timestamptz`);
  }

  if (columns.has('created_at') && createdTo) {
    params.push(createdTo);
    filters.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const totalResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM patients ${whereClause}`,
      params,
    );
    const total = Number((totalResult.rows[0] as DbRow | undefined)?.total ?? 0);

    const dataParams = [...params, limit, offset];
    const dataResult = await db.query(
      `SELECT * FROM patients ${whereClause} ORDER BY ${getPatientOrderClause(sortBy)} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    return c.json({
      data: dataResult.rows.map((row) => normalizePatientRow(row as DbRow)),
      total,
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
    });
  } catch (error) {
    console.error('[Patients/List] Error:', error);
    return c.json({ data: [], total: 0, error: error instanceof Error ? error.message : 'Erro ao listar pacientes' }, 500);
  }
});

app.get('/last-updated', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);

  if (!(await hasColumn(db, 'patients', 'updated_at'))) {
    return c.json({ data: { last_updated_at: null } });
  }

  const result = await db.query(
    `
      SELECT MAX(updated_at) AS last_updated_at
      FROM patients
      WHERE organization_id = $1::uuid
    `,
    [user.organizationId],
  );

  const lastUpdated = (result.rows[0] as DbRow | undefined)?.last_updated_at;
  return c.json({ data: { last_updated_at: lastUpdated ? String(lastUpdated) : null } });
});

app.get('/by-profile/:profileId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { profileId } = c.req.param();

  if (!(await hasColumn(db, 'patients', 'profile_id'))) {
    return c.json({ data: null });
  }

  const result = await db.query(
    `
      SELECT *
      FROM patients
      WHERE profile_id = $1::uuid
        AND organization_id = $2::uuid
      LIMIT 1
    `,
    [profileId, user.organizationId],
  );

  const row = result.rows[0] as DbRow | undefined;
  return c.json({ data: row ? normalizePatientRow(row) : null });
});

app.post('/', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const body = (await c.req.json()) as PatientPayload;
  const columns = await getTableColumns(db, 'patients');

  if (columns.size === 0) {
    return c.json({ error: 'Tabela patients não encontrada no Neon DB' }, 500);
  }

  const fullName = trimmedString(body.full_name ?? body.name);
  if (!fullName) return c.json({ error: 'Nome é obrigatório' }, 400);

  try {
    const insertValues = buildPatientWritePayload(body, columns, user.organizationId, true);
    insertValues.full_name = fullName;

    const { sql, params } = buildInsertStatement('patients', insertValues);
    const result = await db.query(sql, params);
    const row = result.rows[0] as DbRow | undefined;

    if (!row) {
      return c.json({ error: 'Falha ao criar paciente' }, 500);
    }

    return c.json({ data: normalizePatientRow(row) }, 201);
  } catch (error) {
    console.error('[Patients/Create] Error:', error);
    return c.json(
      { error: 'Erro ao criar paciente', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      500,
    );
  }
});

app.get('/:id/stats', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  if (!(await hasTable(db, 'appointments'))) {
    return c.json({ data: { totalSessions: 0, upcomingAppointments: 0, lastVisit: null } });
  }

  const result = await db.query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE COALESCE(status, 'scheduled') IN ('completed', 'Realizado', 'Concluído')
        )::int AS total_sessions,
        COUNT(*) FILTER (
          WHERE date >= CURRENT_DATE
            AND COALESCE(status, 'scheduled') NOT IN ('cancelled', 'Cancelado', 'completed', 'Realizado')
        )::int AS upcoming_appointments,
        MAX(date) FILTER (WHERE date <= CURRENT_DATE) AS last_visit
      FROM appointments
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
    `,
    [id, user.organizationId],
  );

  const row = (result.rows[0] as DbRow | undefined) ?? {};

  return c.json({
    data: {
      totalSessions: Number(row.total_sessions ?? 0),
      upcomingAppointments: Number(row.upcoming_appointments ?? 0),
      lastVisit: row.last_visit ? String(row.last_visit) : null,
    },
  });
});

app.get('/:id', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  try {
    const result = await db.query(
      `
        SELECT *
        FROM patients
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
        LIMIT 1
      `,
      [id, user.organizationId],
    );

    const row = result.rows[0] as DbRow | undefined;
    if (!row) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ data: normalizePatientRow(row) });
  } catch (error) {
    return c.json(
      { error: 'Erro ao buscar paciente', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      500,
    );
  }
});

const updatePatientHandler = async (c: any) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;
  const columns = await getTableColumns(db, 'patients');

  try {
    const updateValues = buildPatientWritePayload(body, columns, user.organizationId, false);
    if (Object.keys(updateValues).length === 0) {
      return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    }

    const { sql, params } = buildUpdateStatement('patients', 'id', id, user.organizationId, updateValues);
    const result = await db.query(sql, params);
    const row = result.rows[0] as DbRow | undefined;

    if (!row) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ data: normalizePatientRow(row) });
  } catch (error) {
    return c.json(
      { error: 'Erro ao atualizar paciente', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      500,
    );
  }
};

app.put('/:id', updatePatientHandler);
app.patch('/:id', updatePatientHandler);

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  try {
    const result = await db.query(
      `
        UPDATE patients
        SET is_active = false, updated_at = NOW()
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
        RETURNING id
      `,
      [id, user.organizationId],
    );

    const row = result.rows[0] as DbRow | undefined;
    if (!row) return c.json({ error: 'Paciente não encontrado' }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: 'Erro ao excluir paciente', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      500,
    );
  }
});

app.get('/:id/medical-records', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  const result = await db.query(
    `
      SELECT *
      FROM medical_records
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
      ORDER BY record_date DESC, created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeMedicalRecordRow(row as DbRow)) });
});

app.post('/:id/medical-records', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      INSERT INTO medical_records (
        patient_id,
        organization_id,
        chief_complaint,
        medical_history,
        current_medications,
        allergies,
        previous_surgeries,
        family_history,
        lifestyle_habits,
        record_date,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        COALESCE($10::date, CURRENT_DATE),
        $11,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      nullableString(body.chief_complaint),
      nullableString(body.medical_history),
      nullableString(body.current_medications),
      nullableString(body.allergies),
      nullableString(body.previous_surgeries),
      nullableString(body.family_history),
      nullableString(body.lifestyle_habits),
      nullableString(body.record_date),
      nullableString(body.created_by),
    ],
  );

  return c.json({ data: normalizeMedicalRecordRow(result.rows[0] as DbRow) }, 201);
});

app.put('/:id/medical-records/:recordId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, recordId } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      UPDATE medical_records
      SET
        chief_complaint = COALESCE($1, chief_complaint),
        medical_history = COALESCE($2, medical_history),
        current_medications = COALESCE($3, current_medications),
        allergies = COALESCE($4, allergies),
        previous_surgeries = COALESCE($5, previous_surgeries),
        family_history = COALESCE($6, family_history),
        lifestyle_habits = COALESCE($7, lifestyle_habits),
        record_date = COALESCE($8::date, record_date),
        created_by = COALESCE($9, created_by),
        updated_at = NOW()
      WHERE id = $10::uuid
        AND patient_id = $11::uuid
        AND organization_id = $12::uuid
      RETURNING *
    `,
    [
      nullableString(body.chief_complaint),
      nullableString(body.medical_history),
      nullableString(body.current_medications),
      nullableString(body.allergies),
      nullableString(body.previous_surgeries),
      nullableString(body.family_history),
      nullableString(body.lifestyle_habits),
      nullableString(body.record_date),
      nullableString(body.created_by),
      recordId,
      id,
      user.organizationId,
    ],
  );

  const row = result.rows[0] as DbRow | undefined;
  if (!row) return c.json({ error: 'Prontuário não encontrado' }, 404);
  return c.json({ data: normalizeMedicalRecordRow(row) });
});

app.delete('/:id/medical-records/:recordId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, recordId } = c.req.param();

  await db.query(
    `
      DELETE FROM medical_records
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [recordId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/:id/physical-examinations', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  const result = await db.query(
    `
      SELECT *
      FROM physical_examinations
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
      ORDER BY record_date DESC, created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizePhysicalExaminationRow(row as DbRow)) });
});

app.post('/:id/physical-examinations', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      INSERT INTO physical_examinations (
        patient_id,
        organization_id,
        record_date,
        created_by,
        vital_signs,
        general_appearance,
        heent,
        cardiovascular,
        respiratory,
        gastrointestinal,
        musculoskeletal,
        neurological,
        integumentary,
        psychological,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        COALESCE($3::date, CURRENT_DATE),
        $4,
        $5::jsonb,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      nullableString(body.record_date),
      nullableString(body.created_by),
      JSON.stringify(parseJsonObject(body.vital_signs) ?? {}),
      nullableString(body.general_appearance),
      nullableString(body.heent),
      nullableString(body.cardiovascular),
      nullableString(body.respiratory),
      nullableString(body.gastrointestinal),
      nullableString(body.musculoskeletal),
      nullableString(body.neurological),
      nullableString(body.integumentary),
      nullableString(body.psychological),
    ],
  );

  return c.json({ data: normalizePhysicalExaminationRow(result.rows[0] as DbRow) }, 201);
});

app.put('/:id/physical-examinations/:examId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, examId } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      UPDATE physical_examinations
      SET
        record_date = COALESCE($1::date, record_date),
        created_by = COALESCE($2, created_by),
        vital_signs = COALESCE($3::jsonb, vital_signs),
        general_appearance = COALESCE($4, general_appearance),
        heent = COALESCE($5, heent),
        cardiovascular = COALESCE($6, cardiovascular),
        respiratory = COALESCE($7, respiratory),
        gastrointestinal = COALESCE($8, gastrointestinal),
        musculoskeletal = COALESCE($9, musculoskeletal),
        neurological = COALESCE($10, neurological),
        integumentary = COALESCE($11, integumentary),
        psychological = COALESCE($12, psychological),
        updated_at = NOW()
      WHERE id = $13::uuid
        AND patient_id = $14::uuid
        AND organization_id = $15::uuid
      RETURNING *
    `,
    [
      nullableString(body.record_date),
      nullableString(body.created_by),
      body.vital_signs !== undefined ? JSON.stringify(parseJsonObject(body.vital_signs) ?? {}) : null,
      nullableString(body.general_appearance),
      nullableString(body.heent),
      nullableString(body.cardiovascular),
      nullableString(body.respiratory),
      nullableString(body.gastrointestinal),
      nullableString(body.musculoskeletal),
      nullableString(body.neurological),
      nullableString(body.integumentary),
      nullableString(body.psychological),
      examId,
      id,
      user.organizationId,
    ],
  );

  const row = result.rows[0] as DbRow | undefined;
  if (!row) return c.json({ error: 'Exame físico não encontrado' }, 404);
  return c.json({ data: normalizePhysicalExaminationRow(row) });
});

app.delete('/:id/physical-examinations/:examId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, examId } = c.req.param();

  await db.query(
    `
      DELETE FROM physical_examinations
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [examId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/:id/treatment-plans', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  const result = await db.query(
    `
      SELECT *
      FROM treatment_plans
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
      ORDER BY record_date DESC, created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeTreatmentPlanRow(row as DbRow)) });
});

app.post('/:id/treatment-plans', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      INSERT INTO treatment_plans (
        patient_id,
        organization_id,
        record_date,
        created_by,
        diagnosis,
        objectives,
        procedures,
        exercises,
        recommendations,
        follow_up_date,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        COALESCE($3::date, CURRENT_DATE),
        $4,
        $5::jsonb,
        $6::jsonb,
        $7::jsonb,
        $8::jsonb,
        $9::jsonb,
        $10::date,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      nullableString(body.record_date),
      nullableString(body.created_by),
      JSON.stringify(Array.isArray(body.diagnosis) ? body.diagnosis : []),
      JSON.stringify(Array.isArray(body.objectives) ? body.objectives : []),
      JSON.stringify(Array.isArray(body.procedures) ? body.procedures : []),
      JSON.stringify(Array.isArray(body.exercises) ? body.exercises : []),
      JSON.stringify(Array.isArray(body.recommendations) ? body.recommendations : []),
      nullableString(body.follow_up_date),
    ],
  );

  return c.json({ data: normalizeTreatmentPlanRow(result.rows[0] as DbRow) }, 201);
});

app.put('/:id/treatment-plans/:planId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, planId } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      UPDATE treatment_plans
      SET
        record_date = COALESCE($1::date, record_date),
        created_by = COALESCE($2, created_by),
        diagnosis = COALESCE($3::jsonb, diagnosis),
        objectives = COALESCE($4::jsonb, objectives),
        procedures = COALESCE($5::jsonb, procedures),
        exercises = COALESCE($6::jsonb, exercises),
        recommendations = COALESCE($7::jsonb, recommendations),
        follow_up_date = COALESCE($8::date, follow_up_date),
        updated_at = NOW()
      WHERE id = $9::uuid
        AND patient_id = $10::uuid
        AND organization_id = $11::uuid
      RETURNING *
    `,
    [
      nullableString(body.record_date),
      nullableString(body.created_by),
      body.diagnosis !== undefined ? JSON.stringify(Array.isArray(body.diagnosis) ? body.diagnosis : []) : null,
      body.objectives !== undefined ? JSON.stringify(Array.isArray(body.objectives) ? body.objectives : []) : null,
      body.procedures !== undefined ? JSON.stringify(Array.isArray(body.procedures) ? body.procedures : []) : null,
      body.exercises !== undefined ? JSON.stringify(Array.isArray(body.exercises) ? body.exercises : []) : null,
      body.recommendations !== undefined ? JSON.stringify(Array.isArray(body.recommendations) ? body.recommendations : []) : null,
      nullableString(body.follow_up_date),
      planId,
      id,
      user.organizationId,
    ],
  );

  const row = result.rows[0] as DbRow | undefined;
  if (!row) return c.json({ error: 'Plano de tratamento não encontrado' }, 404);
  return c.json({ data: normalizeTreatmentPlanRow(row) });
});

app.delete('/:id/treatment-plans/:planId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, planId } = c.req.param();

  await db.query(
    `
      DELETE FROM treatment_plans
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [planId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/:id/attachments', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const recordId = trimmedString(c.req.query('recordId'));

  const params: unknown[] = [id, user.organizationId];
  const clauses = ['patient_id = $1::uuid', 'organization_id = $2::uuid'];

  if (recordId) {
    params.push(recordId);
    clauses.push(`record_id = $${params.length}::uuid`);
  }

  const result = await db.query(
    `
      SELECT *
      FROM medical_attachments
      WHERE ${clauses.join(' AND ')}
      ORDER BY uploaded_at DESC
    `,
    params,
  );

  return c.json({ data: result.rows.map((row) => normalizeMedicalAttachmentRow(row as DbRow)) });
});

app.post('/:id/attachments', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      INSERT INTO medical_attachments (
        patient_id,
        organization_id,
        record_id,
        file_name,
        file_url,
        file_type,
        file_size,
        uploaded_by,
        category,
        description,
        uploaded_at,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        $5,
        $6,
        $7,
        $8,
        COALESCE($9, 'other'),
        $10,
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      nullableString(body.record_id),
      trimmedString(body.file_name) ?? trimmedString(body.name) ?? 'arquivo',
      trimmedString(body.file_url) ?? '',
      trimmedString(body.file_type) ?? 'application/octet-stream',
      nullableNumber(body.file_size),
      nullableString(body.uploaded_by),
      nullableString(body.category),
      nullableString(body.description),
    ],
  );

  return c.json({ data: normalizeMedicalAttachmentRow(result.rows[0] as DbRow) }, 201);
});

app.delete('/:id/attachments/:attachmentId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, attachmentId } = c.req.param();

  await db.query(
    `
      DELETE FROM medical_attachments
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [attachmentId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/:id/pathologies', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  const result = await db.query(
    `
      SELECT *
      FROM patient_pathologies
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
      ORDER BY created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizePathologyRow(row as DbRow)) });
});

app.post('/:id/pathologies', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      INSERT INTO patient_pathologies (
        patient_id,
        organization_id,
        pathology_name,
        cid_code,
        diagnosis_date,
        severity,
        affected_region,
        status,
        treated_at,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5::date,
        $6,
        $7,
        COALESCE($8, 'ativo'),
        $9::date,
        $10,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      trimmedString(body.pathology_name) ?? trimmedString(body.name) ?? '',
      nullableString(body.cid_code ?? body.icd_code),
      nullableString(body.diagnosis_date ?? body.diagnosed_at),
      nullableString(body.severity),
      nullableString(body.affected_region),
      nullableString(body.status),
      nullableString(body.treated_at),
      nullableString(body.notes),
    ],
  );

  return c.json({ data: normalizePathologyRow(result.rows[0] as DbRow) }, 201);
});

app.put('/:id/pathologies/:pathologyId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, pathologyId } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      UPDATE patient_pathologies
      SET
        pathology_name = COALESCE($1, pathology_name),
        cid_code = COALESCE($2, cid_code),
        diagnosis_date = COALESCE($3::date, diagnosis_date),
        severity = COALESCE($4, severity),
        affected_region = COALESCE($5, affected_region),
        status = COALESCE($6, status),
        treated_at = COALESCE($7::date, treated_at),
        notes = COALESCE($8, notes),
        updated_at = NOW()
      WHERE id = $9::uuid
        AND patient_id = $10::uuid
        AND organization_id = $11::uuid
      RETURNING *
    `,
    [
      nullableString(body.pathology_name ?? body.name),
      nullableString(body.cid_code ?? body.icd_code),
      nullableString(body.diagnosis_date ?? body.diagnosed_at),
      nullableString(body.severity),
      nullableString(body.affected_region),
      nullableString(body.status),
      nullableString(body.treated_at),
      nullableString(body.notes),
      pathologyId,
      id,
      user.organizationId,
    ],
  );

  const row = result.rows[0] as DbRow | undefined;
  if (!row) return c.json({ error: 'Patologia não encontrada' }, 404);
  return c.json({ data: normalizePathologyRow(row) });
});

app.delete('/:id/pathologies/:pathologyId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, pathologyId } = c.req.param();

  await db.query(
    `
      DELETE FROM patient_pathologies
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [pathologyId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/:id/surgeries', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  const result = await db.query(
    `
      SELECT *
      FROM patient_surgeries
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
      ORDER BY surgery_date DESC, created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeSurgeryRow(row as DbRow)) });
});

app.post('/:id/surgeries', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      INSERT INTO patient_surgeries (
        patient_id,
        organization_id,
        surgery_name,
        surgery_date,
        surgeon_name,
        hospital,
        post_op_protocol,
        surgery_type,
        affected_side,
        complications,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4::date,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      trimmedString(body.surgery_name ?? body.name) ?? '',
      nullableString(body.surgery_date),
      nullableString(body.surgeon_name ?? body.surgeon),
      nullableString(body.hospital),
      nullableString(body.post_op_protocol),
      nullableString(body.surgery_type),
      nullableString(body.affected_side),
      nullableString(body.complications),
      nullableString(body.notes),
    ],
  );

  return c.json({ data: normalizeSurgeryRow(result.rows[0] as DbRow) }, 201);
});

app.put('/:id/surgeries/:surgeryId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, surgeryId } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      UPDATE patient_surgeries
      SET
        surgery_name = COALESCE($1, surgery_name),
        surgery_date = COALESCE($2::date, surgery_date),
        surgeon_name = COALESCE($3, surgeon_name),
        hospital = COALESCE($4, hospital),
        post_op_protocol = COALESCE($5, post_op_protocol),
        surgery_type = COALESCE($6, surgery_type),
        affected_side = COALESCE($7, affected_side),
        complications = COALESCE($8, complications),
        notes = COALESCE($9, notes),
        updated_at = NOW()
      WHERE id = $10::uuid
        AND patient_id = $11::uuid
        AND organization_id = $12::uuid
      RETURNING *
    `,
    [
      nullableString(body.surgery_name ?? body.name),
      nullableString(body.surgery_date),
      nullableString(body.surgeon_name ?? body.surgeon),
      nullableString(body.hospital),
      nullableString(body.post_op_protocol),
      nullableString(body.surgery_type),
      nullableString(body.affected_side),
      nullableString(body.complications),
      nullableString(body.notes),
      surgeryId,
      id,
      user.organizationId,
    ],
  );

  const row = result.rows[0] as DbRow | undefined;
  if (!row) return c.json({ error: 'Cirurgia não encontrada' }, 404);
  return c.json({ data: normalizeSurgeryRow(row) });
});

app.delete('/:id/surgeries/:surgeryId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, surgeryId } = c.req.param();

  await db.query(
    `
      DELETE FROM patient_surgeries
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [surgeryId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/:id/medical-returns', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();

  const result = await db.query(
    `
      SELECT *
      FROM patient_medical_returns
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
      ORDER BY return_date DESC, created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({ data: result.rows.map((row) => normalizeMedicalReturnRow(row as DbRow)) });
});

app.post('/:id/medical-returns', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
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
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5::date,
        $6,
        $7,
        COALESCE($8, false),
        COALESCE($9, false),
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      user.organizationId,
      trimmedString(body.doctor_name) ?? '',
      nullableString(body.doctor_phone),
      nullableString(body.return_date),
      nullableString(body.return_period),
      nullableString(body.notes),
      nullableBoolean(body.report_done),
      nullableBoolean(body.report_sent),
    ],
  );

  return c.json({ data: normalizeMedicalReturnRow(result.rows[0] as DbRow) }, 201);
});

app.put('/:id/medical-returns/:medicalReturnId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, medicalReturnId } = c.req.param();
  const body = (await c.req.json()) as PatientPayload;

  const result = await db.query(
    `
      UPDATE patient_medical_returns
      SET
        doctor_name = COALESCE($1, doctor_name),
        doctor_phone = COALESCE($2, doctor_phone),
        return_date = COALESCE($3::date, return_date),
        return_period = COALESCE($4, return_period),
        notes = COALESCE($5, notes),
        report_done = COALESCE($6, report_done),
        report_sent = COALESCE($7, report_sent),
        updated_at = NOW()
      WHERE id = $8::uuid
        AND patient_id = $9::uuid
        AND organization_id = $10::uuid
      RETURNING *
    `,
    [
      nullableString(body.doctor_name),
      nullableString(body.doctor_phone),
      nullableString(body.return_date),
      nullableString(body.return_period),
      nullableString(body.notes),
      nullableBoolean(body.report_done),
      nullableBoolean(body.report_sent),
      medicalReturnId,
      id,
      user.organizationId,
    ],
  );

  const row = result.rows[0] as DbRow | undefined;
  if (!row) return c.json({ error: 'Retorno médico não encontrado' }, 404);
  return c.json({ data: normalizeMedicalReturnRow(row) });
});

app.delete('/:id/medical-returns/:medicalReturnId', async (c) => {
  const user = c.get('user');
  const db = createPool(c.env);
  const { id, medicalReturnId } = c.req.param();

  await db.query(
    `
      DELETE FROM patient_medical_returns
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND organization_id = $3::uuid
    `,
    [medicalReturnId, id, user.organizationId],
  );

  return c.json({ ok: true });
});

export { app as patientsRoutes };
