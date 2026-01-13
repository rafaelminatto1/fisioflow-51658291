import { z } from 'zod';

export const PatientSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    mainCondition: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'Em Tratamento', 'Inicial', 'Alta', 'Arquivado']).default('active'),
    progress: z.number().optional().default(0),
    incomplete_registration: z.boolean().optional().default(false),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    organization_id: z.string().uuid().optional().nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;

// Schema for updating/creating
export const PatientFormSchema = PatientSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
}).partial();
