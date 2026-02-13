import { describe, it, expect, vi } from 'vitest';
import { AgendaAutomationService } from '../AgendaAutomationService';

// Mocking Firebase
vi.mock('@/integrations/firebase/app', () => ({
  db: {},
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn()
}));

describe('AgendaAutomationService', () => {
  it('should calculate duration correctly between two times', () => {
    // Acessando via reflexão pois o método é privado
    const calculateDuration = (AgendaAutomationService as any).calculateDuration;
    expect(calculateDuration('08:00', '09:00')).toBe(60);
    expect(calculateDuration('10:30', '11:15')).toBe(45);
    expect(calculateDuration('13:00', '14:30')).toBe(90);
  });

  it('should add minutes to a time string correctly', () => {
    const addMinutes = (AgendaAutomationService as any).addMinutes;
    expect(addMinutes('08:00', 30)).toBe('08:30');
    expect(addMinutes('09:45', 20)).toBe('10:05');
    expect(addMinutes('23:50', 15)).toBe('00:05');
  });
});
