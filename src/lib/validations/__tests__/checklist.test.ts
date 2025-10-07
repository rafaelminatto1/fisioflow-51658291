import { describe, it, expect } from 'vitest';
import { checklistItemSchema } from '../checklist';

describe('Checklist Validations', () => {
  describe('checklistItemSchema', () => {
    it('deve validar item de checklist válido', () => {
      const validItem = {
        titulo: 'Maca portátil',
        tipo: 'levar',
        quantidade: 2,
        custo_unitario: 0,
        status: 'ABERTO',
        evento_id: 'evento-123',
      };

      const result = checklistItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar título muito curto', () => {
      const invalidItem = {
        titulo: 'Ab',
        tipo: 'levar',
        quantidade: 1,
      };

      const result = checklistItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar tipos permitidos', () => {
      const validTypes = ['levar', 'alugar', 'comprar'];
      
      validTypes.forEach(tipo => {
        const item = {
          titulo: 'Item Teste',
          tipo,
          quantidade: 1,
        };
        const result = checklistItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar tipo inválido', () => {
      const invalidItem = {
        titulo: 'Item Teste',
        tipo: 'tipo_invalido',
        quantidade: 1,
      };

      const result = checklistItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar quantidade positiva', () => {
      const invalidItem = {
        titulo: 'Item Teste',
        tipo: 'levar',
        quantidade: 0,
      };

      const result = checklistItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar custo unitário não-negativo', () => {
      const invalidItem = {
        titulo: 'Item Teste',
        tipo: 'comprar',
        quantidade: 1,
        custo_unitario: -10,
      };

      const result = checklistItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('deve validar status permitidos', () => {
      const validStatuses = ['ABERTO', 'OK'];
      
      validStatuses.forEach(status => {
        const item = {
          titulo: 'Item Teste',
          tipo: 'levar',
          quantidade: 1,
          status,
        };
        const result = checklistItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });
  });
});
