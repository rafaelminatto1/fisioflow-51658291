import { describe, expect, it } from "vitest";
import { normalizeTemplate } from "../whatsapp-api";

describe("normalizeTemplate", () => {
	it("maps legacy stored WhatsApp templates to the UI shape", () => {
		const template = normalizeTemplate({
			id: "confirmacao_agendamento",
			name: "Confirmacao de agendamento",
			template_key: "confirmacao_agendamento",
			content: "Ola {{name}}, sua sessao sera as {{time}}.",
			category: "appointment",
			status: "ativo",
			created_at: "2026-04-12T10:00:00.000Z",
		});

		expect(template).toMatchObject({
			id: "confirmacao_agendamento",
			name: "Confirmacao de agendamento",
			category: "appointment",
			status: "ACTIVE",
			language: "pt_BR",
			body: "Ola {{name}}, sua sessao sera as {{time}}.",
			variables: ["name", "time"],
			isLocal: true,
			createdAt: "2026-04-12T10:00:00.000Z",
		});
	});

	it("preserves Meta template fields when they are already present", () => {
		const template = normalizeTemplate({
			id: "meta-template-id",
			name: "lembrete_consulta",
			category: "UTILITY",
			status: "APPROVED",
			language: "pt_BR",
			body: "Consulta confirmada.",
			isLocal: false,
			createdAt: "2026-04-12T10:00:00.000Z",
		});

		expect(template).toMatchObject({
			id: "meta-template-id",
			name: "lembrete_consulta",
			category: "UTILITY",
			status: "APPROVED",
			language: "pt_BR",
			body: "Consulta confirmada.",
			isLocal: false,
		});
	});
});
