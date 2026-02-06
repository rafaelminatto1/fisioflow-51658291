
// Mock do supabase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateStandardForm, STANDARD_FORMS } from '../useStandardForms';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe.skip('useStandardForms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('STANDARD_FORMS', () => {
    it('deve ter todas as fichas padrão definidas', () => {
      expect(STANDARD_FORMS).toHaveProperty('ANAMNESE');
      expect(STANDARD_FORMS).toHaveProperty('AVALIACAO_POSTURAL');
      expect(STANDARD_FORMS).toHaveProperty('AVALIACAO_FUNCIONAL');
    });

    it('deve ter estrutura correta para cada ficha', () => {
      Object.values(STANDARD_FORMS).forEach((form) => {
        expect(form).toHaveProperty('nome');
        expect(form).toHaveProperty('tipo');
        expect(form).toHaveProperty('descricao');
        expect(form).toHaveProperty('campos');
        expect(Array.isArray(form.campos)).toBe(true);
      });
    });

    it('ANAMNESE deve ter 18 campos', () => {
      expect(STANDARD_FORMS.ANAMNESE.campos).toHaveLength(18);
    });

    it('AVALIACAO_POSTURAL deve ter 21 campos', () => {
      expect(STANDARD_FORMS.AVALIACAO_POSTURAL.campos).toHaveLength(21);
    });

    it('AVALIACAO_FUNCIONAL deve ter 25 campos', () => {
      expect(STANDARD_FORMS.AVALIACAO_FUNCIONAL.campos).toHaveLength(25);
    });

    it('cada campo deve ter propriedades obrigatórias', () => {
      Object.values(STANDARD_FORMS).forEach((form) => {
        form.campos.forEach((campo) => {
          expect(campo).toHaveProperty('rotulo');
          expect(campo).toHaveProperty('pergunta');
          expect(campo).toHaveProperty('tipo_campo');
          expect(campo).toHaveProperty('secao');
          expect(campo).toHaveProperty('ordem');
          expect(campo).toHaveProperty('obrigatorio');
          expect(typeof campo.obrigatorio).toBe('boolean');
        });
      });
    });
  });

  describe('useCreateStandardForm', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      queryClient = createTestQueryClient();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    it('deve criar ficha de anamnese com sucesso', async () => {
      const mockForm = { id: '123', nome: 'Anamnese Completa' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockForm,
            error: null,
          }),
        }),
      });
      const mockFieldsInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'evaluation_forms') {
          return { insert: mockInsert };
        }
        return { insert: mockFieldsInsert };
      });

      const { result } = renderHook(() => useCreateStandardForm(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('ANAMNESE');
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Anamnese Completa',
          tipo: 'anamnese',
          descricao: 'Ficha de anamnese completa para fisioterapia',
          ativo: true,
        })
      );
      expect(mockFieldsInsert).toHaveBeenCalled();
    });

    it('deve criar ficha de avaliação postural com sucesso', async () => {
      const mockForm = { id: '456', nome: 'Avaliação Postural' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockForm,
            error: null,
          }),
        }),
      });
      const mockFieldsInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'evaluation_forms') {
          return { insert: mockInsert };
        }
        return { insert: mockFieldsInsert };
      });

      const { result } = renderHook(() => useCreateStandardForm(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('AVALIACAO_POSTURAL');
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Avaliação Postural',
          tipo: 'avaliacao_postural',
        })
      );
    });

    it('deve criar ficha de avaliação funcional com sucesso', async () => {
      const mockForm = { id: '789', nome: 'Avaliação Funcional' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockForm,
            error: null,
          }),
        }),
      });
      const mockFieldsInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'evaluation_forms') {
          return { insert: mockInsert };
        }
        return { insert: mockFieldsInsert };
      });

      const { result } = renderHook(() => useCreateStandardForm(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('AVALIACAO_FUNCIONAL');
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Avaliação Funcional',
          tipo: 'avaliacao_funcional',
        })
      );
    });

    it('deve tratar erro na criação da ficha', async () => {
      const mockError = new Error('Erro ao criar ficha');
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useCreateStandardForm(), { wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync('ANAMNESE')).rejects.toThrow();
      });
    });

    it('deve inserir todos os campos da ficha', async () => {
      const mockForm = { id: '123' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockForm,
            error: null,
          }),
        }),
      });
      const mockFieldsInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'evaluation_forms') {
          return { insert: mockInsert };
        }
        return { insert: mockFieldsInsert };
      });

      const { result } = renderHook(() => useCreateStandardForm(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('ANAMNESE');
      });

      expect(mockFieldsInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            form_id: '123',
            rotulo: expect.any(String),
            pergunta: expect.any(String),
            tipo_campo: expect.any(String),
            secao: expect.any(String),
            ordem: expect.any(Number),
            obrigatorio: expect.any(Boolean),
          }),
        ])
      );

      const insertedFields = mockFieldsInsert.mock.calls[0][0];
      expect(insertedFields).toHaveLength(18); // ANAMNESE tem 18 campos
    });
  });
});
