import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserOrganizationId, requireUserOrganizationId } from '../userHelpers';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('userHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserOrganizationId', () => {
    it('deve retornar organization_id quando usuário está autenticado e tem organização', async () => {
      const mockUserId = 'user-123';
      const mockOrgId = 'org-456';

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await getUserOrganizationId();

      expect(result).toBe(mockOrgId);
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('organization_id');
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockSingle).toHaveBeenCalled();
    });

    it('deve retornar null quando usuário não tem organização', async () => {
      const mockUserId = 'user-123';

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { organization_id: null },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await getUserOrganizationId();

      expect(result).toBeNull();
    });

    it('deve lançar erro quando usuário não está autenticado', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getUserOrganizationId()).rejects.toThrow('Usuário não autenticado');
    });

    it('deve lançar erro quando getUser falha', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Erro de autenticação' },
      });

      await expect(getUserOrganizationId()).rejects.toThrow('Usuário não autenticado');
    });

    it('deve propagar erro quando query do profile falha', async () => {
      const mockUserId = 'user-123';
      const mockError = { message: 'Erro ao buscar perfil' };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      await expect(getUserOrganizationId()).rejects.toThrow('Erro ao buscar organização do usuário');
    });
  });

  describe('requireUserOrganizationId', () => {
    it('deve retornar organization_id quando encontrado', async () => {
      const mockOrgId = 'org-456';

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { organization_id: mockOrgId },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await requireUserOrganizationId();

      expect(result).toBe(mockOrgId);
    });

    it('deve lançar erro quando organization_id não é encontrado', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { organization_id: null },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      await expect(requireUserOrganizationId()).rejects.toThrow(
        'Organização não encontrada. Você precisa estar vinculado a uma organização.'
      );
    });
  });
});

