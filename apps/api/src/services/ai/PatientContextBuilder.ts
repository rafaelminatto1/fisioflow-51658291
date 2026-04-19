import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import {
	appointments,
	exercisePrescriptions,
	medicalRecords,
	patientGoals,
	patientPathologies,
	patients,
	sessions,
	standardizedTestResults,
} from "@fisioflow/db";
import type { Env } from "../../types/env";
import { getDbForOrg } from "../../lib/db";

export interface PatientContextOptions {
	sessionLimit?: number;
	appointmentHistoryLimit?: number;
	upcomingDaysWindow?: number;
	testResultLimit?: number;
	prescriptionLimit?: number;
}

export interface BuiltPatientContext {
	patientId: string;
	organizationId: string;
	contextXml: string;
	generatedAt: string;
	approxTokens: number;
	counts: {
		sessions: number;
		pastAppointments: number;
		upcomingAppointments: number;
		pathologies: number;
		goals: number;
		testResults: number;
		prescriptions: number;
	};
}

const DEFAULTS: Required<PatientContextOptions> = {
	sessionLimit: 40,
	appointmentHistoryLimit: 30,
	upcomingDaysWindow: 60,
	testResultLimit: 30,
	prescriptionLimit: 10,
};

export async function buildPatientContext(
	env: Env,
	patientId: string,
	organizationId: string,
	options: PatientContextOptions = {},
): Promise<BuiltPatientContext> {
	const cfg = { ...DEFAULTS, ...options };
	const db = await getDbForOrg(organizationId, env);
	const today = new Date().toISOString().slice(0, 10);

	const [
		patientRow,
		medicalRow,
		pathologyRows,
		goalRows,
		sessionRows,
		pastAppointmentRows,
		upcomingAppointmentRows,
		testRows,
		prescriptionRows,
	] = await Promise.all([
		db
			.select()
			.from(patients)
			.where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
			.limit(1),
		db
			.select()
			.from(medicalRecords)
			.where(
				and(
					eq(medicalRecords.patientId, patientId),
					isNull(medicalRecords.deletedAt),
				),
			)
			.orderBy(desc(medicalRecords.createdAt))
			.limit(1),
		db
			.select()
			.from(patientPathologies)
			.where(
				and(
					eq(patientPathologies.patientId, patientId),
					isNull(patientPathologies.deletedAt),
				),
			)
			.orderBy(desc(patientPathologies.isPrimary), desc(patientPathologies.diagnosedAt)),
		db
			.select()
			.from(patientGoals)
			.where(
				and(
					eq(patientGoals.patientId, patientId),
					isNull(patientGoals.deletedAt),
				),
			)
			.orderBy(desc(patientGoals.createdAt)),
		db
			.select()
			.from(sessions)
			.where(and(eq(sessions.patientId, patientId), isNull(sessions.deletedAt)))
			.orderBy(desc(sessions.date))
			.limit(cfg.sessionLimit),
		db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.patientId, patientId),
					sql`${appointments.date} < ${today}`,
				),
			)
			.orderBy(desc(appointments.date), desc(appointments.startTime))
			.limit(cfg.appointmentHistoryLimit),
		db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.patientId, patientId),
					gte(appointments.date, today),
				),
			)
			.orderBy(appointments.date, appointments.startTime)
			.limit(20),
		db
			.select()
			.from(standardizedTestResults)
			.where(
				and(
					eq(standardizedTestResults.patientId, patientId),
					isNull(standardizedTestResults.deletedAt),
				),
			)
			.orderBy(desc(standardizedTestResults.appliedAt))
			.limit(cfg.testResultLimit),
		db
			.select()
			.from(exercisePrescriptions)
			.where(
				and(
					eq(exercisePrescriptions.patientId, patientId),
					isNull(exercisePrescriptions.deletedAt),
				),
			)
			.orderBy(desc(exercisePrescriptions.createdAt))
			.limit(cfg.prescriptionLimit),
	]);

	const patient = patientRow[0];
	if (!patient) {
		throw new Error(`Patient ${patientId} not found in org ${organizationId}`);
	}

	const contextXml = renderPatientContextXml({
		patient,
		medical: medicalRow[0],
		pathologies: pathologyRows,
		goals: goalRows,
		sessions: sessionRows,
		pastAppointments: pastAppointmentRows,
		upcomingAppointments: upcomingAppointmentRows,
		testResults: testRows,
		prescriptions: prescriptionRows,
	});

	return {
		patientId,
		organizationId,
		contextXml,
		generatedAt: new Date().toISOString(),
		approxTokens: Math.ceil(contextXml.length / 4),
		counts: {
			sessions: sessionRows.length,
			pastAppointments: pastAppointmentRows.length,
			upcomingAppointments: upcomingAppointmentRows.length,
			pathologies: pathologyRows.length,
			goals: goalRows.length,
			testResults: testRows.length,
			prescriptions: prescriptionRows.length,
		},
	};
}

interface RenderInput {
	patient: any;
	medical?: any;
	pathologies: any[];
	goals: any[];
	sessions: any[];
	pastAppointments: any[];
	upcomingAppointments: any[];
	testResults: any[];
	prescriptions: any[];
}

function renderPatientContextXml(input: RenderInput): string {
	const { patient } = input;
	const lines: string[] = [];

	lines.push("<patient_context>");
	lines.push("  <demographics>");
	lines.push(`    <id>${xmlEscape(patient.id)}</id>`);
	lines.push(`    <full_name>${xmlEscape(patient.fullName ?? "")}</full_name>`);
	if (patient.gender) lines.push(`    <gender>${xmlEscape(patient.gender)}</gender>`);
	if (patient.legacyDateOfBirth)
		lines.push(
			`    <date_of_birth>${xmlEscape(String(patient.legacyDateOfBirth))}</date_of_birth>`,
		);
	if (patient.profession)
		lines.push(`    <profession>${xmlEscape(patient.profession)}</profession>`);
	if (patient.bloodType)
		lines.push(`    <blood_type>${xmlEscape(patient.bloodType)}</blood_type>`);
	if (patient.weightKg)
		lines.push(`    <weight_kg>${xmlEscape(String(patient.weightKg))}</weight_kg>`);
	if (patient.heightCm)
		lines.push(`    <height_cm>${xmlEscape(String(patient.heightCm))}</height_cm>`);
	if (patient.mainCondition)
		lines.push(
			`    <main_condition>${xmlEscape(patient.mainCondition)}</main_condition>`,
		);
	if (Array.isArray(patient.alerts) && patient.alerts.length > 0) {
		lines.push("    <alerts>");
		for (const alert of patient.alerts) {
			lines.push(`      <alert>${xmlEscape(String(alert))}</alert>`);
		}
		lines.push("    </alerts>");
	}
	lines.push("  </demographics>");

	if (input.medical) {
		const m = input.medical;
		lines.push("  <anamnese>");
		if (m.chiefComplaint)
			lines.push(
				`    <chief_complaint>${xmlEscape(m.chiefComplaint)}</chief_complaint>`,
			);
		if (m.currentHistory)
			lines.push(
				`    <current_history>${xmlEscape(m.currentHistory)}</current_history>`,
			);
		if (m.pastHistory)
			lines.push(`    <past_history>${xmlEscape(m.pastHistory)}</past_history>`);
		if (m.medicalHistory)
			lines.push(
				`    <medical_history>${xmlEscape(m.medicalHistory)}</medical_history>`,
			);
		if (m.familyHistory)
			lines.push(
				`    <family_history>${xmlEscape(m.familyHistory)}</family_history>`,
			);
		if (m.currentMedications)
			lines.push(
				`    <medications>${xmlEscape(m.currentMedications)}</medications>`,
			);
		if (m.previousSurgeries)
			lines.push(
				`    <previous_surgeries>${xmlEscape(m.previousSurgeries)}</previous_surgeries>`,
			);
		if (m.lifestyleHabits)
			lines.push(`    <lifestyle>${xmlEscape(m.lifestyleHabits)}</lifestyle>`);
		if (m.diagnosis)
			lines.push(`    <diagnosis>${xmlEscape(m.diagnosis)}</diagnosis>`);
		if (Array.isArray(m.icd10Codes) && m.icd10Codes.length > 0) {
			lines.push(
				`    <icd10>${xmlEscape(m.icd10Codes.join(", "))}</icd10>`,
			);
		}
		if (Array.isArray(m.allergies) && m.allergies.length > 0) {
			lines.push("    <allergies>");
			for (const a of m.allergies) {
				lines.push(
					`      <allergy severity="${xmlEscape(a.severity ?? "")}">${xmlEscape(a.allergen ?? "")}${a.reaction ? ` — ${xmlEscape(a.reaction)}` : ""}</allergy>`,
				);
			}
			lines.push("    </allergies>");
		}
		lines.push("  </anamnese>");
	}

	if (input.pathologies.length > 0) {
		lines.push("  <pathologies>");
		for (const p of input.pathologies) {
			const attrs = [
				`status="${xmlEscape(p.status ?? "")}"`,
				p.isPrimary ? `primary="true"` : null,
				p.icdCode ? `icd="${xmlEscape(p.icdCode)}"` : null,
				p.diagnosedAt ? `diagnosed="${xmlEscape(toIso(p.diagnosedAt))}"` : null,
			]
				.filter(Boolean)
				.join(" ");
			lines.push(
				`    <pathology ${attrs}>${xmlEscape(p.name ?? "")}${p.description ? ` — ${xmlEscape(p.description)}` : ""}</pathology>`,
			);
		}
		lines.push("  </pathologies>");
	}

	if (input.goals.length > 0) {
		lines.push("  <treatment_goals>");
		for (const g of input.goals) {
			const attrs = [
				`status="${xmlEscape(g.status ?? "")}"`,
				g.priority ? `priority="${xmlEscape(g.priority)}"` : null,
				g.targetDate ? `target="${xmlEscape(toIso(g.targetDate))}"` : null,
			]
				.filter(Boolean)
				.join(" ");
			lines.push(
				`    <goal ${attrs}>${xmlEscape(g.description ?? "")}</goal>`,
			);
		}
		lines.push("  </treatment_goals>");
	}

	if (input.sessions.length > 0) {
		lines.push(`  <clinical_history sessions="${input.sessions.length}">`);
		for (const s of input.sessions) {
			lines.push(
				`    <session date="${xmlEscape(toIso(s.date))}" number="${xmlEscape(String(s.sessionNumber ?? ""))}" status="${xmlEscape(s.status ?? "")}">`,
			);
			const subj = extractSoapText(s.subjective, [
				"complaints",
				"painScale",
				"painLocation",
				"perceivedEvolution",
				"notes",
			]);
			if (subj)
				lines.push(`      <subjective>${xmlEscape(subj)}</subjective>`);
			const obj = extractSoapText(s.objective, ["physicalExam", "notes"]);
			if (obj) lines.push(`      <objective>${xmlEscape(obj)}</objective>`);
			const assess = extractSoapText(s.assessment, [
				"diagnosis",
				"evolutionAnalysis",
				"prognosis",
				"notes",
			]);
			if (assess)
				lines.push(`      <assessment>${xmlEscape(assess)}</assessment>`);
			const plan = extractSoapText(s.plan, [
				"conduct",
				"orientations",
				"homeExercises",
				"nextSessionGoals",
				"notes",
			]);
			if (plan) lines.push(`      <plan>${xmlEscape(plan)}</plan>`);
			lines.push("    </session>");
		}
		lines.push("  </clinical_history>");
	}

	if (input.testResults.length > 0) {
		lines.push("  <standardized_tests>");
		for (const t of input.testResults) {
			const attrs = [
				`name="${xmlEscape(t.testName ?? t.testType ?? "")}"`,
				t.appliedAt ? `date="${xmlEscape(toIso(t.appliedAt))}"` : null,
				t.score != null ? `score="${xmlEscape(String(t.score))}"` : null,
				t.maxScore != null
					? `max="${xmlEscape(String(t.maxScore))}"`
					: null,
			]
				.filter(Boolean)
				.join(" ");
			lines.push(
				`    <test ${attrs}>${xmlEscape(t.interpretation ?? "")}</test>`,
			);
		}
		lines.push("  </standardized_tests>");
	}

	if (input.prescriptions.length > 0) {
		lines.push("  <exercise_prescriptions>");
		for (const p of input.prescriptions) {
			const exercises = Array.isArray(p.exercises) ? p.exercises : [];
			lines.push(
				`    <prescription title="${xmlEscape(p.title ?? "")}" status="${xmlEscape(p.status ?? "")}" created="${xmlEscape(toIso(p.createdAt))}" exercise_count="${exercises.length}">`,
			);
			if (p.notes) lines.push(`      <notes>${xmlEscape(p.notes)}</notes>`);
			for (const ex of exercises.slice(0, 15)) {
				const name = typeof ex === "object" && ex ? ex.name ?? ex.title ?? "" : String(ex ?? "");
				const specs = [
					typeof ex === "object" && ex?.sets ? `${ex.sets}x${ex.reps ?? ""}` : null,
					typeof ex === "object" && ex?.loadKg ? `${ex.loadKg}kg` : null,
				]
					.filter(Boolean)
					.join(" ");
				lines.push(
					`      <exercise>${xmlEscape(name)}${specs ? ` (${xmlEscape(specs)})` : ""}</exercise>`,
				);
			}
			lines.push("    </prescription>");
		}
		lines.push("  </exercise_prescriptions>");
	}

	if (input.pastAppointments.length > 0 || input.upcomingAppointments.length > 0) {
		lines.push("  <appointments>");
		if (input.pastAppointments.length > 0) {
			lines.push(`    <past total="${input.pastAppointments.length}">`);
			for (const a of input.pastAppointments.slice(0, 15)) {
				lines.push(
					`      <appointment date="${xmlEscape(toIso(a.date))}" time="${xmlEscape(a.startTime ?? "")}" status="${xmlEscape(a.status ?? "")}" type="${xmlEscape(a.appointmentType ?? a.type ?? "")}"/>`,
				);
			}
			lines.push("    </past>");
		}
		if (input.upcomingAppointments.length > 0) {
			lines.push(`    <upcoming total="${input.upcomingAppointments.length}">`);
			for (const a of input.upcomingAppointments) {
				lines.push(
					`      <appointment date="${xmlEscape(toIso(a.date))}" time="${xmlEscape(a.startTime ?? "")}" status="${xmlEscape(a.status ?? "")}" type="${xmlEscape(a.appointmentType ?? a.type ?? "")}"/>`,
				);
			}
			lines.push("    </upcoming>");
		}
		lines.push("  </appointments>");
	}

	lines.push("</patient_context>");
	return lines.join("\n");
}

function extractSoapText(field: unknown, keys: string[]): string {
	if (!field || typeof field !== "object") return "";
	const obj = field as Record<string, unknown>;
	const parts: string[] = [];
	for (const key of keys) {
		const val = obj[key];
		if (val == null) continue;
		if (typeof val === "string" && val.trim()) {
			parts.push(`${key}: ${val.trim()}`);
		} else if (typeof val === "number") {
			parts.push(`${key}: ${val}`);
		}
	}
	return parts.join(" | ");
}

function toIso(value: unknown): string {
	if (!value) return "";
	if (value instanceof Date) return value.toISOString().slice(0, 19);
	if (typeof value === "string") return value.slice(0, 19);
	return String(value);
}

function xmlEscape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
