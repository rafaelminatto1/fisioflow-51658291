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
    expect(normalizeStatus(undefined)).toBe('agendado');
  });

  it('mantém status PT-BR do banco como estão', () => {
    expect(normalizeStatus('agendado')).toBe('agendado');
    expect(normalizeStatus('atendido')).toBe('atendido');
    expect(normalizeStatus('avaliacao')).toBe('avaliacao');
    expect(normalizeStatus('cancelado')).toBe('cancelado');
    expect(normalizeStatus('faltou')).toBe('faltou');
    expect(normalizeStatus('presenca_confirmada')).toBe('presenca_confirmada');
  });

  it('mapeia aliases EN para o enum PT-BR do banco', () => {
    expect(normalizeStatus('scheduled')).toBe('agendado');
    expect(normalizeStatus('cancelled')).toBe('cancelado');
    expect(normalizeStatus('completed')).toBe('atendido');
    expect(normalizeStatus('evaluation')).toBe('avaliacao');
    expect(normalizeStatus('confirmed')).toBe('presenca_confirmada');
    expect(normalizeStatus('rescheduled')).toBe('remarcar');
  });

  it('mapeia aliases legados para o enum PT-BR do banco', () => {
    expect(normalizeStatus('concluido')).toBe('atendido');
    expect(normalizeStatus('confirmado')).toBe('presenca_confirmada');
    expect(normalizeStatus('aguardando_confirmacao')).toBe('agendado');
    expect(normalizeStatus('falta')).toBe('faltou');
    expect(normalizeStatus('remarcado')).toBe('remarcar');
  });

  it('retorna agendado para status desconhecido', () => {
    expect(normalizeStatus('inexistente')).toBe('agendado');
  });

  it('ignora maiúsculas/minúsculas e espaços', () => {
    expect(normalizeStatus('  SCHEDULED  ')).toBe('agendado');
    expect(normalizeStatus('CONFIRMADO')).toBe('presenca_confirmada');
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
  it('conta statuses ativos do enum do banco', () => {
    expect(countsTowardCapacity('agendado')).toBe(true);
    expect(countsTowardCapacity('presenca_confirmada')).toBe(true);
    expect(countsTowardCapacity('atendido')).toBe(true);
  });

  it('não conta statuses finais/cancelados', () => {
    expect(countsTowardCapacity('cancelado')).toBe(false);
    expect(countsTowardCapacity('faltou')).toBe(false);
    expect(countsTowardCapacity('remarcar')).toBe(false);
  });
});

describe('STATUS_MAP', () => {
  it('contém os valores canônicos PT-BR do banco', () => {
    expect(STATUS_MAP['agendado']).toBe('agendado');
    expect(STATUS_MAP['atendido']).toBe('atendido');
    expect(STATUS_MAP['avaliacao']).toBe('avaliacao');
    expect(STATUS_MAP['cancelado']).toBe('cancelado');
    expect(STATUS_MAP['faltou']).toBe('faltou');
  });

  it('contém aliases EN para o enum PT-BR do banco', () => {
    expect(STATUS_MAP['scheduled']).toBe('agendado');
    expect(STATUS_MAP['cancelled']).toBe('cancelado');
    expect(STATUS_MAP['completed']).toBe('atendido');
    expect(STATUS_MAP['evaluation']).toBe('avaliacao');
    expect(STATUS_MAP['confirmed']).toBe('presenca_confirmada');
  });
});
