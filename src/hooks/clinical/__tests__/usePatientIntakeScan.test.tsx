import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  campoEhAplicavel,
  INTAKE_MAX_BYTES,
  useApplyIntakeFields,
  useScanIntakeSheet,
} from "../usePatientIntakeScan";
import { request } from "@/api/v2/base";

vi.mock("@/api/v2/base", () => ({ request: vi.fn() }));

const requestMock = vi.mocked(request);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue({ data: {}, meta: {} } as never);
});

describe("useScanIntakeSheet", () => {
  it("monta FormData com file e patientId", async () => {
    const { result } = renderHook(() => useScanIntakeSheet(), { wrapper });
    const file = new File(["x"], "ficha.pdf", { type: "application/pdf" });

    result.current.mutate({ file, patientId: "p9" });

    await waitFor(() => expect(requestMock).toHaveBeenCalled());
    const [path, init] = requestMock.mock.calls[0]!;
    expect(path).toBe("/api/clinical/intake/scan");
    const form = init!.body as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("patientId")).toBe("p9");
  });

  it("omite patientId quando não informado", async () => {
    const { result } = renderHook(() => useScanIntakeSheet(), { wrapper });
    result.current.mutate({ file: new File(["x"], "f.jpg", { type: "image/jpeg" }) });

    await waitFor(() => expect(requestMock).toHaveBeenCalled());
    const form = requestMock.mock.calls[0]![1]!.body as FormData;
    expect(form.get("patientId")).toBeNull();
  });

  it("barra arquivo acima do limite antes de subir 8 MB à toa", async () => {
    const { result } = renderHook(() => useScanIntakeSheet(), { wrapper });
    const grande = new File(["x"], "grande.jpg", { type: "image/jpeg" });
    Object.defineProperty(grande, "size", { value: INTAKE_MAX_BYTES + 1 });

    result.current.mutate({ file: grande });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/8 MB/);
    expect(requestMock).not.toHaveBeenCalled();
  });
});

describe("useApplyIntakeFields", () => {
  it("envia JSON e invalida o cache do paciente", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useApplyIntakeFields(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({ patientId: "p1", telefone: "11987654321" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [path, init] = requestMock.mock.calls[0]!;
    expect(path).toBe("/api/clinical/intake/apply");
    expect(JSON.parse(String(init!.body))).toEqual({ patientId: "p1", telefone: "11987654321" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["patient", "p1"] });
  });
});

describe("campoEhAplicavel", () => {
  it("exclui o CEP: não existe coluna de CEP em patients", () => {
    expect(campoEhAplicavel("cep")).toBe(false);
    expect(campoEhAplicavel("telefone")).toBe(true);
    expect(campoEhAplicavel("data_nascimento")).toBe(true);
  });
});
