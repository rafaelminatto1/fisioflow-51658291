import { z } from 'zod';

// Schema para categoria de exercício
export const exerciseCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da categoria é obrigatório')
    .max(50, 'Nome da categoria muito longo'),
  description: z
    .string()
    .max(200, 'Descrição muito longa')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal (#RRGGBB)')
    .optional()
});

// Schema para exercício
export const exerciseSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do exercício é obrigatório')
    .max(100, 'Nome do exercício muito longo'),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(1000, 'Descrição muito longa'),
  instructions: z
    .string()
    .min(1, 'Instruções são obrigatórias')
    .max(2000, 'Instruções muito longas'),
  categoryId: z
    .string()
    .uuid('ID da categoria inválido'),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced'], {
      errorMap: () => ({ message: 'Nível de dificuldade inválido' })
    }),
  duration: z
    .number()
    .min(1, 'Duração deve ser pelo menos 1 minuto')
    .max(180, 'Duração máxima é 180 minutos'),
  equipment: z
    .array(z.string().max(50, 'Nome do equipamento muito longo'))
    .max(10, 'Máximo 10 equipamentos por exercício')
    .optional()
    .default([]),
  muscleGroups: z
    .array(z.string().max(50, 'Nome do grupo muscular muito longo'))
    .min(1, 'Pelo menos um grupo muscular deve ser especificado')
    .max(10, 'Máximo 10 grupos musculares por exercício'),
  contraindications: z
    .string()
    .max(500, 'Contraindicações muito longas')
    .optional(),
  benefits: z
    .string()
    .max(500, 'Benefícios muito longos')
    .optional(),
  videoUrl: z
    .string()
    .url('URL do vídeo inválida')
    .optional(),
  imageUrls: z
    .array(z.string().url('URL da imagem inválida'))
    .max(5, 'Máximo 5 imagens por exercício')
    .optional()
    .default([]),
  isActive: z
    .boolean()
    .optional()
    .default(true)
});

// Schema para atualização de exercício
export const updateExerciseSchema = exerciseSchema.partial().refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);

// Schema para parâmetros de exercício em um plano
export const exerciseParametersSchema = z.object({
  sets: z
    .number()
    .min(1, 'Número de séries deve ser pelo menos 1')
    .max(10, 'Máximo 10 séries por exercício'),
  reps: z
    .number()
    .min(1, 'Número de repetições deve ser pelo menos 1')
    .max(100, 'Máximo 100 repetições por série')
    .optional(),
  duration: z
    .number()
    .min(1, 'Duração deve ser pelo menos 1 segundo')
    .max(3600, 'Duração máxima é 3600 segundos (1 hora)')
    .optional(),
  restTime: z
    .number()
    .min(0, 'Tempo de descanso deve ser pelo menos 0 segundos')
    .max(600, 'Tempo de descanso máximo é 600 segundos (10 minutos)')
    .optional()
    .default(30),
  weight: z
    .number()
    .min(0, 'Peso deve ser pelo menos 0 kg')
    .max(500, 'Peso máximo é 500 kg')
    .optional(),
  resistance: z
    .enum(['light', 'medium', 'heavy'], {
      errorMap: () => ({ message: 'Resistência inválida' })
    })
    .optional(),
  notes: z
    .string()
    .max(200, 'Notas muito longas')
    .optional()
}).refine(
  (data) => data.reps || data.duration,
  {
    message: 'Repetições ou duração devem ser especificadas',
    path: ['reps']
  }
);

// Schema para exercício em um plano de tratamento
export const planExerciseSchema = z.object({
  exerciseId: z
    .string()
    .uuid('ID do exercício inválido'),
  parameters: exerciseParametersSchema,
  order: z
    .number()
    .min(1, 'Ordem deve ser pelo menos 1')
    .max(50, 'Máximo 50 exercícios por sessão'),
  isOptional: z
    .boolean()
    .optional()
    .default(false)
});

// Schema para sessão de exercícios
export const exerciseSessionSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da sessão é obrigatório')
    .max(100, 'Nome da sessão muito longo'),
  description: z
    .string()
    .max(500, 'Descrição muito longa')
    .optional(),
  exercises: z
    .array(planExerciseSchema)
    .min(1, 'Pelo menos um exercício deve ser incluído na sessão')
    .max(20, 'Máximo 20 exercícios por sessão'),
  estimatedDuration: z
    .number()
    .min(5, 'Duração estimada deve ser pelo menos 5 minutos')
    .max(240, 'Duração estimada máxima é 240 minutos'),
  warmupInstructions: z
    .string()
    .max(500, 'Instruções de aquecimento muito longas')
    .optional(),
  cooldownInstructions: z
    .string()
    .max(500, 'Instruções de relaxamento muito longas')
    .optional()
});

// Schema para plano de tratamento
export const treatmentPlanSchema = z.object({
  patientId: z
    .string()
    .uuid('ID do paciente inválido'),
  name: z
    .string()
    .min(1, 'Nome do plano é obrigatório')
    .max(100, 'Nome do plano muito longo'),
  description: z
    .string()
    .max(1000, 'Descrição muito longa')
    .optional(),
  objectives: z
    .array(z.string().max(200, 'Objetivo muito longo'))
    .min(1, 'Pelo menos um objetivo deve ser especificado')
    .max(10, 'Máximo 10 objetivos por plano'),
  sessions: z
    .array(exerciseSessionSchema)
    .min(1, 'Pelo menos uma sessão deve ser incluída no plano')
    .max(10, 'Máximo 10 sessões por plano'),
  frequency: z
    .number()
    .min(1, 'Frequência deve ser pelo menos 1 vez por semana')
    .max(7, 'Frequência máxima é 7 vezes por semana'),
  duration: z
    .number()
    .min(1, 'Duração deve ser pelo menos 1 semana')
    .max(52, 'Duração máxima é 52 semanas'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  isActive: z
    .boolean()
    .optional()
    .default(true),
  notes: z
    .string()
    .max(1000, 'Notas muito longas')
    .optional()
}).refine(
  (data) => {
    if (data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Data de início deve ser anterior à data de fim',
    path: ['endDate']
  }
);

// Schema para atualização de plano de tratamento
export const updateTreatmentPlanSchema = treatmentPlanSchema.partial().refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);

// Schema para busca de exercícios
export const searchExerciseSchema = z.object({
  query: z
    .string()
    .min(1, 'Termo de busca é obrigatório')
    .max(100, 'Termo de busca muito longo'),
  categoryId: z
    .string()
    .uuid('ID da categoria inválido')
    .optional(),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .optional(),
  muscleGroups: z
    .array(z.string())
    .optional(),
  equipment: z
    .array(z.string())
    .optional(),
  maxDuration: z
    .number()
    .min(1, 'Duração máxima deve ser pelo menos 1 minuto')
    .optional(),
  limit: z
    .number()
    .min(1, 'Limite deve ser pelo menos 1')
    .max(100, 'Limite máximo é 100')
    .optional()
    .default(20),
  offset: z
    .number()
    .min(0, 'Offset deve ser pelo menos 0')
    .optional()
    .default(0)
});

// Schema para registro de execução de exercício
export const exerciseExecutionSchema = z.object({
  planExerciseId: z
    .string()
    .uuid('ID do exercício do plano inválido'),
  sessionId: z
    .string()
    .uuid('ID da sessão inválido'),
  completedSets: z
    .number()
    .min(0, 'Séries completadas deve ser pelo menos 0'),
  completedReps: z
    .array(z.number().min(0, 'Repetições devem ser pelo menos 0'))
    .optional(),
  completedDuration: z
    .number()
    .min(0, 'Duração completada deve ser pelo menos 0 segundos')
    .optional(),
  actualWeight: z
    .number()
    .min(0, 'Peso real deve ser pelo menos 0 kg')
    .optional(),
  actualResistance: z
    .enum(['light', 'medium', 'heavy'])
    .optional(),
  difficulty: z
    .number()
    .min(1, 'Dificuldade deve ser entre 1 e 10')
    .max(10, 'Dificuldade deve ser entre 1 e 10')
    .optional(),
  pain: z
    .number()
    .min(0, 'Dor deve ser entre 0 e 10')
    .max(10, 'Dor deve ser entre 0 e 10')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notas muito longas')
    .optional(),
  completedAt: z
    .string()
    .datetime('Data e hora de conclusão inválida')
});

// Tipos TypeScript derivados dos schemas
export type ExerciseCategoryData = z.infer<typeof exerciseCategorySchema>;
export type ExerciseData = z.infer<typeof exerciseSchema>;
export type UpdateExerciseData = z.infer<typeof updateExerciseSchema>;
export type ExerciseParametersData = z.infer<typeof exerciseParametersSchema>;
export type PlanExerciseData = z.infer<typeof planExerciseSchema>;
export type ExerciseSessionData = z.infer<typeof exerciseSessionSchema>;
export type TreatmentPlanData = z.infer<typeof treatmentPlanSchema>;
export type UpdateTreatmentPlanData = z.infer<typeof updateTreatmentPlanSchema>;
export type SearchExerciseData = z.infer<typeof searchExerciseSchema>;
export type ExerciseExecutionData = z.infer<typeof exerciseExecutionSchema>;