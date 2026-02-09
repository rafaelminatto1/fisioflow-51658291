import { describe, it, expect } from 'vitest';
import { checklistItemSchema, checklistItemCreateSchema } from '../checklist';

describe('Checklist Validations', () => {
  describe('checklistItemCreateSchema', () => {
    it('deve validar item de checklist válido', () => {
      const validItem = {
        titulo: 'Maca portátil',
        tipo: 'levar',
        quantidade: 2,
        custo_unitario: 0,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar título muito curto (menos de 2 caracteres)', () => {
      const invalidItem = {
        titulo: 'A',
        tipo: 'levar',
        quantidade: 1,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar tipos permitidos', () => {
      const validTypes = ['levar', 'alugar', 'comprar'] as const;

      validTypes.forEach(tipo => {
        const item = {
          titulo: 'Item Teste',
          tipo,
          quantidade: 1,
          evento_id: '550e8400-e29b-41d4-a716-446655440000',
        };
        const result = checklistItemCreateSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar tipo inválido', () => {
      const invalidItem = {
        titulo: 'Item Teste',
        tipo: 'tipo_invalido',
        quantidade: 1,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar quantidade positiva', () => {
      const invalidItem = {
        titulo: 'Item Teste',
        tipo: 'levar',
        quantidade: 0,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar custo unitário não-negativo', () => {
      const invalidItem = {
        titulo: 'Item Teste',
        tipo: 'comprar',
        quantidade: 1,
        custo_unitario: -10,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve aceitar custo padrão (0)', () => {
      const item = {
        titulo: 'Item Teste',
        tipo: 'levar',
        quantidade: 1,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.custo_unitario).toBe(0);
      }
    });

    it('deve aceitar quantidade padrão (1)', () => {
      const item = {
        titulo: 'Item Teste',
        tipo: 'levar',
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = checklistItemCreateSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantidade).toBe(1);
      }
    });
  });

  describe('checklistItemSchema (completo)', () => {
    it('deve validar item completo com id, status e timestamps', () => {
      const itemCompleto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        titulo: 'Maca portátil',
        tipo: 'levar',
        quantidade: 2,
        custo_unitario: 0,
        status: 'ABERTO',
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = checklistItemSchema.safeParse(itemCompleto);
      expect(result.success).toBe(true);
    });

    it('deve validar status OK', () => {
      const itemOk = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        titulo: 'Maca portátil',
        tipo: 'levar',
        quantidade: 2,
        custo_unitario: 0,
        status: 'OK',
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = checklistItemSchema.safeParse(itemOk);
      expect(result.success).toBe(true);
    });

    it('deve validar status permitidos', () => {
      const validStatuses = ['ABERTO', 'OK'] as const;

      validStatuses.forEach(status => {
        const item = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          titulo: 'Item Teste',
          tipo: 'levar',
          quantidade: 1,
          status,
          evento_id: '550e8400-e29b-41d4-a716-446655440001',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        };
        const result = checklistItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar status inválido', () => {
      const itemInvalido = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        titulo: 'Item Teste',
        tipo: 'levar',
        quantidade: 1,
        status: 'PENDENTE',
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = checklistItemSchema.safeParse(itemInvalido);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar item completo sem id', () => {
      const itemIncompleto = {
        titulo: 'Item Teste',
        tipo: 'levar',
        quantidade: 1,
        status: 'ABERTO',
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = checklistItemSchema.safeParse(itemIncompleto);
      expect(result.success).toBe(false);
    });
  });
});
