import { describe, it, expect } from 'vitest';
import { pagamentoCreateSchema } from '../pagamento';

describe('Pagamento Validations', () => {
  describe('pagamentoCreateSchema', () => {
    it('deve validar pagamento válido', () => {
      const validPagamento = {
        tipo: 'prestador',
        descricao: 'Pagamento Fisioterapeuta',
        valor: 500.00,
        pago_em: new Date('2025-10-01'),
        evento_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
      };

      const result = pagamentoCreateSchema.safeParse(validPagamento);
      expect(result.success).toBe(true);
    });

    it('deve validar tipos de pagamento permitidos', () => {
      const validTypes = ['prestador', 'insumo', 'outro'];

      validTypes.forEach(tipo => {
        const pagamento = {
          tipo,
          descricao: 'Teste',
          valor: 100,
          pago_em: new Date('2025-10-01'),
          evento_id: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = pagamentoCreateSchema.safeParse(pagamento);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar tipo inválido', () => {
      const invalidPagamento = {
        tipo: 'tipo_invalido',
        descricao: 'Teste',
        valor: 100,
        pago_em: new Date('2025-10-01'),
        evento_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = pagamentoCreateSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });

    it('deve validar valor positivo', () => {
      const invalidPagamento = {
        tipo: 'prestador',
        descricao: 'Teste',
        valor: 0,
        pago_em: new Date('2025-10-01'),
        evento_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = pagamentoCreateSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar valor negativo', () => {
      const invalidPagamento = {
        tipo: 'insumo',
        descricao: 'Teste',
        valor: -50,
        pago_em: new Date('2025-10-01'),
        evento_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = pagamentoCreateSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });

    it('deve aceitar comprovante_url opcional', () => {
      const pagamento = {
        tipo: 'prestador',
        descricao: 'Pagamento com comprovante',
        valor: 200,
        pago_em: new Date('2025-10-01'),
        evento_id: '123e4567-e89b-12d3-a456-426614174000',
        comprovante_url: 'https://example.com/comprovante.pdf',
      };

      const result = pagamentoCreateSchema.safeParse(pagamento);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar descrição muito curta', () => {
      const invalidPagamento = {
        tipo: 'outro',
        descricao: 'A',
        valor: 100,
        pago_em: new Date('2025-10-01'),
        evento_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = pagamentoCreateSchema.safeParse(invalidPagamento);
      expect(result.success).toBe(false);
    });
  });
});
