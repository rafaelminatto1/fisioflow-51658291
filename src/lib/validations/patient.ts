import { z } from 'zod';

// Schema base para informações pessoais
const personalInfoSchema = {
  firstName: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  lastName: z
    .string()
    .min(1, 'Sobrenome é obrigatório')
    .min(2, 'Sobrenome deve ter pelo menos 2 caracteres')
    .max(50, 'Sobrenome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Sobrenome deve conter apenas letras'),
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
  birthDate: z
    .string()
    .min(1, 'Data de nascimento é obrigatória')
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Data deve estar no formato YYYY-MM-DD'
    )
    .refine(
      (date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 0 && age <= 120;
      },
      'Data de nascimento inválida'
    ),
  gender: z
    .enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Gênero é obrigatório' })
    }),
  cpf: z
    .string()
    .min(1, 'CPF é obrigatório')
    .regex(
      /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      'CPF deve estar no formato 000.000.000-00'
    )
    .refine(
      (cpf) => {
        // Validação básica de CPF
        const numbers = cpf.replace(/[^\d]/g, '');
        if (numbers.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(numbers)) return false;
        
        // Validação dos dígitos verificadores
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
      },
      'CPF inválido'
    )
};

// Schema para endereço
const addressSchema = {
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
    .regex(
      /^\d{5}-\d{3}$/,
      'CEP deve estar no formato 00000-000'
    )
};

// Schema para informações médicas
const medicalInfoSchema = {
  emergencyContact: z
    .string()
    .min(1, 'Contato de emergência é obrigatório')
    .max(100, 'Nome do contato muito longo'),
  emergencyPhone: z
    .string()
    .min(1, 'Telefone de emergência é obrigatório')
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
      'Formato de telefone inválido'
    ),
  healthInsurance: z
    .string()
    .max(100, 'Plano de saúde muito longo')
    .optional(),
  healthInsuranceNumber: z
    .string()
    .max(50, 'Número do plano muito longo')
    .optional(),
  allergies: z
    .string()
    .max(500, 'Descrição de alergias muito longa')
    .optional(),
  medications: z
    .string()
    .max(500, 'Lista de medicamentos muito longa')
    .optional(),
  medicalHistory: z
    .string()
    .max(1000, 'Histórico médico muito longo')
    .optional(),
  physicalLimitations: z
    .string()
    .max(500, 'Limitações físicas muito longas')
    .optional()
};

// Schema completo para criação de paciente
export const createPatientSchema = z.object({
  ...personalInfoSchema,
  ...addressSchema,
  ...medicalInfoSchema
});

// Schema para atualização de paciente (todos os campos opcionais)
export const updatePatientSchema = z.object({
  firstName: personalInfoSchema.firstName.optional(),
  lastName: personalInfoSchema.lastName.optional(),
  email: personalInfoSchema.email.optional(),
  phone: personalInfoSchema.phone.optional(),
  birthDate: personalInfoSchema.birthDate.optional(),
  gender: personalInfoSchema.gender.optional(),
  cpf: personalInfoSchema.cpf.optional(),
  street: addressSchema.street.optional(),
  number: addressSchema.number.optional(),
  complement: addressSchema.complement.optional(),
  neighborhood: addressSchema.neighborhood.optional(),
  city: addressSchema.city.optional(),
  state: addressSchema.state.optional(),
  zipCode: addressSchema.zipCode.optional(),
  emergencyContact: medicalInfoSchema.emergencyContact.optional(),
  emergencyPhone: medicalInfoSchema.emergencyPhone.optional(),
  healthInsurance: medicalInfoSchema.healthInsurance.optional(),
  healthInsuranceNumber: medicalInfoSchema.healthInsuranceNumber.optional(),
  allergies: medicalInfoSchema.allergies.optional(),
  medications: medicalInfoSchema.medications.optional(),
  medicalHistory: medicalInfoSchema.medicalHistory.optional(),
  physicalLimitations: medicalInfoSchema.physicalLimitations.optional()
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);

// Schema para busca de pacientes
export const searchPatientSchema = z.object({
  query: z
    .string()
    .min(1, 'Termo de busca é obrigatório')
    .max(100, 'Termo de busca muito longo'),
  searchBy: z
    .enum(['name', 'email', 'cpf', 'phone'], {
      errorMap: () => ({ message: 'Tipo de busca inválido' })
    })
    .optional()
    .default('name'),
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

// Schema para filtros de pacientes
export const patientFiltersSchema = z.object({
  gender: z
    .enum(['male', 'female', 'other'])
    .optional(),
  ageMin: z
    .number()
    .min(0, 'Idade mínima deve ser pelo menos 0')
    .max(120, 'Idade mínima máxima é 120')
    .optional(),
  ageMax: z
    .number()
    .min(0, 'Idade máxima deve ser pelo menos 0')
    .max(120, 'Idade máxima máxima é 120')
    .optional(),
  city: z
    .string()
    .max(50, 'Cidade muito longa')
    .optional(),
  state: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres')
    .optional(),
  hasHealthInsurance: z
    .boolean()
    .optional(),
  createdAfter: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  createdBefore: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
}).refine(
  (data) => {
    if (data.ageMin && data.ageMax) {
      return data.ageMin <= data.ageMax;
    }
    return true;
  },
  {
    message: 'Idade mínima deve ser menor ou igual à idade máxima',
    path: ['ageMax']
  }
).refine(
  (data) => {
    if (data.createdAfter && data.createdBefore) {
      return new Date(data.createdAfter) <= new Date(data.createdBefore);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior à data final',
    path: ['createdBefore']
  }
);

// Tipos TypeScript derivados dos schemas
export type CreatePatientFormData = z.infer<typeof createPatientSchema>;
export type UpdatePatientFormData = z.infer<typeof updatePatientSchema>;
export type SearchPatientFormData = z.infer<typeof searchPatientSchema>;
export type PatientFiltersData = z.infer<typeof patientFiltersSchema>;