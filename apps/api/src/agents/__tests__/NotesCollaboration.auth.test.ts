/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { SELF, env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

let canEdit = true;

vi.mock("../../lib/db", () => ({
  getRawSql: vi.fn(() => async (statement: string) => {
    if (statement.includes("FROM notes n")) {
      return { rows: [{ organization_id: "org-1", owner_id: "owner-1", acl_version: 3, can_edit: canEdit }] };
    }
    if (statement.includes("SELECT yjs_state")) return { rows: [{ yjs_state: null, content_html: null, content_text: null }] };
    return { rows: [] };
  }),
}));

async function open(ticket?: string): Promise<WebSocket> {
  const url = new URL("https://collab.test/api/notes/00000000-0000-4000-8000-000000000001/collaboration");
  if (ticket) url.searchParams.set("ticket", ticket);
  const response = await SELF.fetch(url.toString(), { headers: { Upgrade: "websocket" } });
  expect(response.status).toBe(101);
  if (!response.webSocket) throw new Error("socket missing");
  response.webSocket.accept();
  return response.webSocket;
}

async function issueTicket(ticket = "note-editor") {
  await (env as unknown as { FISIOFLOW_CONFIG: KVNamespace }).FISIOFLOW_CONFIG.put(
    `notes:collaboration-ticket:${ticket}`,
    JSON.stringify({ noteId: "00000000-0000-4000-8000-000000000001", userId: "editor-1", organizationId: "org-1", roles: ["fisioterapeuta"] }),
  );
  return ticket;
}

function nextClose(ws: WebSocket): Promise<number> {
  return new Promise((resolve) => ws.addEventListener("close", (event) => resolve((event as CloseEvent).code)));
}

describe("NotesCollaboration — ACL no WebSocket", () => {
  it("recusa token ausente ou inválido", async () => {
    const socket = await open();
    await expect(nextClose(socket)).resolves.toBe(4401);
  });

  it("fecha um socket que perde edit_content antes de aceitar novo update", async () => {
    canEdit = true;
    const socket = await open(await issueTicket());
    canEdit = false;
    const closed = nextClose(socket);
    socket.send(new Uint8Array([0]));
    await expect(closed).resolves.toBe(4403);
    canEdit = true;
  });

  it("consome o ticket na primeira conexão e bloqueia a reutilização", async () => {
    const ticket = await issueTicket("single-use-ticket");
    const firstSocket = await open(ticket);
    firstSocket.close();

    const reusedSocket = await open(ticket);
    await expect(nextClose(reusedSocket)).resolves.toBe(4401);
  });
});
