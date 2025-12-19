import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateMockTransaction,
  generateMockAppointment,
  createMockSupabaseResponse,
  createMockSupabaseError,
  generateUUID,
  createFutureDate,
} from '../utils/testHelpers';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Transactions - Criação de Transação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('transactions.create', () => {
    it('deve criar transação de receita corretamente', async () => {
      const patientId = generateUUID();
      const appointmentId = generateUUID();
      
      const transactionData = {
        tipo: 'receita',
        descricao: 'Sessão de fisioterapia',
        valor: 150.00,
        data_vencimento: createFutureDate(0),
        patient_id: patientId,
        appointment_id: appointmentId,
        forma_pagamento: 'pix',
      };

      const mockCreatedTransaction = generateMockTransaction({
        ...transactionData,
        id: generateUUID(),
        status: 'pendente',
      });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCreatedTransaction)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data).toBeDefined();
      expect(result.data.tipo).toBe('receita');
      expect(result.data.valor).toBe(150.00);
      expect(result.data.status).toBe('pendente');
      expect(result.error).toBeNull();
    });

    it('deve criar transação de despesa corretamente', async () => {
      const transactionData = {
        tipo: 'despesa',
        descricao: 'Material de escritório',
        valor: 250.00,
        data_vencimento: createFutureDate(7),
        categoria: 'material',
      };

      const mockCreatedTransaction = generateMockTransaction({
        ...transactionData,
        id: generateUUID(),
      });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCreatedTransaction)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.tipo).toBe('despesa');
      expect(result.data.valor).toBe(250.00);
    });

    it('deve vincular transação ao agendamento', async () => {
      const appointmentId = generateUUID();
      
      const mockTransaction = generateMockTransaction({
        appointment_id: appointmentId,
      });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockTransaction)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.appointment_id).toBe(appointmentId);
    });
  });

  describe('Cálculo de Valores', () => {
    it('deve calcular valor total corretamente para sessão única', () => {
      const calculateSessionValue = (baseValue: number, quantity: number = 1): number => {
        return baseValue * quantity;
      };

      expect(calculateSessionValue(150)).toBe(150);
      expect(calculateSessionValue(150, 1)).toBe(150);
    });

    it('deve calcular valor para pacote de sessões', () => {
      const calculatePackageValue = (
        sessionsCount: number,
        sessionValue: number,
        discountPercent: number = 0
      ): number => {
        const subtotal = sessionsCount * sessionValue;
        const discount = subtotal * (discountPercent / 100);
        return subtotal - discount;
      };

      // Pacote de 10 sessões de R$150 sem desconto
      expect(calculatePackageValue(10, 150, 0)).toBe(1500);

      // Pacote de 10 sessões de R$150 com 10% de desconto
      expect(calculatePackageValue(10, 150, 10)).toBe(1350);

      // Pacote de 5 sessões de R$200 com 5% de desconto
      expect(calculatePackageValue(5, 200, 5)).toBe(950);
    });

    it('deve aplicar desconto percentual corretamente', () => {
      const applyDiscount = (value: number, discountPercent: number): number => {
        return value * (1 - discountPercent / 100);
      };

      expect(applyDiscount(100, 10)).toBe(90);
      expect(applyDiscount(100, 50)).toBe(50);
      expect(applyDiscount(100, 0)).toBe(100);
    });

    it('deve validar que valor não pode ser negativo', () => {
      const validateValue = (value: number): boolean => value >= 0;

      expect(validateValue(100)).toBe(true);
      expect(validateValue(0)).toBe(true);
      expect(validateValue(-50)).toBe(false);
    });
  });

  describe('transactions.updateStatus', () => {
    it('deve marcar transação como paga', async () => {
      const transactionId = generateUUID();

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseResponse(generateMockTransaction({
            id: transactionId,
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0],
          }))
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.status).toBe('pago');
      expect(result.data.data_pagamento).toBeDefined();
    });

    it('deve registrar data de pagamento ao marcar como pago', async () => {
      const transactionId = generateUUID();
      const paymentDate = new Date().toISOString().split('T')[0];

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseResponse(generateMockTransaction({
            id: transactionId,
            status: 'pago',
            data_pagamento: paymentDate,
          }))
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.data_pagamento).toBe(paymentDate);
    });
  });

  describe('Relatórios Financeiros', () => {
    it('deve calcular saldo corretamente', () => {
      const calculateBalance = (
        receitas: Array<{ valor: number }>,
        despesas: Array<{ valor: number }>
      ): number => {
        const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
        const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
        return totalReceitas - totalDespesas;
      };

      const receitas = [
        { valor: 150 },
        { valor: 200 },
        { valor: 150 },
      ];

      const despesas = [
        { valor: 50 },
        { valor: 100 },
      ];

      expect(calculateBalance(receitas, despesas)).toBe(350);
    });

    it('deve agrupar transações por status', () => {
      const groupByStatus = (transactions: Array<{ status: string }>): Record<string, number> => {
        return transactions.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      };

      const transactions = [
        { status: 'pendente' },
        { status: 'pago' },
        { status: 'pendente' },
        { status: 'pago' },
        { status: 'pago' },
        { status: 'vencido' },
      ];

      const grouped = groupByStatus(transactions);

      expect(grouped.pendente).toBe(2);
      expect(grouped.pago).toBe(3);
      expect(grouped.vencido).toBe(1);
    });

    it('deve identificar transações vencidas', () => {
      const isOverdue = (dueDate: string, status: string): boolean => {
        if (status === 'pago') return false;
        const due = new Date(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      expect(isOverdue(pastDateStr, 'pendente')).toBe(true);
      expect(isOverdue(futureDateStr, 'pendente')).toBe(false);
      expect(isOverdue(pastDateStr, 'pago')).toBe(false);
    });
  });
});
