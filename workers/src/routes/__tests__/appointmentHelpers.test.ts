import { describe, it, expect } from 'vitest';
import {
  calculateEndTime,
  normalizeStatus,
  sanitizeAppointmentRow,
  isConflictError,
  countsTowardCapacity,
  STATUS_MAP,
} from '../appointmentHelpers';

describe('calculateEndTime', () => {
  it('soma duração ao horário de início', () => {
    expect(calculateEndTime('08:00', 60)).toBe('09:00');
    expect(calculateEndTime('08:30', 30)).toBe('09:00');
    expect(calculateEndTime('23:00', 90)).toBe('00:30');
  });

  it('normaliza minutos acima de 59', () => {
    expect(calculateEndTime('08:00', 90)).toBe('09:30');
    expect(calculateEndTime('00:00', 0)).toBe('00:00');
  });

  it('envolve corretamente passando da meia-noite', () => {
    expect(calculateEndTime('23:30', 60)).toBe('00:30');
  });
});

describe('normalizeStatus', () => {
  it('retorna scheduled para undefined', () => {
    expect(normalizeStatus(undefined)).toBe('scheduled');
  });

  it('mantém status canônicos como estão', () => {
    expect(normalizeStatus('confirmed')).toBe('confirmed');
    expect(normalizeStatus('completed')).toBe('completed');
    expect(normalizeStatus('cancelled')).toBe('cancelled');
  });

  it('mapeia aliases PT-BR para canônicos', () => {
    expect(normalizeStatus('agendado')).toBe('scheduled');
    expect(normalizeStatus('cancelado')).toBe('cancelled');
    expect(normalizeStatus('concluido')).toBe('completed');
    expect(normalizeStatus('faltou')).toBe('no_show');
    expect(normalizeStatus('remarcado')).toBe('rescheduled');
  });

  it('retorna scheduled para status desconhecido', () => {
    expect(normalizeStatus('inexistente')).toBe('scheduled');
  });

  it('ignora maiúsculas/minúsculas e espaços', () => {
    expect(normalizeStatus('  AGENDADO  ')).toBe('scheduled');
    expect(normalizeStatus('CONFIRMADO')).toBe('confirmed');
  });
});

describe('sanitizeAppointmentRow', () => {
  it('usa 08:00 como fallback para start_time vazio', () => {
    const row = sanitizeAppointmentRow({ start_time: '', duration_minutes: '60' });
    expect(row.start_time).toBe('08:00');
  });

  it('trunca start_time para HH:MM', () => {
    const row = sanitizeAppointmentRow({ start_time: '08:30:00', duration_minutes: '60' });
    expect(row.start_time).toBe('08:30');
  });

  it('calcula end_time quando ausente', () => {
    const row = sanitizeAppointmentRow({ start_time: '10:00', end_time: null, duration_minutes: '60' });
    expect(row.end_time).toBe('11:00');
  });

  it('preserva end_time válido existente', () => {
    const row = sanitizeAppointmentRow({ start_time: '10:00', end_time: '11:30:00', duration_minutes: '60' });
    expect(row.end_time).toBe('11:30');
  });

  it('usa 60 como duração padrão', () => {
    const row = sanitizeAppointmentRow({ start_time: '10:00', end_time: '', duration_minutes: undefined });
    expect(row.duration_minutes).toBe(60);
  });
});

describe('isConflictError', () => {
  it('detecta exclusion_violation (23P01)', () => {
    expect(isConflictError({ code: '23P01' })).toBe(true);
  });

  it('detecta unique_violation (23505)', () => {
    expect(isConflictError({ code: '23505' })).toBe(true);
  });

  it('detecta por mensagem de constraint', () => {
    expect(isConflictError({ message: 'no_overlapping_therapist_appointments constraint' })).toBe(true);
    expect(isConflictError({ message: 'duplicate key value violates unique constraint' })).toBe(true);
  });

  it('não detecta outros erros', () => {
    expect(isConflictError({ code: '42P01', message: 'table not found' })).toBe(false);
    expect(isConflictError({})).toBe(false);
  });
});

describe('countsTowardCapacity', () => {
  it('conta statuses ativos', () => {
    expect(countsTowardCapacity('scheduled')).toBe(true);
    expect(countsTowardCapacity('confirmed')).toBe(true);
    expect(countsTowardCapacity('completed')).toBe(true);
  });

  it('não conta statuses finais/cancelados', () => {
    expect(countsTowardCapacity('cancelled')).toBe(false);
    expect(countsTowardCapacity('no_show')).toBe(false);
    expect(countsTowardCapacity('rescheduled')).toBe(false);
  });
});

describe('STATUS_MAP', () => {
  it('contém mapeamentos PT-BR esperados', () => {
    expect(STATUS_MAP['agendado']).toBe('scheduled');
    expect(STATUS_MAP['cancelado']).toBe('cancelled');
    expect(STATUS_MAP['concluido']).toBe('completed');
    expect(STATUS_MAP['falta']).toBe('no_show');
    expect(STATUS_MAP['faltou']).toBe('no_show');
  });
});
