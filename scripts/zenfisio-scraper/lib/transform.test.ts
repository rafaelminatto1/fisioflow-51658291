import { describe, it, expect } from "vitest";
import {
  mapTipoToAppointmentStatus,
  mapTipoToAppointmentType,
  parseZenfisioDateTime,
} from "./transform";

describe("mapTipoToAppointmentStatus", () => {
  it("mapeia Evolução para atendido + cria sessão", () => {
    expect(mapTipoToAppointmentStatus("Evolução")).toEqual({ status: "atendido", createsSession: true });
  });
  it("mapeia Faltou para faltou sem sessão", () => {
    expect(mapTipoToAppointmentStatus("Faltou")).toEqual({ status: "faltou", createsSession: false });
  });
  it("mapeia Avaliação para avaliacao + cria sessão", () => {
    expect(mapTipoToAppointmentStatus("Avaliação")).toEqual({ status: "avaliacao", createsSession: true });
  });
  it("mapeia Presença para presenca_confirmada + cria sessão", () => {
    expect(mapTipoToAppointmentStatus("Presença")).toEqual({ status: "presenca_confirmada", createsSession: true });
  });
  it("tipo desconhecido cai em nao_atendido sem sessão", () => {
    expect(mapTipoToAppointmentStatus("Xpto")).toEqual({ status: "nao_atendido", createsSession: false });
  });
});

describe("mapTipoToAppointmentType", () => {
  it("Avaliação => evaluation", () => {
    expect(mapTipoToAppointmentType("Avaliação")).toBe("evaluation");
  });
  it("Evolução => session", () => {
    expect(mapTipoToAppointmentType("Evolução")).toBe("session");
  });
});

describe("parseZenfisioDateTime", () => {
  it("parseia data_completa dd/MM/yyyy HH:mm", () => {
    expect(parseZenfisioDateTime("30/08/2024 15:00", undefined)).toEqual({ date: "2024-08-30", startTime: "15:00" });
  });
  it("usa fallback data sem hora", () => {
    expect(parseZenfisioDateTime(undefined, "03/04/2024")).toEqual({ date: "2024-04-03", startTime: null });
  });
  it("retorna null quando ambos ausentes/inválidos", () => {
    expect(parseZenfisioDateTime(undefined, undefined)).toBeNull();
    expect(parseZenfisioDateTime("data-ruim", undefined)).toBeNull();
  });
});
