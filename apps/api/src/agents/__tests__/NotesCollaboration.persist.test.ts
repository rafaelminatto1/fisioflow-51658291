/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from "cloudflare:test";
import { getSchema } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it, vi } from "vitest";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";
import { evolutionEditorExtensions } from "@fisioflow/evolution-editor-schema";

const NOTE_ID = "00000000-0000-4000-8000-000000000002";
const TICKET = "persist-notes-ticket";
const messageSync = 0;
const schema = getSchema(evolutionEditorExtensions);

let savedParams: unknown[] | undefined;

vi.mock("../../lib/db", () => ({
  getRawSql: vi.fn(() => async (text: string, params?: unknown[]) => {
    if (text.includes("FROM notes n")) {
      return { rows: [{ organization_id: "org-1", owner_id: "owner-1", acl_version: 1, can_edit: true }] };
    }
    if (text.includes("SELECT yjs_state")) return { rows: [{ yjs_state: null, content_html: null, content_text: null }] };
    if (text.includes("UPDATE notes")) {
      savedParams = params;
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

class Client {
  readonly doc = new Y.Doc();

  constructor(private readonly ws: WebSocket) {
    ws.binaryType = "arraybuffer";
    ws.addEventListener("message", (event) => this.onMessage(event));
    ws.accept();
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      ws.send(encoding.toUint8Array(encoder));
    });
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  private onMessage(event: MessageEvent): void {
    const decoder = decoding.createDecoder(new Uint8Array(event.data as ArrayBuffer));
    if (decoding.readVarUint(decoder) !== messageSync) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
    if (encoding.length(encoder) > 1) this.ws.send(encoding.toUint8Array(encoder));
  }

  edit(text: string) {
    const pmDoc = PMNode.fromJSON(schema, { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
    prosemirrorToYXmlFragment(pmDoc, this.doc.getXmlFragment("default"));
  }

  close() { this.ws.close(); }
}

function settle(ms = 100) { return new Promise((resolve) => setTimeout(resolve, ms)); }

describe("NotesCollaboration — persistência Yjs", () => {
  it("persiste snapshot, HTML e texto após uma edição colaborativa", async () => {
    savedParams = undefined;
    await (env as unknown as { FISIOFLOW_CONFIG: KVNamespace }).FISIOFLOW_CONFIG.put(
      `notes:collaboration-ticket:${TICKET}`,
      JSON.stringify({ noteId: NOTE_ID, userId: "owner-1", organizationId: "org-1", roles: ["fisioterapeuta"] }),
    );
    const response = await SELF.fetch(`https://collab.test/api/notes/${NOTE_ID}/collaboration?ticket=${TICKET}`, { headers: { Upgrade: "websocket" } });
    expect(response.status).toBe(101);
    if (!response.webSocket) throw new Error("socket missing");
    const client = new Client(response.webSocket);
    await settle();
    client.edit("Discussão clínica não indexada.");

    const started = Date.now();
    while (!savedParams && Date.now() - started < 4000) await settle();
    expect(savedParams).toBeDefined();
    const [snapshot, html, text, id] = savedParams as unknown as [Uint8Array, string, string, string];
    expect(snapshot).toBeInstanceOf(Uint8Array);
    expect(snapshot.byteLength).toBeGreaterThan(0);
    expect(html).toContain("Discussão clínica não indexada.");
    expect(text).toContain("Discussão clínica não indexada.");
    expect(id).toBe(NOTE_ID);
    client.close();
  }, 10_000);
});
