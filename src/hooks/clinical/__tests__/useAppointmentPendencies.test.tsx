import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

const requestMock = vi.fn();
vi.mock("@/api/v2/base", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

import {
  describePendency,
  useAppointmentPendencies,
  type AppointmentPendenciesMeta,
  type AppointmentPendency,
} from "../useAppointmentPendencies";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

const meta: AppointmentPendenciesMeta = {
  from: "2026-07-27",
  to: "2026-08-02",
  totalAppointments: 109,
  counts: { sem_evolucao: 12, plato: 3 },
  criterios: {
    semEvolucao: "Atendimento já realizado e nenhuma evolução escrita para esta data",
    plato: "4 sessões seguidas com a mesma conduta e sem ganho de carga ou de dor",
  },
  plateauRecentDays: 90,
};

beforeEach(() => {
  requestMock.mockReset().mockResolvedValue({ data: {}, meta });
});

describe("useAppointmentPendencies", () => {
  it("não chama a API sem intervalo — a agenda pode montar antes dos dados", async () => {
    renderHook(() => useAppointmentPendencies({ from: null, to: null }), { wrapper });
    await waitFor(() => expect(requestMock).not.toHaveBeenCalled());
  });

  it("pede a janela inteira em uma chamada só", async () => {
    const { result } = renderHook(
      () => useAppointmentPendencies({ from: "2026-07-27", to: "2026-08-02" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      "/api/clinical/appointments/pendencias?from=2026-07-27&to=2026-08-02",
    );
  });

  it("respeita enabled=false", async () => {
    renderHook(
      () => useAppointmentPendencies({ from: "2026-07-27", to: "2026-08-02", enabled: false }),
      { wrapper },
    );
    await waitFor(() => expect(requestMock).not.toHaveBeenCalled());
  });

  it("devolve o mapa indexado por agendamento", async () => {
    requestMock.mockResolvedValue({
      data: {
        a1: { appointmentId: "a1", patientId: "p1", flags: ["sem_evolucao"], plateauSessions: null, plateauLastDate: null },
      },
      meta,
    });
    const { result } = renderHook(
      () => useAppointmentPendencies({ from: "2026-07-27", to: "2026-08-02" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.a1.flags).toEqual(["sem_evolucao"]);
    expect(result.current.data?.meta.totalAppointments).toBe(109);
  });
});

describe("describePendency", () => {
  const base: AppointmentPendency = {
    appointmentId: "a1",
    patientId: "p1",
    flags: ["sem_evolucao"],
    plateauSessions: null,
    plateauLastDate: null,
  };

  it("sempre expõe o critério — badge sem critério não é acionável", () => {
    expect(describePendency(base, meta)).toContain(meta.criterios.semEvolucao);
  });

  it("cai em texto padrão quando o meta ainda não chegou", () => {
    expect(describePendency(base)).toMatch(/Sem evolução/);
  });

  it("dá números ao platô: quantas sessões e até quando", () => {
    const texto = describePendency(
      { ...base, flags: ["plato"], plateauSessions: 5, plateauLastDate: "2026-07-20" },
      meta,
    );
    expect(texto).toContain("5 sessões seguidas");
    expect(texto).toContain("2026-07-20");
  });

  it("descreve os dois sinais quando ambos acendem", () => {
    const texto = describePendency({ ...base, flags: ["sem_evolucao", "plato"] }, meta);
    expect(texto).toMatch(/Sem evolução/);
    expect(texto).toMatch(/Platô/);
  });
});
