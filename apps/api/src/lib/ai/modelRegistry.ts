import type { Env } from '../../types/env';
import { getRawSql, type DbRow } from '../../lib/db';

export type AIProvider = 'zai' | 'workers-ai' | 'openai' | 'anthropic' | 'gemini';

export type AICapability = 'chat' | 'thinking' | 'vision' | 'audio' | 'transcription' | 'embeddings' | 'function-calling';

export type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface AIModelDefinition {
	id: string;
	provider: AIProvider;
	displayName: string;
	description: string;
	capabilities: AICapability[];
	inputCostPer1m: number;
	outputCostPer1m: number;
	cachedCostPer1m: number;
	contextLength: number | null;
	isFree: boolean;
	isDefault: boolean;
	sortOrder: number;
}

export interface AIModelConfig {
	chatModel: string;
	analysisModel: string;
	visionModel: string;
	transcriptionModel: string;
	embeddingModel: string;
	thinkingEnabled: boolean;
	thinkingLevel: ThinkingLevel;
}

interface CachedConfig {
	config: AIModelConfig;
	expiresAt: number;
}

const DEFAULT_CONFIG: AIModelConfig = {
	chatModel: 'glm-4.7-flash',
	analysisModel: 'glm-4.7-flash',
	visionModel: 'glm-5v-turbo',
	transcriptionModel: 'glm-asr-2512',
	embeddingModel: '@cf/baai/bge-base-en-v1.5',
	thinkingEnabled: false,
	thinkingLevel: 'MEDIUM',
};

const MODEL_DEFINITIONS: AIModelDefinition[] = [
	{
		id: 'glm-4.7-flash',
		provider: 'zai',
		displayName: 'GLM-4.7 Flash',
		description: 'Rápido e gratuito. Ideal para uso diário.',
		capabilities: ['chat', 'thinking'],
		inputCostPer1m: 0,
		outputCostPer1m: 0,
		cachedCostPer1m: 0,
		contextLength: 200000,
		isFree: true,
		isDefault: true,
		sortOrder: 1,
	},
	{
		id: 'glm-5.1',
		provider: 'zai',
		displayName: 'GLM-5.1',
		description: 'Flagship. 200K contexto, thinking avançado.',
		capabilities: ['chat', 'thinking', 'function-calling'],
		inputCostPer1m: 1.40,
		outputCostPer1m: 4.40,
		cachedCostPer1m: 0.26,
		contextLength: 200000,
		isFree: false,
		isDefault: false,
		sortOrder: 2,
	},
	{
		id: 'glm-5v-turbo',
		provider: 'zai',
		displayName: 'GLM-5V Turbo',
		description: 'Multimodal com visão.',
		capabilities: ['chat', 'vision', 'thinking'],
		inputCostPer1m: 1.20,
		outputCostPer1m: 4.00,
		cachedCostPer1m: 0.24,
		contextLength: 200000,
		isFree: false,
		isDefault: false,
		sortOrder: 10,
	},
	{
		id: 'glm-asr-2512',
		provider: 'zai',
		displayName: 'GLM-ASR',
		description: 'Transcrição de áudio. PT-BR nativo.',
		capabilities: ['audio', 'transcription'],
		inputCostPer1m: 0.03,
		outputCostPer1m: 0,
		cachedCostPer1m: 0,
		contextLength: null,
		isFree: false,
		isDefault: false,
		sortOrder: 20,
	},
	{
		id: 'workers-llama-3.3-70b',
		provider: 'workers-ai',
		displayName: 'Llama 3.3 70B (Edge)',
		description: 'Edge inference grátis.',
		capabilities: ['chat'],
		inputCostPer1m: 0,
		outputCostPer1m: 0,
		cachedCostPer1m: 0,
		contextLength: null,
		isFree: true,
		isDefault: false,
		sortOrder: 5,
	},
	{
		id: 'workers-whisper',
		provider: 'workers-ai',
		displayName: 'Whisper (Edge)',
		description: 'Transcrição na edge.',
		capabilities: ['audio', 'transcription'],
		inputCostPer1m: 0,
		outputCostPer1m: 0,
		cachedCostPer1m: 0,
		contextLength: null,
		isFree: true,
		isDefault: false,
		sortOrder: 21,
	},
	{
		id: 'workers-embeddings',
		provider: 'workers-ai',
		displayName: 'BGE Embeddings (Edge)',
		description: 'Embeddings para RAG.',
		capabilities: ['embeddings'],
		inputCostPer1m: 0,
		outputCostPer1m: 0,
		cachedCostPer1m: 0,
		contextLength: null,
		isFree: true,
		isDefault: false,
		sortOrder: 30,
	},
	{
		id: 'gpt-4o',
		provider: 'openai',
		displayName: 'GPT-4o',
		description: 'OpenAI flagship.',
		capabilities: ['chat', 'vision'],
		inputCostPer1m: 2.50,
		outputCostPer1m: 10.00,
		cachedCostPer1m: 1.25,
		contextLength: 128000,
		isFree: false,
		isDefault: false,
		sortOrder: 3,
	},
	{
		id: 'gpt-4o-mini',
		provider: 'openai',
		displayName: 'GPT-4o Mini',
		description: 'Rápido e barato.',
		capabilities: ['chat'],
		inputCostPer1m: 0.15,
		outputCostPer1m: 0.60,
		cachedCostPer1m: 0.075,
		contextLength: 128000,
		isFree: false,
		isDefault: false,
		sortOrder: 4,
	},
	{
		id: 'claude-sonnet-4',
		provider: 'anthropic',
		displayName: 'Claude Sonnet 4',
		description: 'Excelente em análise clínica.',
		capabilities: ['chat', 'thinking'],
		inputCostPer1m: 3.00,
		outputCostPer1m: 15.00,
		cachedCostPer1m: 1.50,
		contextLength: 200000,
		isFree: false,
		isDefault: false,
		sortOrder: 7,
	},
	{
		id: 'gemini-3-flash',
		provider: 'gemini',
		displayName: 'Gemini 3 Flash (Legacy)',
		description: 'Google Gemini. Já configurado.',
		capabilities: ['chat', 'thinking'],
		inputCostPer1m: 0,
		outputCostPer1m: 0,
		cachedCostPer1m: 0,
		contextLength: 1000000,
		isFree: true,
		isDefault: false,
		sortOrder: 8,
	},
];

const MODEL_MAP = new Map(MODEL_DEFINITIONS.map((m) => [m.id, m]));

const configCache = new Map<string, CachedConfig>();
const CONFIG_TTL_MS = 5 * 60 * 1000;

export class ModelRegistry {
	constructor(private env: Env) {}

	getModel(modelId: string): AIModelDefinition | undefined {
		return MODEL_MAP.get(modelId);
	}

	getModelOrThrow(modelId: string): AIModelDefinition {
		const model = MODEL_MAP.get(modelId);
		if (!model) throw new Error(`Unknown AI model: ${modelId}`);
		return model;
	}

	listModels(options?: { capability?: AICapability; freeOnly?: boolean }): AIModelDefinition[] {
		let models = MODEL_DEFINITIONS.filter((m) => m.id !== 'workers-embeddings');
		if (options?.capability) {
			models = models.filter((m) => m.capabilities.includes(options.capability!));
		}
		if (options?.freeOnly) {
			models = models.filter((m) => m.isFree);
		}
		return models.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	listChatModels(): AIModelDefinition[] {
		return this.listModels({ capability: 'chat' });
	}

	hasCapability(modelId: string, capability: AICapability): boolean {
		return MODEL_MAP.get(modelId)?.capabilities.includes(capability) ?? false;
	}

	isFree(modelId: string): boolean {
		return MODEL_MAP.get(modelId)?.isFree ?? false;
	}

	getProvider(modelId: string): AIProvider {
		return this.getModelOrThrow(modelId).provider;
	}

	calculateCost(modelId: string, inputTokens: number, outputTokens: number, cachedTokens = 0): number {
		const model = this.getModelOrThrow(modelId);
		const inputCost = ((inputTokens - cachedTokens) / 1_000_000) * model.inputCostPer1m;
		const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1m;
		const cachedCost = (cachedTokens / 1_000_000) * model.cachedCostPer1m;
		return inputCost + outputCost + cachedCost;
	}

	getFallbackChain(modelId: string): string[] {
		const model = this.getModelOrThrow(modelId);
		const chain = [modelId];

		if (model.provider === 'zai') {
			chain.push('workers-llama-3.3-70b');
		} else if (model.provider === 'openai' || model.provider === 'anthropic') {
			chain.push('glm-4.7-flash', 'workers-llama-3.3-70b');
		}

		chain.push('workers-llama-3.3-70b');
		return [...new Set(chain)];
	}

	async getConfig(organizationId: string): Promise<AIModelConfig> {
		const cached = configCache.get(organizationId);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.config;
		}

		try {
			const sql = getRawSql(this.env);
			const result = await sql<{
				default_chat_model: string;
				default_analysis_model: string;
				default_vision_model: string;
				default_transcription_model: string;
				default_embedding_model: string;
				thinking_enabled: boolean;
				thinking_budget: string;
			}>(
				`SELECT default_chat_model, default_analysis_model, default_vision_model,
				        default_transcription_model, default_embedding_model,
				        thinking_enabled, thinking_budget
				 FROM ai_config WHERE organization_id = $1`,
				[organizationId],
			);

			if (result.rows && result.rows.length > 0) {
				const row = result.rows[0];
				const config: AIModelConfig = {
					chatModel: row.default_chat_model,
					analysisModel: row.default_analysis_model,
					visionModel: row.default_vision_model,
					transcriptionModel: row.default_transcription_model,
					embeddingModel: row.default_embedding_model,
					thinkingEnabled: row.thinking_enabled,
					thinkingLevel: (row.thinking_budget as ThinkingLevel) ?? 'MEDIUM',
				};
				configCache.set(organizationId, { config, expiresAt: Date.now() + CONFIG_TTL_MS });
				return config;
			}
		} catch {
			// Table might not exist yet (before migration runs)
		}

		return { ...DEFAULT_CONFIG };
	}

	async setConfig(organizationId: string, updates: Partial<AIModelConfig>): Promise<AIModelConfig> {
		const current = await this.getConfig(organizationId);
		const merged = { ...current, ...updates };

		try {
			const sql = getRawSql(this.env, 'write');
			await sql(
				`INSERT INTO ai_config (organization_id, default_chat_model, default_analysis_model,
				         default_vision_model, default_transcription_model, default_embedding_model,
				         thinking_enabled, thinking_budget)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				 ON CONFLICT (organization_id) DO UPDATE SET
				   default_chat_model = $2, default_analysis_model = $3,
				   default_vision_model = $4, default_transcription_model = $5,
				   default_embedding_model = $6, thinking_enabled = $7,
				   thinking_budget = $8, updated_at = now()`,
				[organizationId, merged.chatModel, merged.analysisModel, merged.visionModel,
				 merged.transcriptionModel, merged.embeddingModel, merged.thinkingEnabled, merged.thinkingLevel],
			);
		} catch {
			// Table might not exist yet
		}

		configCache.delete(organizationId);
		return merged;
	}

	invalidateConfigCache(organizationId: string): void {
		configCache.delete(organizationId);
	}
}

export function createModelRegistry(env: Env): ModelRegistry {
	return new ModelRegistry(env);
}
