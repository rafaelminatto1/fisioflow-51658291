import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { appointments, patients, profiles, sessions } from "@fisioflow/db";
import { createDb } from "../lib/db";
import { normalizeRole, requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const ALLOWED_IMPORT_ROLES = new Set(["admin", "super_admin", "owner"]);

type ImportSessionStatus = "draft" | "finalized" | "cancelled";

const SESSION_STATUS_ALIASES: Record<string, ImportSessionStatus> = {
  draft: "draft",
  rascunho: "draft",
  finalized: "finalized",
  finalizado: "finalized",
  completed: "finalized",
  complete: "finalized",
  concluido: "finalized",
  concluído: "finalized",
  signed: "finalized",
  cancelled: "cancelled",
  canceled: "cancelled",
  cancelado: "cancelled",
  cancelada: "cancelled",
};

const APPOINTMENT_STATUSES = [
  "agendado",
  "atendido",
  "avaliacao",
  "cancelado",
  "faltou",
  "faltou_com_aviso",
  "faltou_sem_aviso",
  "nao_atendido",
  "nao_atendido_sem_cobranca",
  "presenca_confirmada",
  "remarcar",
] as const;

const legacyEvolutionSchema = z
  .object({
    date: z.string().trim().optional(),
    startTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    observacao: z.string().trim().min(1).optional(),
    appointmentStatus: z.enum(APPOINTMENT_STATUSES).optional(),
    appointmentType: z
      .enum(["evaluation", "session", "reassessment", "group", "return"])
      .default("session"),
    painScale: z.number().min(0).max(10).optional(),
    status: z.string().trim().optional(),
    therapistId: z.string().trim().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .refine((e) => Boolean(e.observacao) || Boolean(e.appointmentStatus), {
    message: "Evolução precisa de observacao ou appointmentStatus.",
  });

const legacyPatientSchema = z.object({
  fullName: z.string().trim().min(1),
  socialName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().nullable().optional(),
  gender: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  observations: z.string().trim().optional(),
  legacyId: z.string().trim().optional(),
  evolutions: z.array(legacyEvolutionSchema).min(1),
});

export const legacyImportSchema = z.object({
  replaceExisting: z.literal(true),
  dryRun: z.boolean().optional().default(false),
  patients: z.array(legacyPatientSchema).min(1),
});

type LegacyImportPayload = z.infer<typeof legacyImportSchema>;
type LegacyPatient = z.infer<typeof legacyPatientSchema>;
type LegacyEvolution = z.infer<typeof legacyEvolutionSchema>;

type ImportResultStatus = "wouldImport" | "wouldFail" | "imported" | "failed";

type ImportPatientResult = {
  index: number;
  fullName: string;
  status: ImportResultStatus;
  patientId?: string;
  appointmentsImported: number;
  sessionsImported: number;
  sessionsFailed: number;
  errors: string[];
  warnings: string[];
};

type ImportSummary = {
  totalPatients: number;
  importedPatients: number;
  failedPatients: number;
  totalSessions: number;
  importedSessions: number;
  failedSessions: number;
  importedAppointments: number;
};

type PreparedSessionRow = {
  date: Date;
  observacao: string;
  painScale: number | null;
  status: ImportSessionStatus;
  duration: number | null;
  therapistId: string;
  sessionNumber: number;
};

type PreparedAppointmentRow = {
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  therapistId: string;
  durationMinutes: number;
  sessionObservacao: string | null;
  painScale: number | null;
  sessionNumber: number | null;
};

export function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = (h * 60 + m + durationMinutes) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function normalizeImportedName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeGender(value: string | undefined): "M" | "F" | "O" | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["m", "masculino", "male", "homem"].includes(normalized)) return "M";
  if (["f", "feminino", "female", "mulher"].includes(normalized)) return "F";
  if (["o", "outro", "other", "nao informado", "não informado"].includes(normalized)) return "O";
  return null;
}

function normalizeBirthDate(value: string | undefined, warnings: string[]): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    warnings.push(`birthDate inválida ignorada: ${raw}`);
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function parseLegacySessionDate(
  value: string | undefined,
  importTimestamp: Date,
): { date: Date | null; warning?: string; error?: string } {
  if (!value || !value.trim()) {
    return {
      date: new Date(importTimestamp),
      warning: "Data da evolução ausente; usando timestamp da importação.",
    };
  }

  const raw = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { date: null, error: `Data de evolução inválida: ${raw}` };
    }
    return { date: parsed };
  }

  const looksIso = /^\d{4}-\d{2}-\d{2}T/.test(raw);
  if (!looksIso) {
    return { date: null, error: `Formato de data não suportado: ${raw}` };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: null, error: `Data de evolução inválida: ${raw}` };
  }

  return { date: parsed };
}

export function normalizeLegacySessionStatus(
  value: string | undefined,
): { status: ImportSessionStatus; warning?: string } {
  if (!value || !value.trim()) {
    return {
      status: "finalized",
      warning: "Status da evolução ausente; usando finalized.",
    };
  }

  const normalized = SESSION_STATUS_ALIASES[value.trim().toLowerCase()];
  if (normalized) {
    return { status: normalized };
  }

  return {
    status: "finalized",
    warning: `Status legado não suportado (${value}); usando finalized.`,
  };
}

function isAuthorizedImportRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? ALLOWED_IMPORT_ROLES.has(normalized) : false;
}

async function resolveLocalProfileId(
  db: ReturnType<typeof createDb>,
  organizationId: string,
  requestedProfileId: string,
): Promise<string | null> {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, requestedProfileId), eq(profiles.organizationId, organizationId)))
    .limit(1);

  return profile?.id ?? null;
}

async function resolveTherapistId(
  db: ReturnType<typeof createDb>,
  patient: LegacyPatient,
  evolution: LegacyEvolution,
  organizationId: string,
  authenticatedProfileId: string | undefined,
  cache: Map<string, string | null>,
  warnings: string[],
): Promise<string | null> {
  const requestedTherapistId = evolution.therapistId?.trim();

  const getCachedOrResolve = async (candidate: string): Promise<string | null> => {
    if (cache.has(candidate)) {
      return cache.get(candidate) ?? null;
    }
    const resolved = await resolveLocalProfileId(db, organizationId, candidate);
    cache.set(candidate, resolved);
    return resolved;
  };

  if (requestedTherapistId) {
    if (isUuid(requestedTherapistId)) {
      const resolvedRequested = await getCachedOrResolve(requestedTherapistId);
      if (resolvedRequested) return resolvedRequested;

      warnings.push(
        `therapistId legado não encontrado na organização para ${patient.fullName}; usando profileId autenticado quando disponível.`,
      );
    } else {
      warnings.push(
        `therapistId legado inválido para ${patient.fullName}; usando profileId autenticado quando disponível.`,
      );
    }
  }

  if (authenticatedProfileId && isUuid(authenticatedProfileId)) {
    const resolvedAuthenticated = await getCachedOrResolve(authenticatedProfileId);
    if (resolvedAuthenticated) {
      if (requestedTherapistId) {
        warnings.push(
          "Autoria histórica reassociada ao profileId autenticado durante a importação.",
        );
      }
      return resolvedAuthenticated;
    }
  }

  return null;
}

async function preparePatientImport(
  db: ReturnType<typeof createDb>,
  patient: LegacyPatient,
  organizationId: string,
  authenticatedProfileId: string | undefined,
  importTimestamp: Date,
  cache: Map<string, string | null>,
): Promise<{
  patientValues: Record<string, unknown>;
  sessionsToInsert: PreparedSessionRow[];
  appointmentsToInsert: PreparedAppointmentRow[];
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const patientValues = {
    fullName: normalizeImportedName(patient.fullName),
    socialName: patient.socialName?.trim() || null,
    phone: patient.phone?.trim() || null,
    email: patient.email?.trim() || null,
    gender: normalizeGender(patient.gender),
    legacyDateOfBirth: normalizeBirthDate(patient.birthDate, warnings),
    notes: patient.notes?.trim() || null,
    observations: patient.observations?.trim() || null,
    organizationId,
    isActive: true,
  };

  const sessionsToInsert: PreparedSessionRow[] = [];
  const appointmentsToInsert: PreparedAppointmentRow[] = [];

  for (const [index, evolution] of patient.evolutions.entries()) {
    const parsedDate = parseLegacySessionDate(evolution.date, importTimestamp);
    if (parsedDate.error) {
      errors.push(parsedDate.error);
      continue;
    }
    if (parsedDate.warning) warnings.push(parsedDate.warning);

    const normalizedStatus = normalizeLegacySessionStatus(evolution.status);
    if (normalizedStatus.warning) warnings.push(normalizedStatus.warning);

    const therapistId = await resolveTherapistId(
      db,
      patient,
      evolution,
      organizationId,
      authenticatedProfileId,
      cache,
      warnings,
    );

    if (!therapistId) {
      errors.push(
        `Não foi possível resolver therapistId para a evolução ${index + 1} de ${patient.fullName}.`,
      );
      continue;
    }

    const startTime = evolution.startTime ?? "08:00";
    const durationMinutes = evolution.durationMinutes ?? 60;
    const apptDate = parsedDate.date!.toISOString().slice(0, 10);

    appointmentsToInsert.push({
      date: apptDate,
      startTime,
      endTime: computeEndTime(startTime, durationMinutes),
      status: evolution.appointmentStatus ?? "atendido",
      type: evolution.appointmentType ?? "session",
      therapistId,
      durationMinutes,
      sessionObservacao: evolution.observacao?.trim() ?? null,
      painScale: evolution.painScale ?? null,
      sessionNumber: index + 1,
    });

    sessionsToInsert.push({
      date: parsedDate.date!,
      observacao: (evolution.observacao ?? "").trim(),
      painScale: evolution.painScale ?? null,
      status: normalizedStatus.status,
      duration: evolution.durationMinutes ?? null,
      therapistId,
      sessionNumber: index + 1,
    });
  }

  return { patientValues, sessionsToInsert, appointmentsToInsert, warnings, errors };
}

async function wipeOrganizationLegacyImportData(
  db: ReturnType<typeof createDb>,
  organizationId: string,
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM clinical_embeddings WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM clinical_reasoning_logs WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM clinical_scribe_logs WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM session_attachments WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM pain_map_points WHERE pain_map_id IN (SELECT id FROM pain_maps WHERE organization_id = ${organizationId})`);
    await tx.execute(sql`DELETE FROM package_usage WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_exercise_logs WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM group_checkins WHERE enrollment_id IN (SELECT id FROM group_enrollments WHERE organization_id = ${organizationId})`);
    await tx.execute(sql`DELETE FROM group_enrollments WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_review_actions WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_annotations WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_events WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_frames WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_jobs WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_media WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_metrics WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM biomechanics_assessments WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM pain_maps WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM standardized_test_results WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_session_metrics WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM generated_reports WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM prescribed_exercises WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM exercise_prescriptions WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_objective_assignments WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_pathologies WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_goals WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM surgeries WHERE medical_record_id IN (SELECT id FROM medical_records WHERE organization_id = ${organizationId})`);
    await tx.execute(sql`DELETE FROM pathologies WHERE medical_record_id IN (SELECT id FROM medical_records WHERE organization_id = ${organizationId})`);
    await tx.execute(sql`DELETE FROM goals WHERE medical_record_id IN (SELECT id FROM medical_records WHERE organization_id = ${organizationId})`);
    await tx.execute(sql`DELETE FROM medical_records WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_portal_users WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_gamification WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM xp_transactions WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM achievements_log WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM daily_quests WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_longitudinal_summary WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patient_streaks WHERE patient_id IN (SELECT id FROM patients WHERE organization_id = ${organizationId})`);
    await tx.execute(sql`DELETE FROM patient_packages WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM appointments WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM sessions WHERE organization_id = ${organizationId}`);
    await tx.execute(sql`DELETE FROM patients WHERE organization_id = ${organizationId}`);
  });
}

function buildSummary(payload: LegacyImportPayload, results: ImportPatientResult[]): ImportSummary {
  return {
    totalPatients: payload.patients.length,
    importedPatients: results.filter((result) =>
      payload.dryRun ? result.status === "wouldImport" : result.status === "imported",
    ).length,
    failedPatients: results.filter((result) =>
      payload.dryRun ? result.status === "wouldFail" : result.status === "failed",
    ).length,
    totalSessions: payload.patients.reduce((acc, patient) => acc + patient.evolutions.length, 0),
    importedSessions: results.reduce((acc, result) => acc + result.sessionsImported, 0),
    failedSessions: results.reduce((acc, result) => acc + result.sessionsFailed, 0),
    importedAppointments: results.reduce((acc, result) => acc + result.appointmentsImported, 0),
  };
}

app.post("/legacy-data", requireAuth, async (c) => {
  const user = c.get("user");

  if (!isAuthorizedImportRole(user.role)) {
    return c.json({ error: "Acesso negado para importação destrutiva" }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = legacyImportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Payload inválido",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const payload = parsed.data;
  const importTimestamp = new Date();
  const db = createDb(c.env, "write");
  const therapistCache = new Map<string, string | null>();
  const results: ImportPatientResult[] = [];
  const topLevelWarnings: string[] = [];

  if (payload.dryRun) {
    for (const [index, patient] of payload.patients.entries()) {
      const prepared = await preparePatientImport(
        db,
        patient,
        user.organizationId,
        user.profileId,
        importTimestamp,
        therapistCache,
      );

      const wouldImport = prepared.errors.length === 0;
      results.push({
        index,
        fullName: normalizeImportedName(patient.fullName),
        status: wouldImport ? "wouldImport" : "wouldFail",
        appointmentsImported: wouldImport ? prepared.appointmentsToInsert.length : 0,
        sessionsImported: wouldImport
          ? prepared.appointmentsToInsert.filter((a) => a.sessionObservacao !== null).length
          : 0,
        sessionsFailed: wouldImport ? 0 : patient.evolutions.length,
        errors: prepared.errors,
        warnings: prepared.warnings,
      });
    }
  } else {
    try {
      await wipeOrganizationLegacyImportData(db, user.organizationId);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          dryRun: false,
          replaceExisting: true,
          warnings: [],
          error: "Falha ao limpar os dados atuais da organização",
          details: error?.message,
        },
        500,
      );
    }

    for (const [index, patient] of payload.patients.entries()) {
      const prepared = await preparePatientImport(
        db,
        patient,
        user.organizationId,
        user.profileId,
        importTimestamp,
        therapistCache,
      );

      if (prepared.errors.length > 0) {
        results.push({
          index,
          fullName: normalizeImportedName(patient.fullName),
          status: "failed",
          appointmentsImported: 0,
          sessionsImported: 0,
          sessionsFailed: patient.evolutions.length,
          errors: prepared.errors,
          warnings: prepared.warnings,
        });
        continue;
      }

      try {
        let sessionsLinked = 0;
        const created = await db.transaction(async (tx) => {
          const [createdPatient] = await tx
            .insert(patients)
            .values(prepared.patientValues as any)
            .returning({ id: patients.id });

          for (const appt of prepared.appointmentsToInsert) {
            const [createdAppt] = await tx
              .insert(appointments)
              .values({
                patientId: createdPatient.id,
                organizationId: user.organizationId,
                therapistId: appt.therapistId,
                date: appt.date,
                startTime: appt.startTime,
                endTime: appt.endTime,
                durationMinutes: appt.durationMinutes,
                status: appt.status,
                type: appt.type as any,
              } as any)
              .returning({ id: appointments.id });

            if (appt.sessionObservacao) {
              await tx.insert(sessions).values({
                patientId: createdPatient.id,
                organizationId: user.organizationId,
                therapistId: appt.therapistId,
                appointmentId: createdAppt.id,
                date: new Date(`${appt.date}T${appt.startTime}:00`),
                observacao: appt.sessionObservacao,
                painScale: appt.painScale,
                duration: appt.durationMinutes,
                status: "finalized",
                sessionNumber: appt.sessionNumber,
              } as any);
              sessionsLinked++;
            }
          }

          return createdPatient;
        });

        results.push({
          index,
          fullName: normalizeImportedName(patient.fullName),
          status: "imported",
          patientId: created.id,
          appointmentsImported: prepared.appointmentsToInsert.length,
          sessionsImported: sessionsLinked,
          sessionsFailed: 0,
          errors: [],
          warnings: prepared.warnings,
        });
      } catch (error: any) {
        results.push({
          index,
          fullName: normalizeImportedName(patient.fullName),
          status: "failed",
          appointmentsImported: 0,
          sessionsImported: 0,
          sessionsFailed: patient.evolutions.length,
          errors: [error?.message ?? "Falha ao importar paciente"],
          warnings: prepared.warnings,
        });
      }
    }
  }

  const summary = buildSummary(payload, results);
  const hasFailures = summary.failedPatients > 0;
  const hasImports = summary.importedPatients > 0;

  if (!payload.dryRun && !hasImports) {
    topLevelWarnings.push(
      "A limpeza da organização foi concluída, mas nenhum paciente pôde ser importado com sucesso.",
    );
  }

  return c.json({
    success: payload.dryRun ? !hasFailures : !hasFailures && hasImports,
    dryRun: payload.dryRun,
    replaceExisting: true,
    warnings: topLevelWarnings,
    summary,
    results,
  });
});

export { app as importRoutes };
