import { describe, it, expect } from 'vitest';
import { prestadorSchema } from '../prestador';

describe('Prestador Validations', () => {
  it('deve validar prestador válido', () => {
    const validPrestador = {
      nome: 'João Silva',
      contato: 'joao@example.com',
      cpf_cnpj: '123.456.789-00',
      valor_acordado: 500,
      status_pagamento: 'PENDENTE',
      evento_id: 'evento-123',
    };

    const result = prestadorSchema.safeParse(validPrestador);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar nome muito curto', () => {
    const invalidPrestador = {
      nome: 'J',
      valor_acordado: 500,
      status_pagamento: 'PENDENTE',
    };

    const result = prestadorSchema.safeParse(invalidPrestador);
    expect(result.success).toBe(false);
  });

  it('deve validar valor não-negativo', () => {
    const invalidPrestador = {
      nome: 'João Silva',
      valor_acordado: -100,
      status_pagamento: 'PENDENTE',
    };

    const result = prestadorSchema.safeParse(invalidPrestador);
    expect(result.success).toBe(false);
  });

  it('deve validar status de pagamento válido', () => {
    const invalidPrestador = {
      nome: 'João Silva',
      valor_acordado: 500,
      status_pagamento: 'INVALIDO',
    };

    const result = prestadorSchema.safeParse(invalidPrestador);
    expect(result.success).toBe(false);
  });
});
