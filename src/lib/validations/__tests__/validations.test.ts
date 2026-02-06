import { describe, it, expect } from 'vitest';

import {
  validateCPFFormat,
  validateCPFDigits,
  cleanCPF,
  validateEmail,
  validatePhone,
  cleanPhone,
  formatPhone,
  validateTimeSlot,
  validateUUID,
  validateFutureDate,
  validateDateRange,
  validatePositiveAmount,
  validateNonNegativeAmount,
  sanitizeString,
  cpfSchema,
  emailSchema,
  phoneSchema,
  timeSlotSchema,
  uuidSchema,
  moneySchema,
} from '../index';

describe('Validações de CPF', () => {
  describe('cleanCPF', () => {
    it('deve remover pontos e traços do CPF', () => {
      expect(cleanCPF('529.982.247-25')).toBe('52998224725');
    });

    it('deve manter CPF já limpo', () => {
      expect(cleanCPF('52998224725')).toBe('52998224725');
    });

    it('deve remover espaços e caracteres especiais', () => {
      expect(cleanCPF('529 982 247-25')).toBe('52998224725');
    });
  });

  describe('validateCPFFormat', () => {
    it('deve validar CPF com formato correto', () => {
      expect(validateCPFFormat('529.982.247-25')).toBe(true);
      expect(validateCPFFormat('52998224725')).toBe(true);
    });

    it('deve rejeitar CPF com menos de 11 dígitos', () => {
      expect(validateCPFFormat('1234567890')).toBe(false);
    });

    it('deve rejeitar CPF com mais de 11 dígitos', () => {
      expect(validateCPFFormat('123456789012')).toBe(false);
    });

    it('deve rejeitar CPF com dígitos repetidos', () => {
      expect(validateCPFFormat('111.111.111-11')).toBe(false);
      expect(validateCPFFormat('00000000000')).toBe(false);
      expect(validateCPFFormat('99999999999')).toBe(false);
    });
  });

  describe('validateCPFDigits', () => {
    it('deve validar CPFs válidos com dígitos verificadores corretos', () => {
      expect(validateCPFDigits('529.982.247-25')).toBe(true);
      expect(validateCPFDigits('123.456.789-09')).toBe(true);
    });

    it('deve rejeitar CPFs com dígitos verificadores incorretos', () => {
      expect(validateCPFDigits('529.982.247-26')).toBe(false);
      expect(validateCPFDigits('123.456.789-00')).toBe(false);
    });
  });

  describe('cpfSchema (Zod)', () => {
    it('deve passar para CPF válido', () => {
      const result = cpfSchema.safeParse('52998224725');
      expect(result.success).toBe(true);
    });

    it('deve falhar para CPF inválido', () => {
      const result = cpfSchema.safeParse('12345678900');
      expect(result.success).toBe(false);
    });

    it('deve retornar mensagem de erro apropriada', () => {
      const result = cpfSchema.safeParse('123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('11 dígitos');
      }
    });
  });
});

describe('Validações de Email', () => {
  describe('validateEmail', () => {
    it('deve validar emails válidos', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.com.br')).toBe(true);
      expect(validateEmail('user+tag@subdomain.domain.org')).toBe(true);
    });

    it('deve rejeitar emails inválidos', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('no@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('deve tratar espaços corretamente', () => {
      expect(validateEmail('  test@example.com  ')).toBe(false); // Espaços nas bordas
    });
  });

  describe('emailSchema (Zod)', () => {
    it('deve passar para email válido', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('deve falhar para email inválido', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('deve falhar para email muito curto', () => {
      const result = emailSchema.safeParse('a@b');
      expect(result.success).toBe(false);
    });

    it('deve fazer trim automaticamente', () => {
      const result = emailSchema.safeParse('  test@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });
  });
});

describe('Validações de Telefone', () => {
  describe('cleanPhone', () => {
    it('deve remover caracteres não numéricos', () => {
      expect(cleanPhone('(11) 99988-7766')).toBe('11999887766');
      expect(cleanPhone('+55 11 99988-7766')).toBe('5511999887766');
    });
  });

  describe('validatePhone', () => {
    it('deve validar telefones válidos', () => {
      expect(validatePhone('11999887766')).toBe(true);
      expect(validatePhone('(11) 99988-7766')).toBe(true);
      expect(validatePhone('1199887766')).toBe(true);
    });

    it('deve rejeitar telefones muito curtos', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('1234567')).toBe(false);
    });

    it('deve rejeitar telefones muito longos', () => {
      expect(validatePhone('12345678901234567890')).toBe(false);
    });
  });

  describe('formatPhone', () => {
    it('deve formatar telefone celular (11 dígitos)', () => {
      expect(formatPhone('11999887766')).toBe('(11) 99988-7766');
    });

    it('deve formatar telefone fixo (10 dígitos)', () => {
      expect(formatPhone('1132145678')).toBe('(11) 3214-5678');
    });

    it('deve retornar original se formato não reconhecido', () => {
      expect(formatPhone('123456789')).toBe('123456789');
    });
  });

  describe('phoneSchema (Zod)', () => {
    it('deve passar para telefone válido', () => {
      const result = phoneSchema.safeParse('11999887766');
      expect(result.success).toBe(true);
    });

    it('deve falhar para telefone muito curto', () => {
      const result = phoneSchema.safeParse('123');
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações de Horário', () => {
  describe('validateTimeSlot', () => {
    it('deve validar horários válidos', () => {
      expect(validateTimeSlot('09:00')).toBe(true);
      expect(validateTimeSlot('14:30')).toBe(true);
      expect(validateTimeSlot('23:59')).toBe(true);
      expect(validateTimeSlot('00:00')).toBe(true);
    });

    it('deve rejeitar horários inválidos', () => {
      expect(validateTimeSlot('25:00')).toBe(false);
      expect(validateTimeSlot('12:60')).toBe(false);
      expect(validateTimeSlot('9:00')).toBe(true); // Permite sem zero à esquerda
      expect(validateTimeSlot('abc')).toBe(false);
    });
  });

  describe('timeSlotSchema (Zod)', () => {
    it('deve passar para horário válido', () => {
      const result = timeSlotSchema.safeParse('14:30');
      expect(result.success).toBe(true);
    });

    it('deve falhar para horário inválido', () => {
      const result = timeSlotSchema.safeParse('25:00');
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações de UUID', () => {
  describe('validateUUID', () => {
    it('deve validar UUIDs válidos', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('deve rejeitar UUIDs inválidos', () => {
      expect(validateUUID('invalid-uuid')).toBe(false);
      expect(validateUUID('12345')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });
  });

  describe('uuidSchema (Zod)', () => {
    it('deve passar para UUID válido', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('deve falhar para UUID inválido', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações de Data', () => {
  describe('validateFutureDate', () => {
    it('deve validar data futura', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(validateFutureDate(futureDate)).toBe(true);
    });

    it('deve validar data de hoje', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(validateFutureDate(today)).toBe(true);
    });

    it('deve rejeitar data passada', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(validateFutureDate(pastDate)).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('deve validar intervalo válido', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');
      expect(validateDateRange(start, end)).toBe(true);
    });

    it('deve validar datas iguais', () => {
      const date = new Date('2025-01-15');
      expect(validateDateRange(date, date)).toBe(true);
    });

    it('deve rejeitar intervalo invertido', () => {
      const start = new Date('2025-01-31');
      const end = new Date('2025-01-01');
      expect(validateDateRange(start, end)).toBe(false);
    });
  });
});

describe('Validações de Valor Monetário', () => {
  describe('validatePositiveAmount', () => {
    it('deve validar valores positivos', () => {
      expect(validatePositiveAmount(100)).toBe(true);
      expect(validatePositiveAmount(0.01)).toBe(true);
      expect(validatePositiveAmount(9999.99)).toBe(true);
    });

    it('deve rejeitar zero', () => {
      expect(validatePositiveAmount(0)).toBe(false);
    });

    it('deve rejeitar valores negativos', () => {
      expect(validatePositiveAmount(-100)).toBe(false);
    });

    it('deve rejeitar Infinity', () => {
      expect(validatePositiveAmount(Infinity)).toBe(false);
    });
  });

  describe('validateNonNegativeAmount', () => {
    it('deve validar zero', () => {
      expect(validateNonNegativeAmount(0)).toBe(true);
    });

    it('deve validar valores positivos', () => {
      expect(validateNonNegativeAmount(100)).toBe(true);
    });

    it('deve rejeitar valores negativos', () => {
      expect(validateNonNegativeAmount(-1)).toBe(false);
    });
  });

  describe('moneySchema (Zod)', () => {
    it('deve passar para valor válido', () => {
      const result = moneySchema.safeParse(150.50);
      expect(result.success).toBe(true);
    });

    it('deve falhar para valor negativo', () => {
      const result = moneySchema.safeParse(-100);
      expect(result.success).toBe(false);
    });

    it('deve falhar para valor muito alto', () => {
      const result = moneySchema.safeParse(99999999999);
      expect(result.success).toBe(false);
    });
  });
});

describe('Sanitização', () => {
  describe('sanitizeString', () => {
    it('deve remover espaços nas bordas', () => {
      expect(sanitizeString('  texto  ')).toBe('texto');
    });

    it('deve remover caracteres < e >', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('deve manter texto normal intacto', () => {
      expect(sanitizeString('Texto normal')).toBe('Texto normal');
    });
  });
});
