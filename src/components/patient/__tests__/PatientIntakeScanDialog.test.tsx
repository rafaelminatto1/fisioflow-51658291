import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PatientIntakeScanDialog } from "../PatientIntakeScanDialog";
import { request } from "@/api/v2/base";

vi.mock("@/api/v2/base", () => ({ request: vi.fn() }));

const requestMock = vi.mocked(request);

const AVISO_SCAN =
  "Nada foi gravado no cadastro. Os valores vêm de leitura automática da imagem e precisam de conferência antes de serem aplicados.";

const SCAN = {
  data: {
    patientId: "p1",
    candidatos: [
      {
        field: "cpf",
        value: "52998224725",
        sourceText: "529.982.247-25",
        sourceStart: 40,
        sourceEnd: 54,
        confidence: 0.95,
      },
      {
        field: "telefone",
        value: "11987654321",
        sourceText: "Tel: (11) 98765-4321",
        sourceStart: 10,
        sourceEnd: 30,
        confidence: 0.7,
      },
      {
        field: "telefone_secundario",
        value: "34567890",
        sourceText: "3456-7890",
        sourceStart: 60,
        sourceEnd: 69,
        confidence: 0.42,
      },
      {
        field: "cep",
        value: "01310100",
        sourceText: "01310-100",
        sourceStart: 80,
        sourceEnd: 89,
        confidence: 0.8,
      },
    ],
    textoOcr: "ficha",
    caracteresLidos: 420,
  },
  meta: { confiancaMinima: 0.5, aviso: AVISO_SCAN },
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function arquivoFicha() {
  return new File(["conteudo"], "ficha.jpg", { type: "image/jpeg" });
}

async function digitalizar() {
  const input = screen.getByLabelText(/foto ou pdf da ficha/i);
  fireEvent.change(input, { target: { files: [arquivoFicha()] } });
  fireEvent.click(screen.getByRole("button", { name: /ler ficha/i }));
  await waitFor(() => expect(screen.getByText(AVISO_SCAN)).toBeInTheDocument());
}

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockImplementation(async (path: string) => {
    if (path.includes("/intake/scan")) return SCAN as never;
    return { data: { patientId: "p1", aplicados: ["telefone"], ignorados: [] }, meta: {} } as never;
  });
});

describe("PatientIntakeScanDialog", () => {
  it("envia a ficha como multipart e não grava nada no scan", async () => {
    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });

    await digitalizar();

    const [path, init] = requestMock.mock.calls[0]!;
    expect(path).toBe("/api/clinical/intake/scan");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init!.body as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("patientId")).toBe("p1");
    // Content-Type fica a cargo do browser: definir na mão quebra o boundary.
    expect(init?.headers).toBeUndefined();

    // O aviso do servidor precisa estar visível — é a garantia de que nada foi gravado.
    expect(screen.getByText(AVISO_SCAN)).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("explica a confiança em vez de mostrar percentual seco", async () => {
    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });
    await digitalizar();

    expect(screen.getByText(/dígito verificador confere/i)).toBeInTheDocument();
    expect(screen.getByText(/telefone não tem dígito verificador/i)).toBeInTheDocument();
    // Telefone sem DDD: o que importa não é "42%", é que não serve para envio.
    expect(screen.getByText(/falta o DDD/i)).toBeInTheDocument();
    expect(screen.getByText(/não serve para enviar mensagem/i)).toBeInTheDocument();
    expect(screen.queryByText("42%")).not.toBeInTheDocument();
  });

  it("mostra o trecho do OCR que originou cada candidato", async () => {
    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });
    await digitalizar();

    expect(screen.getByText("Tel: (11) 98765-4321")).toBeInTheDocument();
    expect(screen.getByText("529.982.247-25")).toBeInTheDocument();
    expect(screen.getByText("01310-100")).toBeInTheDocument();
  });

  it("mostra CEP como informativo, sem opção de aplicar", async () => {
    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });
    await digitalizar();

    const informativo = screen.getByText(/Somente informativo/i).parentElement!;
    expect(within(informativo).getByText(/CEP: 01310100/)).toBeInTheDocument();
    expect(within(informativo).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Não existe campo de CEP no cadastro/i)).toBeInTheDocument();
    // Um checkbox por candidato aplicável (3), nenhum para o CEP.
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("bloqueia aplicar telefone sem DDD até a pessoa corrigir", async () => {
    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });
    await digitalizar();

    fireEvent.click(screen.getByLabelText("Telefone secundário"));

    const aplicar = screen.getByRole("button", { name: /aplicar/i });
    await waitFor(() => expect(aplicar).toBeDisabled());
    expect(screen.getByText(/Sem DDD o número não serve para envio/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Valor de Telefone secundário"), {
      target: { value: "(11) 3456-7890" },
    });

    await waitFor(() => expect(aplicar).toBeEnabled());
  });

  it("aplica os valores editados e só os campos marcados", async () => {
    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });
    await digitalizar();

    fireEvent.click(screen.getByLabelText("Telefone"));
    fireEvent.change(screen.getByLabelText("Valor de Telefone"), {
      target: { value: "(11) 98765-4322" },
    });

    fireEvent.click(screen.getByRole("button", { name: /aplicar 1 campo/i }));

    await waitFor(() => {
      const post = requestMock.mock.calls.find(([p]) => p === "/api/clinical/intake/apply");
      expect(post).toBeTruthy();
      const body = JSON.parse(String(post![1]!.body));
      expect(body).toEqual({ patientId: "p1", telefone: "11987654322" });
    });
  });

  it("explica os campos ignorados por já terem dado preenchido", async () => {
    requestMock.mockImplementation(async (path: string) => {
      if (path.includes("/intake/scan")) return SCAN as never;
      return {
        data: { patientId: "p1", aplicados: ["cpf"], ignorados: ["telefone"] },
        meta: {
          aviso:
            "Campos já preenchidos não foram sobrescritos — dado digitado por uma pessoa vale mais que leitura de foto.",
        },
      } as never;
    });

    render(<PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });
    await digitalizar();

    fireEvent.click(screen.getByLabelText("CPF"));
    fireEvent.click(screen.getByRole("button", { name: /aplicar 1 campo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Gravado no cadastro: CPF/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Não sobrescrito: Telefone/)).toBeInTheDocument();
    expect(screen.getByText(/não foram sobrescritos/i)).toBeInTheDocument();
  });

  it("não cria um segundo scroll dentro do modal", async () => {
    const { baseElement } = render(
      <PatientIntakeScanDialog open onOpenChange={vi.fn()} patientId="p1" />,
      { wrapper },
    );

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const scrollers = baseElement.querySelectorAll(".overflow-y-auto");
    expect(scrollers.length).toBeLessThanOrEqual(1);
  });
});
