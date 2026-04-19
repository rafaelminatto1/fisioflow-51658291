import { z } from "zod";

const PostureRegionSchema = z.object({
	findings: z
		.array(z.string())
		.describe("Achados observados (ex: hiperlordose lombar, protrusão cabeça)"),
	asymmetries: z
		.array(z.string())
		.describe("Assimetrias identificadas (vazio se nenhuma)"),
});

const RomJointSchema = z.object({
	joint: z
		.string()
		.describe("Articulação avaliada (ex: ombro direito, coluna lombar)"),
	movement: z
		.string()
		.describe("Movimento avaliado (flexão, extensão, abdução, etc.)"),
	rangeDegrees: z
		.number()
		.nullable()
		.describe("Amplitude em graus, se mensurada"),
	notes: z
		.string()
		.describe("Observação clínica (dor ao final, limitação, etc.)"),
});

const SpecialTestSchema = z.object({
	name: z
		.string()
		.describe(
			"Nome do teste especial (Lasègue, McMurray, Phalen, Neer, etc.)",
		),
	result: z
		.enum(["positive", "negative", "inconclusive"])
		.describe("Resultado do teste"),
	interpretation: z
		.string()
		.describe("Interpretação clínica do resultado"),
});

const MuscleStrengthSchema = z.object({
	muscle: z
		.string()
		.describe("Músculo ou grupo muscular avaliado"),
	grade: z
		.enum(["0", "1", "2", "3", "4", "5"])
		.describe("Graduação MRC (0-5)"),
	notes: z.string().describe("Observação (dor à contração, fadiga, etc.)"),
});

export const AssessmentFormSchema = z.object({
	patient: z.object({
		mainComplaint: z
			.string()
			.describe("Queixa principal conforme relato do paciente"),
		currentHistory: z
			.string()
			.describe(
				"História da doença atual (início, fatores desencadeantes, evolução, fatores de melhora/piora)",
			),
		pastHistory: z
			.string()
			.describe("Antecedentes pessoais (cirurgias, comorbidades)"),
		familyHistory: z
			.string()
			.describe("Antecedentes familiares relevantes"),
		medications: z
			.array(z.string())
			.describe("Medicações em uso"),
		lifestyle: z
			.string()
			.describe(
				"Hábitos de vida, atividade física, profissão, ergonomia",
			),
	}),
	painAssessment: z.object({
		vasScore: z
			.number()
			.int()
			.min(0)
			.max(10)
			.nullable()
			.describe("Escala EVA de dor (0-10)"),
		location: z
			.string()
			.describe("Localização anatômica da dor"),
		characteristics: z
			.string()
			.describe("Caráter da dor (pontada, queimação, latejante, etc.)"),
		aggravatingFactors: z
			.array(z.string())
			.describe("Fatores que pioram a dor"),
		relievingFactors: z
			.array(z.string())
			.describe("Fatores que aliviam a dor"),
	}),
	posturalAssessment: z.object({
		anterior: PostureRegionSchema,
		posterior: PostureRegionSchema,
		lateral: PostureRegionSchema,
	}),
	rangeOfMotion: z
		.array(RomJointSchema)
		.describe("Avaliação de ADM articular"),
	muscleStrength: z
		.array(MuscleStrengthSchema)
		.describe("Testes de força muscular"),
	specialTests: z
		.array(SpecialTestSchema)
		.describe("Testes especiais realizados"),
	palpation: z
		.string()
		.describe("Achados à palpação (trigger points, edema, temperatura)"),
	functionalAssessment: z
		.string()
		.describe(
			"Avaliação funcional (marcha, AVDs, limitações ocupacionais)",
		),
	physiotherapyDiagnosis: z.object({
		primary: z
			.string()
			.describe("Diagnóstico fisioterapêutico principal"),
		differential: z
			.array(z.string())
			.describe("Diagnósticos diferenciais considerados"),
		icd10: z
			.array(z.string())
			.describe("CID-10 relacionados (se mencionados)"),
		ciff: z
			.array(z.string())
			.describe("Códigos CIF-F (se aplicáveis)"),
	}),
	treatmentPlan: z.object({
		objectives: z
			.array(z.string())
			.min(1)
			.describe("Objetivos terapêuticos (curto/médio/longo prazo)"),
		interventions: z
			.array(z.string())
			.min(1)
			.describe(
				"Condutas planejadas (técnicas manuais, cinesioterapia, eletroterapia, etc.)",
			),
		frequency: z
			.string()
			.describe("Frequência e duração do tratamento proposto"),
		homeExercises: z
			.array(z.string())
			.describe("Exercícios domiciliares prescritos"),
		prognosis: z
			.string()
			.describe("Prognóstico estimado"),
	}),
	clinicalReasoning: z
		.string()
		.describe(
			"Raciocínio clínico consolidado (por que o diagnóstico e plano foram escolhidos, correlações com achados)",
		),
	redFlags: z
		.array(z.string())
		.describe(
			"Sinais de alerta que requerem encaminhamento médico (vazio se nenhum)",
		),
});

export type AssessmentForm = z.infer<typeof AssessmentFormSchema>;
