import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunAi = vi.fn();
const mockQuery = vi.fn();

vi.mock("../../lib/ai-native", () => ({
	runAi: (...args: unknown[]) => mockRunAi(...args),
	readAiText: (r: any) => r?.text ?? "",
}));

vi.mock("../../lib/db", () => ({
	createPool: vi.fn(() => ({ query: mockQuery })),
}));

/** D1 fake p/ feriados_nacionais. */
function makeD1(holidays: Record<string, string>) {
	return {
		prepare: (sql: string) => ({
			bind: (...dates: string[]) => ({
				all: async () => ({
					results: dates
						.filter((d) => holidays[d])
						.map((d) => ({ data: d, nome: holidays[d] })),
				}),
			}),
		}),
		_sqlSeen: [] as string[],
	};
}

function setupOrg(concierge: Record<string, unknown>) {
	mockQuery.mockImplementation(async (sql: string) => {
		if (sql.includes("FROM organizations")) return { rows: [{ concierge }] };
		if (sql.includes("FROM profiles")) return { rows: [{ id: "t1" }] };
		if (sql.includes("FROM appointments")) return { rows: [] };
		return { rows: [] };
	});
}

// Amanhã em BRT, formato ISO — usado p/ pergunta "amanhã".
function tomorrowIso(): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date(Date.now() + 86_400_000));
	const get = (t: string) => parts.find((p) => p.type === t)?.value;
	return `${get("year")}-${get("month")}-${get("day")}`;
}

beforeEach(() => {
	mockQuery.mockReset();
	mockRunAi.mockReset().mockResolvedValue({
		text: JSON.stringify({ reply: "ok", intent: "information", answerable: true }),
	});
});

describe("disponibilidade × feriados", () => {
	it("dia feriado não oferece horários e explica o motivo", async () => {
		setupOrg({ availabilityAutoReply: true });
		const env = { DB: makeD1({ [tomorrowIso()]: "Feriado de Teste" }) } as any;
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			env,
			"org-x",
			"tem horário amanhã?",
			[],
		);
		expect(out.answerable).toBe(true);
		expect(out.reply).toContain("feriado");
		expect(out.reply).toContain("Feriado de Teste");
		expect(out.reply).not.toMatch(/\d{2}:\d{2}/);
	});

	it("sem binding DB (dev local) segue oferecendo horários normalmente", async () => {
		setupOrg({ availabilityAutoReply: true });
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			{} as any,
			"org-x",
			"tem horário amanhã?",
			[],
		);
		expect(out.answerable).toBe(true);
	});
});

describe("condução do agendamento", () => {
	it("resposta de disponibilidade termina com CTA de reserva", async () => {
		setupOrg({ availabilityAutoReply: true });
		const env = { DB: makeD1({}) } as any;
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			env,
			"org-x",
			"tem horário amanhã?",
			[],
		);
		// amanhã pode ser domingo (sem slots) — só exige CTA quando ofereceu horários
		if (/\d{2}:\d{2}/.test(out.reply)) {
			expect(out.reply).toMatch(/reserva|garantir/i);
		}
	});

	it("confirmação de horário ('pode ser às 10h') vira bookingRequest sem chamar o LLM", async () => {
		setupOrg({ availabilityAutoReply: true });
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			{} as any,
			"org-x",
			"pode ser amanhã às 10h",
			[],
		);
		expect(out.answerable).toBe(true);
		expect(out.intent).toBe("scheduling");
		expect(out.bookingRequest?.slotLabel).toContain("10");
		expect(out.reply).toMatch(/equipe/i);
		expect(mockRunAi).not.toHaveBeenCalled();
	});

	it("sem availabilityAutoReply, confirmação de horário segue p/ o fluxo normal (LLM)", async () => {
		setupOrg({ availabilityAutoReply: false });
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			{} as any,
			"org-x",
			"pode ser amanhã às 10h",
			[],
		);
		expect(out.bookingRequest).toBeUndefined();
		expect(mockRunAi).toHaveBeenCalled();
	});

	it("mensagem sem horário concreto NÃO vira bookingRequest", async () => {
		setupOrg({ availabilityAutoReply: true });
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			{} as any,
			"org-x",
			"quero marcar uma avaliação",
			[],
		);
		expect(out.bookingRequest).toBeUndefined();
	});
});

describe("createConciergeBookingTask", () => {
	it("cria tarefa ALTA vinculada à conversa, com dedup de 1h", async () => {
		const { createConciergeBookingTask } = await import("../ai-concierge");
		const calls: Array<[string, unknown[]]> = [];
		const pool = {
			query: vi.fn(async (sql: string, params: unknown[] = []) => {
				calls.push([sql, params]);
				return { rows: [] as unknown[] };
			}),
		};
		await createConciergeBookingTask(
			pool,
			"org-x",
			"conv-1",
			"10h",
			"pode ser amanhã às 10h",
		);
		const insert = calls.find(([sql]) => sql.includes("INSERT INTO tarefas"));
		expect(insert).toBeTruthy();
		expect(String(insert?.[1]?.[1])).toMatch(/reserva/i);
		expect(String(insert?.[1]?.[2])).toContain("pode ser amanhã às 10h");

		// dedup: já existe tarefa recente → não insere de novo
		const pool2 = {
			query: vi.fn(async (sql: string) => {
				if (sql.includes("SELECT 1 FROM tarefas")) return { rows: [{ "?column?": 1 }] };
				return { rows: [] };
			}),
		};
		await createConciergeBookingTask(pool2, "org-x", "conv-1", "10h", "de novo");
		expect(
			pool2.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO tarefas")),
		).toBe(false);
	});
});
