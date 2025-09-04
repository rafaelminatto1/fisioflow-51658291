import { z } from 'zod';

// Schema para agendamento de sessão
export const sessionScheduleSchema = z.object({
  patientId: z
    .string()
    .uuid('ID do paciente inválido'),
  treatmentPlanId: z
    .string()
    .uuid('ID do plano de tratamento inválido')
    .optional(),
  scheduledDate: z
    .string()
    .datetime('Data e hora de agendamento inválida'),
  duration: z
    .number()
    .min(15, 'Duração mínima é 15 minutos')
    .max(240, 'Duração máxima é 240 minutos'),
  sessionType: z
    .enum(['evaluation', 'treatment', 'reevaluation', 'discharge'], {
      errorMap: () => ({ message: 'Tipo de sessão inválido' })
    }),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      errorMap: () => ({ message: 'Prioridade inválida' })
    })
    .optional()
    .default('normal'),
  notes: z
    .string()
    .max(500, 'Notas muito longas')
    .optional(),
  reminderEnabled: z
    .boolean()
    .optional()
    .default(true),
  reminderTime: z
    .number()
    .min(5, 'Lembrete deve ser pelo menos 5 minutos antes')
    .max(1440, 'Lembrete máximo é 1440 minutos (24 horas) antes')
    .optional()
    .default(60)
});

// Schema para atualização de agendamento
export const updateSessionScheduleSchema = sessionScheduleSchema.partial().refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);

// Schema SOAP - Subjetivo
export const soapSubjectiveSchema = z.object({
  chiefComplaint: z
    .string()
    .min(1, 'Queixa principal é obrigatória')
    .max(500, 'Queixa principal muito longa'),
  painLevel: z
    .number()
    .min(0, 'Nível de dor deve ser entre 0 e 10')
    .max(10, 'Nível de dor deve ser entre 0 e 10')
    .optional(),
  painLocation: z
    .string()
    .max(200, 'Localização da dor muito longa')
    .optional(),
  painCharacteristics: z
    .string()
    .max(300, 'Características da dor muito longas')
    .optional(),
  symptomsDescription: z
    .string()
    .max(1000, 'Descrição dos sintomas muito longa')
    .optional(),
  functionalLimitations: z
    .string()
    .max(500, 'Limitações funcionais muito longas')
    .optional(),
  sleepQuality: z
    .enum(['excellent', 'good', 'fair', 'poor', 'very_poor'], {
      errorMap: () => ({ message: 'Qualidade do sono inválida' })
    })
    .optional(),
  medicationChanges: z
    .string()
    .max(300, 'Mudanças na medicação muito longas')
    .optional(),
  dailyActivities: z
    .string()
    .max(500, 'Atividades diárias muito longas')
    .optional(),
  patientGoals: z
    .string()
    .max(500, 'Objetivos do paciente muito longos')
    .optional()
});

// Schema SOAP - Objetivo
export const soapObjectiveSchema = z.object({
  vitalSigns: z.object({
    bloodPressure: z
      .string()
      .regex(/^\d{2,3}\/\d{2,3}$/, 'Pressão arterial deve estar no formato 120/80')
      .optional(),
    heartRate: z
      .number()
      .min(30, 'Frequência cardíaca deve ser pelo menos 30 bpm')
      .max(220, 'Frequência cardíaca máxima é 220 bpm')
      .optional(),
    respiratoryRate: z
      .number()
      .min(8, 'Frequência respiratória deve ser pelo menos 8 rpm')
      .max(60, 'Frequência respiratória máxima é 60 rpm')
      .optional(),
    temperature: z
      .number()
      .min(32, 'Temperatura deve ser pelo menos 32°C')
      .max(45, 'Temperatura máxima é 45°C')
      .optional(),
    oxygenSaturation: z
      .number()
      .min(70, 'Saturação de oxigênio deve ser pelo menos 70%')
      .max(100, 'Saturação de oxigênio máxima é 100%')
      .optional()
  }).optional(),
  physicalExamination: z
    .string()
    .max(1000, 'Exame físico muito longo')
    .optional(),
  rangeOfMotion: z
    .string()
    .max(500, 'Amplitude de movimento muito longa')
    .optional(),
  muscleStrength: z
    .string()
    .max(500, 'Força muscular muito longa')
    .optional(),
  posturalAssessment: z
    .string()
    .max(500, 'Avaliação postural muito longa')
    .optional(),
  balanceCoordination: z
    .string()
    .max(500, 'Equilíbrio e coordenação muito longos')
    .optional(),
  functionalTests: z
    .string()
    .max(500, 'Testes funcionais muito longos')
    .optional(),
  measurements: z
    .string()
    .max(300, 'Medidas muito longas')
    .optional(),
  observations: z
    .string()
    .max(1000, 'Observações muito longas')
    .optional()
});

// Schema SOAP - Avaliação
export const soapAssessmentSchema = z.object({
  clinicalImpression: z
    .string()
    .min(1, 'Impressão clínica é obrigatória')
    .max(1000, 'Impressão clínica muito longa'),
  diagnosis: z
    .string()
    .max(500, 'Diagnóstico muito longo')
    .optional(),
  prognosis: z
    .enum(['excellent', 'good', 'fair', 'poor', 'guarded'], {
      errorMap: () => ({ message: 'Prognóstico inválido' })
    })
    .optional(),
  progressStatus: z
    .enum(['significant_improvement', 'moderate_improvement', 'minimal_improvement', 'no_change', 'decline'], {
      errorMap: () => ({ message: 'Status de progresso inválido' })
    })
    .optional(),
  complications: z
    .string()
    .max(500, 'Complicações muito longas')
    .optional(),
  riskFactors: z
    .string()
    .max(500, 'Fatores de risco muito longos')
    .optional(),
  functionalStatus: z
    .string()
    .max(500, 'Status funcional muito longo')
    .optional(),
  goalProgress: z
    .string()
    .max(500, 'Progresso dos objetivos muito longo')
    .optional()
});

// Schema SOAP - Plano
export const soapPlanSchema = z.object({
  treatmentPlan: z
    .string()
    .min(1, 'Plano de tratamento é obrigatório')
    .max(1000, 'Plano de tratamento muito longo'),
  interventions: z
    .array(z.string().max(200, 'Intervenção muito longa'))
    .min(1, 'Pelo menos uma intervenção deve ser especificada')
    .max(10, 'Máximo 10 intervenções por sessão'),
  homeExercises: z
    .string()
    .max(500, 'Exercícios domiciliares muito longos')
    .optional(),
  precautions: z
    .string()
    .max(500, 'Precauções muito longas')
    .optional(),
  nextSessionGoals: z
    .string()
    .max(500, 'Objetivos da próxima sessão muito longos')
    .optional(),
  frequency: z
    .string()
    .max(100, 'Frequência muito longa')
    .optional(),
  duration: z
    .string()
    .max(100, 'Duração muito longa')
    .optional(),
  referrals: z
    .string()
    .max(300, 'Encaminhamentos muito longos')
    .optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
});

// Schema completo SOAP
export const soapRecordSchema = z.object({
  sessionId: z
    .string()
    .uuid('ID da sessão inválido'),
  subjective: soapSubjectiveSchema,
  objective: soapObjectiveSchema,
  assessment: soapAssessmentSchema,
  plan: soapPlanSchema,
  sessionDuration: z
    .number()
    .min(1, 'Duração da sessão deve ser pelo menos 1 minuto')
    .max(300, 'Duração máxima da sessão é 300 minutos'),
  therapistNotes: z
    .string()
    .max(1000, 'Notas do terapeuta muito longas')
    .optional(),
  patientResponse: z
    .enum(['excellent', 'good', 'fair', 'poor'], {
      errorMap: () => ({ message: 'Resposta do paciente inválida' })
    })
    .optional(),
  adherenceLevel: z
    .enum(['excellent', 'good', 'fair', 'poor'], {
      errorMap: () => ({ message: 'Nível de aderência inválido' })
    })
    .optional()
});

// Schema para atualização de registro SOAP
export const updateSoapRecordSchema = soapRecordSchema.partial().refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);

// Schema para sessão de tratamento completa
export const treatmentSessionSchema = z.object({
  scheduleId: z
    .string()
    .uuid('ID do agendamento inválido'),
  startTime: z
    .string()
    .datetime('Hora de início inválida'),
  endTime: z
    .string()
    .datetime('Hora de fim inválida')
    .optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'], {
      errorMap: () => ({ message: 'Status da sessão inválido' })
    }),
  attendanceConfirmed: z
    .boolean()
    .optional()
    .default(false),
  cancellationReason: z
    .string()
    .max(300, 'Motivo do cancelamento muito longo')
    .optional(),
  soapRecord: soapRecordSchema.optional(),
  exercisesCompleted: z
    .array(z.string().uuid('ID do exercício inválido'))
    .optional()
    .default([]),
  attachments: z
    .array(z.string().url('URL do anexo inválida'))
    .max(10, 'Máximo 10 anexos por sessão')
    .optional()
    .default([])
}).refine(
  (data) => {
    if (data.endTime) {
      return new Date(data.startTime) < new Date(data.endTime);
    }
    return true;
  },
  {
    message: 'Hora de início deve ser anterior à hora de fim',
    path: ['endTime']
  }
).refine(
  (data) => {
    if (data.status === 'cancelled' && !data.cancellationReason) {
      return false;
    }
    return true;
  },
  {
    message: 'Motivo do cancelamento é obrigatório quando a sessão é cancelada',
    path: ['cancellationReason']
  }
);

// Schema para busca de sessões
export const searchSessionSchema = z.object({
  patientId: z
    .string()
    .uuid('ID do paciente inválido')
    .optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .optional(),
  sessionType: z
    .enum(['evaluation', 'treatment', 'reevaluation', 'discharge'])
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
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['dateTo']
  }
);

// Tipos TypeScript derivados dos schemas
export type SessionScheduleData = z.infer<typeof sessionScheduleSchema>;
export type UpdateSessionScheduleData = z.infer<typeof updateSessionScheduleSchema>;
export type SoapSubjectiveData = z.infer<typeof soapSubjectiveSchema>;
export type SoapObjectiveData = z.infer<typeof soapObjectiveSchema>;
export type SoapAssessmentData = z.infer<typeof soapAssessmentSchema>;
export type SoapPlanData = z.infer<typeof soapPlanSchema>;
export type SoapRecordData = z.infer<typeof soapRecordSchema>;
export type UpdateSoapRecordData = z.infer<typeof updateSoapRecordSchema>;
export type TreatmentSessionData = z.infer<typeof treatmentSessionSchema>;
export type SearchSessionData = z.infer<typeof searchSessionSchema>;