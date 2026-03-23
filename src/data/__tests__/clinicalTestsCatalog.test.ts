import { describe, expect, it } from "vitest";

import {
	builtinClinicalTestsCatalog,
	mergeClinicalTestsCatalog,
	normalizeClinicalTestName,
} from "../clinicalTestsCatalog";

describe("clinicalTestsCatalog", () => {
	it("normaliza nome removendo acentos e caixa", () => {
		expect(normalizeClinicalTestName("  Pós-Operatório  ")).toBe(
			"pos-operatorio",
		);
	});

	it("mantém catálogo built-in quando não há testes remotos", () => {
		const merged = mergeClinicalTestsCatalog([]);

		expect(merged.length).toBe(builtinClinicalTestsCatalog.length);
		expect(merged.some((test) => test.is_builtin)).toBe(true);
	});

	it("mescla teste remoto com built-in preservando recursos de evidência", () => {
		const merged = mergeClinicalTestsCatalog([
			{
				id: "remote-lachman",
				organization_id: "org-1",
				name: "teste de lachman",
				name_en: null,
				category: "Ortopedia",
				target_joint: "Joelho",
				type: "special_test",
				purpose: "Versão customizada",
				instructions: "Instrução adaptada",
				positive_criteria: null,
				fields_definition: [],
				tags: ["acl"],
				image_url: null,
				media_urls: [],
				created_at: "2026-03-21T00:00:00.000Z",
				updated_at: "2026-03-21T00:00:00.000Z",
			},
		]);

		const lachman = merged.find((test) => test.id === "remote-lachman");

		expect(lachman).toBeDefined();
		expect(lachman?.is_builtin).toBe(false);
		expect(lachman?.purpose).toBe("Versão customizada");
		expect(lachman?.evidence_resources?.length).toBeGreaterThan(0);
		expect(lachman?.reference).toContain("Huang");
	});
});
