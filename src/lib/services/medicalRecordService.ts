/**
 * Medical Record Service - Workers/Neon backed
 */

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	patientsApi,
	sessionsApi,
	type PatientMedicalAttachment,
	type PatientMedicalRecord,
	type PatientPhysicalExamination,
	type PatientTreatmentPlan,
	type SessionRecord,
} from "@/lib/api/workers-client";
import { fisioLogger as logger } from "@/lib/errors/logger";

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
	category?: "exam" | "imaging" | "document" | "photo" | "other";
	description?: string;
}

export class MedicalRecordError extends Error {
	constructor(
		message: string,
		public code?: string,
		public originalError?: unknown,
	) {
		super(message);
		this.name = "MedicalRecordError";
	}
}

function splitCsv(value?: string | null): string[] | undefined {
	if (!value) return undefined;
	const items = value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	return items.length ? items : undefined;
}

function joinCsv(values?: string[]): string | undefined {
	if (!values?.length) return undefined;
	return values.join(", ");
}

function mapMedicalRecord(record: PatientMedicalRecord): AnamnesisRecord {
	return {
		id: record.id,
		patient_id: record.patient_id,
		record_date: record.record_date,
		created_at: record.created_at ?? record.record_date,
		updated_at: record.updated_at ?? record.record_date,
		created_by: record.created_by ?? "",
		chief_complaint: record.chief_complaint ?? undefined,
		history_present_illness: record.medical_history ?? undefined,
		past_medical_history: record.previous_surgeries ?? undefined,
		medications: splitCsv(record.current_medications),
		allergies: splitCsv(record.allergies),
		family_history: record.family_history ?? undefined,
		lifestyle: record.lifestyle_habits
			? { exercise: record.lifestyle_habits }
			: undefined,
	};
}

function mapPhysicalExamination(
	record: PatientPhysicalExamination,
): PhysicalExamination {
	return {
		id: record.id,
		patient_id: record.patient_id,
		record_date: record.record_date,
		created_at: record.created_at ?? record.record_date,
		updated_at: record.updated_at ?? record.record_date,
		created_by: record.created_by ?? "",
		vital_signs:
			(record.vital_signs as PhysicalExamination["vital_signs"]) ?? {},
		general_appearance: record.general_appearance ?? undefined,
		heent: record.heent ?? undefined,
		cardiovascular: record.cardiovascular ?? undefined,
		respiratory: record.respiratory ?? undefined,
		gastrointestinal: record.gastrointestinal ?? undefined,
		musculoskeletal: record.musculoskeletal ?? undefined,
		neurological: record.neurological ?? undefined,
		integumentary: record.integumentary ?? undefined,
		psychological: record.psychological ?? undefined,
	};
}

function mapTreatmentPlan(record: PatientTreatmentPlan): TreatmentPlan {
	return {
		id: record.id,
		patient_id: record.patient_id,
		record_date: record.record_date,
		created_at: record.created_at ?? record.record_date,
		updated_at: record.updated_at ?? record.record_date,
		created_by: record.created_by ?? "",
		diagnosis: Array.isArray(record.diagnosis)
			? record.diagnosis.map(String)
			: undefined,
		objectives: Array.isArray(record.objectives)
			? record.objectives.map(String)
			: undefined,
		procedures: Array.isArray(record.procedures)
			? record.procedures.map(String)
			: undefined,
		exercises: Array.isArray(record.exercises)
			? record.exercises.map((exercise) => {
					const item = exercise as Record<string, unknown>;
					return {
						name: String(item.name ?? ""),
						sets: item.sets != null ? Number(item.sets) : undefined,
						reps: item.reps != null ? Number(item.reps) : undefined,
						frequency:
							item.frequency != null ? String(item.frequency) : undefined,
						duration: item.duration != null ? String(item.duration) : undefined,
					};
				})
			: undefined,
		recommendations: Array.isArray(record.recommendations)
			? record.recommendations.map(String)
			: undefined,
		follow_up_date: record.follow_up_date ?? undefined,
	};
}

function mapAttachment(record: PatientMedicalAttachment): Attachment {
	return {
		id: record.id,
		record_id: record.record_id ?? "",
		patient_id: record.patient_id,
		file_name: record.file_name,
		file_url: record.file_url,
		file_type: record.file_type,
		file_size: record.file_size ?? undefined,
		uploaded_at: record.uploaded_at ?? new Date().toISOString(),
		uploaded_by: record.uploaded_by ?? undefined,
		category: (record.category as Attachment["category"]) ?? "other",
		description: record.description ?? undefined,
	};
}

export async function getAnamnesisRecords(
	patientId: string,
): Promise<AnamnesisRecord[]> {
	try {
		const response = await patientsApi.medicalRecords(patientId);
		return (response.data ?? [])
			.map(mapMedicalRecord)
			.sort((a, b) => b.record_date.localeCompare(a.record_date));
	} catch (error) {
		logger.error(
			"Error fetching anamnesis records",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao buscar anamneses",
			"FETCH_ERROR",
			error,
		);
	}
}

export async function getLatestAnamnesis(
	patientId: string,
): Promise<AnamnesisRecord | null> {
	const records = await getAnamnesisRecords(patientId);
	return records[0] ?? null;
}

export async function saveAnamnesis(
	patientId: string,
	data: Partial<AnamnesisRecord>,
	userId: string,
): Promise<AnamnesisRecord> {
	try {
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
		return mapMedicalRecord(response.data);
	} catch (error) {
		logger.error("Error saving anamnesis", error, "medicalRecordService");
		throw new MedicalRecordError(
			"Erro ao salvar anamnese",
			"SAVE_ERROR",
			error,
		);
	}
}

export async function deleteAnamnesis(
	recordId: string,
	patientId?: string,
): Promise<void> {
	try {
		if (!patientId)
			throw new Error(
				`deleteAnamnesis requer patientId para remover ${recordId}`,
			);
		await patientsApi.deleteMedicalRecord(patientId, recordId);
	} catch (error) {
		logger.error("Error deleting anamnesis", error, "medicalRecordService");
		throw new MedicalRecordError(
			"Erro ao excluir anamnese",
			"DELETE_ERROR",
			error,
		);
	}
}

export async function getPhysicalExaminations(
	patientId: string,
): Promise<PhysicalExamination[]> {
	try {
		const response = await patientsApi.physicalExaminations(patientId);
		return (response.data ?? [])
			.map(mapPhysicalExamination)
			.sort((a, b) => b.record_date.localeCompare(a.record_date));
	} catch (error) {
		logger.error(
			"Error fetching physical examinations",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao buscar exames físicos",
			"FETCH_ERROR",
			error,
		);
	}
}

export async function savePhysicalExamination(
	patientId: string,
	data: Partial<PhysicalExamination>,
	userId: string,
): Promise<PhysicalExamination> {
	try {
		const payload = {
			record_date: data.record_date ?? new Date().toISOString().slice(0, 10),
			created_by: userId,
			vital_signs: data.vital_signs ?? {},
			general_appearance: data.general_appearance,
			heent: data.heent,
			cardiovascular: data.cardiovascular,
			respiratory: data.respiratory,
			gastrointestinal: data.gastrointestinal,
			musculoskeletal: data.musculoskeletal,
			neurological: data.neurological,
			integumentary: data.integumentary,
			psychological: data.psychological,
		};
		const response = data.id
			? await patientsApi.updatePhysicalExamination(patientId, data.id, payload)
			: await patientsApi.createPhysicalExamination(patientId, payload);
		return mapPhysicalExamination(response.data);
	} catch (error) {
		logger.error(
			"Error saving physical examination",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao salvar exame físico",
			"SAVE_ERROR",
			error,
		);
	}
}

export async function getTreatmentPlans(
	patientId: string,
): Promise<TreatmentPlan[]> {
	try {
		const response = await patientsApi.treatmentPlans(patientId);
		return (response.data ?? [])
			.map(mapTreatmentPlan)
			.sort((a, b) => b.record_date.localeCompare(a.record_date));
	} catch (error) {
		logger.error(
			"Error fetching treatment plans",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao buscar planos de tratamento",
			"FETCH_ERROR",
			error,
		);
	}
}

export async function getActiveTreatmentPlan(
	patientId: string,
): Promise<TreatmentPlan | null> {
	const plans = await getTreatmentPlans(patientId);
	return plans[0] ?? null;
}

export async function saveTreatmentPlan(
	patientId: string,
	data: Partial<TreatmentPlan>,
	userId: string,
): Promise<TreatmentPlan> {
	try {
		const payload = {
			record_date: data.record_date ?? new Date().toISOString().slice(0, 10),
			created_by: userId,
			diagnosis: data.diagnosis ?? [],
			objectives: data.objectives ?? [],
			procedures: data.procedures ?? [],
			exercises: data.exercises ?? [],
			recommendations: data.recommendations ?? [],
			follow_up_date: data.follow_up_date,
		};
		const response = data.id
			? await patientsApi.updateTreatmentPlan(patientId, data.id, payload)
			: await patientsApi.createTreatmentPlan(patientId, payload);
		return mapTreatmentPlan(response.data);
	} catch (error) {
		logger.error("Error saving treatment plan", error, "medicalRecordService");
		throw new MedicalRecordError(
			"Erro ao salvar plano de tratamento",
			"SAVE_ERROR",
			error,
		);
	}
}

export async function updateTreatmentPlan(
	patientId: string,
	planId: string,
	data: Partial<TreatmentPlan>,
): Promise<TreatmentPlan> {
	try {
		const response = await patientsApi.updateTreatmentPlan(patientId, planId, {
			record_date: data.record_date,
			created_by: data.created_by,
			diagnosis: data.diagnosis,
			objectives: data.objectives,
			procedures: data.procedures,
			exercises: data.exercises,
			recommendations: data.recommendations,
			follow_up_date: data.follow_up_date,
		});
		return mapTreatmentPlan(response.data);
	} catch (error) {
		logger.error(
			"Error updating treatment plan",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao atualizar plano de tratamento",
			"UPDATE_ERROR",
			error,
		);
	}
}

export async function getPatientAttachments(
	patientId: string,
): Promise<Attachment[]> {
	try {
		const response = await patientsApi.medicalAttachments(patientId);
		return (response.data ?? []).map(mapAttachment);
	} catch (error) {
		logger.error("Error fetching attachments", error, "medicalRecordService");
		throw new MedicalRecordError("Erro ao buscar anexos", "FETCH_ERROR", error);
	}
}

export async function getRecordAttachments(
	recordId: string,
): Promise<Attachment[]> {
	try {
		logger.warn(
			`getRecordAttachments(${recordId}) requer patientId no backend atual; retornando lista vazia`,
			undefined,
			"medicalRecordService",
		);
		return [];
	} catch (error) {
		logger.error(
			"Error fetching record attachments",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError("Erro ao buscar anexos", "FETCH_ERROR", error);
	}
}

export async function deleteAttachment(
	attachmentId: string,
	patientId?: string,
): Promise<void> {
	try {
		if (!patientId)
			throw new Error(
				`deleteAttachment requer patientId para remover ${attachmentId}`,
			);
		await patientsApi.deleteMedicalAttachment(patientId, attachmentId);
	} catch (error) {
		logger.error("Error deleting attachment", error, "medicalRecordService");
		throw new MedicalRecordError(
			"Erro ao excluir anexo",
			"DELETE_ERROR",
			error,
		);
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
			current.soap_notes = [
				...(current.soap_notes ?? []),
				toHistoryEntry(session),
			];
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
				{ id: exam.id, vital_signs: exam.vital_signs },
			];
			historyMap.set(date, current);
		});

		return Array.from(historyMap.values()).sort((a, b) =>
			b.date.localeCompare(a.date),
		);
	} catch (error) {
		logger.error(
			"Error fetching consultation history",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao buscar histórico de consultas",
			"FETCH_ERROR",
			error,
		);
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
		const [anamnesis, examinations, plans, sessionsResponse] =
			await Promise.all([
				getLatestAnamnesis(patientId),
				getPhysicalExaminations(patientId),
				getTreatmentPlans(patientId),
				sessionsApi.list({ patientId, limit: 5 }),
			]);

		const recentNotes = (sessionsResponse.data ?? [])
			.slice(0, 5)
			.map((session) => ({
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
		logger.error(
			"Error generating medical record summary",
			error,
			"medicalRecordService",
		);
		throw new MedicalRecordError(
			"Erro ao gerar resumo do prontuário",
			"SUMMARY_ERROR",
			error,
		);
	}
}

export function formatMedicalRecordAsHTML(
	summary: MedicalRecordSummary,
): string {
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #2563eb; margin: 0; }
    .header .date { color: #666; font-size: 14px; }
    .patient-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .patient-info h2 { margin-top: 0; color: #1f2937; }
    .section { margin-bottom: 30px; }
    .section h3 { color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
    .field { margin-bottom: 10px; }
    .field-label { font-weight: 600; color: #374151; }
    .soap-note { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .soap-note .date { color: #2563eb; font-weight: 600; margin-bottom: 10px; }
    .soap-section { margin-bottom: 10px; }
    .soap-label { font-weight: 600; color: #6b7280; }
    @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Prontuário Eletrônico</h1>
    <div class="date">Gerado em: ${formatDate(summary.generatedAt)}</div>
  </div>
  <div class="patient-info">
    <h2>Dados do Paciente</h2>
    <div class="field"><span class="field-label">Nome:</span> ${summary.patient.name}</div>
    ${summary.patient.birthDate ? `<div class="field"><span class="field-label">Data de Nascimento:</span> ${formatDate(summary.patient.birthDate)}</div>` : ""}
    ${summary.patient.cpf ? `<div class="field"><span class="field-label">CPF:</span> ${summary.patient.cpf}</div>` : ""}
    ${summary.patient.phone ? `<div class="field"><span class="field-label">Telefone:</span> ${summary.patient.phone}</div>` : ""}
    ${summary.patient.email ? `<div class="field"><span class="field-label">Email:</span> ${summary.patient.email}</div>` : ""}
  </div>
  ${summary.anamnesis ? `<div class="section"><h3>Anamnese</h3>${summary.anamnesis.chief_complaint ? `<div class="field"><span class="field-label">Queixa Principal:</span> ${summary.anamnesis.chief_complaint}</div>` : ""}${summary.anamnesis.history_present_illness ? `<div class="field"><span class="field-label">História da Doença Atual:</span> ${summary.anamnesis.history_present_illness}</div>` : ""}${summary.anamnesis.past_medical_history ? `<div class="field"><span class="field-label">Histórico Médico:</span> ${summary.anamnesis.past_medical_history}</div>` : ""}${summary.anamnesis.medications?.length ? `<div class="field"><span class="field-label">Medicações:</span> ${summary.anamnesis.medications.join(", ")}</div>` : ""}${summary.anamnesis.allergies?.length ? `<div class="field"><span class="field-label">Alergias:</span> ${summary.anamnesis.allergies.join(", ")}</div>` : ""}</div>` : ""}
  ${summary.latestExamination ? `<div class="section"><h3>Exame Físico</h3>${summary.latestExamination.vital_signs?.blood_pressure ? `<div class="field"><span class="field-label">Pressão Arterial:</span> ${summary.latestExamination.vital_signs.blood_pressure}</div>` : ""}${summary.latestExamination.vital_signs?.heart_rate ? `<div class="field"><span class="field-label">Frequência Cardíaca:</span> ${summary.latestExamination.vital_signs.heart_rate} bpm</div>` : ""}${summary.latestExamination.vital_signs?.weight ? `<div class="field"><span class="field-label">Peso:</span> ${summary.latestExamination.vital_signs.weight} kg</div>` : ""}${summary.latestExamination.musculoskeletal ? `<div class="field"><span class="field-label">Sistema Musculoesquelético:</span> ${summary.latestExamination.musculoskeletal}</div>` : ""}</div>` : ""}
  ${summary.activePlan ? `<div class="section"><h3>Plano de Tratamento</h3>${summary.activePlan.diagnosis?.length ? `<div class="field"><span class="field-label">Diagnóstico:</span> ${summary.activePlan.diagnosis.join(", ")}</div>` : ""}${summary.activePlan.objectives?.length ? `<div class="field"><span class="field-label">Objetivos:</span> ${summary.activePlan.objectives.join(", ")}</div>` : ""}${summary.activePlan.procedures?.length ? `<div class="field"><span class="field-label">Procedimentos:</span> ${summary.activePlan.procedures.join(", ")}</div>` : ""}${summary.activePlan.follow_up_date ? `<div class="field"><span class="field-label">Próxima Consulta:</span> ${formatDate(summary.activePlan.follow_up_date)}</div>` : ""}</div>` : ""}
  ${summary.recentNotes.length > 0 ? `<div class="section"><h3>Evoluções Recentes</h3>${summary.recentNotes.map((note) => `<div class="soap-note"><div class="date">${formatDate(note.date)}</div>${note.subjective ? `<div class="soap-section"><span class="soap-label">S (Subjetivo):</span> ${note.subjective}</div>` : ""}${note.objective ? `<div class="soap-section"><span class="soap-label">O (Objetivo):</span> ${note.objective}</div>` : ""}${note.assessment ? `<div class="soap-section"><span class="soap-label">A (Avaliação):</span> ${note.assessment}</div>` : ""}${note.plan ? `<div class="soap-section"><span class="soap-label">P (Plano):</span> ${note.plan}</div>` : ""}</div>`).join("")}</div>` : ""}
  <div style="margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px;">Gerado por FisioFlow - Sistema de Gestão para Fisioterapeutas</div>
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
