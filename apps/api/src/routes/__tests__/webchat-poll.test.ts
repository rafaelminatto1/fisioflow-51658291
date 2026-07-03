import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
	createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/realtime", () => ({
	broadcastToOrg: vi.fn(),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
	resolveOrCreateContact: vi.fn(),
}));

vi.mock("../../lib/whatsapp-conversations", () => ({
	findOrCreateConversation: vi.fn(),
	addMessage: vi.fn(),
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

const ENV = { ENVIRONMENT: "development" } as any;
const ORG = "00000000-0000-0000-0000-000000000001";
const CONV_ID = "d1324f23-abdf-4329-be64-555148335004";

// Simula o Postgres: created_at tem precisão de MICROSSEGUNDOS.
// O bug do loop: o /poll devolvia `at` truncado em milissegundos (JS Date);
// o widget mandava esse valor de volta como `after` e `.938289 > .938`
// era true — a mesma mensagem voltava em todo poll, para sempre.
const MSG = {
	id: "6d5841f8-78b6-4907-b1cd-9ab2ff008102",
	content: '"Não, a Activity Fisioterapia não aceita convênios."',
	createdAtMicros: Date.parse("2026-07-03T20:16:23.938Z") * 1000 + 289,
};

function afterToMicros(after: string): number {
	const m = after.match(/\.(\d+)Z$/);
	const base = Date.parse(after.replace(/\.\d+Z$/, ".000Z")) * 1000;
	if (!m) return base;
	const frac = m[1].padEnd(6, "0").slice(0, 6);
	return base + Number(frac);
}

beforeEach(() => {
	mockQuery.mockReset();
	mockQuery.mockImplementation(async (sql: string, params: unknown[]) => {
		if (sql.includes("FROM wa_conversations")) {
			return { rows: [{ id: CONV_ID }] };
		}
		if (sql.includes("FROM wa_messages")) {
			const after = String(params[1]);
			if (MSG.createdAtMicros > afterToMicros(after)) {
				const row: Record<string, unknown> = {
					id: MSG.id,
					content: MSG.content,
					// Como o driver pg: Date com precisão de milissegundos
					created_at: new Date(Math.floor(MSG.createdAtMicros / 1000)),
					// Como to_char(... .US): string com microssegundos
					at: "2026-07-03T20:16:23.938289Z",
				};
				return { rows: [row] };
			}
			return { rows: [] };
		}
		return { rows: [] };
	});
});

describe("GET /api/webchat/poll — round-trip do cursor `after`", () => {
	it("não devolve a mesma mensagem quando o cliente ecoa o `at` recebido", async () => {
		const app = await buildApp();

		const first = await app.request(
			`/api/webchat/poll?org=${ORG}&visitorId=v1&after=${encodeURIComponent("1970-01-01T00:00:00Z")}`,
			{},
			ENV,
		);
		const firstBody = (await first.json()) as any;
		expect(firstBody.messages).toHaveLength(1);

		const cursor = firstBody.messages[0].at as string;
		const second = await app.request(
			`/api/webchat/poll?org=${ORG}&visitorId=v1&after=${encodeURIComponent(cursor)}`,
			{},
			ENV,
		);
		const secondBody = (await second.json()) as any;
		expect(secondBody.messages).toHaveLength(0);
	});
});
