import OpenAI from 'openai';
import type { Env } from '../../../types/env';
import type { ThinkingLevel } from '../modelRegistry';

export interface ZAIChatOptions {
	model: string;
	messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
	temperature?: number;
	maxTokens?: number;
	thinkingLevel?: ThinkingLevel;
	responseFormat?: { type: 'json_object' | 'text' };
	cacheKey?: string;
	cacheTtl?: number;
}

export interface ZAIChatResult {
	content: string;
	thinking?: string;
	usage: {
		inputTokens: number;
		outputTokens: number;
		cachedTokens: number;
	};
	model: string;
}

const ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4/';
const AI_GATEWAY_PATH = 'openai';

function createClient(env: Env, cacheKey?: string, cacheTtl?: number): OpenAI {
	const baseURL = env.FISIOFLOW_AI_GATEWAY_URL
		? `${env.FISIOFLOW_AI_GATEWAY_URL}/${AI_GATEWAY_PATH}`
		: ZAI_BASE_URL;

	const defaultHeaders: Record<string, string> = {};
	if (cacheKey) defaultHeaders['cf-aig-cache-key'] = cacheKey;
	if (cacheTtl) defaultHeaders['cf-aig-cache-ttl'] = String(cacheTtl);

	return new OpenAI({
		apiKey: env.ZAI_API_KEY!,
		baseURL,
		defaultHeaders,
	});
}

const THINKING_BUDGETS: Record<ThinkingLevel, number> = {
	MINIMAL: 0,
	LOW: 512,
	MEDIUM: 1024,
	HIGH: 4096,
};

export async function zaiChat(env: Env, opts: ZAIChatOptions): Promise<ZAIChatResult> {
	const client = createClient(env, opts.cacheKey, opts.cacheTtl);

	const requestParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
		model: opts.model,
		messages: opts.messages,
		temperature: opts.temperature ?? 0.4,
		max_tokens: opts.maxTokens ?? 2048,
	};

	if (opts.responseFormat) {
		requestParams.response_format = opts.responseFormat as any;
	}

	const response = await client.chat.completions.create(requestParams);

	const choice = response.choices[0];
	const message = choice?.message;

	let thinking: string | undefined;
	if ((message as any)?.reasoning_content) {
		thinking = String((message as any).reasoning_content);
	}

	return {
		content: message?.content ?? '',
		thinking,
		usage: {
			inputTokens: response.usage?.prompt_tokens ?? 0,
			outputTokens: response.usage?.completion_tokens ?? 0,
			cachedTokens: (response.usage as any)?.prompt_tokens_details?.cached_tokens ?? 0,
		},
		model: response.model,
	};
}

export async function zaiVision(
	env: Env,
	opts: {
		model?: string;
		imageBase64: string;
		imageMimeType: string;
		prompt: string;
		systemInstruction?: string;
		maxTokens?: number;
	},
): Promise<ZAIChatResult> {
	const client = createClient(env);
	const model = opts.model ?? 'glm-5v-turbo';

	const messages: OpenAI.ChatCompletionMessageParam[] = [];

	if (opts.systemInstruction) {
		messages.push({ role: 'system', content: opts.systemInstruction });
	}

	messages.push({
		role: 'user',
		content: [
			{
				type: 'image_url',
				image_url: {
					url: `data:${opts.imageMimeType};base64,${opts.imageBase64}`,
				},
			},
			{ type: 'text', text: opts.prompt },
		],
	});

	const response = await client.chat.completions.create({
		model,
		messages,
		max_tokens: opts.maxTokens ?? 1024,
		temperature: 0.4,
	});

	return {
		content: response.choices[0]?.message?.content ?? '',
		usage: {
			inputTokens: response.usage?.prompt_tokens ?? 0,
			outputTokens: response.usage?.completion_tokens ?? 0,
			cachedTokens: (response.usage as any)?.prompt_tokens_details?.cached_tokens ?? 0,
		},
		model: response.model,
	};
}

export async function zaiTranscribe(
	env: Env,
	opts: {
		model?: string;
		audio: ArrayBuffer;
		language?: string;
	},
): Promise<{ text: string }> {
	const client = createClient(env);
	const model = opts.model ?? 'glm-asr-2512';

	const file = new File([opts.audio], 'audio.wav', { type: 'audio/wav' });

	const response = await client.audio.transcriptions.create({
		model,
		file,
		language: opts.language ?? 'pt',
		response_format: 'text',
	});

	return {
		text: typeof response === 'string' ? response : (response as any).text ?? '',
	};
}
