import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientCombobox } from "../patient-combobox";
import type { Patient } from "@/types";

describe("PatientCombobox", () => {
  it("exibe o nome de fallback no campo bloqueado de edição mesmo sem value", () => {
    render(
      <PatientCombobox
        patients={[]}
        value=""
        onValueChange={vi.fn()}
        fallbackDisplayName="Maria Silva"
        disabled
      />,
    );

    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.queryByText("Selecione o paciente...")).not.toBeInTheDocument();
  });

  it("prioriza o paciente encontrado na lista quando o value está preenchido", () => {
    const patient: Patient = {
      id: "patient-1",
      name: "João Souza",
      full_name: "João Souza",
      birthDate: "1990-01-01",
      gender: "masculino",
      mainCondition: "Dor lombar",
      status: "Em Tratamento",
      progress: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    render(
      <PatientCombobox
        patients={[patient]}
        value="patient-1"
        onValueChange={vi.fn()}
        fallbackDisplayName="Nome antigo"
      />,
    );

    expect(screen.getByText("João Souza")).toBeInTheDocument();
    expect(screen.queryByText("Nome antigo")).not.toBeInTheDocument();
  });
});
