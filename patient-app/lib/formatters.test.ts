/**
 * Formatter Utilities Tests
 */

import { DateFormatter, NumberFormatter, StringFormatter, ExerciseFormatter, DurationFormatter } from './formatters';

describe('DateFormatter', () => {
  const testDate = new Date('2024-02-01T10:30:00');

  describe('short', () => {
    it('should format date as dd/MM/yyyy', () => {
      expect(DateFormatter.short(testDate)).toBe('01/02/2024');
    });
  });

  describe('withTime', () => {
    it('should format date with time', () => {
      const result = DateFormatter.withTime(testDate);
      expect(result).toContain('01/02/2024');
      expect(result).toContain('10:30');
    });
  });

  describe('friendly', () => {
    it('should return "Hoje" for today', () => {
      expect(DateFormatter.friendly(new Date())).toBe('Hoje');
    });

    it('should return "Amanhã" for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(DateFormatter.friendly(tomorrow)).toBe('Amanhã');
    });

    it('should return "Ontem" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(DateFormatter.friendly(yesterday)).toBe('Ontem');
    });

    it('should return formatted date for other days', () => {
      const otherDay = new Date('2024-01-15');
      const result = DateFormatter.friendly(otherDay);
      expect(result).toBe('15/01/2024');
    });
  });

  describe('time', () => {
    it('should format time as HH:mm', () => {
      expect(DateFormatter.time(testDate)).toBe('10:30');
    });
  });

  describe('isToday', () => {
    it('should identify today', () => {
      expect(DateFormatter.isToday(new Date())).toBe(true);
      expect(DateFormatter.isToday(new Date('2024-01-01'))).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should identify past dates', () => {
      expect(DateFormatter.isPast(new Date('2020-01-01'))).toBe(true);
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(DateFormatter.isPast(future)).toBe(false);
    });
  });
});

describe('NumberFormatter', () => {
  describe('format', () => {
    it('should format number with thousands separator', () => {
      expect(NumberFormatter.format(1000)).toBe('1.000');
      expect(NumberFormatter.format(1234567)).toBe('1.234.567');
    });
  });

  describe('percentage', () => {
    it('should format number as percentage', () => {
      expect(NumberFormatter.percentage(0.5)).toBe('50%');
      expect(NumberFormatter.percentage(0.123, 2)).toBe('12.30%');
    });
  });

  describe('currency', () => {
    it('should format number as BRL currency', () => {
      expect(NumberFormatter.currency(1234.56)).toContain('R$');
      expect(NumberFormatter.currency(100)).toBe('R$ 100,00');
    });
  });
});

describe('StringFormatter', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(StringFormatter.capitalize('test')).toBe('Test');
      expect(StringFormatter.capitalize('TEST')).toBe('TEST');
    });
  });

  describe('titleCase', () => {
    it('should convert to title case', () => {
      expect(StringFormatter.titleCase('test string')).toBe('Test String');
      expect(StringFormatter.titleCase('fisioflow app')).toBe('Fisioflow App');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(StringFormatter.truncate('Long text string', 8)).toBe('Long te...');
      expect(StringFormatter.truncate('Short', 10)).toBe('Short');
    });
  });

  describe('slugify', () => {
    it('should convert string to slug', () => {
      expect(StringFormatter.slugify('Hello World')).toBe('hello-world');
      expect(StringFormatter.slugify('Test 123')).toBe('test-123');
    });
  });

  describe('initials', () => {
    it('should extract initials from name', () => {
      expect(StringFormatter.initials('John Doe')).toBe('JD');
      expect(StringFormatter.initials('João')).toBe('J');
      expect(StringFormatter.initials('')).toBe('');
    });
  });
});

describe('ExerciseFormatter', () => {
  describe('difficulty', () => {
    it('should format difficulty level', () => {
      expect(ExerciseFormatter.difficulty(1)).toBe('Fácil');
      expect(ExerciseFormatter.difficulty(2)).toBe('Médio');
      expect(ExerciseFormatter.difficulty(3)).toBe('Difícil');
    });
  });

  describe('reps', () => {
    it('should format repetitions', () => {
      expect(ExerciseFormatter.reps(12)).toBe('12x');
      expect(ExerciseFormatter.reps(15)).toBe('15x');
    });
  });

  describe('details', () => {
    it('should format exercise details', () => {
      const details = ExerciseFormatter.details(3, 12, 30, 45);
      expect(details).toContain('3x12');
    });
  });

  describe('difficultyLabel', () => {
    it('should return difficulty label', () => {
      expect(ExerciseFormatter.difficultyLabel(1)).toBe('Fácil');
      expect(ExerciseFormatter.difficultyLabel(2)).toBe('Médio');
      expect(ExerciseFormatter.difficultyLabel(3)).toBe('Difícil');
    });
  });

  describe('painLabel', () => {
    it('should return pain label', () => {
      expect(ExerciseFormatter.painLabel(3)).toBe('Leve');
      expect(ExerciseFormatter.painLabel(7)).toBe('Moderada');
      expect(ExerciseFormatter.painLabel(10)).toBe('Severa');
    });
  });

  describe('painColor', () => {
    it('should return pain color', () => {
      expect(ExerciseFormatter.painColor(3)).toBe('#22C55E');
      expect(ExerciseFormatter.painColor(7)).toBe('#F59E0B');
      expect(ExerciseFormatter.painColor(10)).toBe('#EF4444');
    });
  });
});

describe('DurationFormatter', () => {
  describe('seconds', () => {
    it('should format seconds', () => {
      expect(DurationFormatter.seconds(90)).toBe('1min 30s');
      expect(DurationFormatter.seconds(120)).toBe('2min');
    });
  });

  describe('minutes', () => {
    it('should format minutes', () => {
      expect(DurationFormatter.minutes(1.5)).toBe('1min 30s');
      expect(DurationFormatter.minutes(2)).toBe('2min');
    });
  });
});
