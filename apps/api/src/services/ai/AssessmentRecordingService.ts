import type { Env } from "../../types/env";
import { transcribeAudio } from "../../lib/ai-native";
import { callGeminiStructured } from "../../lib/ai-gemini-v2";
import {
	AssessmentFormSchema,
	type AssessmentForm,
} from "../../schemas/assessment-schema";
import {
	ASSESSMENT_SYSTEM_INSTRUCTION,
	buildAssessmentPrompt,
} from "../../lib/ai/prompts/assessment-prompts";
import { buildPatientContext } from "./PatientContextBuilder";

export interface ProcessRecordingInput {
	audioBase64: string;
	patientId?: string;
	organizationId: string;
	patientContextHint?: string;
}

export interface ProcessTranscriptInput {
	transcript: string;
	patientId?: string;
	organizationId: string;
	patientContextHint?: string;
}

export interface AssessmentResult {
	form: AssessmentForm;
	transcript: string;
	patientContextUsed: boolean;
}

export class AssessmentRecordingService {
	constructor(private env: Env) {}

	async processRecording(
		input: ProcessRecordingInput,
	): Promise<AssessmentResult> {
		const transcript = await transcribeAudio(this.env, input.audioBase64);
		if (!transcript || transcript.trim().length < 10) {
			throw new Error(
				"Transcrição vazia ou muito curta. Verifique a qualidade do áudio.",
			);
		}

		return this.processTranscript({
			transcript,
			patientId: input.patientId,
			organizationId: input.organizationId,
			patientContextHint: input.patientContextHint,
		});
	}

	async processTranscript(
		input: ProcessTranscriptInput,
	): Promise<AssessmentResult> {
		const patientContext = await this.loadPatientContext(
			input.patientId,
			input.organizationId,
			input.patientContextHint,
		);

		const prompt = buildAssessmentPrompt(input.transcript, patientContext);

		const form = await callGeminiStructured(this.env, {
			schema: AssessmentFormSchema,
			prompt,
			model: "gemini-3.1-pro-preview",
			thinkingLevel: "HIGH",
			systemInstruction: ASSESSMENT_SYSTEM_INSTRUCTION,
			temperature: 0.2,
			maxOutputTokens: 4096,
		});

		return {
			form,
			transcript: input.transcript,
			patientContextUsed: !!patientContext,
		};
	}

	private async loadPatientContext(
		patientId: string | undefined,
		organizationId: string,
		hint?: string,
	): Promise<string | undefined> {
		if (hint && hint.trim().length > 0) return hint.trim();
		if (!patientId) return undefined;

		try {
			const ctx = await buildPatientContext(this.env, patientId, organizationId, {
				sessionLimit: 10,
				appointmentHistoryLimit: 5,
				testResultLimit: 5,
				prescriptionLimit: 3,
			});
			return ctx.contextXml;
		} catch (error) {
			console.warn(
				"[AssessmentRecordingService] Falha ao carregar contexto do paciente:",
				error,
			);
			return undefined;
		}
	}
}
