import { createPool } from '../../lib/db';
import {
  type PatientPayload,
  type PatientRouteApp,
  type DbRow,
  trimmedString,
  nullableString,
  nullableBoolean,
  nullableNumber,
  parseJsonObject,
  normalizeMedicalRecordRow,
  normalizePhysicalExaminationRow,
  normalizeTreatmentPlanRow,
  normalizeMedicalAttachmentRow,
  normalizePathologyRow,
  normalizeSurgeryRow,
  normalizeMedicalReturnRow,
} from './shared';

export function registerPatientClinicalDetailRoutes(app: PatientRouteApp) {
  app.get('/:id/medical-records', async (c) => {
    const user = c.get('user');
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
          created_by,
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
          $11,
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
        user.uid,
      ],
    );

    return c.json({ data: normalizePathologyRow(result.rows[0] as DbRow) }, 201);
  });

  app.put('/:id/pathologies/:pathologyId', async (c) => {
    const user = c.get('user');
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
          created_by,
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
          $12,
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
        user.uid,
      ],
    );

    return c.json({ data: normalizeSurgeryRow(result.rows[0] as DbRow) }, 201);
  });

  app.put('/:id/surgeries/:surgeryId', async (c) => {
    const user = c.get('user');
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
    const db = await createPool(c.env);
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
}
