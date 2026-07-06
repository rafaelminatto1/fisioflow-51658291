import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { seedYDocFromHtml } from "@fisioflow/evolution-editor-schema";
import { RichTextEditor } from "../RichTextEditor";

const yProviderCtor = vi.fn();
const idbPersistenceCtor = vi.fn();

vi.mock("y-partyserver/provider", () => ({
  default: class MockYProvider {
    room: string;
    options: unknown;
    // Instância real de `y-protocols/awareness`, não um objeto simulado —
    // `CollaborationCursor`/`yCursorPlugin` chamam `.states` (Map), `.on`/`.off`
    // ("change"/"update") e `.setLocalStateField`, contrato que um mock parcial
    // não reproduz fielmente.
    awareness: Awareness;
    constructor(host: string, room: string, doc: Y.Doc, options: unknown) {
      yProviderCtor(host, room, doc, options);
      this.room = room;
      this.options = options;
      this.awareness = new Awareness(doc);
    }
    destroy() {
      this.awareness.destroy();
    }
    on() {}
    off() {}
  },
}));

vi.mock("y-indexeddb", () => ({
  IndexeddbPersistence: class MockIndexeddbPersistence {
    constructor(name: string, doc: unknown) {
      idbPersistenceCtor(name, doc);
    }
    destroy() {}
  },
}));

vi.mock("@/lib/auth/neon-token", () => ({
  getNeonAccessToken: vi.fn(async () => "test-jwt-token"),
}));

vi.mock("@/hooks/useExercises", () => ({
  useExercises: () => ({ exercises: [] }),
}));

vi.mock("@/hooks/usePatientEvolution", () => ({
  usePatientGoals: () => ({ data: [] }),
  usePatientPathologies: () => ({ data: [] }),
}));

vi.mock("@/hooks/useSoapRecords", () => ({
  useSoapRecords: () => ({ data: [] }),
}));

// jsdom não implementa as APIs de layout que o ProseMirror usa para calcular a
// posição de scroll após uma transação (getClientRects/elementFromPoint) — sem
// isso, digitar via `userEvent` nunca chega a produzir uma transação real.
// Mesmo polyfill usado em collaboration-fallback.test.tsx.
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

describe("RichTextEditor — colaboração via y-partyserver", () => {
  beforeEach(() => {
    yProviderCtor.mockClear();
    idbPersistenceCtor.mockClear();
  });

  it("conecta o provider y-partyserver com o room correto e token JWT nos params", async () => {
    render(
      <RichTextEditor
        value=""
        onValueChange={() => {}}
        collaborationId="sess-1"
      />,
    );

    await waitFor(() => {
      expect(yProviderCtor).toHaveBeenCalledTimes(1);
    });

    const [, room, , options] = yProviderCtor.mock.calls[0];
    expect(room).toBe("sess-1");
    expect(options).toBeDefined();

    const resolvedParams = await (options as { params: () => Promise<Record<string, string>> }).params();
    expect(resolvedParams).toEqual({ token: "test-jwt-token" });
  });

  it("cria persistência offline via y-indexeddb para o mesmo id de colaboração", async () => {
    render(
      <RichTextEditor
        value=""
        onValueChange={() => {}}
        collaborationId="sess-1"
      />,
    );

    await waitFor(() => {
      expect(idbPersistenceCtor).toHaveBeenCalledTimes(1);
    });

    const [name] = idbPersistenceCtor.mock.calls[0];
    expect(name).toBe("sess-1");
  });

  // ── Teste de binding real (evita a regressão do Gate 1) ──────────────────
  // Os dois testes acima só provam que o provider/IndexedDB foram
  // *construídos* — isso passava mesmo com o editor completamente desvinculado
  // do Y.Doc (bug real encontrado em produção: `useEditor` montava o editor
  // ANTES de `ydoc` existir, então a extensão `Collaboration`/`ySyncPlugin`
  // nunca entrava no schema). Os testes abaixo provam o vínculo de fato:
  // digitar no editor precisa refletir no Y.Doc, e uma atualização remota do
  // Y.Doc precisa refletir no DOM do editor.

  it("digitar no editor grava no Y.Doc real (ySyncPlugin vinculado)", async () => {
    render(
      <RichTextEditor
        value=""
        onValueChange={() => {}}
        collaborationId="sess-bind-1"
      />,
    );

    await waitFor(() => {
      expect(idbPersistenceCtor).toHaveBeenCalledTimes(1);
    });
    // Y.Doc real passado ao construtor mockado da persistência — é a MESMA
    // instância usada por `Collaboration.configure({ document: ydoc })`.
    const [, ydoc] = idbPersistenceCtor.mock.calls[0] as [string, Y.Doc];
    expect(ydoc).toBeInstanceOf(Y.Doc);

    const editorEl = await waitFor(() => {
      const el = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });

    const user = userEvent.setup();
    await user.click(editorEl);
    await user.type(editorEl, "vinculado ao yjs");

    await waitFor(() => {
      expect(ydoc.getXmlFragment("default").toString()).toContain("vinculado ao yjs");
    });
  });

  it("uma atualização remota aplicada ao Y.Doc aparece no DOM do editor (binding bidirecional)", async () => {
    render(
      <RichTextEditor
        value=""
        onValueChange={() => {}}
        collaborationId="sess-bind-2"
      />,
    );

    await waitFor(() => {
      expect(idbPersistenceCtor).toHaveBeenCalledTimes(1);
    });
    const [, ydoc] = idbPersistenceCtor.mock.calls[0] as [string, Y.Doc];

    await waitFor(() => {
      expect(document.querySelector('[contenteditable="true"]')).toBeTruthy();
    });

    // Simula um peer remoto: monta um Y.Doc paralelo com o mesmo conteúdo
    // esperado e aplica o update codificado no doc real do componente — é
    // exatamente o que o provider faria ao receber uma sincronização.
    const remoteDoc = new Y.Doc();
    seedYDocFromHtml(remoteDoc, "<p>texto do peer remoto</p>");
    const update = Y.encodeStateAsUpdate(remoteDoc);

    Y.applyUpdate(ydoc, update);

    await waitFor(() => {
      expect(document.body.textContent).toContain("texto do peer remoto");
    });
  });
});
