import { describe, it, expect } from 'vitest';
import { eventoSchema, eventoCreateSchema } from '../evento';

describe('Evento Validations', () => {
  describe('eventoSchema', () => {
    it('deve validar evento válido', () => {
      const validEvento = {
        nome: 'Corrida Beneficente',
        categoria: 'corrida',
        local: 'Parque Ibirapuera',
        data_inicio: '2025-12-01',
        data_fim: '2025-12-01',
        descricao: 'Evento de corrida para arrecadação de fundos',
        status: 'AGENDADO',
        gratuito: false,
        valor_padrao_prestador: 100,
      };

      const result = eventoSchema.safeParse(validEvento);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar evento sem nome', () => {
      const invalidEvento = {
        categoria: 'corrida',
        local: 'Parque',
        data_inicio: '2025-12-01',
        data_fim: '2025-12-01',
      };

      const result = eventoSchema.safeParse(invalidEvento);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidEvento = {
        nome: 'Ab',
        categoria: 'corrida',
        local: 'Parque',
        data_inicio: '2025-12-01',
        data_fim: '2025-12-01',
      };

      const result = eventoSchema.safeParse(invalidEvento);
      expect(result.success).toBe(false);
    });

    it('deve validar valor padrão prestador não-negativo', () => {
      const invalidEvento = {
        nome: 'Evento Teste',
        categoria: 'corrida',
        local: 'Local Teste',
        data_inicio: '2025-12-01',
        data_fim: '2025-12-01',
        valor_padrao_prestador: -10,
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
        data_inicio: '2025-11-01',
        data_fim: '2025-11-02',
        gratuito: true,
      };

      const result = eventoCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
