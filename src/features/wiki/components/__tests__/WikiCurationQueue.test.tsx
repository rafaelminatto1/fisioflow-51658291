import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WikiCurationQueue } from "../WikiCurationQueue";
import { useWikiCuration } from "@/hooks/wiki/useWikiCuration";

vi.mock("@/hooks/wiki/useWikiCuration", () => ({ useWikiCuration: vi.fn() }));
const useWikiCurationMock = vi.mocked(useWikiCuration);

function queryState(overrides: Record<string, unknown> = {}) {
  return {
    capabilities: ["manage_library"],
    canManageLibrary: true,
    capabilitiesLoading: false,
    capabilitiesError: null,
    items: [],
    counts: {},
    queueQuery: {
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
    },
    detailQuery: { isLoading: false, refetch: vi.fn() },
    transition: vi.fn(),
    transitionPending: false,
    assign: vi.fn(),
    assignmentPending: false,
    retryCapabilities: vi.fn(),
    ...overrides,
  } as never;
}

beforeEach(() => useWikiCurationMock.mockReturnValue(queryState()));

describe("WikiCurationQueue", () => {
  it("não expõe a fila sem capability editorial", () => {
    useWikiCurationMock.mockReturnValue(
      queryState({ canManageLibrary: false }),
    );
    render(
      <MemoryRouter>
        <WikiCurationQueue />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/não possui capacidade editorial/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("renderiza estado vazio e contadores da fila", () => {
    useWikiCurationMock.mockReturnValue(
      queryState({ counts: { inbox: 2, triage: 1 } }),
    );
    render(
      <MemoryRouter initialEntries={["/wiki?view=curation"]}>
        <WikiCurationQueue />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Gestão da Biblioteca" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nenhum item nesta etapa")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Caixa de entrada 2/ }),
    ).toBeInTheDocument();
  });

  it("mostra estados editorial e técnico de forma independente", () => {
    useWikiCurationMock.mockReturnValue(
      queryState({
        items: [
          {
            id: "i1",
            versionId: "v1",
            rowVersion: 1,
            title: "Diretriz de joelho",
            kind: "guideline",
            editorialStatus: "triage",
            technicalStatus: "failed",
            allowedActions: [],
            provenance: { sourceTitle: "SciELO" },
          },
        ],
      }),
    );
    render(
      <MemoryRouter>
        <WikiCurationQueue />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Em triagem")).toHaveLength(2);
    expect(screen.getByText("Falha técnica")).toBeInTheDocument();
  });

  it("oferece filtros compatíveis de validade e tipo canônico", () => {
    render(
      <MemoryRouter>
        <WikiCurationQueue />
      </MemoryRouter>,
    );
    expect(screen.getByRole("combobox", { name: /validade/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /tipo/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /estado técnico/i })).toBeInTheDocument();
  });
});
