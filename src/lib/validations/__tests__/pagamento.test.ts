import { describe, it, expect } from 'vitest';
import { pagamentoSchema } from '../pagamento';

describe('Pagamento Validations', () => {
  describe('pagamentoSchema', () => {
    it('deve validar pagamento válido', () => {
      const validPagamento = {
        tipo: 'prestador',
        descricao: 'Pagamento Fisioterapeuta',
        valor: 500.00,
        pago_em: '2025-10-01',
        evento_id: 'evento-123',
      };

      const result = pagamentoSchema.safeParse(validPagamento);
      expect(result.success).toBe(true);
    });

    it('deve validar tipos de pagamento permitidos', () => {
      const validTypes = ['prestador', 'insumo', 'outro'];
      
      validTypes.forEach(tipo => {
        const pagamento = {
          tipo,
          descricao: 'Teste',
          valor: 100,
          pago_em: '2025-10-01',
        };
        const result = pagamentoSchema.safeParse(pagamento);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar tipo inválido', () => {
      const invalidPagamento = {
        tipo: 'tipo_invalido',
        descricao: 'Teste',
        valor: 100,
        pago_em: '2025-10-01',
      };

      const result = pagamentoSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });

    it('deve validar valor positivo', () => {
      const invalidPagamento = {
        tipo: 'prestador',
        descricao: 'Teste',
        valor: 0,
        pago_em: '2025-10-01',
      };

      const result = pagamentoSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valor negativo', () => {
      const invalidPagamento = {
        tipo: 'insumo',
        descricao: 'Teste',
        valor: -50,
        pago_em: '2025-10-01',
      };

      const result = pagamentoSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });

    it('deve aceitar comprovante_url opcional', () => {
      const pagamento = {
        tipo: 'prestador',
        descricao: 'Pagamento com comprovante',
        valor: 200,
        pago_em: '2025-10-01',
        comprovante_url: 'https://example.com/comprovante.pdf',
      };

      const result = pagamentoSchema.safeParse(pagamento);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar descrição muito curta', () => {
      const invalidPagamento = {
        tipo: 'outro',
        descricao: 'Ab',
        valor: 100,
        pago_em: '2025-10-01',
      };

      const result = pagamentoSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });
  });
});
