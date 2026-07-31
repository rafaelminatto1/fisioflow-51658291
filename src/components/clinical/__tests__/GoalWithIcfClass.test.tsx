import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { GoalWithIcfClass } from "../GoalWithIcfClass";
import { request } from "@/api/v2/base";

vi.mock("@/api/v2/base", () => ({ request: vi.fn() }));

const requestMock = vi.mocked(request);

const ICF_CLASSES = [
  { value: "sintoma", label: "Sintoma", hint: 'Ex.: "reduzir dor lombar"' },
  {
    value: "funcao_estrutura",
    label: "Função / estrutura",
    hint: 'Ex.: "ganhar 20° de flexão de ombro"',
  },
  {
    value: "atividade_participacao",
    label: "Atividade / participação",
    hint: 'Ex.: "voltar a jogar futebol aos domingos"',
  },
  { value: "nao_classificavel", label: "Não classificável", hint: "Objetivo vago" },
];

const AVISO_SINTOMA =
  "Este objetivo descreve apenas o sintoma. Objetivos de atividade/participação associaram-se a melhor desfecho — vale acrescentar.";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Harness controlado: o componente é um campo, quem guarda o texto é a tela. */
function Harness({ inicial = "", onSave }: { inicial?: string; onSave?: (v: string) => void }) {
  const [value, setValue] = useState(inicial);
  return (
    <div>
      <GoalWithIcfClass value={value} onChange={setValue} debounceMs={0} />
      <button type="button" onClick={() => onSave?.(value)}>
        Salvar objetivo
      </button>
    </div>
  );
}

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.includes("/goals/icf-classes")) {
      return { data: ICF_CLASSES, meta: { fundamento: "FYSIOPRIM" } } as never;
    }
    if (path.includes("/goals/classify")) {
      const description = String(JSON.parse(String(init?.body ?? "{}")).description ?? "");
      if (/futebol|voltar a/i.test(description)) {
        return { data: { suggested: "atividade_participacao", symptomOnly: false } } as never;
      }
      return {
        data: { suggested: "sintoma", symptomOnly: true, advice: AVISO_SINTOMA },
      } as never;
    }
    return { data: null } as never;
  });
});

describe("GoalWithIcfClass", () => {
  it("classifica enquanto o usuário digita", async () => {
    render(<Harness />, { wrapper });

    fireEvent.change(screen.getByLabelText(/objetivo terapêutico/i), {
      target: { value: "reduzir a dor lombar" },
    });

    await waitFor(() => {
      const classify = requestMock.mock.calls.filter(([path]) =>
        String(path).includes("/goals/classify"),
      );
      expect(classify.length).toBeGreaterThan(0);
      expect(JSON.parse(String(classify.at(-1)![1]!.body)).description).toBe("reduzir a dor lombar");
    });
  });

  it("mostra o aviso quando o objetivo é só de sintoma", async () => {
    render(<Harness />, { wrapper });

    fireEvent.change(screen.getByLabelText(/objetivo terapêutico/i), {
      target: { value: "reduzir a dor lombar" },
    });

    const aviso = await screen.findByTestId("goal-icf-advice");
    expect(aviso).toHaveTextContent(/apenas o sintoma/i);
    expect(aviso).toHaveTextContent(/pode ser salvo do jeito que está/i);
  });

  it("nunca bloqueia o salvamento por causa do aviso", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />, { wrapper });

    fireEvent.change(screen.getByLabelText(/objetivo terapêutico/i), {
      target: { value: "reduzir a dor lombar" },
    });
    await screen.findByTestId("goal-icf-advice");

    const salvar = screen.getByRole("button", { name: /salvar objetivo/i });
    expect(salvar).toBeEnabled();
    expect(screen.getByLabelText(/objetivo terapêutico/i)).not.toBeDisabled();

    fireEvent.click(salvar);
    expect(onSave).toHaveBeenCalledWith("reduzir a dor lombar");
  });

  it("não mostra aviso quando o objetivo é de atividade/participação", async () => {
    render(<Harness />, { wrapper });

    fireEvent.change(screen.getByLabelText(/objetivo terapêutico/i), {
      target: { value: "voltar a jogar futebol aos domingos" },
    });

    await waitFor(() => {
      expect(
        requestMock.mock.calls.some(([path]) => String(path).includes("/goals/classify")),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("goal-icf-advice")).not.toBeInTheDocument();
    });
  });

  it("não classifica texto curto demais", async () => {
    render(<Harness />, { wrapper });

    fireEvent.change(screen.getByLabelText(/objetivo terapêutico/i), { target: { value: "do" } });

    await waitFor(() => {
      expect(screen.getByLabelText(/objetivo terapêutico/i)).toHaveValue("do");
    });
    expect(
      requestMock.mock.calls.filter(([path]) => String(path).includes("/goals/classify")),
    ).toHaveLength(0);
  });

  it("exibe as classes CIF vindas do servidor", async () => {
    render(<Harness />, { wrapper });

    expect(await screen.findByText("Atividade / participação")).toBeInTheDocument();
    expect(screen.getByText('Ex.: "ganhar 20° de flexão de ombro"')).toBeInTheDocument();
  });
});
