import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { usePatientsUrlState } from "../usePatientsUrlState";

/**
 * O filtro de pendência mora na URL, não em estado local: a recepção compartilha
 * "os 613 candidatos a alta" por link, e recarregar a página não pode perder o
 * recorte que a pessoa estava trabalhando.
 */

function wrapper(initial: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
}

describe("usePatientsUrlState — filtro de pendência", () => {
  it("lê a pendência da URL e a repassa aos filtros da listagem", () => {
    const { result } = renderHook(() => usePatientsUrlState(), {
      wrapper: wrapper("/pacientes?pending=candidatoAlta"),
    });

    expect(result.current.filtersState.pending).toBe("candidatoAlta");
    expect(result.current.filters.pending).toBe("candidatoAlta");
  });

  it("sem parâmetro na URL, nenhuma pendência está aplicada", () => {
    const { result } = renderHook(() => usePatientsUrlState(), {
      wrapper: wrapper("/pacientes"),
    });

    expect(result.current.filtersState.pending).toBeNull();
  });

  /**
   * Link antigo com chave que não existe mais cai para "sem filtro". Aceitar a
   * chave desconhecida faria o backend ignorá-la e a tela mostrar a base inteira
   * rotulada como pendência — pior que não filtrar.
   */
  it("chave desconhecida é descartada em vez de vazar para a API", () => {
    const { result } = renderHook(() => usePatientsUrlState(), {
      wrapper: wrapper("/pacientes?pending=inventado"),
    });

    expect(result.current.filtersState.pending).toBeNull();
    expect(result.current.filters.pending).toBeNull();
  });

  it("aplicar uma pendência volta para a primeira página", () => {
    const { result } = renderHook(() => usePatientsUrlState(), {
      wrapper: wrapper("/pacientes?page=4"),
    });

    act(() => {
      result.current.updateSearchParams({ pending: "platoConfirmado" });
    });

    expect(result.current.filtersState.pending).toBe("platoConfirmado");
    expect(result.current.pageParam).toBe(1);
  });

  it("limpar todos os filtros remove também a pendência", () => {
    const { result } = renderHook(() => usePatientsUrlState(), {
      wrapper: wrapper("/pacientes?pending=semTelefone&status=active"),
    });

    act(() => {
      result.current.handleClearAllFilters();
    });

    expect(result.current.filtersState.pending).toBeNull();
  });
});
