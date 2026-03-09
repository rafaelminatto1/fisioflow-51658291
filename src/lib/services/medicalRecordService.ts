/**
 * Medical Record Service - Workers/Neon first, local fallback for unsupported sections
 */

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { patientsApi, sessionsApi, type PatientMedicalRecord, type SessionRecord } from '@/lib/api/workers-client';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface MedicalRecord {
  id: string;
  patient_id: string;
  patient_name?: string;
  record_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name?: string;
}

export interface AnamnesisRecord extends MedicalRecord {
  chief_complaint?: string;
  history_present_illness?: string;
  past_medical_history?: string;
  medications?: string[];
  allergies?: string[];
  family_history?: string;
  social_history?: string;
  occupational_history?: string;
  lifestyle?: {
    smoking?: boolean;
    alcohol?: boolean;
    exercise?: string;
    diet?: string;
  };
}

export interface PhysicalExamination extends MedicalRecord {
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: number;
    respiratory_rate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  general_appearance?: string;
  heent?: string;
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  musculoskeletal?: string;
  neurological?: string;
  integumentary?: string;
  psychological?: string;
}

export interface TreatmentPlan extends MedicalRecord {
  diagnosis?: string[];
  objectives?: string[];
  procedures?: string[];
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    frequency?: string;
    duration?: string;
  }>;
  recommendations?: string[];
  follow_up_date?: string;
}

export interface Attachment {
  id: string;
  record_id: string;
  patient_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: string;
  category?: 'exam' | 'imaging' | 'document' | 'photo' | 'other';
  description?: string;
}

export class MedicalRecordError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'MedicalRecordError';
  }
}

const ANAMNESIS_INDEX_KEY = 'medical-records:anamnesis-index';
const PHYSICAL_EXAM_PREFIX = 'medical-records:physical:';
const TREATMENT_PLAN_PREFIX = 'medical-records:treatment:';
const ATTACHMENTS_PREFIX = 'medical-records:attachments:';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function listKeys(prefix: string): string[] {
  if (!canUseStorage()) return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

function sortByDateDesc<T extends { record_date?: string; created_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const left = a.record_date ?? a.created_at ?? '';
    const right = b.record_date ?? b.created_at ?? '';
    return right.localeCompare(left);
  });
}

function physicalExamKey(patientId: string) {
  return `${PHYSICAL_EXAM_PREFIX}${patientId}`;
}

function treatmentPlanKey(patientId: string) {
  return `${TREATMENT_PLAN_PREFIX}${patientId}`;
}

function attachmentsKey(patientId: string) {
  return `${ATTACHMENTS_PREFIX}${patientId}`;
}

function mapMedicalRecord(record: PatientMedicalRecord): AnamnesisRecord {
  return {
    id: record.id,
    patient_id: record.patient_id,
    record_date: record.record_date,
    created_at: record.created_at ?? record.record_date,
    updated_at: record.updated_at ?? record.record_date,
    created_by: record.created_by ?? '',
    chief_complaint: record.chief_complaint ?? undefined,
    history_present_illness: record.medical_history ?? undefined,
    past_medical_history: record.previous_surgeries ?? undefined,
    medications: splitCsv(record.current_medications),
    allergies: splitCsv(record.allergies),
    family_history: record.family_history ?? undefined,
    lifestyle: record.lifestyle_habits
      ? {
          exercise: record.lifestyle_habits,
        }
      : undefined,
  };
}

function splitCsv(value?: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function joinCsv(values?: string[]): string | undefined {
  if (!values?.length) return undefined;
  return values.join(', ');
}

function rememberAnamnesisRecord(record: { id: string; patient_id: string }) {
  const index = readJson<Record<string, string>>(ANAMNESIS_INDEX_KEY, {});
  index[record.id] = record.patient_id;
  writeJson(ANAMNESIS_INDEX_KEY, index);
}

function getPatientIdByAnamnesisRecord(recordId: string): string | null {
  const index = readJson<Record<string, string>>(ANAMNESIS_INDEX_KEY, {});
  return index[recordId] ?? null;
}

async function upsertPatientMedicalRecord(
  patientId: string,
  data: Partial<AnamnesisRecord>,
  userId: string,
): Promise<AnamnesisRecord> {
  const existing = await patientsApi.medicalRecords(patientId);
  const current = existing.data?.[0];
  const payload = {
    chief_complaint: data.chief_complaint,
    medical_history: data.history_present_illness,
    previous_surgeries: data.past_medical_history,
    current_medications: joinCsv(data.medications),
    allergies: joinCsv(data.allergies),
    family_history: data.family_history,
    lifestyle_habits: data.lifestyle?.exercise,
    record_date: data.record_date ?? new Date().toISOString().slice(0, 10),
    created_by: userId,
  };

  const response = current
    ? await patientsApi.updateMedicalRecord(patientId, current.id, payload)
    : await patientsApi.createMedicalRecord(patientId, payload);
  const mapped = mapMedicalRecord(response.data);
  rememberAnamnesisRecord(mapped);
  return mapped;
}

function getLocalCollection<T>(prefixKey: string): T[] {
  return sortByDateDesc(readJson<T[]>(prefixKey, [] as T[]));
}

function saveLocalCollection<T>(prefixKey: string, items: T[]) {
  writeJson(prefixKey, items);
}

function buildRecordId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function upsertLocalRecord<T extends MedicalRecord>(
  storageKey: string,
  data: Partial<T>,
  patientId: string,
  userId: string,
  idPrefix: string,
): Promise<T> {
  const items = getLocalCollection<T>(storageKey);
  const id = data.id ?? buildRecordId(idPrefix);
  const createdAt = items.find((item) => item.id === id)?.created_at ?? new Date().toISOString();
  const nextRecord = {
    ...(items.find((item) => item.id === id) ?? {}),
    ...data,
    id,
    patient_id: patientId,
    record_date: data.record_date ?? new Date().toISOString().slice(0, 10),
    created_by: data.created_by ?? userId,
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  } as T;

  const nextItems = sortByDateDesc([
    nextRecord,
    ...items.filter((item) => item.id !== id),
  ]);
  saveLocalCollection(storageKey, nextItems);
  return nextRecord;
}

function removeFromLocalCollection(prefix: string, id: string): boolean {
  const keys = listKeys(prefix);
  let removed = false;
  keys.forEach((key) => {
    const items = readJson<Array<{ id: string }>>(key, []);
    const next = items.filter((item) => item.id !== id);
    if (next.length !== items.length) {
      removed = true;
      writeJson(key, next);
    }
  });
  return removed;
}

export async function getAnamnesisRecords(patientId: string): Promise<AnamnesisRecord[]> {
  try {
    const response = await patientsApi.medicalRecords(patientId);
    const records = (response.data ?? []).map(mapMedicalRecord);
    records.forEach(rememberAnamnesisRecord);
    return sortByDateDesc(records);
  } catch (error) {
    logger.error('Error fetching anamnesis records', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anamneses', 'FETCH_ERROR', error);
  }
}

export async function getLatestAnamnesis(patientId: string): Promise<AnamnesisRecord | null> {
  try {
    const records = await getAnamnesisRecords(patientId);
    return records[0] ?? null;
  } catch (error) {
    logger.error('Error fetching latest anamnesis', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anamnese', 'FETCH_ERROR', error);
  }
}

export async function saveAnamnesis(
  patientId: string,
  data: Partial<AnamnesisRecord>,
  userId: string,
): Promise<AnamnesisRecord> {
  try {
    return await upsertPatientMedicalRecord(patientId, data, userId);
  } catch (error) {
    logger.error('Error saving anamnesis', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao salvar anamnese', 'SAVE_ERROR', error);
  }
}

export async function deleteAnamnesis(recordId: string): Promise<void> {
  try {
    const patientId = getPatientIdByAnamnesisRecord(recordId);
    if (!patientId) throw new Error('Paciente do prontuário não encontrado');
    await patientsApi.deleteMedicalRecord(patientId, recordId);
  } catch (error) {
    logger.error('Error deleting anamnesis', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao excluir anamnese', 'DELETE_ERROR', error);
  }
}

export async function getPhysicalExaminations(patientId: string): Promise<PhysicalExamination[]> {
  try {
    return getLocalCollection<PhysicalExamination>(physicalExamKey(patientId));
  } catch (error) {
    logger.error('Error fetching physical examinations', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar exames físicos', 'FETCH_ERROR', error);
  }
}

export async function savePhysicalExamination(
  patientId: string,
  data: Partial<PhysicalExamination>,
  userId: string,
): Promise<PhysicalExamination> {
  try {
    return await upsertLocalRecord<PhysicalExamination>(
      physicalExamKey(patientId),
      data,
      patientId,
      userId,
      'physical-exam',
    );
  } catch (error) {
    logger.error('Error saving physical examination', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao salvar exame físico', 'SAVE_ERROR', error);
  }
}

export async function getTreatmentPlans(patientId: string): Promise<TreatmentPlan[]> {
  try {
    return getLocalCollection<TreatmentPlan>(treatmentPlanKey(patientId));
  } catch (error) {
    logger.error('Error fetching treatment plans', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar planos de tratamento', 'FETCH_ERROR', error);
  }
}

export async function getActiveTreatmentPlan(patientId: string): Promise<TreatmentPlan | null> {
  try {
    const plans = await getTreatmentPlans(patientId);
    return plans[0] ?? null;
  } catch (error) {
    logger.error('Error fetching active treatment plan', error, 'medicalRecordService');
    return null;
  }
}

export async function saveTreatmentPlan(
  patientId: string,
  data: Partial<TreatmentPlan>,
  userId: string,
): Promise<TreatmentPlan> {
  try {
    return await upsertLocalRecord<TreatmentPlan>(
      treatmentPlanKey(patientId),
      data,
      patientId,
      userId,
      'treatment-plan',
    );
  } catch (error) {
    logger.error('Error saving treatment plan', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao salvar plano de tratamento', 'SAVE_ERROR', error);
  }
}

export async function updateTreatmentPlan(planId: string, data: Partial<TreatmentPlan>): Promise<TreatmentPlan> {
  try {
    const keys = listKeys(TREATMENT_PLAN_PREFIX);
    for (const key of keys) {
      const patientId = key.replace(TREATMENT_PLAN_PREFIX, '');
      const items = readJson<TreatmentPlan[]>(key, []);
      const current = items.find((item) => item.id === planId);
      if (!current) continue;
      return upsertLocalRecord<TreatmentPlan>(
        key,
        { ...current, ...data },
        patientId,
        current.created_by,
        'treatment-plan',
      );
    }
    throw new Error('Plano de tratamento não encontrado');
  } catch (error) {
    logger.error('Error updating treatment plan', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao atualizar plano de tratamento', 'UPDATE_ERROR', error);
  }
}

export async function getPatientAttachments(patientId: string): Promise<Attachment[]> {
  try {
    return getLocalCollection<Attachment>(attachmentsKey(patientId));
  } catch (error) {
    logger.error('Error fetching attachments', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anexos', 'FETCH_ERROR', error);
  }
}

export async function getRecordAttachments(recordId: string): Promise<Attachment[]> {
  try {
    return listKeys(ATTACHMENTS_PREFIX)
      .flatMap((key) => readJson<Attachment[]>(key, []))
      .filter((attachment) => attachment.record_id === recordId)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  } catch (error) {
    logger.error('Error fetching record attachments', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anexos', 'FETCH_ERROR', error);
  }
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  try {
    const removed = removeFromLocalCollection(ATTACHMENTS_PREFIX, attachmentId);
    if (!removed) throw new Error('Anexo não encontrado');
  } catch (error) {
    logger.error('Error deleting attachment', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao excluir anexo', 'DELETE_ERROR', error);
  }
}

export interface ConsultationHistory {
  date: string;
  soap_notes?: Array<{
    id: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    status: string;
  }>;
  treatment_plans?: Array<{
    id: string;
    diagnosis?: string[];
    objectives?: string[];
    procedures?: string[];
  }>;
  examinations?: Array<{
    id: string;
    vital_signs?: Record<string, unknown>;
  }>;
}

function toHistoryEntry(session: SessionRecord) {
  return {
    id: session.id,
    subjective: session.subjective,
    objective: session.objective,
    assessment: session.assessment,
    plan: session.plan,
    status: session.status,
  };
}

export async function getConsultationHistory(
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<ConsultationHistory[]> {
  try {
    const [sessionsResponse, treatmentPlans, examinations] = await Promise.all([
      sessionsApi.list({ patientId, limit: 100 }),
      getTreatmentPlans(patientId),
      getPhysicalExaminations(patientId),
    ]);

    const historyMap = new Map<string, ConsultationHistory>();

    (sessionsResponse.data ?? []).forEach((session) => {
      const date = session.record_date ?? session.created_at;
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;
      const current = historyMap.get(date) ?? { date };
      current.soap_notes = [...(current.soap_notes ?? []), toHistoryEntry(session)];
      historyMap.set(date, current);
    });

    treatmentPlans.forEach((plan) => {
      const date = plan.record_date;
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;
      const current = historyMap.get(date) ?? { date };
      current.treatment_plans = [
        ...(current.treatment_plans ?? []),
        {
          id: plan.id,
          diagnosis: plan.diagnosis,
          objectives: plan.objectives,
          procedures: plan.procedures,
        },
      ];
      historyMap.set(date, current);
    });

    examinations.forEach((exam) => {
      const date = exam.record_date;
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;
      const current = historyMap.get(date) ?? { date };
      current.examinations = [
        ...(current.examinations ?? []),
        {
          id: exam.id,
          vital_signs: exam.vital_signs,
        },
      ];
      historyMap.set(date, current);
    });

    return Array.from(historyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    logger.error('Error fetching consultation history', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar histórico de consultas', 'FETCH_ERROR', error);
  }
}

export interface MedicalRecordSummary {
  patient: {
    name: string;
    birthDate?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  };
  anamnesis?: AnamnesisRecord;
  latestExamination?: PhysicalExamination;
  activePlan?: TreatmentPlan;
  recentNotes: Array<{
    date: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  }>;
  generatedAt: string;
}

export async function generateMedicalRecordSummary(
  patientId: string,
  patientData: {
    name: string;
    birthDate?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  },
): Promise<MedicalRecordSummary> {
  try {
    const [anamnesis, examinations, plans, sessionsResponse] = await Promise.all([
      getLatestAnamnesis(patientId),
      getPhysicalExaminations(patientId),
      getTreatmentPlans(patientId),
      sessionsApi.list({ patientId, limit: 5 }),
    ]);

    const recentNotes = (sessionsResponse.data ?? []).slice(0, 5).map((session) => ({
      date: session.record_date ?? session.created_at,
      subjective: session.subjective,
      objective: session.objective,
      assessment: session.assessment,
      plan: session.plan,
    }));

    return {
      patient: patientData,
      anamnesis: anamnesis ?? undefined,
      latestExamination: examinations[0] ?? undefined,
      activePlan: plans[0] ?? undefined,
      recentNotes,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error generating medical record summary', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao gerar resumo do prontuário', 'SUMMARY_ERROR', error);
  }
}

export function formatMedicalRecordAsHTML(summary: MedicalRecordSummary): string {
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prontuário - ${summary.patient.name}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
    }
    .header .date {
      color: #666;
      font-size: 14px;
    }
    .patient-info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .patient-info h2 {
      margin-top: 0;
      color: #1f2937;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h3 {
      color: #2563eb;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-weight: 600;
      color: #374151;
    }
    .soap-note {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .soap-note .date {
      color: #2563eb;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .soap-section {
      margin-bottom: 10px;
    }
    .soap-label {
      font-weight: 600;
      color: #6b7280;
    }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Prontuário Eletrônico</h1>
    <div class="date">Gerado em: ${formatDate(summary.generatedAt)}</div>
  </div>

  <div class="patient-info">
    <h2>Dados do Paciente</h2>
    <div class="field">
      <span class="field-label">Nome:</span> ${summary.patient.name}
    </div>
    ${summary.patient.birthDate ? `<div class="field"><span class="field-label">Data de Nascimento:</span> ${formatDate(summary.patient.birthDate)}</div>` : ''}
    ${summary.patient.cpf ? `<div class="field"><span class="field-label">CPF:</span> ${summary.patient.cpf}</div>` : ''}
    ${summary.patient.phone ? `<div class="field"><span class="field-label">Telefone:</span> ${summary.patient.phone}</div>` : ''}
    ${summary.patient.email ? `<div class="field"><span class="field-label">Email:</span> ${summary.patient.email}</div>` : ''}
  </div>

  ${summary.anamnesis ? `
  <div class="section">
    <h3>Anamnese</h3>
    ${summary.anamnesis.chief_complaint ? `<div class="field"><span class="field-label">Queixa Principal:</span> ${summary.anamnesis.chief_complaint}</div>` : ''}
    ${summary.anamnesis.history_present_illness ? `<div class="field"><span class="field-label">História da Doença Atual:</span> ${summary.anamnesis.history_present_illness}</div>` : ''}
    ${summary.anamnesis.past_medical_history ? `<div class="field"><span class="field-label">Histórico Médico:</span> ${summary.anamnesis.past_medical_history}</div>` : ''}
    ${summary.anamnesis.medications?.length ? `<div class="field"><span class="field-label">Medicações:</span> ${summary.anamnesis.medications.join(', ')}</div>` : ''}
    ${summary.anamnesis.allergies?.length ? `<div class="field"><span class="field-label">Alergias:</span> ${summary.anamnesis.allergies.join(', ')}</div>` : ''}
  </div>
  ` : ''}

  ${summary.latestExamination ? `
  <div class="section">
    <h3>Exame Físico</h3>
    ${summary.latestExamination.vital_signs?.blood_pressure ? `<div class="field"><span class="field-label">Pressão Arterial:</span> ${summary.latestExamination.vital_signs.blood_pressure}</div>` : ''}
    ${summary.latestExamination.vital_signs?.heart_rate ? `<div class="field"><span class="field-label">Frequência Cardíaca:</span> ${summary.latestExamination.vital_signs.heart_rate} bpm</div>` : ''}
    ${summary.latestExamination.vital_signs?.weight ? `<div class="field"><span class="field-label">Peso:</span> ${summary.latestExamination.vital_signs.weight} kg</div>` : ''}
    ${summary.latestExamination.musculoskeletal ? `<div class="field"><span class="field-label">Sistema Musculoesquelético:</span> ${summary.latestExamination.musculoskeletal}</div>` : ''}
  </div>
  ` : ''}

  ${summary.activePlan ? `
  <div class="section">
    <h3>Plano de Tratamento</h3>
    ${summary.activePlan.diagnosis?.length ? `<div class="field"><span class="field-label">Diagnóstico:</span> ${summary.activePlan.diagnosis.join(', ')}</div>` : ''}
    ${summary.activePlan.objectives?.length ? `<div class="field"><span class="field-label">Objetivos:</span> ${summary.activePlan.objectives.join(', ')}</div>` : ''}
    ${summary.activePlan.procedures?.length ? `<div class="field"><span class="field-label">Procedimentos:</span> ${summary.activePlan.procedures.join(', ')}</div>` : ''}
    ${summary.activePlan.follow_up_date ? `<div class="field"><span class="field-label">Próxima Consulta:</span> ${formatDate(summary.activePlan.follow_up_date)}</div>` : ''}
  </div>
  ` : ''}

  ${summary.recentNotes.length > 0 ? `
  <div class="section">
    <h3>Evoluções Recentes</h3>
    ${summary.recentNotes.map((note) => `
      <div class="soap-note">
        <div class="date">${formatDate(note.date)}</div>
        ${note.subjective ? `<div class="soap-section"><span class="soap-label">S (Subjetivo):</span> ${note.subjective}</div>` : ''}
        ${note.objective ? `<div class="soap-section"><span class="soap-label">O (Objetivo):</span> ${note.objective}</div>` : ''}
        ${note.assessment ? `<div class="soap-section"><span class="soap-label">A (Avaliação):</span> ${note.assessment}</div>` : ''}
        ${note.plan ? `<div class="soap-section"><span class="soap-label">P (Plano):</span> ${note.plan}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div style="margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px;">
    Gerado por FisioFlow - Sistema de Gestão para Fisioterapeutas
  </div>
</body>
</html>
  `.trim();
}

export const medicalRecordService = {
  getAnamnesisRecords,
  getLatestAnamnesis,
  saveAnamnesis,
  deleteAnamnesis,
  getPhysicalExaminations,
  savePhysicalExamination,
  getTreatmentPlans,
  getActiveTreatmentPlan,
  saveTreatmentPlan,
  updateTreatmentPlan,
  getPatientAttachments,
  getRecordAttachments,
  deleteAttachment,
  getConsultationHistory,
  generateMedicalRecordSummary,
  formatMedicalRecordAsHTML,
};
