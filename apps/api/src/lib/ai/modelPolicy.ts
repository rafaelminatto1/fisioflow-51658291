export type ModelClass = 'cheap' | 'medium' | 'embeddings' | 'reranker' | 'forbidden';

export type TaskType = 
  | 'clinical_rag_query'
  | 'no_show_risk_explanation'
  | 'soap_evolution_generation'
  | 'patient_longitudinal_summary'
  | 'grammar_correction'
  | 'json_extraction'
  | 'protocol_knowledge_search';

export const FORBIDDEN_MODELS = [
  'GLM 5.2', 
  'gpt-4', // Exemplo: restrito por não ter BAA
  'gpt-4o'
];

export const MODEL_REGISTRY: Record<string, ModelClass> = {
  '@cf/meta/llama-3-8b-instruct': 'cheap',
  'gemini-1.5-flash': 'cheap',
  'gemini-1.5-pro': 'medium',
  '@cf/baai/bge-base-en-v1.5': 'embeddings',
  'text-embedding-004': 'embeddings',
  '@cf/baai/bge-reranker-v2-m3': 'reranker',
};

// Mapeia quais taskTypes podem usar quais categorias de modelo
export const TASK_MODEL_PERMISSIONS: Record<TaskType, ModelClass[]> = {
  'grammar_correction': ['cheap'],
  'json_extraction': ['cheap'],
  'no_show_risk_explanation': ['cheap'],
  'protocol_knowledge_search': ['cheap', 'reranker', 'embeddings'],
  'clinical_rag_query': ['cheap', 'medium', 'embeddings', 'reranker'],
  'patient_longitudinal_summary': ['medium', 'cheap'],
  'soap_evolution_generation': ['medium'],
};

export class ModelPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelPolicyError';
  }
}

/**
 * Valida se um modelo pode ser usado para uma tarefa específica
 */
export function validateModelPolicy(model: string, taskType: TaskType): boolean {
  // 1. Bloqueia explicitamente modelos proibidos
  if (FORBIDDEN_MODELS.includes(model)) {
    throw new ModelPolicyError(`O modelo '${model}' está proibido para uso no ambiente de produção.`);
  }

  // 2. Identifica a classe do modelo
  const modelClass = MODEL_REGISTRY[model];
  if (!modelClass) {
    throw new ModelPolicyError(`O modelo '${model}' não está registrado na política. Classifique-o antes de usar.`);
  }

  // 3. Valida permissão de taskType
  const allowedClasses = TASK_MODEL_PERMISSIONS[taskType];
  if (!allowedClasses) {
    throw new ModelPolicyError(`TaskType '${taskType}' desconhecido na política.`);
  }

  if (!allowedClasses.includes(modelClass)) {
    throw new ModelPolicyError(`O modelo '${model}' (Classe: ${modelClass}) não é permitido para a tarefa '${taskType}'. Modelos permitidos: ${allowedClasses.join(', ')}.`);
  }

  return true;
}
