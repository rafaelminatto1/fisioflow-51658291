import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    awareness = {
      getStates: () => new Map(),
      on: vi.fn(),
      off: vi.fn(),
      setLocalStateField: vi.fn(),
    };

    constructor(_host: string, room: string) {
      this.room = room;
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

    destroy() {}
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
vi.mock("@/hooks/useSoapRecords", () => ({ useSoapRecords: () => ({ data: [] }) }));
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
});
