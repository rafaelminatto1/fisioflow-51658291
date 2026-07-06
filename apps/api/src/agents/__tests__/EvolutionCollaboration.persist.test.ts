/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF } from "cloudflare:test";
import { getSchema } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it, vi } from "vitest";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";
import { evolutionEditorExtensions } from "@fisioflow/evolution-editor-schema";

// Mesmo padrão dos testes de auth/sync (Task 4): o módulo real de "../../lib/db"
// carrega o driver `pg`, que não roda no bundler do vitest-pool-workers, então
// é mockado sem `importOriginal`. Este teste captura os parâmetros passados às
// queries de SELECT (onLoad) e UPDATE (onSave) para verificar a persistência.
vi.mock("../../lib/auth", () => ({
  resolveJwtCandidate: vi.fn(async () => ({
    uid: "persist-test-user",
    organizationId: "persist-test-org",
    role: "fisioterapeuta",
  })),
  userHasRole: (user: { role?: string } | null, roles: string[]) =>
    Boolean(user?.role && roles.includes(user.role)),
}));

let savedUpdateParams: unknown[] | undefined;
let loadSnapshot: Uint8Array | null = null;
let loadObservacao: string | null = null;

vi.mock("../../lib/db", () => ({
  getRawSql: vi.fn(
    () =>
      async (text: string, params?: unknown[]) => {
        const sql = String(text);
        if (/SELECT org_id FROM sessions/i.test(sql)) {
          return { rows: [{ org_id: "persist-test-org" }], rowCount: 1 };
        }
        if (/SELECT observacao_ydoc(?:, observacao)? FROM sessions/i.test(sql)) {
          return {
            rows: [{ observacao_ydoc: loadSnapshot, observacao: loadObservacao }],
            rowCount: 1,
          };
        }
        if (/UPDATE sessions SET observacao_ydoc/i.test(sql)) {
          savedUpdateParams = params;
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected query in mock: ${sql}`);
      },
  ),
}));

const messageSync = 0;
const AUTH_TOKEN = "persist-test-token";

const schema = getSchema(evolutionEditorExtensions);

function buildSnapshot(text: string): Uint8Array {
  const doc = new Y.Doc();
  const pmDoc = PMNode.fromJSON(schema, {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
  prosemirrorToYXmlFragment(pmDoc, doc.getXmlFragment("default"));
  return Y.encodeStateAsUpdate(doc);
}

async function openClient(sessionId: string): Promise<CollabClient> {
  const res = await SELF.fetch(
    `https://collab.test/api/sessions/${sessionId}/collaboration?token=${AUTH_TOKEN}`,
    { headers: { Upgrade: "websocket" } },
  );
  expect(res.status).toBe(101);
  const ws = res.webSocket;
  if (!ws) throw new Error("no webSocket on 101 response");
  return new CollabClient(ws);
}

class CollabClient {
  readonly doc = new Y.Doc();
  private readonly ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.binaryType = "arraybuffer";
    ws.addEventListener("message", (event) => this.onMessage(event));
    ws.accept();
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      this.ws.send(encoding.toUint8Array(encoder));
    });

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  private onMessage(event: MessageEvent): void {
    const data = new Uint8Array(event.data as ArrayBuffer);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);
    if (messageType !== messageSync) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
    if (encoding.length(encoder) > 1) {
      this.ws.send(encoding.toUint8Array(encoder));
    }
  }

  edit(text: string): void {
    const pmDoc = PMNode.fromJSON(schema, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    });
    prosemirrorToYXmlFragment(pmDoc, this.doc.getXmlFragment("default"));
  }

  close(): void {
    this.ws.close();
  }
}

function settle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("EvolutionCollaboration — persistência onLoad/onSave", () => {
  it("onSave grava snapshot Yjs + HTML renderizado após edição (debounced)", async () => {
    savedUpdateParams = undefined;
    loadSnapshot = null;
    loadObservacao = null;
    const sessionId = "persist-save";
    const client = await openClient(sessionId);
    await settle(100);

    client.edit("Paciente evoluiu bem.");
    await settle(100);

    const started = Date.now();
    while (!savedUpdateParams && Date.now() - started < 4000) {
      await settle(100);
    }

    expect(savedUpdateParams).toBeDefined();
    const [ydoc, html, id] = savedUpdateParams as unknown as [Uint8Array, string, string];
    expect(ydoc).toBeInstanceOf(Uint8Array);
    expect(ydoc.byteLength).toBeGreaterThan(0);
    expect(html).toContain("Paciente evoluiu bem.");
    expect(id).toBe(sessionId);

    client.close();
  }, 10000);

  it("onLoad restaura o Y.Doc a partir do snapshot salvo", async () => {
    savedUpdateParams = undefined;
    loadSnapshot = buildSnapshot("Olá");
    loadObservacao = null;
    const sessionId = "persist-load";

    const client = await openClient(sessionId);
    await settle(300);

    const fragment = client.doc.getXmlFragment("default");
    expect(fragment.toString()).toContain("Olá");

    client.close();
  });

  it("onLoad semeia o Y.Doc a partir do observacao HTML quando não há snapshot (Gate 1)", async () => {
    savedUpdateParams = undefined;
    loadSnapshot = null;
    loadObservacao = "<p>Nota clínica <strong>existente</strong></p>";
    const sessionId = "persist-seed-html";

    const client = await openClient(sessionId);
    await settle(300);

    const fragment = client.doc.getXmlFragment("default");
    const rendered = fragment.toString();
    expect(rendered).toContain("Nota clínica");
    expect(rendered).toContain("existente");

    client.close();
  });

  it("onLoad com observacao contendo <table> não lança e inicia a colaboração normalmente (Gate 1 — seedYDocFromHtml à prova de crash)", async () => {
    savedUpdateParams = undefined;
    loadSnapshot = null;
    loadObservacao =
      "<table><tbody><tr><th>Data</th><th>Evolução</th></tr><tr><td>01/01</td><td>Melhora</td></tr></tbody></table>";
    const sessionId = "persist-seed-table";

    const client = await openClient(sessionId);
    await settle(300);

    // A colaboração deve iniciar (WebSocket 101 já validado em openClient) e o
    // cliente deve conseguir editar em seguida, provando que onLoad não
    // derrubou o Durable Object mesmo com o bug conhecido de
    // `element.closest is not a function` no zeed-dom.
    client.edit("Editando após tabela na semeadura.");
    await settle(100);

    client.close();
  });

  it("onLoad prioriza o snapshot Yjs sobre observacao HTML (sem duplicar)", async () => {
    savedUpdateParams = undefined;
    loadSnapshot = buildSnapshot("Snapshot vence");
    loadObservacao = "<p>HTML nao deve semear</p>";
    const sessionId = "persist-seed-priority";

    const client = await openClient(sessionId);
    await settle(300);

    const rendered = client.doc.getXmlFragment("default").toString();
    expect(rendered).toContain("Snapshot vence");
    expect(rendered).not.toContain("HTML nao deve semear");

    client.close();
  });
});
