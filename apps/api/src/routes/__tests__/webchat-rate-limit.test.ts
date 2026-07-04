import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
	createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/realtime", () => ({
	broadcastToOrg: vi.fn(),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
	resolveOrCreateContact: vi.fn(async () => ({ id: "c1", display_name: "X" })),
}));

vi.mock("../../lib/whatsapp-conversations", () => ({
	findOrCreateConversation: vi.fn(async () => ({ id: "conv-1" })),
	addMessage: vi.fn(async () => ({ id: "m1" })),
}));

vi.mock("../../lib/analytics", () => ({
	writeEvent: vi.fn(),
}));

async function buildApp() {
	const { Hono } = await import("hono");
	const { webchatRoutes } = await import("../webchat");
	const app = new Hono<any>();
	app.route("/api/webchat", webchatRoutes);
	return app;
}

/** EDGE_CACHE fake: contador em memória com a mesma semântica do middleware. */
function makeEdgeCache() {
	const counts = new Map<string, number>();
	return {
		prepare: (_sql: string) => ({
			bind: (key: string, _windowStart: number) => ({
				first: async () => {
					const next = (counts.get(key) ?? 0) + 1;
					counts.set(key, next);
					return { count: next };
				},
			}),
		}),
	};
}

const ORG = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
	mockQuery.mockReset().mockImplementation(async (sql: string) => {
		if (sql.includes("FROM organizations")) {
			if (sql.includes("concierge")) return { rows: [{ concierge: { webchatAutoReply: false } }] };
			return { rows: [{ "?column?": 1 }] };
		}
		return { rows: [] };
	});
});

describe("POST /api/webchat/message — rate limit", () => {
	it("bloqueia com 429 após exceder o limite por IP", async () => {
		const app = await buildApp();
		const env = { ENVIRONMENT: "development", EDGE_CACHE: makeEdgeCache() } as any;

		let lastStatus = 0;
		let got429 = false;
		for (let i = 0; i < 40; i++) {
			const res = await app.request(
				"/api/webchat/message",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"CF-Connecting-IP": "203.0.113.7",
					},
					body: JSON.stringify({ org: ORG, visitorId: "v1", text: `msg ${i}` }),
				},
				env,
			);
			lastStatus = res.status;
			if (res.status === 429) {
				got429 = true;
				break;
			}
		}
		expect(got429).toBe(true);
		expect(lastStatus).toBe(429);
	});

	it("segue funcionando sem EDGE_CACHE (dev local)", async () => {
		const app = await buildApp();
		const env = { ENVIRONMENT: "development" } as any;
		const res = await app.request(
			"/api/webchat/message",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ org: ORG, visitorId: "v1", text: "oi" }),
			},
			env,
		);
		expect(res.status).toBe(200);
	});
});
