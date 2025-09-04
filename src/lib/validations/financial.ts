import { z } from 'zod';

// Schema para plano de preços
export const pricingPlanSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do plano é obrigatório')
    .max(100, 'Nome do plano muito longo'),
  description: z
    .string()
    .max(500, 'Descrição muito longa')
    .optional(),
  price: z
    .number()
    .min(0, 'Preço deve ser pelo menos 0')
    .max(10000, 'Preço máximo é R$ 10.000'),
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres (ex: BRL)')
    .default('BRL'),
  billingCycle: z
    .enum(['session', 'weekly', 'monthly', 'quarterly', 'yearly'], {
      errorMap: () => ({ message: 'Ciclo de cobrança inválido' })
    }),
  sessionCount: z
    .number()
    .min(1, 'Número de sessões deve ser pelo menos 1')
    .max(100, 'Máximo 100 sessões por plano')
    .optional(),
  validityDays: z
    .number()
    .min(1, 'Validade deve ser pelo menos 1 dia')
    .max(365, 'Validade máxima é 365 dias')
    .optional(),
  features: z
    .array(z.string().max(100, 'Funcionalidade muito longa'))
    .max(20, 'Máximo 20 funcionalidades por plano')
    .optional()
    .default([]),
  isActive: z
    .boolean()
    .optional()
    .default(true),
  discountPercentage: z
    .number()
    .min(0, 'Desconto deve ser pelo menos 0%')
    .max(100, 'Desconto máximo é 100%')
    .optional()
});

// Schema para cobrança/fatura
export const invoiceSchema = z.object({
  patientId: z
    .string()
    .uuid('ID do paciente inválido'),
  pricingPlanId: z
    .string()
    .uuid('ID do plano de preços inválido')
    .optional(),
  invoiceNumber: z
    .string()
    .min(1, 'Número da fatura é obrigatório')
    .max(50, 'Número da fatura muito longo'),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa'),
  items: z
    .array(z.object({
      description: z
        .string()
        .min(1, 'Descrição do item é obrigatória')
        .max(200, 'Descrição do item muito longa'),
      quantity: z
        .number()
        .min(1, 'Quantidade deve ser pelo menos 1')
        .max(100, 'Quantidade máxima é 100'),
      unitPrice: z
        .number()
        .min(0, 'Preço unitário deve ser pelo menos 0')
        .max(10000, 'Preço unitário máximo é R$ 10.000'),
      totalPrice: z
        .number()
        .min(0, 'Preço total deve ser pelo menos 0')
    }))
    .min(1, 'Pelo menos um item deve ser incluído')
    .max(50, 'Máximo 50 itens por fatura'),
  subtotal: z
    .number()
    .min(0, 'Subtotal deve ser pelo menos 0'),
  discountAmount: z
    .number()
    .min(0, 'Desconto deve ser pelo menos 0')
    .optional()
    .default(0),
  taxAmount: z
    .number()
    .min(0, 'Taxa deve ser pelo menos 0')
    .optional()
    .default(0),
  totalAmount: z
    .number()
    .min(0, 'Total deve ser pelo menos 0'),
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .default('BRL'),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  status: z
    .enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'], {
      errorMap: () => ({ message: 'Status da fatura inválido' })
    })
    .default('draft'),
  paymentMethod: z
    .enum(['cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check'], {
      errorMap: () => ({ message: 'Método de pagamento inválido' })
    })
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notas muito longas')
    .optional()
}).refine(
  (data) => new Date(data.issueDate) <= new Date(data.dueDate),
  {
    message: 'Data de emissão deve ser anterior ou igual à data de vencimento',
    path: ['dueDate']
  }
).refine(
  (data) => {
    const calculatedSubtotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
    return Math.abs(data.subtotal - calculatedSubtotal) < 0.01;
  },
  {
    message: 'Subtotal deve ser igual à soma dos itens',
    path: ['subtotal']
  }
).refine(
  (data) => {
    const calculatedTotal = data.subtotal - data.discountAmount + data.taxAmount;
    return Math.abs(data.totalAmount - calculatedTotal) < 0.01;
  },
  {
    message: 'Total deve ser igual ao subtotal menos desconto mais taxa',
    path: ['totalAmount']
  }
);

// Schema para pagamento
export const paymentSchema = z.object({
  invoiceId: z
    .string()
    .uuid('ID da fatura inválido'),
  amount: z
    .number()
    .min(0.01, 'Valor do pagamento deve ser pelo menos R$ 0,01')
    .max(100000, 'Valor máximo do pagamento é R$ 100.000'),
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .default('BRL'),
  paymentMethod: z
    .enum(['cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check'], {
      errorMap: () => ({ message: 'Método de pagamento inválido' })
    }),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  transactionId: z
    .string()
    .max(100, 'ID da transação muito longo')
    .optional(),
  cardDetails: z.object({
    lastFourDigits: z
      .string()
      .regex(/^\d{4}$/, 'Últimos 4 dígitos devem conter apenas números')
      .optional(),
    brand: z
      .string()
      .max(20, 'Bandeira do cartão muito longa')
      .optional(),
    authorizationCode: z
      .string()
      .max(50, 'Código de autorização muito longo')
      .optional()
  }).optional(),
  pixDetails: z.object({
    pixKey: z
      .string()
      .max(100, 'Chave PIX muito longa')
      .optional(),
    endToEndId: z
      .string()
      .max(100, 'ID end-to-end muito longo')
      .optional()
  }).optional(),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'], {
      errorMap: () => ({ message: 'Status do pagamento inválido' })
    })
    .default('pending'),
  notes: z
    .string()
    .max(500, 'Notas muito longas')
    .optional()
});

// Schema para reembolso
export const refundSchema = z.object({
  paymentId: z
    .string()
    .uuid('ID do pagamento inválido'),
  amount: z
    .number()
    .min(0.01, 'Valor do reembolso deve ser pelo menos R$ 0,01'),
  reason: z
    .string()
    .min(1, 'Motivo do reembolso é obrigatório')
    .max(500, 'Motivo muito longo'),
  refundDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed'], {
      errorMap: () => ({ message: 'Status do reembolso inválido' })
    })
    .default('pending'),
  transactionId: z
    .string()
    .max(100, 'ID da transação muito longo')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notas muito longas')
    .optional()
});

// Schema para relatório financeiro
export const financialReportSchema = z.object({
  reportType: z
    .enum(['revenue', 'expenses', 'profit_loss', 'cash_flow', 'patient_balance'], {
      errorMap: () => ({ message: 'Tipo de relatório inválido' })
    }),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  groupBy: z
    .enum(['day', 'week', 'month', 'quarter', 'year'], {
      errorMap: () => ({ message: 'Agrupamento inválido' })
    })
    .optional()
    .default('month'),
  patientIds: z
    .array(z.string().uuid('ID do paciente inválido'))
    .optional(),
  paymentMethods: z
    .array(z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check']))
    .optional(),
  includeRefunds: z
    .boolean()
    .optional()
    .default(true),
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .default('BRL')
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['endDate']
  }
);

// Schema para configurações de pagamento
export const paymentSettingsSchema = z.object({
  acceptCash: z
    .boolean()
    .default(true),
  acceptCreditCard: z
    .boolean()
    .default(false),
  acceptDebitCard: z
    .boolean()
    .default(false),
  acceptPix: z
    .boolean()
    .default(false),
  acceptBankTransfer: z
    .boolean()
    .default(false),
  acceptCheck: z
    .boolean()
    .default(false),
  defaultCurrency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .default('BRL'),
  taxRate: z
    .number()
    .min(0, 'Taxa deve ser pelo menos 0%')
    .max(100, 'Taxa máxima é 100%')
    .optional()
    .default(0),
  lateFeeRate: z
    .number()
    .min(0, 'Taxa de atraso deve ser pelo menos 0%')
    .max(100, 'Taxa de atraso máxima é 100%')
    .optional()
    .default(0),
  gracePeriodDays: z
    .number()
    .min(0, 'Período de carência deve ser pelo menos 0 dias')
    .max(90, 'Período de carência máximo é 90 dias')
    .optional()
    .default(0),
  invoicePrefix: z
    .string()
    .max(10, 'Prefixo da fatura muito longo')
    .optional()
    .default('INV'),
  nextInvoiceNumber: z
    .number()
    .min(1, 'Próximo número da fatura deve ser pelo menos 1')
    .optional()
    .default(1),
  reminderDaysBefore: z
    .array(z.number().min(1, 'Dias de lembrete devem ser pelo menos 1'))
    .max(5, 'Máximo 5 lembretes por fatura')
    .optional()
    .default([7, 3, 1])
});

// Schema para busca de transações financeiras
export const searchTransactionSchema = z.object({
  patientId: z
    .string()
    .uuid('ID do paciente inválido')
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  transactionType: z
    .enum(['invoice', 'payment', 'refund'])
    .optional(),
  status: z
    .string()
    .optional(),
  paymentMethod: z
    .enum(['cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check'])
    .optional(),
  minAmount: z
    .number()
    .min(0, 'Valor mínimo deve ser pelo menos 0')
    .optional(),
  maxAmount: z
    .number()
    .min(0, 'Valor máximo deve ser pelo menos 0')
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
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['endDate']
  }
).refine(
  (data) => {
    if (data.minAmount && data.maxAmount) {
      return data.minAmount <= data.maxAmount;
    }
    return true;
  },
  {
    message: 'Valor mínimo deve ser menor ou igual ao valor máximo',
    path: ['maxAmount']
  }
);

// Tipos TypeScript derivados dos schemas
export type PricingPlanData = z.infer<typeof pricingPlanSchema>;
export type InvoiceData = z.infer<typeof invoiceSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
export type RefundData = z.infer<typeof refundSchema>;
export type FinancialReportData = z.infer<typeof financialReportSchema>;
export type PaymentSettingsData = z.infer<typeof paymentSettingsSchema>;
export type SearchTransactionData = z.infer<typeof searchTransactionSchema>;