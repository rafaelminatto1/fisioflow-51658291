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

const ENV = {} as any;

function orgSettings(concierge: Record<string, unknown>) {
  mockQuery.mockImplementation(async (sql: string) => {
    if (sql.includes("FROM organizations")) return { rows: [{ concierge }] };
    return { rows: [] };
  });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockRunAi.mockReset().mockResolvedValue({
    text: JSON.stringify({ reply: "ok", intent: "information", answerable: true }),
  });
});

describe("conciergeIdentity", () => {
  it("padrão divulga IA (assistente virtual)", async () => {
    const { conciergeIdentity } = await import("../ai-concierge");
    const id = conciergeIdentity(null);
    expect(id.attendantName).toBe("Rafael");
    expect(id.clinicName).toBe("Activity Fisioterapia");
    expect(id.signature).toBe("Sou o assistente virtual da Activity Fisioterapia");
  });

  it("discloseAi=false mantém a persona humana (nomes customizados)", async () => {
    const { conciergeIdentity } = await import("../ai-concierge");
    const id = conciergeIdentity({
      attendantName: "Ana",
      clinicName: "Clínica Verde",
      discloseAi: false,
    });
    expect(id.signature).toBe("Sou Ana da Clínica Verde");
  });

  it("aceita raw como string JSON (jsonb)", async () => {
    const { conciergeIdentity } = await import("../ai-concierge");
    expect(conciergeIdentity('{"attendantName":"Ana"}').attendantName).toBe("Ana");
    expect(conciergeIdentity("not-json").attendantName).toBe("Rafael");
  });
});

describe("greeting helpers com assinatura custom", () => {
  it("stripGreetingIntro remove apresentação custom", async () => {
    const { stripGreetingIntro } = await import("../ai-concierge");
    const custom = "Sou Ana da Clínica Verde";
    const reply = `Boa tarde, tudo bem? ${custom}. Atendemos das 8h às 18h.`;
    const out = stripGreetingIntro(reply, custom);
    expect(out).not.toContain(custom);
    expect(out).toContain("8h às 18h");
  });
});

describe("processMessage rebaixa deflexões a unanswerable", () => {
	it('resposta "não temos informações..." vira answerable=false (handoff/humano)', async () => {
		orgSettings({});
		mockRunAi.mockResolvedValue({
			text: JSON.stringify({
				reply:
					"Não temos informações sobre o atendimento a crianças de 8 anos. Por favor, entre em contato conosco.",
				intent: "information",
				answerable: true,
			}),
		});
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(
			ENV,
			"org-x",
			"atendem crianças?",
			[],
		);
		expect(out.answerable).toBe(false);
		expect(out.reply).toBe("");
	});

	it("pergunta sobre público específico (crianças/gestantes/idade) nem chama o LLM", async () => {
		orgSettings({});
		const { AIConciergeService } = await import("../ai-concierge");
		for (const q of [
			"Voces atendem criancas de 8 anos?",
			"atendem gestantes?",
			"qual a idade mínima para atendimento?",
			"tratam bebê com torcicolo?",
		]) {
			const out = await AIConciergeService.processMessage(ENV, "org-x", q, []);
			expect(out.answerable, q).toBe(false);
		}
		expect(mockRunAi).not.toHaveBeenCalled();
	});

	it("resposta que NEGA atendimento inventado vira unanswerable", async () => {
		orgSettings({});
		mockRunAi.mockResolvedValue({
			text: JSON.stringify({
				reply: "Infelizmente, não atendemos pilates na clínica.",
				intent: "information",
				answerable: true,
			}),
		});
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(ENV, "org-x", "tem pilates?", []);
		expect(out.answerable).toBe(false);
	});

	it("negações COBERTAS pelo KB (domingo/convênio) continuam passando", async () => {
		orgSettings({});
		const { AIConciergeService } = await import("../ai-concierge");
		mockRunAi.mockResolvedValue({
			text: JSON.stringify({
				reply: "Não atendemos aos domingos. Nosso horário é de segunda a sexta das 07h às 21h.",
				intent: "information",
				answerable: true,
			}),
		});
		const dom = await AIConciergeService.processMessage(ENV, "org-x", "abrem domingo?", []);
		expect(dom.answerable).toBe(true);

		mockRunAi.mockResolvedValue({
			text: JSON.stringify({
				reply: "Não aceitamos convênios, mas fornecemos nota fiscal para reembolso.",
				intent: "information",
				answerable: true,
			}),
		});
		const conv = await AIConciergeService.processMessage(ENV, "org-x", "aceitam convênio?", []);
		expect(conv.answerable).toBe(true);
	});

	it("resposta real coberta pelo KB continua answerable=true", async () => {
		orgSettings({});
		mockRunAi.mockResolvedValue({
			text: JSON.stringify({
				reply: "A sessão avulsa custa R$ 180,00 e a avaliação R$ 180,00.",
				intent: "information",
				answerable: true,
			}),
		});
		const { AIConciergeService } = await import("../ai-concierge");
		const out = await AIConciergeService.processMessage(ENV, "org-x", "valores?", []);
		expect(out.answerable).toBe(true);
	});
});

describe("processMessage usa KB e identidade das settings da organização", () => {
  it("KB custom entra no system prompt no lugar do default", async () => {
    orgSettings({ knowledgeBase: "Clínica Verde — valores: sessão R$ 250,00." });
    const { AIConciergeService } = await import("../ai-concierge");
    await AIConciergeService.processMessage(ENV, "org-x", "quanto custa?", []);

    expect(mockRunAi).toHaveBeenCalledTimes(1);
    const messages = mockRunAi.mock.calls[0][2].messages;
    const system = messages.find((m: any) => m.role === "system")?.content ?? "";
    expect(system).toContain("sessão R$ 250,00");
    expect(system).not.toContain("Rua Manuel Vieira de Sousa");
  });

  it("sem KB custom, usa o default da Activity", async () => {
    orgSettings({});
    const { AIConciergeService } = await import("../ai-concierge");
    await AIConciergeService.processMessage(ENV, "org-x", "quanto custa?", []);
    const system = mockRunAi.mock.calls[0][2].messages[0].content;
    expect(system).toContain("Rua Manuel Vieira de Sousa");
  });

  it("identidade custom aparece na apresentação do prompt (persona humana, discloseAi=false)", async () => {
    orgSettings({ attendantName: "Ana", clinicName: "Clínica Verde", discloseAi: false });
    const { AIConciergeService } = await import("../ai-concierge");
    await AIConciergeService.processMessage(ENV, "org-x", "oi", []);
    const system = mockRunAi.mock.calls[0][2].messages[0].content;
    expect(system).toContain("Sou Ana da Clínica Verde");
    expect(system).toContain('assine como "Ana"');
  });

  it("por padrão (disclosure ON) a apresentação divulga o assistente virtual", async () => {
    orgSettings({ clinicName: "Clínica Verde" });
    const { AIConciergeService } = await import("../ai-concierge");
    await AIConciergeService.processMessage(ENV, "org-x", "oi", []);
    const system = mockRunAi.mock.calls[0][2].messages[0].content;
    expect(system).toContain("Sou o assistente virtual da Clínica Verde");
  });
});
