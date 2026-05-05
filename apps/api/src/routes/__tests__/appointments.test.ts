import { describe, it, expect } from "vitest";
import {
  calculateEndTime,
  normalizeStatus,
  normalizeAppointmentType,
  isConflictError,
  countsTowardCapacity,
  sanitizeAppointmentRow,
  STATUS_MAP,
} from "../appointmentHelpers";

describe("calculateEndTime", () => {
  it("soma minutos corretamente", () => {
    expect(calculateEndTime("09:00", 60)).toBe("10:00");
    expect(calculateEndTime("09:00", 30)).toBe("09:30");
    expect(calculateEndTime("09:45", 45)).toBe("10:30");
  });

  it("ultrapassa meia-noite sem quebrar", () => {
    expect(calculateEndTime("23:30", 60)).toBe("00:30");
  });

  it("duração zero retorna o mesmo horário", () => {
    expect(calculateEndTime("14:00", 0)).toBe("14:00");
  });
});

describe("normalizeStatus", () => {
  it("retorna agendado para valor vazio", () => {
    expect(normalizeStatus(undefined)).toBe("agendado");
    expect(normalizeStatus("")).toBe("agendado");
  });

  it("mapeia aliases em inglês para PT-BR canônico", () => {
    expect(normalizeStatus("scheduled")).toBe("agendado");
    expect(normalizeStatus("confirmed")).toBe("presenca_confirmada");
    expect(normalizeStatus("completed")).toBe("atendido");
    expect(normalizeStatus("no_show")).toBe("faltou");
    expect(normalizeStatus("cancelled")).toBe("cancelado");
  });

  it("mantém valores PT-BR válidos intactos", () => {
    expect(normalizeStatus("atendido")).toBe("atendido");
    expect(normalizeStatus("presenca_confirmada")).toBe("presenca_confirmada");
    expect(normalizeStatus("faltou_com_aviso")).toBe("faltou_com_aviso");
  });

  it("normaliza para lowercase e substitui espaços", () => {
    expect(normalizeStatus("AGENDADO")).toBe("agendado");
    expect(normalizeStatus("Presenca Confirmada")).toBe("presenca_confirmada");
  });
});

describe("normalizeAppointmentType", () => {
  it("mapeia variações de avaliação para evaluation", () => {
    expect(normalizeAppointmentType("avaliação inicial")).toBe("evaluation");
    expect(normalizeAppointmentType("Avaliacao Inicial")).toBe("evaluation");
  });

  it("mapeia variações de sessão para session", () => {
    expect(normalizeAppointmentType("fisioterapia")).toBe("session");
    expect(normalizeAppointmentType("pilates")).toBe("session");
    expect(normalizeAppointmentType("rpg")).toBe("session");
  });

  it("retorna session para tipo desconhecido", () => {
    expect(normalizeAppointmentType(undefined)).toBe("session");
    expect(normalizeAppointmentType("qualquer coisa")).toBe("session");
  });
});

describe("isConflictError", () => {
  it("detecta conflito por código de exclusion_violation", () => {
    expect(isConflictError({ code: "23P01" })).toBe(true);
  });

  it("detecta conflito por unique_violation", () => {
    expect(isConflictError({ code: "23505" })).toBe(true);
  });

  it("detecta conflito por mensagem da constraint", () => {
    expect(isConflictError({ message: "no_overlapping_therapist_appointments" })).toBe(true);
    expect(isConflictError({ message: "duplicate key value violates unique constraint" })).toBe(true);
  });

  it("não detecta conflito em erros genéricos", () => {
    expect(isConflictError({ code: "42601", message: "syntax error" })).toBe(false);
    expect(isConflictError({})).toBe(false);
  });
});

describe("countsTowardCapacity", () => {
  it("conta atendido, agendado e confirmado como capacidade", () => {
    expect(countsTowardCapacity("atendido")).toBe(true);
    expect(countsTowardCapacity("agendado")).toBe(true);
    expect(countsTowardCapacity("presenca_confirmada")).toBe(true);
  });

  it("não conta cancelados, faltas e não atendidos", () => {
    expect(countsTowardCapacity("cancelado")).toBe(false);
    expect(countsTowardCapacity("faltou")).toBe(false);
    expect(countsTowardCapacity("faltou_com_aviso")).toBe(false);
    expect(countsTowardCapacity("faltou_sem_aviso")).toBe(false);
    expect(countsTowardCapacity("nao_atendido")).toBe(false);
    expect(countsTowardCapacity("nao_atendido_sem_cobranca")).toBe(false);
    expect(countsTowardCapacity("remarcar")).toBe(false);
  });
});

describe("sanitizeAppointmentRow", () => {
  it("preenche end_time quando ausente com base em duration_minutes", () => {
    const row = sanitizeAppointmentRow({ start_time: "09:00", duration_minutes: 60 });
    expect(row.end_time).toBe("10:00");
  });

  it("usa fallback 08:00 quando start_time é nulo", () => {
    const row = sanitizeAppointmentRow({ start_time: null, duration_minutes: 30 });
    expect(row.start_time).toBe("08:00");
    expect(row.end_time).toBe("08:30");
  });

  it("trunca horário para HH:MM se vier com segundos", () => {
    const row = sanitizeAppointmentRow({ start_time: "09:00:00", duration_minutes: 60 });
    expect(row.start_time).toBe("09:00");
  });

  it("usa 60 minutos como duração padrão se duration_minutes ausente", () => {
    const row = sanitizeAppointmentRow({ start_time: "10:00" });
    expect(row.duration_minutes).toBe(60);
    expect(row.end_time).toBe("11:00");
  });
});
