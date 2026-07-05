/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF } from "cloudflare:test";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { describe, expect, it } from "vitest";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

const messageSync = 0;

async function openClient(sessionId: string): Promise<CollabClient> {
  const res = await SELF.fetch(`https://collab.test/api/sessions/${sessionId}/collaboration`, {
    headers: { Upgrade: "websocket" },
  });
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

  text(): string {
    return this.doc.getText("content").toString();
  }

  edit(value: string): void {
    this.doc.getText("content").insert(0, value);
  }

  close(): void {
    this.ws.close();
  }
}

function settle(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForText(client: CollabClient, expected: string, timeout = 3000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (client.text() === expected) return;
    await settle(25);
  }
  throw new Error(`timeout waiting for "${expected}", got "${client.text()}"`);
}

describe("EvolutionCollaboration — sincronização Yjs autoritativa", () => {
  it("propaga edições entre dois clientes conectados ao mesmo sessionId", async () => {
    const sessionId = "sync-concurrent";
    const a = await openClient(sessionId);
    const b = await openClient(sessionId);
    await settle();

    a.edit("Paciente evoluiu bem.");

    await waitForText(b, "Paciente evoluiu bem.");
    expect(b.text()).toBe(a.text());
  });

  it("entrega o estado atual do servidor a um cliente que entra depois (autoridade do servidor)", async () => {
    const sessionId = "sync-late-joiner";
    const a = await openClient(sessionId);
    await settle();

    a.edit("Estado persistido no servidor.");
    await settle();
    a.close();
    await settle();

    const b = await openClient(sessionId);
    await waitForText(b, "Estado persistido no servidor.");
    expect(b.text()).toBe("Estado persistido no servidor.");
  });
});
