import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockAddMessage = vi.fn();
const mockProcessMessage = vi.fn();

vi.mock("../../lib/db", () => ({
	createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/realtime", () => ({
	broadcastToOrg: vi.fn(),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
	resolveOrCreateContact: vi.fn(async () => ({
		id: "contact-1",
		display_name: "Rafael",
	})),
}));

vi.mock("../../lib/whatsapp-conversations", () => ({
	findOrCreateConversation: vi.fn(async () => ({ id: "conv-1" })),
	addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

vi.mock("../../lib/analytics", () => ({
	writeEvent: vi.fn(),
}));

vi.mock("../../services/ai-concierge", async (importOriginal) => {
	const original = await importOriginal<typeof import("../../services/ai-concierge")>();
	return {
		...original,
		AIConciergeService: {
			processMessage: (...args: unknown[]) => mockProcessMessage(...args),
		},
	};
});

async function buildApp() {
	const { Hono } = await import("hono");
	const { webchatRoutes } = await import("../webchat");
	const app = new Hono<any>();
	app.route("/api/webchat", webchatRoutes);
	return app;
}

const ENV = { ENVIRONMENT: "development" } as any;
const ORG = "00000000-0000-0000-0000-000000000001";

const GREETING =
	"Boa noite, tudo bem? Sou o Rafael da Activity Fisioterapia. Como posso ajudar?";

function post(app: any, body: Record<string, unknown>) {
	return app.request(
		"/api/webchat/message",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
		ENV,
	);
}

function autoReplies() {
	// addMessage é chamado tanto p/ inbound quanto p/ resposta do concierge;
	// a resposta automática tem direction 'outbound' (5º argumento).
	return mockAddMessage.mock.calls.filter((c) => c[4] === "outbound");
}

beforeEach(() => {
	mockQuery.mockReset();
	mockAddMessage.mockReset().mockResolvedValue({ id: "msg-1" });
	mockProcessMessage.mockReset().mockResolvedValue({
		answerable: true,
		reply: GREETING,
		intent: "greeting",
	});
	mockQuery.mockImplementation(async (sql: string) => {
		if (sql.includes("FROM organizations")) {
			if (sql.includes("concierge"))
				return {
					rows: [{ concierge: { webchatAutoReply: true, webchatReplyDelaySeconds: 0 } }],
				};
			return { rows: [{ "?column?": 1 }] };
		}
		return { rows: [] };
	});
});

describe("POST /api/webchat/message — saudação duplicada", () => {
	it("não aciona o concierge na mensagem de captura de nome (widget já cumprimenta localmente)", async () => {
		const app = await buildApp();
		const res = await post(app, {
			org: ORG,
			visitorId: "v1",
			text: "Rafael",
			name: "Rafael",
		});
		expect(res.status).toBe(200);
		await new Promise((r) => setTimeout(r, 50));
		expect(mockProcessMessage).not.toHaveBeenCalled();
		expect(autoReplies()).toHaveLength(0);
	});

	it("nunca se reapresenta no webchat — remove a apresentação da resposta", async () => {
		mockProcessMessage.mockResolvedValue({
			answerable: true,
			reply: `${GREETING}\nAtendemos na Mooca de segunda a sexta.`,
			intent: "info",
		});
		const app = await buildApp();
		const res = await post(app, {
			org: ORG,
			visitorId: "v1",
			text: "olá, onde vocês atendem?",
		});
		expect(res.status).toBe(200);
		await vi.waitFor(() => expect(autoReplies()).toHaveLength(1));
		const sent = String(autoReplies()[0][8]);
		expect(sent).not.toContain("Sou o Rafael da Activity Fisioterapia");
		expect(sent).toContain("Atendemos na Mooca");
	});

	it("responde normalmente a uma pergunta comum", async () => {
		mockProcessMessage.mockResolvedValue({
			answerable: true,
			reply: "Não, não aceitamos convênios, mas fornecemos nota fiscal.",
			intent: "info",
		});
		const app = await buildApp();
		await post(app, { org: ORG, visitorId: "v1", text: "Aceitam convênio?" });
		await vi.waitFor(() => expect(autoReplies()).toHaveLength(1));
		expect(String(autoReplies()[0][8])).toContain("nota fiscal");
	});
});
