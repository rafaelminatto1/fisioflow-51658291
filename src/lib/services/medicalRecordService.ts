/**
 * Medical Record Service - Complete CRUD operations for patient medical records
 *
 * This service provides a comprehensive interface for managing patient medical records,
 * including SOAP notes, attachments, document history, and PDF export.
 */


// ===== TYPES =====

import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeFirestoreData } from '@/utils/firestoreData';

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
  heent?: string; // Head, Eyes, Ears, Nose, Throat
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

// ===== ERROR CLASS =====

export class MedicalRecordError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'MedicalRecordError';
  }
}

// ===== ANAMNESIS CRUD =====

/**
 * Get anamnesis records for a patient
 */
export async function getAnamnesisRecords(patientId: string): Promise<AnamnesisRecord[]> {
  try {
    const q = firestoreQuery(
      collection(db, 'anamnesis_records'),
      where('patient_id', '==', patientId),
      orderBy('record_date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data())
    } as AnamnesisRecord));
  } catch (error) {
    logger.error('Error fetching anamnesis records', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anamneses', 'FETCH_ERROR', error);
  }
}

/**
 * Get latest anamnesis for a patient
 */
export async function getLatestAnamnesis(patientId: string): Promise<AnamnesisRecord | null> {
  try {
    const q = firestoreQuery(
      collection(db, 'anamnesis_records'),
      where('patient_id', '==', patientId),
      orderBy('record_date', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...normalizeFirestoreData(doc.data())
    } as AnamnesisRecord;
  } catch (error) {
    logger.error('Error fetching latest anamnesis', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anamnese', 'FETCH_ERROR', error);
  }
}

/**
 * Create or update anamnesis record
 */
export async function saveAnamnesis(patientId: string, data: Partial<AnamnesisRecord>, userId: string): Promise<AnamnesisRecord> {
  try {
    const recordData = {
      ...data,
      patient_id: patientId,
      record_date: data.record_date || new Date().toISOString().split('T')[0],
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Check if there's an existing anamnesis for this date
    const existingQuery = firestoreQuery(
      collection(db, 'anamnesis_records'),
      where('patient_id', '==', patientId),
      where('record_date', '==', recordData.record_date),
      limit(1)
    );

    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      // Update existing record
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        ...recordData,
        created_at: existingDoc.data().created_at, // Preserve original creation date
      });

      return {
        id: existingDoc.id,
        ...recordData,
        created_at: existingDoc.data().created_at
      } as AnamnesisRecord;
    }

    // Create new record
    const docRef = await addDoc(collection(db, 'anamnesis_records'), {
      ...recordData,
      created_at: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      ...recordData
    } as AnamnesisRecord;
  } catch (error) {
    logger.error('Error saving anamnesis', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao salvar anamnese', 'SAVE_ERROR', error);
  }
}

/**
 * Delete anamnesis record
 */
export async function deleteAnamnesis(recordId: string): Promise<void> {
  try {
    const docRef = doc(db, 'anamnesis_records', recordId);
    await deleteDoc(docRef);
  } catch (error) {
    logger.error('Error deleting anamnesis', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao excluir anamnese', 'DELETE_ERROR', error);
  }
}

// ===== PHYSICAL EXAMINATION CRUD =====

/**
 * Get physical examination records for a patient
 */
export async function getPhysicalExaminations(patientId: string): Promise<PhysicalExamination[]> {
  try {
    const q = firestoreQuery(
      collection(db, 'physical_examinations'),
      where('patient_id', '==', patientId),
      orderBy('record_date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data())
    } as PhysicalExamination));
  } catch (error) {
    logger.error('Error fetching physical examinations', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar exames físicos', 'FETCH_ERROR', error);
  }
}

/**
 * Save physical examination record
 */
export async function savePhysicalExamination(patientId: string, data: Partial<PhysicalExamination>, userId: string): Promise<PhysicalExamination> {
  try {
    const recordData = {
      ...data,
      patient_id: patientId,
      record_date: data.record_date || new Date().toISOString().split('T')[0],
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'physical_examinations'), recordData);

    return {
      id: docRef.id,
      ...recordData
    } as PhysicalExamination;
  } catch (error) {
    logger.error('Error saving physical examination', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao salvar exame físico', 'SAVE_ERROR', error);
  }
}

// ===== TREATMENT PLAN CRUD =====

/**
 * Get treatment plans for a patient
 */
export async function getTreatmentPlans(patientId: string): Promise<TreatmentPlan[]> {
  try {
    const q = firestoreQuery(
      collection(db, 'treatment_plans'),
      where('patient_id', '==', patientId),
      orderBy('record_date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data())
    } as TreatmentPlan));
  } catch (error) {
    logger.error('Error fetching treatment plans', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar planos de tratamento', 'FETCH_ERROR', error);
  }
}

/**
 * Get active treatment plan for a patient
 */
export async function getActiveTreatmentPlan(patientId: string): Promise<TreatmentPlan | null> {
  try {
    const plans = await getTreatmentPlans(patientId);
    // Return the most recent plan
    return plans.length > 0 ? plans[0] : null;
  } catch (error) {
    logger.error('Error fetching active treatment plan', error, 'medicalRecordService');
    return null;
  }
}

/**
 * Save treatment plan
 */
export async function saveTreatmentPlan(patientId: string, data: Partial<TreatmentPlan>, userId: string): Promise<TreatmentPlan> {
  try {
    const recordData = {
      ...data,
      patient_id: patientId,
      record_date: data.record_date || new Date().toISOString().split('T')[0],
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'treatment_plans'), recordData);

    return {
      id: docRef.id,
      ...recordData
    } as TreatmentPlan;
  } catch (error) {
    logger.error('Error saving treatment plan', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao salvar plano de tratamento', 'SAVE_ERROR', error);
  }
}

/**
 * Update treatment plan
 */
export async function updateTreatmentPlan(planId: string, data: Partial<TreatmentPlan>): Promise<TreatmentPlan> {
  try {
    const docRef = doc(db, 'treatment_plans', planId);

    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    const snapshot = await getDoc(docRef);
    return {
      id: snapshot.id,
      ...snapshot.data()
    } as TreatmentPlan;
  } catch (error) {
    logger.error('Error updating treatment plan', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao atualizar plano de tratamento', 'UPDATE_ERROR', error);
  }
}

// ===== ATTACHMENTS =====

/**
 * Get attachments for a patient
 */
export async function getPatientAttachments(patientId: string): Promise<Attachment[]> {
  try {
    const q = firestoreQuery(
      collection(db, 'medical_attachments'),
      where('patient_id', '==', patientId),
      orderBy('uploaded_at', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data())
    } as Attachment));
  } catch (error) {
    logger.error('Error fetching attachments', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anexos', 'FETCH_ERROR', error);
  }
}

/**
 * Get attachments for a specific record
 */
export async function getRecordAttachments(recordId: string): Promise<Attachment[]> {
  try {
    const q = firestoreQuery(
      collection(db, 'medical_attachments'),
      where('record_id', '==', recordId),
      orderBy('uploaded_at', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data())
    } as Attachment));
  } catch (error) {
    logger.error('Error fetching record attachments', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar anexos', 'FETCH_ERROR', error);
  }
}

/**
 * Delete attachment
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'medical_attachments', attachmentId);
    await deleteDoc(docRef);
  } catch (error) {
    logger.error('Error deleting attachment', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao excluir anexo', 'DELETE_ERROR', error);
  }
}

// ===== CONSULTATION HISTORY =====

/**
 * Get complete consultation history for a patient
 * Includes SOAP notes, treatment plans, and examinations
 */
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

export async function getConsultationHistory(patientId: string, _startDate?: string, _endDate?: string): Promise<ConsultationHistory[]> {
  try {
    // This would be more efficient with a proper backend function
    // For now, fetch all relevant records and group them by date

    const historyMap = new Map<string, ConsultationHistory>();

    // Fetch SOAP notes
    const soapQuery = firestoreQuery(
      collection(db, 'soap_records'),
      where('patient_id', '==', patientId),
      orderBy('record_date', 'desc')
    );
    const soapSnapshot = await getDocs(soapQuery);

    soapSnapshot.docs.forEach(doc => {
      const data = normalizeFirestoreData(doc.data());
      const date = data.record_date || data.created_at;

      if (!historyMap.has(date)) {
        historyMap.set(date, { date });
      }

      const entry = historyMap.get(date)!;
      if (!entry.soap_notes) entry.soap_notes = [];
      entry.soap_notes.push({
        id: doc.id,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        status: data.status,
      });
    });

    // Convert map to array and sort by date descending
    return Array.from(historyMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  } catch (error) {
    logger.error('Error fetching consultation history', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao buscar histórico de consultas', 'FETCH_ERROR', error);
  }
}

// ===== PDF EXPORT =====

/**
 * Generate medical record summary for PDF export
 */
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

export async function generateMedicalRecordSummary(patientId: string, patientData: {
  name: string;
  birthDate?: string;
  cpf?: string;
  phone?: string;
  email?: string;
}): Promise<MedicalRecordSummary> {
  try {
    const [anamnesis, examinations, plans, soapRecords] = await Promise.all([
      getLatestAnamnesis(patientId),
      getPhysicalExaminations(patientId),
      getTreatmentPlans(patientId),
      getDocs(firestoreQuery(
        collection(db, 'soap_records'),
        where('patient_id', '==', patientId),
        orderBy('record_date', 'desc'),
        limit(5)
      )),
    ]);

    const recentNotes = soapRecords.docs.map(doc => {
      const data = normalizeFirestoreData(doc.data());
      return {
        date: data.record_date || data.created_at,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
      };
    });

    return {
      patient: patientData,
      anamnesis: anamnesis || undefined,
      latestExamination: examinations[0] || undefined,
      activePlan: plans[0] || undefined,
      recentNotes,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error generating medical record summary', error, 'medicalRecordService');
    throw new MedicalRecordError('Erro ao gerar resumo do prontuário', 'SUMMARY_ERROR', error);
  }
}

/**
 * Format medical record summary as HTML for PDF generation
 */
export function formatMedicalRecordAsHTML(summary: MedicalRecordSummary): string {
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
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
    ${summary.recentNotes.map(note => `
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

// Export singleton instance
export const medicalRecordService = {
  // Anamnesis
  getAnamnesisRecords,
  getLatestAnamnesis,
  saveAnamnesis,
  deleteAnamnesis,

  // Physical Examination
  getPhysicalExaminations,
  savePhysicalExamination,

  // Treatment Plans
  getTreatmentPlans,
  getActiveTreatmentPlan,
  saveTreatmentPlan,
  updateTreatmentPlan,

  // Attachments
  getPatientAttachments,
  getRecordAttachments,
  deleteAttachment,

  // History
  getConsultationHistory,

  // Export
  generateMedicalRecordSummary,
  formatMedicalRecordAsHTML,
};