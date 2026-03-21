/**
 * AI Service - Migrated to Workers/Neon
 */

import { aiApi } from "@/lib/api/workers-client";

async function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result as string;
			resolve(result.split(",")[1] ?? result);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

export interface ClinicalChatInput extends Record<string, unknown> {
	message: string;
	context?: {
		patientId?: string;
		patientName?: string;
		condition?: string;
		sessionCount?: number;
		recentEvolutions?: Array<{ date: string; notes: string }>;
	};
	conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ClinicalChatResponse {
	response: string;
}

async function callAIService<TInput extends Record<string, unknown>, TOutput>(
	action: string,
	data: TInput,
): Promise<TOutput> {
	const result = await aiApi.service<TInput, TOutput>(action, data);
	return result.data;
}

export async function getClinicalInsights(
	prompt: string,
	options: {
		patientId?: string;
		patientName?: string;
		language?: string;
	},
): Promise<string> {
	const result = await callAIService<ClinicalChatInput, { response: string }>(
		"clinicalChat",
		{
			message: prompt,
			context: {
				patientId: options.patientId,
				patientName: options.patientName,
				condition: options.patientName,
				sessionCount: 0,
			},
		},
	);
	return result.response;
}

export async function getTreatmentRecommendations(
	prompt: string,
	options: {
		patientId?: string;
		patientName?: string;
		diagnosis?: string;
		primaryComplaint?: string;
		sessionCount?: number;
		language?: string;
	},
): Promise<string> {
	const result = await callAIService<ClinicalChatInput, { response: string }>(
		"clinicalChat",
		{
			message: prompt,
			context: {
				patientId: options.patientId,
				patientName: options.patientName,
				condition: options.diagnosis || options.primaryComplaint,
				sessionCount: options.sessionCount ?? 0,
			},
		},
	);
	return result.response;
}

export async function chatWithClinicalAssistant(
	input: ClinicalChatInput,
): Promise<string> {
	const result = await callAIService<ClinicalChatInput, ClinicalChatResponse>(
		"clinicalChat",
		input,
	);
	return result.response;
}

export interface ExerciseSuggestionInput extends Record<string, unknown> {
	patientId: string;
	goals: string[];
	availableEquipment?: string[];
	treatmentPhase?: "initial" | "progressive" | "advanced" | "maintenance";
	painMap?: Record<string, number>;
}

export interface ExerciseSuggestionResponse {
	success: boolean;
	data?: {
		exercises: Array<{
			exerciseId?: string;
			name: string;
			category?: string;
			difficulty?: string;
			rationale: string;
			targetArea: string;
			goalsAddressed: string[];
			sets?: number;
			reps?: number;
			duration?: number;
			frequency?: string;
			precautions?: string[];
			confidence: number;
		}>;
		programRationale: string;
		expectedOutcomes: string[];
		progressionCriteria: string[];
	};
	error?: string;
}

export async function getExerciseSuggestions(
	input: ExerciseSuggestionInput,
): Promise<ExerciseSuggestionResponse> {
	return callAIService<ExerciseSuggestionInput, ExerciseSuggestionResponse>(
		"exerciseSuggestion",
		input,
	);
}

export interface GenerateExercisePlanInput extends Record<string, unknown> {
	patientName: string;
	age?: number;
	condition: string;
	painLevel: number;
	equipment: string[];
	goals: string;
	limitations?: string;
}

export interface ExercisePlanResponse {
	planName: string;
	goal: string;
	frequency: string;
	durationWeeks: number;
	exercises: Array<{
		name: string;
		sets: number;
		reps: string;
		rest: string;
		notes?: string;
		videoQuery: string;
	}>;
	warmup: string;
	cooldown: string;
}

export async function generateExercisePlanWithIA(
	input: GenerateExercisePlanInput,
): Promise<ExercisePlanResponse> {
	return callAIService<GenerateExercisePlanInput, ExercisePlanResponse>(
		"generateExercisePlan",
		input,
	);
}

export interface ClinicalAnalysisInput extends Record<string, unknown> {
	patientId: string;
	currentSOAP: {
		subjective?: string;
		objective?: unknown;
		assessment?: string;
		plan?: unknown;
		vitalSigns?: Record<string, unknown>;
		functionalTests?: Record<string, unknown>;
	};
	useGrounding?: boolean;
	treatmentDurationWeeks?: number;
	redFlagCheckOnly?: boolean;
}

export async function getClinicalAnalysis(input: ClinicalAnalysisInput) {
	return callAIService("clinicalAnalysis", input);
}

export interface SoapGenerationInput extends Record<string, unknown> {
	patientContext: {
		patientName: string;
		condition: string;
		sessionNumber: number;
	};
	subjective?: string;
	objective?: string;
	assistantNeeded: "assessment" | "plan" | "both" | "full";
}

export interface SoapGenerationResponse {
	success: boolean;
	soapNote?: string;
	timestamp: string;
}

export async function generateSOAPNote(
	input: SoapGenerationInput,
): Promise<SoapGenerationResponse> {
	return callAIService<SoapGenerationInput, SoapGenerationResponse>(
		"soapNoteChat",
		input,
	);
}

export async function analyzeMovement(input: {
	videoData?: string;
	patientId?: string;
	context?: string;
}) {
	return callAIService("movementAnalysis", input);
}

export async function transcribeAudioBlob(
	blob: Blob,
	mimeType: string,
): Promise<{ transcription: string }> {
	const audioData = await blobToBase64(blob);
	const result = await aiApi.transcribeAudio({
		audioData,
		mimeType: mimeType || "audio/webm",
		languageCode: "pt-BR",
		context: "medical",
	});
	return { transcription: result.data.transcription };
}

export async function analyzePainEvolution(
	patientId: string,
	currentPainLevel: number,
): Promise<Record<string, unknown>> {
	const response = await chatWithClinicalAssistant({
		message: `Analisar evolução da dor. Nível atual ${currentPainLevel}/10.`,
		context: { patientId, sessionCount: 0 },
	});
	return {
		overallTrend:
			currentPainLevel <= 3
				? "improving"
				: currentPainLevel >= 7
					? "worsening"
					: "stable",
		trendDescription: response,
		keyFindings: [response],
		clinicalAlerts:
			currentPainLevel >= 8 ? ["Dor intensa relatada, revisar red flags."] : [],
		globalPainChange: 0,
		percentageChange: 0,
		positiveIndicators:
			currentPainLevel <= 3 ? ["Dor em faixa controlada."] : [],
	};
}

export async function predictRecovery(
	patientId: string,
	patientProfile: Record<string, unknown>,
	currentCondition: Record<string, unknown>,
	treatmentContext: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const response = await chatWithClinicalAssistant({
		message: `Estimar recuperação com base em ${JSON.stringify({ patientProfile, currentCondition, treatmentContext })}`,
		context: {
			patientId,
			sessionCount: Number(treatmentContext.sessionsCompleted ?? 0),
		},
	});
	return {
		predictedRecoveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		confidenceScore: 0.7,
		milestones: [],
		riskFactors: [],
		treatmentRecommendations: {
			sessionsPerWeek: 2,
			estimatedTotalSessions: 12,
			intensity: "moderate",
			focusAreas: [],
			rationale: response,
		},
		confidenceInterval: { lower: "", upper: "", expectedDays: 30 },
	};
}

export async function evaluateTreatmentResponse(
	patientId: string,
	sessionsCompleted: number,
	currentPainLevel: number,
): Promise<Record<string, unknown>> {
	const response = await chatWithClinicalAssistant({
		message: `Avaliar resposta ao tratamento após ${sessionsCompleted} sessões e dor ${currentPainLevel}/10.`,
		context: { patientId, sessionCount: sessionsCompleted },
	});
	return {
		responseRating:
			currentPainLevel <= 3
				? "positive"
				: currentPainLevel >= 7
					? "negative"
					: "neutral",
		summary: response,
		recommendations: [],
		nextSteps: [],
	};
}

export interface SemanticSearchResponse {
	success: boolean;
	query: string;
	results: Array<{
		id: string;
		patient_id: string;
		record_date: string | Date;
		subjective?: string;
		objective?: string;
		assessment?: string;
		plan?: string;
		score?: number;
	}>;
}

export async function findSimilarClinicalRecords(
	query: string,
	limit: number = 5,
): Promise<SemanticSearchResponse> {
	const result = await callAIService<
		{ query: string; limit: number },
		SemanticSearchResponse
	>("semanticSearch", { query, limit });
	return result;
}

/**
 * Busca no Banco de Conhecimento Vetorial (Wiki, Protocolos, Artigos)
 */
export async function searchClinicalKnowledge(
	query: string,
	filter?: Record<string, any>
): Promise<any[]> {
	try {
		const result = await callAIService<
			{ query: string; filter?: Record<string, any> },
			{ data: any[] }
		>("vectorSearch", { query, filter });
		return result.data || [];
	} catch (error) {
		console.error("Erro na busca vetorial:", error);
		return [];
	}
}

export interface ClinicalReportInput extends Record<string, unknown> {
	patientInfo: {
		name: string;
		condition?: string;
	};
	sessions: Array<{
		date: string;
		subjective?: string;
		objective?: string;
		assessment?: string;
		plan?: string;
		painLevel?: number;
		exercises?: Array<{ name: string; notes?: string }>;
	}>;
	measurementEvolution?: Array<{
		name: string;
		type: string;
		initial: { value: number | string; unit: string; date: string };
		current: { value: number | string; unit: string; date: string };
		improvement: number | string;
	}>;
}

export async function generateClinicalReport(
	input: ClinicalReportInput,
): Promise<string> {
	const sessionsText = input.sessions
		.map((s, i) => {
			const exercisesText =
				s.exercises
					?.map((e) => e.name + (e.notes ? " (" + e.notes + ")" : ""))
					.join(", ") || "N/A";
			return `Data: ${s.date}
Subjetivo: ${s.subjective || "N/A"}
Objetivo: ${s.objective || "N/A"}
Avaliação: ${s.assessment || "N/A"}
Plano: ${s.plan || "N/A"}
Dor: ${s.painLevel || "N/A"}/10
Exercícios: ${exercisesText}`;
		})
		.join("\n---");

	const prompt = `Você é um fisioterapeuta preceptor experiente. Sua tarefa é redigir um "Relatório Fisioterapêutico" formal e clínico baseado nas sessões registradas do paciente.
  
Paciente: ${input.patientInfo.name}
Condição/Diagnóstico: ${input.patientInfo.condition || "Não especificado"}

Histórico das ${input.sessions.length} Sessões Gravadas:
${sessionsText}

Por favor, escreva o relatório com a seguinte estrutura em Markdown:
## Histórico Clínico e Diagnóstico
(Um resumo das queixas iniciais e o que motivou a fisioterapia)

## Condutas Atuais / Tratamento
(As principais condutas terapêuticas adotadas ao longo destas sessões, exercícios principais, terapias usadas, etc, com base nas sessões)

## Evolução Clínica
(A evolução de dor, mobilidade, adesão ao tratamento, ganhos funcionais. Identifique a melhora ou não do paciente)

## Próximos Passos do Plano
(O que se planeja daqui para frente, baseado na última sessão e evolução apresentada)

## Referências Científicas
(Inclua de 2 a 4 referências bibliográficas reais e embasadas na literatura científica atual que justifiquem as condutas adotadas neste caso.)

Diretrizes:
- O texto deve ser profissional, direto e claro.
- Não crie dados fictícios que não estejam no histórico (exceto formulações textuais para dar coesão).
- Faça um apanhado geral em vez de listar sessão por sessão.
`;

	const result = await callAIService<
		ClinicalChatInput & Record<string, unknown>,
		{ response: string }
	>("clinicalChat", {
		message: prompt,
		context: {
			patientName: input.patientInfo.name,
			condition: input.patientInfo.condition,
			sessionCount: input.sessions.length,
		},
	});

	return result.response;
}
