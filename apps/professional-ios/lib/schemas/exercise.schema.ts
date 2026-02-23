import { z } from 'zod';
import type { Exercise } from '@/types';

/**
 * Dificuldade do exercício
 */
export const difficultySchema = z.enum([
  'Fácil',
  'Médio',
  'Difícil',
], {
  errorMap: {
    invalid_type_error: 'Dificuldade inválida',
    required_error: 'Dificuldade é obrigatória',
  },
  description: 'Nível de dificuldade do exercício',
});

/**
 * Schema completo de exercício
 */
export const exerciseSchema = z.object({
  id: z.string().uuid({
    errorMap: {
      invalid_string_error: 'ID deve ser um UUID válido',
    },
  }),
  name: z.string().min(1, 'Nome do exercício').max(100, {
    errorMap: {
      invalid_string_error: 'Nome deve ter entre 1 e 100 caracteres',
    },
  }),
  description: z.string().min(10, 'Descrição do exercício').max(1000, {
    errorMap: {
      invalid_string_error: 'Descrição deve ter entre 10 e 1000 caracteres',
    },
  }),
  difficulty: difficultySchema.default('Médio'),
  category: z.string().default('Geral'),
  bodyParts: z.array(z.string()).default([]),
  duration: z.number().min(1).max(60).default(30, {
    errorMap: {
      invalid_type_error: 'Duração deve ser um número inteiro entre 1 e 60 minutos',
    },
  }),
  sets: z.number().min(1).default(3).optional(),
  repetitions: z.number().min(1).default(10).optional(),
  restTime: z.number().min(0).default(60).optional(),
  thumbnailUrl: z.string().url({
    errorMap: {
      invalid_string_error: 'URL da miniatura inválida',
    },
  }).optional(),
  videoUrl: z.string().url({
    errorMap: {
      invalid_string_error: 'URL do vídeo inválida',
    },
  }).optional(),
  instructions: z.string().max(2000, {
    errorMap: {
      invalid_string_error: 'Instruções devem ter até 2000 caracteres',
    },
  }).optional(),
  active: z.boolean().default(true),
  createdAt: z.string().or(z.coerce.date(), z.literal('')),
  updatedAt: z.string().or(z.coerce.date(), z.literal('')),
}, {
  errorMap: (issue, ctx) => {
    if (issue.code === 'invalid_type' && ctx.path === 'duration') {
      return { ...issue, message: 'Duração inválida: deve ser um número inteiro entre 1 e 60 minutos' };
    }
    return { message: issue.message || 'Erro de validação' };
  },
});

/**
 * Schema para criação de exercício
 */
export const createExerciseSchema = z.object({
  name: z.string().min(1, 'Nome do exercício').max(100, {
    errorMap: {
      invalid_string_error: 'Nome deve ter entre 1 e 100 caracteres',
    },
  }),
  description: z.string().min(10, 'Descrição do exercício').max(1000, {
    errorMap: {
      invalid_string_error: 'Descrição deve ter entre 10 e 1000 caracteres',
    },
  }),
  difficulty: difficultySchema.default('Médio'),
  category: z.string().default('Geral'),
  duration: z.number().min(1).max(60).default(30),
  sets: z.number().min(1).default(3),
  repetitions: z.number().min(1).default(10),
  restTime: z.number().min(0).default(60),
});

/**
 * Schema para atualização de exercício
 */
export const updateExerciseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome do exercício').max(100).optional(),
  description: z.string().max(1000).optional(),
  difficulty: difficultySchema.optional(),
  category: z.string().optional(),
  duration: z.number().min(1).max(60).optional(),
  sets: z.number().min(1).optional(),
  repetitions: z.number().min(1).optional(),
  restTime: z.number().min(0).optional(),
  instructions: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

/**
 * Type exports para uso em outras partes do código
 */
export type ExerciseCreate = z.infer<typeof createExerciseSchema>;
export type ExerciseUpdate = z.infer<typeof updateExerciseSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type BodyPart = z.infer<typeof exerciseSchema>;
