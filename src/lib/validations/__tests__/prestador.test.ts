import { describe, it, expect } from 'vitest';
import { prestadorSchema, prestadorCreateSchema } from '../prestador';

describe('Prestador Validations', () => {
  describe('prestadorCreateSchema', () => {
    it('deve validar prestador válido', () => {
      const validPrestador = {
        nome: 'João Silva',
        contato: 'joao@example.com',
        cpf_cnpj: '123.456.789-00',
        valor_acordado: 500,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = prestadorCreateSchema.safeParse(validPrestador);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidPrestador = {
        nome: 'J',
        valor_acordado: 500,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = prestadorCreateSchema.safeParse(invalidPrestador);
      expect(result.success).toBe(false);
    });

    it('deve validar valor não-negativo', () => {
      const invalidPrestador = {
        nome: 'João Silva',
        valor_acordado: -100,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = prestadorCreateSchema.safeParse(invalidPrestador);
      expect(result.success).toBe(false);
    });

    it('deve aceitar prestador sem contato opcional', () => {
      const prestador = {
        nome: 'Ana Costa',
        valor_acordado: 1000,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = prestadorCreateSchema.safeParse(prestador);
      expect(result.success).toBe(true);
    });
  });

  describe('prestadorSchema (completo)', () => {
    it('deve validar prestador completo com id, status e timestamps', () => {
      const prestadorCompleto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'João Silva',
        contato: 'joao@example.com',
        cpf_cnpj: '123.456.789-00',
        valor_acordado: 500,
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        status_pagamento: 'PENDENTE',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = prestadorSchema.safeParse(prestadorCompleto);
      expect(result.success).toBe(true);
    });

    it('deve validar status_pagamento PAGO', () => {
      const prestadorPago = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'João Silva',
        valor_acordado: 500,
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        status_pagamento: 'PAGO',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = prestadorSchema.safeParse(prestadorPago);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar status de pagamento inválido', () => {
      const invalidPrestador = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'João Silva',
        valor_acordado: 500,
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        status_pagamento: 'INVALIDO',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = prestadorSchema.safeParse(invalidPrestador);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar prestador completo sem id', () => {
      const prestadorIncompleto = {
        nome: 'João Silva',
        valor_acordado: 500,
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        status_pagamento: 'PENDENTE',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = prestadorSchema.safeParse(prestadorIncompleto);
      expect(result.success).toBe(false);
    });
  });
});
