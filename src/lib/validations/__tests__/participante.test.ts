import { describe, it, expect } from 'vitest';
import { participanteSchema } from '../participante';

describe('Participante Validations', () => {
  describe('participanteSchema', () => {
    it('deve validar participante válido', () => {
      const validParticipante = {
        nome: 'Maria Silva',
        contato: 'maria@example.com',
        instagram: '@mariasilva',
        segue_perfil: true,
        evento_id: 'evento-123',
      };

      const result = participanteSchema.safeParse(validParticipante);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidParticipante = {
        nome: 'M',
        evento_id: 'evento-123',
      };

      const result = participanteSchema.safeParse(invalidParticipante);
      expect(result.success).toBe(false);
    });

    it('deve aceitar participante sem instagram', () => {
      const participante = {
        nome: 'João Pereira',
        contato: 'joao@example.com',
        segue_perfil: false,
      };

      const result = participanteSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve aceitar instagram sem @', () => {
      const participante = {
        nome: 'Ana Costa',
        instagram: 'anacosta',
      };

      const result = participanteSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve aceitar instagram com @', () => {
      const participante = {
        nome: 'Pedro Santos',
        instagram: '@pedrosantos',
      };

      const result = participanteSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve validar segue_perfil como boolean', () => {
      const participante = {
        nome: 'Carlos Lima',
        segue_perfil: true,
      };

      const result = participanteSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve aceitar observacoes opcionais', () => {
      const participante = {
        nome: 'Lucia Alves',
        observacoes: 'Primeira participação no evento',
      };

      const result = participanteSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });
  });
});
