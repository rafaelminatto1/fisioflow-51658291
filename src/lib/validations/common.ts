import { z } from 'zod';

// Schema para paginação
export const paginationSchema = z.object({
  page: z
    .number()
    .min(1, 'Página deve ser pelo menos 1')
    .optional()
    .default(1),
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

// Schema para ordenação
export const sortingSchema = z.object({
  sortBy: z
    .string()
    .min(1, 'Campo de ordenação é obrigatório')
    .max(50, 'Campo de ordenação muito longo'),
  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Ordem de classificação inválida' })
    })
    .optional()
    .default('asc')
});

// Schema para filtros de data
export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['endDate']
  }
);

// Schema para upload de arquivo
export const fileUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, 'Nome do arquivo é obrigatório')
    .max(255, 'Nome do arquivo muito longo')
    .regex(
      /^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/,
      'Nome do arquivo deve ter uma extensão válida'
    ),
  fileSize: z
    .number()
    .min(1, 'Tamanho do arquivo deve ser pelo menos 1 byte')
    .max(50 * 1024 * 1024, 'Tamanho máximo do arquivo é 50MB'),
  fileType: z
    .string()
    .min(1, 'Tipo do arquivo é obrigatório')
    .regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9.-]+$/, 'Tipo MIME inválido'),
  bucket: z
    .enum(['patient-documents', 'exercise-media', 'user-avatars', 'treatment-files'], {
      errorMap: () => ({ message: 'Bucket de armazenamento inválido' })
    }),
  folder: z
    .string()
    .max(100, 'Caminho da pasta muito longo')
    .optional(),
  isPublic: z
    .boolean()
    .optional()
    .default(false)
});

// Schema para configurações do usuário
export const userPreferencesSchema = z.object({
  language: z
    .enum(['pt-BR', 'en-US', 'es-ES'], {
      errorMap: () => ({ message: 'Idioma inválido' })
    })
    .optional()
    .default('pt-BR'),
  timezone: z
    .string()
    .min(1, 'Fuso horário é obrigatório')
    .max(50, 'Fuso horário muito longo')
    .optional()
    .default('America/Sao_Paulo'),
  dateFormat: z
    .enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], {
      errorMap: () => ({ message: 'Formato de data inválido' })
    })
    .optional()
    .default('DD/MM/YYYY'),
  timeFormat: z
    .enum(['12h', '24h'], {
      errorMap: () => ({ message: 'Formato de hora inválido' })
    })
    .optional()
    .default('24h'),
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .optional()
    .default('BRL'),
  theme: z
    .enum(['light', 'dark', 'system'], {
      errorMap: () => ({ message: 'Tema inválido' })
    })
    .optional()
    .default('system'),
  notifications: z.object({
    email: z
      .boolean()
      .optional()
      .default(true),
    push: z
      .boolean()
      .optional()
      .default(true),
    sms: z
      .boolean()
      .optional()
      .default(false),
    appointments: z
      .boolean()
      .optional()
      .default(true),
    reminders: z
      .boolean()
      .optional()
      .default(true),
    marketing: z
      .boolean()
      .optional()
      .default(false)
  }).optional().default({})
});

// Schema para endereço (reutilizável)
export const addressSchema = z.object({
  street: z
    .string()
    .min(1, 'Rua é obrigatória')
    .max(100, 'Rua muito longa'),
  number: z
    .string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número muito longo'),
  complement: z
    .string()
    .max(50, 'Complemento muito longo')
    .optional(),
  neighborhood: z
    .string()
    .min(1, 'Bairro é obrigatório')
    .max(50, 'Bairro muito longo'),
  city: z
    .string()
    .min(1, 'Cidade é obrigatória')
    .max(50, 'Cidade muito longa'),
  state: z
    .string()
    .min(1, 'Estado é obrigatório')
    .length(2, 'Estado deve ter 2 caracteres (ex: SP)'),
  zipCode: z
    .string()
    .min(1, 'CEP é obrigatório')
    .regex(/^\d{5}-\d{3}$/, 'CEP deve estar no formato 00000-000'),
  country: z
    .string()
    .min(1, 'País é obrigatório')
    .max(50, 'País muito longo')
    .optional()
    .default('Brasil')
});

// Schema para contato (reutilizável)
export const contactSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  phone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
      'Formato de telefone inválido (ex: (11) 99999-9999)'
    ),
  alternativePhone: z
    .string()
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
      'Formato de telefone inválido'
    )
    .optional(),
  whatsapp: z
    .string()
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
      'Formato de WhatsApp inválido'
    )
    .optional()
});

// Schema para busca geral
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Termo de busca é obrigatório')
    .max(100, 'Termo de busca muito longo'),
  filters: z
    .record(z.any())
    .optional(),
  ...paginationSchema.shape,
  ...sortingSchema.shape
});

// Schema para configurações da clínica
export const clinicSettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da clínica é obrigatório')
    .max(100, 'Nome da clínica muito longo'),
  description: z
    .string()
    .max(500, 'Descrição muito longa')
    .optional(),
  logo: z
    .string()
    .url('URL do logo inválida')
    .optional(),
  address: addressSchema,
  contact: contactSchema,
  cnpj: z
    .string()
    .regex(
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
      'CNPJ deve estar no formato 00.000.000/0000-00'
    )
    .optional(),
  stateRegistration: z
    .string()
    .max(20, 'Inscrição estadual muito longa')
    .optional(),
  municipalRegistration: z
    .string()
    .max(20, 'Inscrição municipal muito longa')
    .optional(),
  workingHours: z.object({
    monday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(false)
    }).optional(),
    tuesday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(false)
    }).optional(),
    wednesday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(false)
    }).optional(),
    thursday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(false)
    }).optional(),
    friday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(false)
    }).optional(),
    saturday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(true)
    }).optional(),
    sunday: z.object({
      start: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      end: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM')
        .optional(),
      closed: z
        .boolean()
        .optional()
        .default(true)
    }).optional()
  }).optional()
});

// Schema para notificação
export const notificationSchema = z.object({
  title: z
    .string()
    .min(1, 'Título é obrigatório')
    .max(100, 'Título muito longo'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .max(500, 'Mensagem muito longa'),
  type: z
    .enum(['info', 'success', 'warning', 'error'], {
      errorMap: () => ({ message: 'Tipo de notificação inválido' })
    }),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      errorMap: () => ({ message: 'Prioridade inválida' })
    })
    .optional()
    .default('normal'),
  recipientId: z
    .string()
    .uuid('ID do destinatário inválido'),
  scheduledFor: z
    .string()
    .datetime('Data e hora de envio inválida')
    .optional(),
  channels: z
    .array(z.enum(['email', 'push', 'sms', 'in_app']))
    .min(1, 'Pelo menos um canal deve ser especificado')
    .max(4, 'Máximo 4 canais por notificação'),
  metadata: z
    .record(z.any())
    .optional()
});

// Utilitários de validação
export const validateCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/[^\d]/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  
  return parseInt(numbers[9]) === digit1 && parseInt(numbers[10]) === digit2;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/[^\d]/g, '');
  if (numbers.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numbers)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return parseInt(numbers[12]) === digit1 && parseInt(numbers[13]) === digit2;
};

export const formatCurrency = (value: number, currency = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(value);
};

export const formatDate = (date: string | Date, format = 'DD/MM/YYYY'): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

// Tipos TypeScript derivados dos schemas
export type PaginationData = z.infer<typeof paginationSchema>;
export type SortingData = z.infer<typeof sortingSchema>;
export type DateRangeData = z.infer<typeof dateRangeSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type UserPreferencesData = z.infer<typeof userPreferencesSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type ContactData = z.infer<typeof contactSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type ClinicSettingsData = z.infer<typeof clinicSettingsSchema>;
export type NotificationData = z.infer<typeof notificationSchema>;