import { z } from 'zod';

// Schema para criar item de checklist
export const checklistItemCreateSchema = z.object({
  evento_id: z.string().uuid(),
  titulo: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  tipo: z.enum(['levar', 'alugar', 'comprar']),
  quantidade: z.number().int().positive().default(1),
  custo_unitario: z.number().nonnegative().default(0),
});

// Schema para atualizar item de checklist
export const checklistItemUpdateSchema = checklistItemCreateSchema.partial().extend({
  status: z.enum(['ABERTO', 'OK']).optional(),
});

// Schema completo do item de checklist
export const checklistItemSchema = checklistItemCreateSchema.extend({
  id: z.string().uuid(),
  status: z.enum(['ABERTO', 'OK']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ChecklistItemCreate = z.infer<typeof checklistItemCreateSchema>;
export type ChecklistItemUpdate = z.infer<typeof checklistItemUpdateSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
