import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockVerifyMetaSignature = vi.fn();
const mockIsDuplicate = vi.fn();
const mockMarkProcessed = vi.fn();
const mockResolveOrCreateContact = vi.fn();
const mockLinkContactToPatient = vi.fn();
const mockFindOrCreateConversation = vi.fn();
const mockAddMessage = vi.fn();
const mockBroadcastToOrg = vi.fn();
const mockWriteEvent = vi.fn();
const mockNotifyOrganization = vi.fn();
const mockNeedsHumanApproval = vi.fn();
const mockSendTextMessage = vi.fn();
const mockProcessMessage = vi.fn();
const mockQueueSendBatch = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../whatsapp", () => ({
  verifyMetaSignature: (...args: unknown[]) => mockVerifyMetaSignature(...args),
}));

vi.mock("../../lib/whatsapp-idempotency", () => ({
  isDuplicate: (...args: unknown[]) => mockIsDuplicate(...args),
  markProcessed: (...args: unknown[]) => mockMarkProcessed(...args),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
  resolveOrCreateContact: (...args: unknown[]) => mockResolveOrCreateContact(...args),
  linkContactToPatient: (...args: unknown[]) => mockLinkContactToPatient(...args),
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

vi.mock("../../services/ai-concierge", () => ({
  AIConciergeService: {
    processMessage: (...args: unknown[]) => mockProcessMessage(...args),
  },
}));

vi.mock("../../lib/push", () => ({
  notifyOrganization: (...args: unknown[]) => mockNotifyOrganization(...args),
}));

vi.mock("../../lib/whatsappApproval", () => ({
  needsHumanApproval: (...args: unknown[]) => mockNeedsHumanApproval(...args),
}));

vi.mock("../../lib/whatsapp", () => ({
  WhatsAppService: class {
    sendTextMessage(...args: unknown[]) {
      return mockSendTextMessage(...args);
    }
  },
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { whatsappWebhookRoutes } = await import("../whatsapp-webhook");
  const app = new Hono<any>();
  app.route("/api/whatsapp/webhook", whatsappWebhookRoutes);
  return app;
}

const ENV = {
  ENVIRONMENT: "development",
  ALLOWED_ORIGINS: "*",
  HYPERDRIVE: {},
  WHATSAPP_APP_SECRET: "secret",
  WHATSAPP_VERIFY_TOKEN: "verify-token",
  DB: {},
  WHATSAPP_QUEUE: {
    sendBatch: (...args: unknown[]) => mockQueueSendBatch(...args),
  },
} as any;

function makePayload() {
  return {
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            value: {
              metadata: { phone_number_id: "123456" },
              contacts: [{ wa_id: "5511999999999", profile: { name: "Maria" } }],
              messages: [
                {
                  id: "wamid.abc",
                  from: "5511999999999",
                  type: "text",
                  text: { body: "oi" },
                },
              ],
            },
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
    new Request("http://localhost/api/whatsapp/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": "ok",
      },
      body: JSON.stringify(body),
    }),
    ENV,
    executionCtx as any,
  );

  await Promise.all(waitUntilPromises);

  return res;
}

describe("POST /api/whatsapp/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyMetaSignature.mockResolvedValue(true);
    mockIsDuplicate.mockResolvedValue(false);
    mockMarkProcessed.mockResolvedValue(undefined);
    mockResolveOrCreateContact.mockResolvedValue({
      id: "contact-1",
      wa_id: "5511999999999",
      display_name: "Maria",
      patient_id: "patient-1",
      username: null,
    });
    mockFindOrCreateConversation.mockResolvedValue({ id: "conversation-1" });
    mockAddMessage.mockResolvedValue({ id: "message-1" });
    mockBroadcastToOrg.mockResolvedValue(undefined);
    mockWriteEvent.mockResolvedValue(undefined);
    mockNotifyOrganization.mockResolvedValue(undefined);
    mockNeedsHumanApproval.mockReturnValue(false);
    mockSendTextMessage.mockResolvedValue(undefined);
    mockProcessMessage.mockResolvedValue({
      answerable: true,
      reply: "ok",
      intent: "other",
      patientData: {},
    });
    mockQueueSendBatch.mockResolvedValue(undefined);
  });

  it("returns 401 for invalid signatures", async () => {
    mockVerifyMetaSignature.mockResolvedValue(false);
    mockQuery.mockResolvedValue({ rows: [{ id: "raw-audit-1" }] });

    const res = await postWebhook({ entry: [] });

    expect(res.status).toBe(401);
  });

  it("enqueues inbound messages to the Cloudflare queue", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: "raw-evt-1" }] });

    const res = await postWebhook(makePayload());

    expect(res.status).toBe(200);
    expect(mockQueueSendBatch).toHaveBeenCalledWith([
      {
        body: expect.objectContaining({
          type: "inbound_message",
          metaMessageId: "wamid.abc",
          phoneNumberId: "123456",
          waId: "5511999999999",
          from: "5511999999999",
          text: "oi",
          messageType: "text",
        }),
      },
    ]);
  });

  it("returns queue metadata in the webhook response", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await postWebhook(makePayload());
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload).toEqual({
      status: "ok",
      enqueued: 1,
      phoneNumberId: "123456",
    });
  });
});
