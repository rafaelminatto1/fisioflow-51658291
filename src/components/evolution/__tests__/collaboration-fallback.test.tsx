import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { seedYDocFromHtml, yDocToHtml } from "@fisioflow/evolution-editor-schema";
import { NotionEvolutionPanel } from "../v2-improved/NotionEvolutionPanel";
import type { EvolutionV2Data } from "../v2-improved/types";

// jsdom não implementa APIs de layout usadas pelo ProseMirror (getClientRects,
// elementFromPoint) para calcular a posição de scroll após uma transação —
// sem isso, a transação de digitação nunca chega a disparar onUpdate.
beforeAll(() => {
  // @ts-expect-error — polyfill mínimo só para o ambiente de teste
  Range.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({}),
  });
  // @ts-expect-error — idem
  Range.prototype.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  });
  document.elementFromPoint = () => null;
});

// ── Mock do provider Yjs (y-partyserver) ──────────────────────────────────
// Instância controlável nos testes: permite disparar manualmente os eventos
// "status" e "synced" que o RichTextEditor escuta para derivar o collabStatus.
// `vi.hoisted` porque `vi.mock` é hoisted ao topo do arquivo.
const { MockYProvider } = vi.hoisted(() => {
  class MockYProvider {
    static instances: MockYProvider[] = [];
    room: string;
    doc: Y.Doc;
    handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    // Instância real de `y-protocols/awareness`, não um objeto simulado —
    // `CollaborationCursor`/`yCursorPlugin` (extension-collaboration-cursor)
    // dependem de `.states` (Map), `.on`/`.off` ("change"/"update") e
    // `.setLocalStateField`, contrato que um mock parcial não reproduz.
    awareness: Awareness;

    constructor(_host: string, room: string, doc: Y.Doc) {
      this.room = room;
      this.doc = doc;
      this.awareness = new Awareness(doc);
      MockYProvider.instances.push(this);
    }

    on(event: string, cb: (...args: unknown[]) => void) {
      (this.handlers[event] ||= []).push(cb);
    }

    off(event: string, cb: (...args: unknown[]) => void) {
      this.handlers[event] = (this.handlers[event] || []).filter((h) => h !== cb);
    }

    emitStatus(status: "connecting" | "connected" | "disconnected") {
      (this.handlers["status"] || []).forEach((h) => h({ status }));
    }

    emitSynced(isSynced: boolean) {
      (this.handlers["synced"] || []).forEach((h) => h(isSynced));
    }

    destroy() {
      this.awareness.destroy();
    }
  }
  return { MockYProvider };
});

vi.mock("y-partyserver/provider", () => ({
  default: MockYProvider,
}));

vi.mock("y-indexeddb", () => ({
  IndexeddbPersistence: class {
    constructor() {}
    destroy() {}
  },
}));

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: vi.fn(async () => "test-jwt-token"),
}));

vi.mock("@/hooks/useExercises", () => ({ useExercises: () => ({ exercises: [] }) }));
vi.mock("@/hooks/usePatientEvolution", () => ({
  usePatientGoals: () => ({ data: [] }),
  usePatientPathologies: () => ({ data: [] }),
}));
const { mockSoapRecordsData } = vi.hoisted(() => ({
  mockSoapRecordsData: { current: [] as unknown[] },
}));
vi.mock("@/hooks/useSoapRecords", () => ({
  useSoapRecords: () => ({ data: mockSoapRecordsData.current }),
}));
vi.mock("@/hooks/useAIClinicalCopilot", () => ({
  useAIClinicalCopilot: () => ({ insights: [], isAnalyzing: false }),
}));

// Componentes irmãos pesados/irrelevantes ao teste da máquina de colaboração
// — mockados para manter o teste focado e rápido.
vi.mock("../v3-unified/EvolutionBlockV3", () => ({ EvolutionBlockV3: () => null }));
vi.mock("../v2-improved/HomeCareBlock", () => ({ HomeCareBlock: () => null }));
vi.mock("../v2-improved/AttachmentsBlock", () => ({ AttachmentsBlock: () => null }));
vi.mock("../v2-improved/MeasurementsBlock", () => ({ MeasurementsBlock: () => null }));
vi.mock("../v2-improved/SessionTimelineStrip", () => ({ SessionTimelineStrip: () => null }));
vi.mock("../v2-improved/ClinicalCopilotPanel", () => ({ ClinicalCopilotPanel: () => null }));
vi.mock("@/components/exercises/ExerciseLibraryModal", () => ({
  ExerciseLibraryModal: () => null,
}));

const baseData: EvolutionV2Data = {
  therapistName: "",
  therapistCrefito: "",
  sessionDate: new Date().toISOString(),
  patientReport: "",
  evolutionText: "Observação inicial salva no servidor",
  procedures: [],
  exercises: [],
  unifiedItems: [],
  observations: "Observação inicial salva no servidor",
  homeCareExercises: "",
  attachments: [],
} as unknown as EvolutionV2Data;

describe("Colaboração na evolução — máquina de dois estados + fallback", () => {
  beforeEach(() => {
    MockYProvider.instances = [];
    mockSoapRecordsData.current = [];
  });

  it("provider conecta (status connected) → autosave clássico NÃO é chamado ao editar", async () => {
    const onChange = vi.fn();
    render(
      <NotionEvolutionPanel
        data={baseData}
        onChange={onChange}
        patientId="patient-1"
        evolutionId="session-1"
        collaborationId="session-1"
        userName="Dra. Ana"
        userColor="#10b981"
      />,
    );

    await waitFor(() => {
      expect(MockYProvider.instances.length).toBe(1);
    });

    onChange.mockClear();

    act(() => {
      MockYProvider.instances[0].emitStatus("connected");
    });

    await waitFor(() => {
      expect(document.querySelector('[data-collab-status="connected"]')).toBeTruthy();
    });

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editor).toBeTruthy();

    const user = userEvent.setup();
    await user.click(editor);
    await user.type(editor, " digitado durante colaboração");

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(onChange).not.toHaveBeenCalled();
  });

  it(
    "provider falha ao conectar (timeout) → remonta em modo clássico: carrega observacao e autosave volta a ser chamado",
    async () => {
      const onChange = vi.fn();
      render(
        <NotionEvolutionPanel
          data={baseData}
          onChange={onChange}
          patientId="patient-1"
          evolutionId="session-2"
          collaborationId="session-2"
          userName="Dra. Ana"
          userColor="#10b981"
        />,
      );

      await waitFor(() => {
        expect(MockYProvider.instances.length).toBe(1);
      });

      // Nunca emite "connected"/"synced" — espera o timeout real de 5s expirar,
      // que faz o painel remontar o editor em modo clássico (sem colaboração).
      await waitFor(
        () => {
          expect(document.querySelector('[data-collab-status="fallback"]')).toBeTruthy();
        },
        { timeout: 8000, interval: 100 },
      );

      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      expect(editor).toBeTruthy();
      // Modo clássico deve carregar o conteúdo de `observacao` vindo dos dados.
      expect(editor.textContent).toContain("Observação inicial salva no servidor");

      onChange.mockClear();

      const user = userEvent.setup();
      await user.click(editor);
      await user.type(editor, " editado em modo fallback");

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onChange).toHaveBeenCalled();
    },
    12000,
  );

  const emptyData: EvolutionV2Data = {
    therapistName: "",
    therapistCrefito: "",
    sessionDate: new Date().toISOString(),
    patientReport: "",
    evolutionText: "",
    procedures: [],
    exercises: [],
    unifiedItems: [],
    observations: "",
    homeCareExercises: "",
    attachments: [],
  } as unknown as EvolutionV2Data;

  const lastSessionRecord = {
    id: "previous-session",
    record_date: new Date().toISOString(),
    observacao: "Texto da sessão anterior a ser replicado",
    pain_scale: 4,
    procedures: [],
    exercises: [],
    home_exercises: [],
    measurements: [],
  };

  it("replicar sessão com colaboração conectada NÃO escreve o texto pelo autosave clássico (só campos estruturados)", async () => {
    const onChange = vi.fn();
    mockSoapRecordsData.current = [lastSessionRecord];

    render(
      <NotionEvolutionPanel
        data={emptyData}
        onChange={onChange}
        patientId="patient-1"
        evolutionId="session-3"
        collaborationId="session-3"
        userName="Dra. Ana"
        userColor="#10b981"
      />,
    );

    await waitFor(() => {
      expect(MockYProvider.instances.length).toBe(1);
    });

    act(() => {
      MockYProvider.instances[0].emitStatus("connected");
    });

    await waitFor(() => {
      expect(document.querySelector('[data-collab-status="connected"]')).toBeTruthy();
    });

    onChange.mockClear();

    const replicateButton = await waitFor(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Replicar agora"),
      );
      expect(btn).toBeTruthy();
      return btn as HTMLButtonElement;
    });

    const user = userEvent.setup();
    await user.click(replicateButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    const payload = onChange.mock.calls[0][0];
    expect(payload.evolutionText).not.toBe("Texto da sessão anterior a ser replicado");
    expect(payload.observations).not.toBe("Texto da sessão anterior a ser replicado");
    expect(payload.painLevel).toBe(4);

    await waitFor(() => {
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      expect(editor.textContent).toContain("Texto da sessão anterior a ser replicado");
    });
  });

  it("replicar sessão em modo clássico/fallback ainda escreve o texto pelo autosave (comportamento cheio preservado)", async () => {
    const onChange = vi.fn();
    mockSoapRecordsData.current = [lastSessionRecord];

    render(
      <NotionEvolutionPanel
        data={emptyData}
        onChange={onChange}
        patientId="patient-1"
        evolutionId="session-4"
      />,
    );

    const replicateButton = await waitFor(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Replicar agora"),
      );
      expect(btn).toBeTruthy();
      return btn as HTMLButtonElement;
    });

    const user = userEvent.setup();
    await user.click(replicateButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    const payload = onChange.mock.calls[0][0];
    expect(payload.evolutionText).toBe("Texto da sessão anterior a ser replicado");
    expect(payload.observations).toBe("Texto da sessão anterior a ser replicado");
    expect(payload.painLevel).toBe(4);
  });

  it("transição de collaborationId undefined→id no meio da digitação não perde o conteúdo digitado", async () => {
    // Wrapper controlado como no app real: `onChange` atualiza o estado do
    // pai e o novo `data` reflui como prop — diferente de um closure mutável,
    // que não dispararia a re-renderização que o cenário real depende.
    const latestData = { current: { ...emptyData } as EvolutionV2Data };
    const HostPanel: React.FC<{ collaborationId?: string; evolutionId?: string }> = ({
      collaborationId,
      evolutionId,
    }) => {
      const [data, setData] = React.useState<EvolutionV2Data>({ ...emptyData });
      return (
        <NotionEvolutionPanel
          data={data}
          onChange={(next) => {
            latestData.current = next;
            setData(next);
          }}
          patientId="patient-1"
          evolutionId={evolutionId}
          collaborationId={collaborationId}
          userName="Dra. Ana"
          userColor="#10b981"
        />
      );
    };

    const { rerender } = render(<HostPanel collaborationId={undefined} evolutionId={undefined} />);

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editor).toBeTruthy();

    const user = userEvent.setup();
    await user.click(editor);
    await user.type(editor, "Digitando durante a transicao de sessao");

    // Garantia sem perda de dados (Gate 1): o caminho clássico já flushou o
    // texto digitado para `observacao` (via onChange) ANTES do remount. Esse é
    // o conteúdo que o servidor persiste e a partir do qual o Durable Object
    // semeia o Y.Doc no onLoad. Em modo colaborativo o editor NÃO lê mais de
    // `value` — a fonte da verdade é o Y.Doc sincronizado.
    await waitFor(() => {
      expect(latestData.current.observations).toContain(
        "Digitando durante a transicao de sessao",
      );
    });

    // Remonta com um collaborationId real, simulando o autosave que criou o
    // registro ~1s depois de o usuário começar a digitar.
    rerender(<HostPanel collaborationId="session-new" evolutionId="session-new" />);

    // Modela o servidor autoritativo (DO.onLoad): na primeira abertura
    // colaborativa, o Y.Doc é semeado a partir do `observacao` já persistido
    // pelo caminho clássico. É a MESMA operação de `seedYDocFromHtml` que o DO
    // executa no servidor — aqui aplicada ao Y.Doc que o provider entrega ao
    // cliente. Assim a sessão colaborativa começa com o conteúdo digitado,
    // sem perda (a fonte da verdade em modo colaborativo é o Y.Doc, não `value`).
    const provider = await waitFor(() => {
      expect(MockYProvider.instances.length).toBe(1);
      return MockYProvider.instances[0];
    });

    seedYDocFromHtml(provider.doc, latestData.current.observations || "");
    provider.emitSynced(true);

    const seededHtml = yDocToHtml(provider.doc);
    expect(seededHtml).toContain("Digitando durante a transicao de sessao");
  });

  it("queda de conexão após conectado mostra indicador de reconexão sem remontar em fallback", async () => {
    const onChange = vi.fn();
    render(
      <NotionEvolutionPanel
        data={baseData}
        onChange={onChange}
        patientId="patient-1"
        evolutionId="session-5"
        collaborationId="session-5"
        userName="Dra. Ana"
        userColor="#10b981"
      />,
    );

    await waitFor(() => {
      expect(MockYProvider.instances.length).toBe(1);
    });

    act(() => {
      MockYProvider.instances[0].emitStatus("connected");
    });

    await waitFor(() => {
      expect(document.querySelector('[data-collab-status="connected"]')).toBeTruthy();
    });

    expect(document.body.textContent).not.toContain("Reconectando");

    act(() => {
      MockYProvider.instances[0].emitStatus("disconnected");
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("Reconectando");
    });

    // Não deve ter remontado o editor em modo clássico/fallback.
    expect(document.querySelector('[data-collab-status="fallback"]')).toBeFalsy();
    expect(document.querySelector('[data-collab-status="connected"]')).toBeTruthy();

    act(() => {
      MockYProvider.instances[0].emitStatus("connected");
    });

    await waitFor(() => {
      expect(document.body.textContent).not.toContain("Reconectando");
    });
  });
});
