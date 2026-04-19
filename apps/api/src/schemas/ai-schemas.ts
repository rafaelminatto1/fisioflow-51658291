import { z } from "zod";

export const SoapSchema = z.object({
	subjective: z
		.string()
		.describe("Queixa principal, histórico, relato do paciente"),
	objective: z
		.string()
		.describe("Achados de exame físico, testes, mensurações objetivas"),
	assessment: z
		.string()
		.describe("Diagnóstico fisioterapêutico, raciocínio clínico"),
	plan: z.string().describe("Conduta, exercícios prescritos, próximos passos"),
});
export type Soap = z.infer<typeof SoapSchema>;

export const ExerciseSuggestionSchema = z.object({
	exercises: z
		.array(
			z.object({
				name: z.string().describe("Nome do exercício em português"),
				rationale: z.string().describe("Justificativa clínica do exercício"),
				targetArea: z
					.string()
					.describe("Área/articulação alvo (ex: ombro, lombar)"),
				sets: z.number().int().min(1).max(10).optional(),
				reps: z.number().int().min(1).max(50).optional(),
				loadKg: z.number().min(0).optional(),
			}),
		)
		.min(1)
		.max(10),
});
export type ExerciseSuggestion = z.infer<typeof ExerciseSuggestionSchema>;

export const ReceiptOcrSchema = z.object({
	valor: z
		.number()
		.describe("Valor numérico em reais, sem símbolo (ex: 150.00)"),
	nome: z.string().nullable().describe("Nome do pagador/titular"),
	cardLastDigits: z
		.string()
		.regex(/^\d{4}$/)
		.nullable()
		.describe("Últimos 4 dígitos do cartão"),
	isFirstPayment: z
		.boolean()
		.describe("Se o comprovante indica primeira parcela/pagamento inicial"),
	pixKey: z.string().nullable().describe("Chave PIX se visível"),
	dataTransacao: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.nullable()
		.describe("Data da transação em formato YYYY-MM-DD"),
});
export type ReceiptOcr = z.infer<typeof ReceiptOcrSchema>;

export const ClinicalReportSchema = z.object({
	summary: z.string().describe("Resumo executivo da análise clínica"),
	trend: z
		.enum(["positive", "neutral", "negative"])
		.describe("Tendência evolutiva do paciente"),
	keyFindings: z
		.array(z.string())
		.min(1)
		.describe("Principais achados clínicos objetivos"),
	clinicalReasoning: z
		.string()
		.describe("Raciocínio clínico estruturado baseado nas métricas"),
	recommendations: z
		.array(z.string())
		.min(1)
		.describe("Recomendações de conduta, próximos passos"),
	riskFactors: z
		.array(z.string())
		.describe("Fatores de risco identificados (vazio se nenhum)"),
});
export type ClinicalReport = z.infer<typeof ClinicalReportSchema>;

export const FormSuggestionSchema = z.object({
	suggestions: z
		.array(
			z.object({
				label: z.string().describe("Nome do campo/teste sugerido"),
				reason: z
					.string()
					.describe("Por que este campo/teste é relevante para o contexto"),
				category: z.enum([
					"escala_dor",
					"amplitude_movimento",
					"forca_muscular",
					"teste_especial",
					"funcional",
					"outro",
				]),
			}),
		)
		.min(1)
		.max(15),
});
export type FormSuggestion = z.infer<typeof FormSuggestionSchema>;

export const TreatmentAdherenceSchema = z.object({
	riskLevel: z
		.enum(["low", "medium", "high"])
		.describe("Nível de risco de não-aderência"),
	confidenceScore: z
		.number()
		.min(0)
		.max(1)
		.describe("Confiança da predição (0-1)"),
	primaryFactors: z
		.array(z.string())
		.min(1)
		.describe("Fatores principais que influenciam a aderência"),
	suggestion: z.string().describe("Conduta sugerida em português"),
	nextActions: z
		.array(
			z.object({
				action: z.string(),
				priority: z.enum(["high", "medium", "low"]),
			}),
		)
		.describe("Ações concretas recomendadas"),
});
export type TreatmentAdherence = z.infer<typeof TreatmentAdherenceSchema>;

export const FastProcessingSchema = z.object({
	result: z.string().describe("O texto processado ou corrigido"),
});
export type FastProcessing = z.infer<typeof FastProcessingSchema>;
