import { describe, it, expect } from "vitest";
import {
  mapTipoToAppointmentStatus,
  mapTipoToAppointmentType,
  parseZenfisioDateTime,
  parseCsvDemographics,
  buildLegacyPatient,
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
  it("rejeita lixo após data e hora válida", () => {
    expect(parseZenfisioDateTime("30/08/2024 15:00 GARBAGE", undefined)).toBeNull();
  });
  it("rejeita data inválida 30/02/2024 (fevereiro não tem 30 dias)", () => {
    expect(parseZenfisioDateTime("30/02/2024", undefined)).toBeNull();
  });
  it("rejeita data inválida 31/04/2024 (abril tem 30 dias)", () => {
    expect(parseZenfisioDateTime("31/04/2024", undefined)).toBeNull();
  });
  it("rejeita hora inválida 25:00", () => {
    expect(parseZenfisioDateTime("15/05/1990 25:00", undefined)).toBeNull();
  });
  it("rejeita minutos inválidos 60", () => {
    expect(parseZenfisioDateTime("15/05/1990 15:60", undefined)).toBeNull();
  });
  it("aceita leap day válido 29/02/2024", () => {
    expect(parseZenfisioDateTime("29/02/2024", undefined)).toEqual({ date: "2024-02-29", startTime: null });
  });
});

describe("parseCsvDemographics", () => {
  const csv = `﻿"Código";"Nome";"Data de nascimento";"Sexo";"Celular"
"2658699";"Yasmin Barros";"15/05/1990";"Feminino";"11999998888"
"2658706";"Andre Luiz";"";"";""`;
  it("indexa por Código e extrai campos preenchidos", () => {
    const demo = parseCsvDemographics(csv);
    expect(demo.get("2658699")).toEqual({ birthDate: "15/05/1990", gender: "Feminino", phone: "11999998888" });
    expect(demo.get("2658706")).toEqual({ birthDate: undefined, gender: undefined, phone: undefined });
  });
});

describe("buildLegacyPatient", () => {
  const patient = {
    paciente_nome: "Yasmin Barros",
    paciente_id: "2658699",
    historico: [
      { data_completa: "30/08/2024 15:00", tipo: "Evolução", conteudo_texto: "texto clínico" },
      { data_completa: "13/09/2024 14:00", tipo: "Faltou", conteudo_texto: "" },
    ],
  };
  it("monta paciente com 2 evoluções (1 com sessão, 1 falta sem texto)", () => {
    const result = buildLegacyPatient(patient, { birthDate: "15/05/1990", gender: "Feminino", phone: "11999998888" })!;
    expect(result.fullName).toBe("Yasmin Barros");
    expect(result.legacyId).toBe("2658699");
    expect(result.birthDate).toBe("15/05/1990");
    expect(result.evolutions).toHaveLength(2);
    expect(result.evolutions[0]).toMatchObject({
      date: "2024-08-30", startTime: "15:00", observacao: "texto clínico",
      appointmentStatus: "atendido", appointmentType: "session",
    });
    expect(result.evolutions[1]).toMatchObject({ appointmentStatus: "faltou", appointmentType: "session" });
    expect(result.evolutions[1].observacao).toBeUndefined();
  });
  it("retorna null quando nenhuma data é parseável", () => {
    expect(buildLegacyPatient({ paciente_nome: "X", paciente_id: "1", historico: [{ tipo: "Faltou" }] })).toBeNull();
  });
});
