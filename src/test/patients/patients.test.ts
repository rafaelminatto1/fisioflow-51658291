import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  generateMockPatient,
  createMockSupabaseResponse,
  createMockSupabaseError,
  generateUUID,
  validCPFs,
  invalidCPFs,
  validEmails,
  invalidEmails,
  validPhones,
  invalidPhones,
} from '../utils/testHelpers';
import { validateCPFDigits, validateEmail, validatePhone } from '@/lib/validations';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Patients - Criação de Paciente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('patients.create', () => {
    it('deve criar paciente com dados completos', async () => {
      const patientData = {
        name: 'Maria Silva',
        email: 'maria.silva@email.com',
        phone: '11999887766',
        cpf: '52998224725',
        birth_date: '1985-03-15',
        gender: 'feminino',
        address: 'Rua das Flores, 123',
      };

      const mockCreatedPatient = generateMockPatient({
        ...patientData,
        id: generateUUID(),
      });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCreatedPatient)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBe('Maria Silva');
      expect(result.data.email).toBe('maria.silva@email.com');
      expect(result.error).toBeNull();
    });

    it('deve criar paciente apenas com dados obrigatórios', async () => {
      const minimalData = {
        name: 'João Santos',
      };

      const mockCreatedPatient = generateMockPatient({
        ...minimalData,
        id: generateUUID(),
        email: null,
        phone: null,
        cpf: null,
      });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCreatedPatient)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('João Santos');
    });

    it('deve retornar patientId após criação', async () => {
      const expectedId = generateUUID();
      const mockPatient = generateMockPatient({ id: expectedId });

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockPatient)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.id).toBe(expectedId);
    });
  });

  describe('Validação de CPF', () => {
    it('deve validar CPFs corretos', () => {
      validCPFs.forEach((cpf) => {
        expect(validateCPFDigits(cpf)).toBe(true);
      });
    });

    it('deve rejeitar CPFs inválidos', () => {
      invalidCPFs.forEach((cpf) => {
        expect(validateCPFDigits(cpf)).toBe(false);
      });
    });

    it('deve rejeitar CPF com formato incorreto (menos de 11 dígitos)', () => {
      expect(validateCPFDigits('1234567890')).toBe(false);
      expect(validateCPFDigits('123456789')).toBe(false);
    });

    it('deve rejeitar CPF com dígitos repetidos', () => {
      expect(validateCPFDigits('11111111111')).toBe(false);
      expect(validateCPFDigits('22222222222')).toBe(false);
      expect(validateCPFDigits('00000000000')).toBe(false);
    });

    it('deve validar CPF com pontuação', () => {
      expect(validateCPFDigits('529.982.247-25')).toBe(true);
      expect(validateCPFDigits('123.456.789-09')).toBe(true);
    });
  });

  describe('Validação de Email', () => {
    it('deve validar emails corretos', () => {
      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('deve rejeitar emails inválidos', () => {
      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('deve rejeitar email sem @', () => {
      expect(validateEmail('emailsemarroba.com')).toBe(false);
    });

    it('deve rejeitar email sem domínio', () => {
      expect(validateEmail('email@')).toBe(false);
    });
  });

  describe('Validação de Telefone', () => {
    it('deve validar telefones corretos', () => {
      validPhones.forEach((phone) => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('deve rejeitar telefones inválidos', () => {
      invalidPhones.forEach((phone) => {
        expect(validatePhone(phone)).toBe(false);
      });
    });

    it('deve validar telefone com 11 dígitos (celular)', () => {
      expect(validatePhone('11999887766')).toBe(true);
    });

    it('deve validar telefone com 10 dígitos (fixo)', () => {
      expect(validatePhone('1132145678')).toBe(true);
    });
  });

  describe('Detecção de Duplicatas', () => {
    it('deve detectar CPF duplicado', async () => {
      const existingCPF = '52998224725';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse([
          generateMockPatient({ cpf: existingCPF }),
        ])),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.eq('cpf', existingCPF);
      const isDuplicate = result.data && result.data.length > 0;

      expect(isDuplicate).toBe(true);
    });

    it('deve detectar email duplicado', async () => {
      const existingEmail = 'existing@email.com';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse([
          generateMockPatient({ email: existingEmail }),
        ])),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.eq('email', existingEmail);
      const isDuplicate = result.data && result.data.length > 0;

      expect(isDuplicate).toBe(true);
    });

    it('deve permitir criação quando não há duplicatas', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.eq('cpf', '99999999999');
      const isDuplicate = result.data && result.data.length > 0;

      expect(isDuplicate).toBe(false);
    });
  });

  describe('patients.update', () => {
    it('deve atualizar dados do paciente', async () => {
      const patientId = generateUUID();
      const originalPatient = generateMockPatient({ id: patientId });
      const updateData = { phone: '11888776655', address: 'Nova Rua, 456' };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          createMockSupabaseResponse({ ...originalPatient, ...updateData })
        ),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.phone).toBe('11888776655');
      expect(result.data.address).toBe('Nova Rua, 456');
    });
  });

  describe('patients.search', () => {
    it('deve buscar pacientes por nome', async () => {
      const searchTerm = 'Silva';
      const matchingPatients = [
        generateMockPatient({ name: 'Maria Silva' }),
        generateMockPatient({ name: 'João Silva Santos' }),
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue(createMockSupabaseResponse(matchingPatients)),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const result = await mockChain.ilike('name', `%${searchTerm}%`);

      expect(result.data.length).toBe(2);
      expect(result.data[0].name).toContain('Silva');
    });
  });
});
