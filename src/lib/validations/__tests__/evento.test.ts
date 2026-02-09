import { describe, it, expect } from 'vitest';
import { eventoSchema, eventoCreateSchema } from '../evento';

describe('Evento Validations', () => {
  describe('eventoSchema', () => {
    it('deve validar evento válido', () => {
      const validEvento = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'Corrida Beneficente',
        categoria: 'corrida',
        local: 'Parque Ibirapuera',
        data_inicio: new Date('2025-12-01'),
        data_fim: new Date('2025-12-01'),
        descricao: 'Evento de corrida para arrecadação de fundos',
        status: 'AGENDADO',
        gratuito: false,
        valor_padrao_prestador: 100,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = eventoSchema.safeParse(validEvento);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar evento sem nome', () => {
      const invalidEvento = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        categoria: 'corrida',
        local: 'Parque',
        data_inicio: new Date('2025-12-01'),
        data_fim: new Date('2025-12-01'),
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = eventoSchema.safeParse(invalidEvento);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidEvento = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'A',
        categoria: 'corrida',
        local: 'Parque',
        data_inicio: new Date('2025-12-01'),
        data_fim: new Date('2025-12-01'),
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = eventoSchema.safeParse(invalidEvento);
      expect(result.success).toBe(false);
    });

    it('deve validar valor padrão prestador não-negativo', () => {
      const invalidEvento = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'Evento Teste',
        categoria: 'corrida',
        local: 'Local Teste',
        data_inicio: new Date('2025-12-01'),
        data_fim: new Date('2025-12-01'),
        valor_padrao_prestador: -10,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = eventoSchema.safeParse(invalidEvento);
      expect(result.success).toBe(false);
    });
  });

  describe('eventoCreateSchema', () => {
    it('deve validar dados de criação válidos', () => {
      const validData = {
        nome: 'Novo Evento',
        categoria: 'corporativo',
        local: 'Empresa XYZ',
        data_inicio: new Date('2025-11-01'),
        data_fim: new Date('2025-11-02'),
        gratuito: true,
      };

      const result = eventoCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve validar data fim posterior ou igual a data início', () => {
      const invalidData = {
        nome: 'Evento Inválido',
        categoria: 'corporativo',
        local: 'Empresa XYZ',
        data_inicio: new Date('2025-11-02'),
        data_fim: new Date('2025-11-01'),
        gratuito: true,
      };

      const result = eventoCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
