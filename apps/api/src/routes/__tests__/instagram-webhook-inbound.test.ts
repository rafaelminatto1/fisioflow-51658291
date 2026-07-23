import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockVerifyMetaSignature = vi.fn();
const mockResolveOrCreateContact = vi.fn();
const mockFindOrCreateConversation = vi.fn();
const mockAddMessage = vi.fn();
const mockBroadcastToOrg = vi.fn();
const mockWriteEvent = vi.fn();
const mockFetchInstagramProfile = vi.fn();
const mockQueueSendBatch = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../whatsapp", () => ({
  verifyMetaSignature: (...args: unknown[]) => mockVerifyMetaSignature(...args),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
  resolveOrCreateContact: (...args: unknown[]) => mockResolveOrCreateContact(...args),
}));

vi.mock("../../lib/whatsapp-conversations", () => ({
  findOrCreateConversation: (...args: unknown[]) => mockFindOrCreateConversation(...args),
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

vi.mock("../../lib/realtime", () => ({
  broadcastToOrg: (...args: unknown[]) => mockBroadcastToOrg(...args),
}));

vi.mock("../../lib/analytics", () => ({
  writeEvent: (...args: unknown[]) => mockWriteEvent(...args),
}));

vi.mock("../../lib/instagram-profile", () => ({
  fetchInstagramProfile: (...args: unknown[]) => mockFetchInstagramProfile(...args),
  formatInstagramDisplayName: ({ name, username }: { name: string | null; username: string | null }) =>
    name ?? username ?? "Instagram",
  IG_GRAPH: "https://graph.instagram.com/v25.0",
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { instagramWebhookRoutes } = await import("../instagram-webhook");
  const app = new Hono<any>();
  app.route("/api/instagram/webhook", instagramWebhookRoutes);
  return app;
}

const ENV = {
  ENVIRONMENT: "development",
  IG_APP_SECRET: "secret",
  IG_VERIFY_TOKEN: "verify-token",
  WHATSAPP_QUEUE: {
    sendBatch: (...args: unknown[]) => mockQueueSendBatch(...args),
  },
} as any;

// Instagram Direct delivers DMs in entry[].messaging[], NOT entry[].changes[].value.messages.
function makeInstagramDirectPayload() {
  return {
    object: "instagram",
    entry: [
      {
        id: "17841400000000000",
        messaging: [
          {
            sender: { id: "igsid_123" },
            recipient: { id: "17841400000000000" },
            message: { mid: "ig_mid_1", text: "Olá, quero agendar" },
          },
        ],
      },
    ],
  };
}

async function postWebhook(body: Record<string, unknown>) {
  const app = await buildApp();
  const waitUntilPromises: Promise<unknown>[] = [];
  const executionCtx = {
    waitUntil(promise: Promise<unknown>) {
      waitUntilPromises.push(promise);
    },
    passThroughOnException: vi.fn(),
  };

  const res = await app.fetch(
    new Request("http://localhost/api/instagram/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature-256": "ok" },
      body: JSON.stringify(body),
    }),
    ENV,
    executionCtx as any,
  );

  await Promise.all(waitUntilPromises);
  return res;
}

describe("POST /api/instagram/webhook (inbound DMs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyMetaSignature.mockResolvedValue(true);
    mockQuery.mockImplementation((sql: string) => {
      if (/instagram_business_account_id/.test(sql)) {
        return Promise.resolve({ rows: [{ id: "org-1" }] });
      }
      if (/instagram_access_token/.test(sql)) {
        return Promise.resolve({ rows: [{ t: "ig-token" }] });
      }
      return Promise.resolve({ rows: [] });
    });
    mockFetchInstagramProfile.mockResolvedValue({
      username: "rafael",
      name: "Rafael",
      profilePic: null,
    });
    mockResolveOrCreateContact.mockResolvedValue({ id: "contact-1", display_name: "Rafael" });
    mockFindOrCreateConversation.mockResolvedValue({ id: "conversation-1" });
    mockAddMessage.mockResolvedValue({ id: "message-1", created_at: "2026-06-29T00:00:00Z" });
  });

  it("persists Instagram Direct messages as an instagram conversation", async () => {
    const res = await postWebhook(makeInstagramDirectPayload());

    expect(res.status).toBe(200);
    expect(mockFindOrCreateConversation).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "contact-1",
      "instagram",
    );
    expect(mockAddMessage).toHaveBeenCalled();
    const addArgs = mockAddMessage.mock.calls[0];
    expect(addArgs).toContain("Olá, quero agendar");
  });

  it("does NOT enqueue Instagram DMs to the WhatsApp queue", async () => {
    await postWebhook(makeInstagramDirectPayload());
    expect(mockQueueSendBatch).not.toHaveBeenCalled();
  });

  function makeAttachmentPayload(type: string) {
    return {
      object: "instagram",
      entry: [
        {
          id: "17841400000000000",
          messaging: [
            {
              sender: { id: "igsid_123" },
              recipient: { id: "17841400000000000" },
              message: { mid: "ig_mid_att", attachments: [{ type, payload: {} }] },
            },
          ],
        },
      ],
    };
  }

  it("renders view-once (ephemeral) messages with a friendly PT-BR label and no mediaType", async () => {
    await postWebhook(makeAttachmentPayload("ephemeral"));
    const addArgs = mockAddMessage.mock.calls[0];
    expect(addArgs).toContain("ephemeral"); // messageType
    expect(addArgs.some((a: unknown) => typeof a === "string" && a.includes("visualização única"))).toBe(
      true,
    );
    expect(addArgs.every((a: unknown) => a !== "[ephemeral]")).toBe(true);
    // Mídia efêmera não vem com URL no webhook → sem mediaType.
    const opts = addArgs[addArgs.length - 1] as { mediaType?: string };
    expect(opts.mediaType).toBeUndefined();
  });

  it.each([
    ["video", "vídeo"],
    ["audio", "áudio"],
    ["file", "arquivo"],
  ])("renders %s attachments with a friendly PT-BR label and matching mediaType", async (type, needle) => {
    await postWebhook(makeAttachmentPayload(type));
    const addArgs = mockAddMessage.mock.calls[0];
    expect(addArgs.some((a: unknown) => typeof a === "string" && a.includes(needle))).toBe(true);
    expect(addArgs.every((a: unknown) => a !== `[${type}]`)).toBe(true);
    const opts = addArgs[addArgs.length - 1] as { mediaType?: string };
    expect(opts.mediaType).toBe(type);
  });

  // Echo = mensagem enviada pela conta (respondida pelo app nativo do Instagram
  // no celular). O contato é o DESTINATÁRIO (recipient), e a mensagem entra como
  // outbound para aparecer no CRM.
  function makeEchoPayload(mid = "ig_mid_echo") {
    return {
      object: "instagram",
      entry: [
        {
          id: "17841400000000000",
          messaging: [
            {
              sender: { id: "17841400000000000" }, // a conta
              recipient: { id: "igsid_123" }, // o contato
              message: { mid, text: "Oi, temos horário amanhã às 10h", is_echo: true },
            },
          ],
        },
      ],
    };
  }

  it("persists Instagram echoes (replies sent from the phone) as OUTBOUND messages", async () => {
    const res = await postWebhook(makeEchoPayload());

    expect(res.status).toBe(200);
    expect(mockFindOrCreateConversation).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "contact-1",
      "instagram",
    );
    expect(mockAddMessage).toHaveBeenCalled();
    const addArgs = mockAddMessage.mock.calls[0];
    // direction "outbound" e o texto do eco
    expect(addArgs).toContain("outbound");
    expect(addArgs).toContain("Oi, temos horário amanhã às 10h");
  });

  it("does NOT duplicate an echo of a message the CRM already sent (dedup by meta_message_id)", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (/instagram_business_account_id/.test(sql)) {
        return Promise.resolve({ rows: [{ id: "org-1" }] });
      }
      if (/instagram_access_token/.test(sql)) {
        return Promise.resolve({ rows: [{ t: "ig-token" }] });
      }
      if (/meta_message_id/.test(sql)) {
        return Promise.resolve({ rows: [{ "?column?": 1 }] }); // já existe
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await postWebhook(makeEchoPayload("ig_mid_already_saved"));

    expect(res.status).toBe(200);
    expect(mockAddMessage).not.toHaveBeenCalled();
  });
});
