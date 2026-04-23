import type { Env } from '../../types/env';
import { createModelRegistry, type AIModelConfig, type ThinkingLevel, type AIProvider } from './modelRegistry';
import { zaiChat, zaiVision, zaiTranscribe, type ZAIChatResult } from './providers/zai';
import { runAi } from '../ai-native';

export type AITask =
	| 'chat'
	| 'soap'
	| 'analysis'
	| 'exercise'
	| 'form-suggestion'
	| 'summarize'
	| 'translate'
	| 'document-analyze'
	| 'document-classify'
	| 'suggest-reply'
	| 'report'
	| 'event-planning'
	| 'fast-processing'
	| 'treatment-assistant'
	| 'patient-360';

export interface CallAIOptions {
	task: AITask;
	model?: string;
	messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
	prompt?: string;
	systemInstruction?: string;
	temperature?: number;
	maxTokens?: number;
	thinkingLevel?: ThinkingLevel;
	responseFormat?: 'json' | 'text';
	cacheKey?: string;
	cacheTtl?: number;
	organizationId?: string;
}

export interface CallAIResult {
	content: string;
	thinking?: string;
	usage: {
		inputTokens: number;
		outputTokens: number;
		cachedTokens: number;
	};
	model: string;
	provider: AIProvider;
	wasFallback: boolean;
	latencyMs: number;
}

function taskToConfigKey(task: AITask): keyof Pick<AIModelConfig, 'chatModel' | 'analysisModel' | 'transcriptionModel'> {
	switch (task) {
		case 'analysis':
		case 'treatment-assistant':
		case 'patient-360':
			return 'analysisModel';
		default:
			return 'chatModel';
	}
}

export async function callAI(env: Env, opts: CallAIOptions): Promise<CallAIResult> {
	const registry = createModelRegistry(env);
	const startTime = Date.now();

	let targetModel = opts.model;

	if (!targetModel && opts.organizationId) {
		try {
			const config = await registry.getConfig(opts.organizationId);
			const configKey = taskToConfigKey(opts.task);
			targetModel = config[configKey];
		} catch {
			targetModel = 'glm-4.7-flash';
		}
	}

	if (!targetModel) targetModel = 'glm-4.7-flash';

	const fallbackChain = registry.getFallbackChain(targetModel);
	const messages = buildMessages(opts);
	let lastError: Error | null = null;

	for (const modelId of fallbackChain) {
		const model = registry.getModel(modelId);
		if (!model) continue;

		try {
			const providerModelId = getProviderModelId(modelId, model.provider);
			const result = await executeProvider(env, model.provider, providerModelId, {
				messages,
				temperature: opts.temperature,
				maxTokens: opts.maxTokens,
				thinkingLevel: opts.thinkingLevel,
				responseFormat: opts.responseFormat,
				cacheKey: opts.cacheKey,
				cacheTtl: opts.cacheTtl,
			});

			return {
				...result,
				provider: model.provider,
				wasFallback: modelId !== targetModel,
				latencyMs: Date.now() - startTime,
			};
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			console.warn(`[callAI] Model ${modelId} failed, trying fallback:`, lastError.message);
		}
	}

	throw lastError ?? new Error(`All models failed for task ${opts.task}`);
}

export async function callAIStructured<T>(
	env: Env,
	opts: CallAIOptions & { schema: { parse: (data: unknown) => T }; schemaDescription?: string },
): Promise<CallAIResult & { data: T }> {
	const systemPrefix = opts.systemInstruction ?? '';
	const schemaHint = opts.schemaDescription ?? 'Respond with valid JSON matching the expected schema. No markdown, no explanation.';
	const augmentedSystem = `${systemPrefix}\n\nIMPORTANT: ${schemaHint}`.trim();

	const result = await callAI(env, {
		...opts,
		systemInstruction: augmentedSystem,
		responseFormat: 'json',
	});

	let parsed: T;
	try {
		const jsonMatch = result.content.match(/\{[\s\S]*\}/);
		const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
		parsed = opts.schema.parse(raw);
	} catch {
		const jsonMatch = result.content.match(/\{[\s\S]*\}/);
		const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
		parsed = opts.schema.parse(raw);
	}

	return { ...result, data: parsed };
}

export async function callAIVision(
	env: Env,
	opts: {
		model?: string;
		imageBase64: string;
		imageMimeType: string;
		prompt: string;
		systemInstruction?: string;
		organizationId?: string;
	},
): Promise<CallAIResult> {
	const registry = createModelRegistry(env);
	const startTime = Date.now();

	let targetModel = opts.model;
	if (!targetModel && opts.organizationId) {
		try {
			const config = await registry.getConfig(opts.organizationId);
			targetModel = config.visionModel;
		} catch {
			targetModel = 'glm-5v-turbo';
		}
	}
	if (!targetModel) targetModel = 'glm-5v-turbo';

	const result = await zaiVision(env, {
		model: targetModel,
		imageBase64: opts.imageBase64,
		imageMimeType: opts.imageMimeType,
		prompt: opts.prompt,
		systemInstruction: opts.systemInstruction,
	});

	return {
		...result,
		provider: 'zai',
		wasFallback: false,
		latencyMs: Date.now() - startTime,
	};
}

export async function callAITranscribe(
	env: Env,
	opts: {
		model?: string;
		audio: ArrayBuffer;
		language?: string;
		organizationId?: string;
	},
): Promise<{ text: string; latencyMs: number }> {
	const registry = createModelRegistry(env);
	const startTime = Date.now();

	let targetModel = opts.model;
	if (!targetModel && opts.organizationId) {
		try {
			const config = await registry.getConfig(opts.organizationId);
			targetModel = config.transcriptionModel;
		} catch {
			targetModel = 'glm-asr-2512';
		}
	}
	if (!targetModel) targetModel = 'glm-asr-2512';

	if (targetModel.startsWith('glm-')) {
		try {
			const result = await zaiTranscribe(env, {
				model: targetModel,
				audio: opts.audio,
				language: opts.language,
			});
			return { text: result.text, latencyMs: Date.now() - startTime };
		} catch (err) {
			console.warn('[callAITranscribe] GLM-ASR failed, falling back to Workers AI:', err);
		}
	}

	const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(opts.audio)));
	const { transcribeAudio } = await import('../ai-native');
	const text = await transcribeAudio(env, audioBase64, opts.language);
	return { text, latencyMs: Date.now() - startTime };
}

function buildMessages(opts: CallAIOptions): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
	if (opts.messages) return opts.messages;
	const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
	if (opts.systemInstruction) messages.push({ role: 'system', content: opts.systemInstruction });
	if (opts.prompt) messages.push({ role: 'user', content: opts.prompt });
	return messages;
}

async function executeProvider(
	env: Env,
	provider: AIProvider,
	modelId: string,
	opts: {
		messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
		temperature?: number;
		maxTokens?: number;
		thinkingLevel?: ThinkingLevel;
		responseFormat?: 'json' | 'text';
		cacheKey?: string;
		cacheTtl?: number;
	},
): Promise<ZAIChatResult> {
	switch (provider) {
		case 'zai':
		case 'openai':
		case 'anthropic':
			return zaiChat(env, {
				model: modelId,
				messages: opts.messages,
				temperature: opts.temperature,
				maxTokens: opts.maxTokens,
				thinkingLevel: opts.thinkingLevel,
				responseFormat: opts.responseFormat === 'json' ? { type: 'json_object' } : undefined,
				cacheKey: opts.cacheKey,
				cacheTtl: opts.cacheTtl,
			});
		case 'workers-ai': {
			const response = await runAi(
				env,
				modelId,
				{ messages: opts.messages, max_tokens: opts.maxTokens ?? 1024 },
				{ cache: !!opts.cacheKey, cacheTtl: opts.cacheTtl ?? 3600 },
			);
			const result = response as { response?: string };
			return {
				content: result.response ?? '',
				usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
				model: modelId,
			};
		}
		case 'gemini': {
			const { callGeminiThinking } = await import('../ai-gemini-v2');
			const result = await callGeminiThinking(env, {
				prompt: opts.messages.map((m) => m.content).join('\n'),
				systemInstruction: opts.messages.find((m) => m.role === 'system')?.content,
				thinkingLevel: opts.thinkingLevel,
				temperature: opts.temperature,
				maxOutputTokens: opts.maxTokens,
			});
			return {
				content: result.text,
				thinking: result.thoughts,
				usage: {
					inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
					outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
					cachedTokens: result.usageMetadata?.cachedContentTokenCount ?? 0,
				},
				model: modelId,
			};
		}
		default:
			throw new Error(`Unsupported AI provider: ${provider}`);
	}
}

const WORKERS_MODEL_MAP: Record<string, string> = {
	'workers-llama-3.3-70b': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	'workers-llama-3.1-8b': '@cf/meta/llama-3.1-8b-instruct',
	'workers-whisper': '@cf/openai/whisper-large-v3-turbo',
	'workers-nova-3': '@cf/deepgram/nova-3',
	'workers-embeddings': '@cf/baai/bge-base-en-v1.5',
};

function getProviderModelId(modelId: string, provider: AIProvider): string {
	if (provider === 'workers-ai') {
		return WORKERS_MODEL_MAP[modelId] ?? modelId;
	}
	return modelId;
}
