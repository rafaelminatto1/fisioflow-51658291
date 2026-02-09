import { describe, it, expect } from 'vitest';
import { participanteSchema, participanteCreateSchema } from '../participante';

describe('Participante Validations', () => {
  describe('participanteCreateSchema', () => {
    it('deve validar participante válido', () => {
      const validParticipante = {
        nome: 'Maria Silva',
        contato: 'maria@example.com',
        instagram: '@mariasilva',
        segue_perfil: true,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(validParticipante);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidParticipante = {
        nome: 'M',
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(invalidParticipante);
      expect(result.success).toBe(false);
    });

    it('deve aceitar participante sem instagram', () => {
      const participante = {
        nome: 'João Pereira',
        contato: 'joao@example.com',
        segue_perfil: false,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve aceitar instagram sem @', () => {
      const participante = {
        nome: 'Ana Costa',
        instagram: 'anacosta',
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve aceitar instagram com @', () => {
      const participante = {
        nome: 'Pedro Santos',
        instagram: '@pedrosantos',
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve validar segue_perfil como boolean', () => {
      const participante = {
        nome: 'Carlos Lima',
        segue_perfil: true,
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });

    it('deve aceitar observacoes opcionais', () => {
      const participante = {
        nome: 'Lucia Alves',
        observacoes: 'Primeira participação no evento',
        evento_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = participanteCreateSchema.safeParse(participante);
      expect(result.success).toBe(true);
    });
  });

  describe('participanteSchema (completo)', () => {
    it('deve validar participante completo com id e timestamps', () => {
      const participanteCompleto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'Maria Silva',
        contato: 'maria@example.com',
        instagram: '@mariasilva',
        segue_perfil: true,
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = participanteSchema.safeParse(participanteCompleto);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar participante completo sem id', () => {
      const participanteIncompleto = {
        nome: 'Maria Silva',
        evento_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = participanteSchema.safeParse(participanteIncompleto);
      expect(result.success).toBe(false);
    });
  });
});
