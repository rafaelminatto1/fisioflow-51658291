import type { ClinicalTestTemplateRecord } from "@/types/workers";

const CATALOG_TIMESTAMP = "2026-03-21T00:00:00.000Z";

export type ClinicalTestCatalogRecord = ClinicalTestTemplateRecord & {
	reference?: string | null;
	sensitivity_specificity?: string | null;
	positive_sign?: string | null;
	regularity_sessions?: number | null;
	layout_type?: string | null;
	is_custom?: boolean;
	is_builtin?: boolean;
	evidence_label?: string;
	evidence_summary?: string;
	source_label?: string;
	sort_order?: number;
	evidence_resources?: ClinicalEvidenceResource[];
};

export interface ClinicalEvidenceResource {
	title: string;
	url: string;
	kind: "pdf" | "link";
	description?: string;
}

type IllustrationPreset =
	| "knee-stability"
	| "shoulder-impingement"
	| "hip-rotation"
	| "cervical-radicular"
	| "balance-reach"
	| "hop-performance"
	| "sit-to-stand"
	| "gait-speed";

interface BaseCatalogInput {
	id: string;
	name: string;
	name_en?: string;
	category: "Ortopedia" | "Esportiva" | "Pós-Operatório";
	target_joint: string;
	type: "special_test" | "functional_test";
	purpose: string;
	execution: string;
	positive_sign?: string;
	reference: string;
	sensitivity_specificity?: string;
	tags: string[];
	evidence_label: string;
	evidence_summary: string;
	source_label: string;
	sort_order: number;
	illustration: IllustrationPreset;
	imageUrl?: string;
	initialPositionImageUrl?: string;
	finalPositionImageUrl?: string;
	evidence_resources?: ClinicalEvidenceResource[];
}

const localPdf = (filename: string) => `/clinical-tests/papers/${filename}`;

function createSvgDataUrl(svg: string) {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createClinicalIllustration(
	title: string,
	subtitle: string,
	preset: IllustrationPreset,
) {
	const artwork = getArtwork(preset);
	const svg = `
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" role="img" aria-label="${escapeXml(title)}">
		<defs>
			<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#f0fdfa" />
				<stop offset="55%" stop-color="#ecfeff" />
				<stop offset="100%" stop-color="#f8fafc" />
			</linearGradient>
			<linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#ffffff" stop-opacity="0.94" />
				<stop offset="100%" stop-color="#dff7f3" stop-opacity="0.84" />
			</linearGradient>
			<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0f766e" flood-opacity="0.10" />
			</filter>
		</defs>
		<rect width="480" height="320" rx="32" fill="url(#bg)" />
		<circle cx="88" cy="84" r="48" fill="#ccfbf1" />
		<circle cx="392" cy="64" r="34" fill="#dbeafe" />
		<circle cx="420" cy="248" r="44" fill="#dcfce7" />
		<rect x="32" y="32" width="416" height="256" rx="28" fill="url(#panel)" stroke="#cbd5e1" stroke-opacity="0.55" filter="url(#shadow)" />
		<g transform="translate(58 44)">
			<rect x="0" y="0" width="132" height="34" rx="17" fill="#ffffff" stroke="#99f6e4" />
			<text x="16" y="21" font-size="12" font-family="Arial, sans-serif" fill="#0f766e" font-weight="700" letter-spacing="0.08em">FISIOFLOW TESTES</text>
			<text x="0" y="74" font-size="28" font-family="Arial, sans-serif" fill="#0f172a" font-weight="700">${escapeXml(title)}</text>
			<text x="0" y="102" font-size="15" font-family="Arial, sans-serif" fill="#475569">${escapeXml(subtitle)}</text>
		</g>
		<g transform="translate(264 40)">
			${artwork}
		</g>
	</svg>
	`;

	return createSvgDataUrl(svg);
}

function getArtwork(preset: IllustrationPreset) {
	switch (preset) {
		case "knee-stability":
			return `
				<path d="M96 22c12 0 22 10 22 22 0 11-10 21-22 21s-22-10-22-21c0-12 10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M96 67v42l-28 34m28-34 32 34" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M76 145 60 208m52-63 22 63" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<circle cx="86" cy="146" r="13" fill="#ffffff" stroke="#14b8a6" stroke-width="5"/>
				<circle cx="86" cy="146" r="4" fill="#14b8a6"/>
				<path d="M42 150c20-26 42-35 62-35" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m94 104 10 11-15 3" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M120 184c18-3 31-10 42-22" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
				<path d="m155 157 7 14-15-2" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
			`;
		case "shoulder-impingement":
			return `
				<path d="M96 22c12 0 22 10 22 22 0 11-10 21-22 21s-22-10-22-21c0-12 10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M96 68v72m0 0-38 53m38-53 45 56" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M98 92 52 52" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<path d="M100 92h64" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<circle cx="154" cy="92" r="14" fill="#ffffff" stroke="#14b8a6" stroke-width="5"/>
				<path d="M156 56c16 10 26 26 30 46" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m188 95-3 15-12-10" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M151 92h44" fill="none" stroke="#f97316" stroke-width="4" stroke-dasharray="7 7" stroke-linecap="round"/>
			`;
		case "hip-rotation":
			return `
				<path d="M94 22c12 0 22 10 22 22 0 11-10 21-22 21s-22-10-22-21c0-12 10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M94 68v54l-34 30m34-30 36 26" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M60 154 48 212m70-48 26 48" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<circle cx="94" cy="122" r="14" fill="#ffffff" stroke="#14b8a6" stroke-width="5"/>
				<path d="M126 119c24 4 42 19 52 41" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m174 156 3 16-15-5" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M132 136c-3 16-12 31-28 42" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
			`;
		case "cervical-radicular":
			return `
				<path d="M104 24c13 0 23 10 23 22s-10 22-23 22c-12 0-22-10-22-22s10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M106 68v50m0 0-18 22m18-22 28 18m-28-18h48" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M154 118c16 5 29 15 38 29" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m185 142 5 14-15-3" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M84 78c-10 8-16 19-18 33" fill="none" stroke="#f97316" stroke-width="5" stroke-linecap="round"/>
				<path d="M104 80c-10 6-16 16-18 30" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 7"/>
				<path d="M124 82c-9 6-14 16-15 28" fill="none" stroke="#14b8a6" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 7"/>
			`;
		case "balance-reach":
			return `
				<path d="M98 24c13 0 23 10 23 22s-10 22-23 22c-12 0-22-10-22-22s10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M98 68v60m0 0-32 68m32-68 46 34" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M98 86 48 124m50-38h62" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<path d="M34 204h136" fill="none" stroke="#94a3b8" stroke-width="7" stroke-linecap="round"/>
				<path d="M164 82c23 9 36 27 40 54" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m202 130-2 16-13-8" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M40 136c8-24 25-38 49-46" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
				<path d="m84 94 2-16-14 6" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
			`;
		case "hop-performance":
			return `
				<path d="M96 22c12 0 22 10 22 22 0 11-10 21-22 21s-22-10-22-21c0-12 10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M96 68v40l-22 24m22-24 34 24" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M75 132 54 182m54-38 52 10" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M48 206h134" fill="none" stroke="#94a3b8" stroke-width="7" stroke-linecap="round"/>
				<path d="M154 74c19 12 32 32 34 58" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m188 126-2 16-14-8" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M124 164c15 5 31 5 46 0" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
			`;
		case "sit-to-stand":
			return `
				<rect x="136" y="132" width="38" height="16" rx="7" fill="#cbd5e1"/>
				<path d="M142 148v40m26-40v40m-40 0h54" fill="none" stroke="#94a3b8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M82 24c13 0 23 10 23 22S95 68 82 68c-12 0-22-10-22-22s10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M82 68v56l-14 16m14-16 38 18" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M70 142 58 190m50-42 18 42" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M118 76c22 12 37 31 42 55" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
				<path d="m156 126-2 16-14-8" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
			`;
		case "gait-speed":
			return `
				<path d="M96 22c12 0 22 10 22 22 0 11-10 21-22 21s-22-10-22-21c0-12 10-22 22-22Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M96 68v48l-24 32m24-32 38 18" fill="none" stroke="#0f172a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M74 149 58 212m60-46 30 46" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M38 208h144" fill="none" stroke="#94a3b8" stroke-width="7" stroke-linecap="round"/>
				<path d="M152 92h46" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 10"/>
				<path d="m190 85 13 7-13 7" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M122 66c16 7 28 19 37 36" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
			`;
	}
}

function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function createBuiltinTest(input: BaseCatalogInput): ClinicalTestCatalogRecord {
	return {
		id: input.id,
		organization_id: null,
		name: input.name,
		name_en: input.name_en ?? null,
		category: input.category,
		target_joint: input.target_joint,
		type: input.type,
		purpose: input.purpose,
		instructions: input.execution,
		execution: input.execution,
		positive_criteria: input.positive_sign ?? null,
		positive_sign: input.positive_sign ?? null,
		fields_definition: [],
		tags: input.tags,
		image_url:
			input.imageUrl ??
			createClinicalIllustration(
				input.name,
				input.target_joint,
				input.illustration,
			),
		initial_position_image_url: input.initialPositionImageUrl ?? null,
		final_position_image_url: input.finalPositionImageUrl ?? null,
		media_urls: [],
		created_at: CATALOG_TIMESTAMP,
		updated_at: CATALOG_TIMESTAMP,
		reference: input.reference,
		sensitivity_specificity: input.sensitivity_specificity ?? null,
		regularity_sessions:
			input.category === "Pós-Operatório"
				? 2
				: input.category === "Esportiva"
					? 4
					: null,
		layout_type: null,
		is_custom: false,
		is_builtin: true,
		evidence_label: input.evidence_label,
		evidence_summary: input.evidence_summary,
		source_label: input.source_label,
		sort_order: input.sort_order,
		evidence_resources: input.evidence_resources ?? [],
	};
}

export const builtinClinicalTestsCatalog: ClinicalTestCatalogRecord[] = [
	createBuiltinTest({
		id: "builtin-slump-test",
		name: "Slump Test",
		name_en: "Slump Test",
		category: "Ortopedia",
		target_joint: "Coluna",
		type: "special_test",
		purpose: "Avaliar a tensão neural e irritação dural, especialmente das raízes nervosas lombares e do nervo isquiático.",
		execution: "1. Paciente sentado à beira da mesa com mãos atrás das costas. 2. Slump (flexão torácica e lombar). 3. Flexão cervical (queixo ao peito). 4. Extensão ativa do joelho. 5. Dorsiflexão do tornozelo. 6. Alívio da flexão cervical para verificar mudança na dor.",
		positive_sign: "Reprodução da dor radicular do paciente que é aliviada pela extensão da coluna cervical.",
		reference: "Butler, D. S. (2000). The Sensitive Nervous System.",
		tags: ["coluna", "lombar", "radiculopatia", "tensão neural", "isquiático"],
		evidence_label: "Padrão-ouro clínico",
		evidence_summary: "Teste de alta sensibilidade para identificação de mecanossensibilidade neural no quadrante inferior.",
		source_label: "Curadoria FisioFlow",
		sort_order: 105,
		illustration: "cervical-radicular",
		initialPositionImageUrl: "/clinical-tests/illustrations/slump-test-initial.png",
		finalPositionImageUrl: "/clinical-tests/illustrations/slump-test-final.png"
	}),
	createBuiltinTest({
		id: "builtin-lachman-test",
		name: "Teste de Lachman",
		name_en: "Lachman Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose:
			"Rastrear instabilidade anterior do joelho em suspeita de lesão do LCA.",
		execution:
			"Paciente em decúbito dorsal com joelho entre 20 e 30 graus de flexão. Estabilize o fêmur distal com uma mão e tracione a tíbia proximal anteriormente com a outra, comparando end-feel e translação com o lado oposto.",
		positive_sign:
			"Translação anterior aumentada e/ou end-feel amolecido em relação ao lado contralateral.",
		reference:
			"Huang et al. Value of clinical tests in diagnosing anterior cruciate ligament injuries: systematic review and meta-analysis. Medicine. 2022. DOI: 10.1097/MD.0000000000029263.",
		sensitivity_specificity:
			"Sensibilidade 0,76; especificidade 0,89 na meta-analise de Huang et al. Em revisao bivariada, 0,81 e 0,85.",
		tags: ["lca", "joelho", "instabilidade", "ortopedia"],
		evidence_label: "Revisão sistemática",
		evidence_summary:
			"Melhor teste isolado para triagem clínica de LCA, mas deve ser interpretado com história e mecanismo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 10,
		illustration: "knee-stability",
		imageUrl: "https://media.moocafisio.com.br/illustrations/lachman_test.png",
		evidence_resources: [
			{
				title: "Meta-análise de testes para LCA",
				url: "https://journals.lww.com/md-journal/fulltext/2022/08050/value_of_clinical_tests_in_diagnosing_anterior.76.aspx",
				kind: "link",
				description:
					"Artigo aberto com valores combinados de Lachman, Pivot Shift e Lever Sign.",
			},
			{
				title: "Revisão bivariada do Lachman e Pivot Shift",
				url: "https://doi.org/10.1007/s00167-022-06898-4",
				kind: "link",
				description:
					"Atualiza a estimativa de sensibilidade e especificidade em LCA.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-pivot-shift-test",
		name: "Pivot Shift",
		name_en: "Pivot Shift Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose:
			"Confirmar instabilidade rotacional do joelho em suspeita de lesão do LCA.",
		execution:
			"Com o joelho em extensao, aplique valgo e rotacao interna da tibia enquanto leva o joelho para flexao progressiva. O teste exige relaxamento e costuma ser mais util em contexto especializado.",
		positive_sign:
			"Reducao subita da tibia lateral/proximal durante a flexao, indicando instabilidade rotacional anterolateral.",
		reference:
			"Huang et al. Medicine. 2022; Sokal et al. Knee Surgery Sports Traumatology Arthroscopy. 2022. DOI: 10.1007/s00167-022-06898-4.",
		sensitivity_specificity:
			"Sensibilidade 0,55-0,59; especificidade 0,94-0,97. Melhor para confirmar do que para rastrear.",
		tags: ["lca", "joelho", "pivot-shift", "instabilidade"],
		evidence_label: "Meta-análise",
		evidence_summary:
			"Alta especificidade para rule-in de lesao de LCA quando positivo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 20,
		illustration: "knee-stability",
		evidence_resources: [
			{
				title: "Meta-análise de testes para LCA",
				url: "https://journals.lww.com/md-journal/fulltext/2022/08050/value_of_clinical_tests_in_diagnosing_anterior.76.aspx",
				kind: "link",
				description:
					"Comparação entre Lachman, anterior drawer, pivot shift e lever sign.",
			},
			{
				title: "Revisão bivariada do Pivot Shift",
				url: "https://doi.org/10.1007/s00167-022-06898-4",
				kind: "link",
				description:
					"Mostra maior utilidade clínica do Pivot Shift para confirmação.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-thessaly-test",
		name: "Teste de Thessaly",
		name_en: "Thessaly Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose:
			"Provocar sintomas meniscais em carga e identificar necessidade de aprofundar a investigacao.",
		execution:
			"Paciente em apoio unipodal com joelho a aproximadamente 20 graus de flexao. O paciente roda tronco e joelho para ambos os lados de forma controlada, com apoio do examinador se necessario.",
		positive_sign:
			"Dor na linha articular, sensacao de bloqueio, falseio ou clique reprodutivel.",
		reference:
			"Blyth et al. Diagnostic accuracy of the Thessaly test for meniscal tears. Health Technology Assessment. 2015. DOI: 10.3310/hta19620.",
		sensitivity_specificity:
			"Em pratica clinica, sensibilidade 0,62-0,66 e especificidade 0,39-0,55. Acuracia insuficiente para substituir imagem.",
		tags: ["menisco", "joelho", "carga", "ortopedia"],
		evidence_label: "Estudo pragmático",
		evidence_summary:
			"Util para reproduzir sintomas, mas nao deve ser usado isoladamente como substituto de MRI/artroscopia.",
		source_label: "Curadoria FisioFlow",
		sort_order: 30,
		illustration: "knee-stability",
		evidence_resources: [
			{
				title: "HTA menisco e Thessaly",
				url: localPdf("thessaly-meniscal-hta-2015.pdf"),
				kind: "pdf",
				description:
					"PDF local com estudo pragmático sobre desempenho do Thessaly em contexto clínico real.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-neer-sign",
		name: "Sinal de Neer",
		name_en: "Neer Sign",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose:
			"Rastrear irritacao subacromial e contribuicao mecanica para dor na elevacao do ombro.",
		execution:
			"Estabilize a escapula e leve o ombro passivamente para elevacao em rotacao interna, observando dor reproduzida no arco terminal.",
		positive_sign:
			"Dor anterior ou anterolateral no ombro durante elevacao passiva terminal.",
		reference:
			"Alqunaee et al. Diagnostic accuracy of clinical tests for subacromial impingement syndrome: systematic review and meta-analysis. Arch Phys Med Rehabil. 2012. DOI: 10.1016/j.apmr.2011.08.035.",
		sensitivity_specificity:
			"Sensibilidade aproximada de 0,78; especificidade em torno de 0,58. Melhor para excluir do que confirmar isoladamente.",
		tags: ["ombro", "impacto", "subacromial", "manguito"],
		evidence_label: "Revisão sistemática",
		evidence_summary:
			"Sinal sensivel, mas com especificidade limitada. Combine com historia, arco doloroso e outros achados.",
		source_label: "Curadoria FisioFlow",
		sort_order: 40,
		illustration: "shoulder-impingement",
		imageUrl:
			"https://media.moocafisio.com.br/illustrations/neer_test_shoulder_illustration.png",
		evidence_resources: [
			{
				title: "Meta-análise de testes do ombro",
				url: "https://link.springer.com/article/10.1186/s12891-017-1400-0",
				kind: "link",
				description:
					"Revisão aberta sobre desempenho de testes provocativos do ombro.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-hawkins-kennedy",
		name: "Hawkins-Kennedy",
		name_en: "Hawkins-Kennedy Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose:
			"Provocar compressao subacromial em pacientes com suspeita de dor relacionada ao manguito rotador.",
		execution:
			"Com ombro e cotovelo a 90 graus, realize rotacao interna passiva do ombro mantendo o braco em posicao de flexao.",
		positive_sign:
			"Dor anterolateral do ombro durante a manobra, comparada ao lado oposto.",
		reference:
			"Alqunaee et al. 2012; Hegedus et al. Update of a systematic review with meta-analysis of shoulder tests. BJSM. 2013.",
		sensitivity_specificity:
			"Sensibilidade aproximada de 0,74; especificidade em torno de 0,57.",
		tags: ["ombro", "hawkins", "impacto", "manguito"],
		evidence_label: "Revisão sistemática",
		evidence_summary:
			"Bom teste provocativo para compor cluster clinico de impacto subacromial.",
		source_label: "Curadoria FisioFlow",
		sort_order: 50,
		illustration: "shoulder-impingement",
		evidence_resources: [
			{
				title: "Meta-análise de testes do ombro",
				url: "https://link.springer.com/article/10.1186/s12891-017-1400-0",
				kind: "link",
				description:
					"Síntese aberta que contextualiza Hawkins, Neer e outros testes do ombro.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-fadir-test",
		name: "FADIR",
		name_en: "Flexion Adduction Internal Rotation",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose:
			"Rastrear conflito femoroacetabular ou dor intra-articular do quadril em pacientes ativos.",
		execution:
			"Com o paciente em decubito dorsal, leve o quadril para flexao, aducao e rotacao interna ate reproduzir sintomas.",
		positive_sign:
			"Dor inguinal ou anterior do quadril reproduzida na manobra.",
		reference:
			"Reiman et al. Diagnostic accuracy of clinical tests for hip femoroacetabular impingement/labral tear: systematic review with meta-analysis. BJSM. 2015. DOI: 10.1136/bjsports-2014-094302.",
		sensitivity_specificity:
			"Alta sensibilidade (0,94-0,99 em meta-analise), com especificidade baixa a moderada. Serve melhor para rastreio.",
		tags: ["quadril", "fai", "labral", "inguinal"],
		evidence_label: "Meta-análise",
		evidence_summary:
			"Teste sensivel para triagem de patologia intra-articular, mas pouco especifico isoladamente.",
		source_label: "Curadoria FisioFlow",
		sort_order: 60,
		illustration: "hip-rotation",
		evidence_resources: [
			{
				title: "Revisão sistemática de testes do quadril",
				url: localPdf("hip-systematic-review-rahman-2013.pdf"),
				kind: "pdf",
				description:
					"PDF local com revisão diagnóstica ampla dos testes físicos do quadril.",
			},
			{
				title: "Meta-análise FAI/labral",
				url: "https://doi.org/10.1136/bjsports-2014-094302",
				kind: "link",
				description:
					"Referência específica usada para a interpretação clínica do FADIR.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-faber-test",
		name: "FABER",
		name_en: "Flexion Abduction External Rotation",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose:
			"Diferenciar contribuicoes do quadril, regiao sacroiliaca e capsula anterior em pacientes com dor no quadril.",
		execution:
			"Posicione o membro em flexao, abducao e rotacao externa, apoiando o tornozelo sobre o joelho oposto, e realize pressao controlada no joelho testado.",
		positive_sign:
			"Dor inguinal sugere componente intra-articular; dor posterior pode apontar envolvimento sacroiliaco.",
		reference:
			"Diamond et al. Sensitivity and Specificity for Physical Examination Tests in Diagnosing Prearthritic Intra-Articular Hip Pathology. Arthroscopy. 2025. PMID: 40692936.",
		sensitivity_specificity:
			"Acuracia variavel entre estudos; alguns cenarios mostram maior especificidade que o FADIR, mas com ampla heterogeneidade.",
		tags: ["quadril", "faber", "sacroiliaca", "labral"],
		evidence_label: "Revisão sistemática",
		evidence_summary:
			"Teste util para mapear local da dor e compor raciocinio clinico diferencial no quadril.",
		source_label: "Curadoria FisioFlow",
		sort_order: 70,
		illustration: "hip-rotation",
		evidence_resources: [
			{
				title: "Revisão sistemática de testes do quadril",
				url: localPdf("hip-systematic-review-rahman-2013.pdf"),
				kind: "pdf",
				description:
					"PDF local com panorama dos testes ortopédicos do quadril.",
			},
			{
				title: "Revisão recente de patologia intra-articular",
				url: "https://pubmed.ncbi.nlm.nih.gov/40692936/",
				kind: "link",
				description:
					"Atualização recente com dados de sensibilidade e especificidade para hip pathology.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-spurling-test",
		name: "Teste de Spurling",
		name_en: "Spurling Test",
		category: "Ortopedia",
		target_joint: "Cervical",
		type: "special_test",
		purpose:
			"Confirmar suspeita de radiculopatia cervical quando a historia sugere dor irradiada e parestesia.",
		execution:
			"Com o paciente sentado, posicione o pescoco em extensao, inclinacao lateral e leve compressao axial gradual do lado sintomatico.",
		positive_sign:
			"Reproducao da dor irradiada para o membro superior no territorio radicular habitual.",
		reference:
			"Lin et al. Diagnostic Performance of Spurling's Test for Cervical Radiculopathy: systematic review and meta-analysis. Am J Phys Med Rehabil. 2025. DOI: 10.1097/PHM.0000000000002707.",
		sensitivity_specificity:
			"Sensibilidade 0,53; especificidade 0,92. Mais forte para confirmar do que para rastrear.",
		tags: ["cervical", "radiculopatia", "spurling", "neuro"],
		evidence_label: "Meta-análise",
		evidence_summary:
			"Alta especificidade quando positivo. Use em conjunto com ULTT, distracao cervical e historia neurologica.",
		source_label: "Curadoria FisioFlow",
		sort_order: 80,
		illustration: "cervical-radicular",
		evidence_resources: [
			{
				title: "Meta-análise recente do Spurling",
				url: "https://pubmed.ncbi.nlm.nih.gov/39938056/",
				kind: "link",
				description:
					"Síntese mais recente com pooled sensitivity e specificity.",
			},
			{
				title: "Revisão clássica de testes provocativos cervicais",
				url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2200707/",
				kind: "link",
				description:
					"PMC aberto com discussão clínica de Spurling, distração e ULTT.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-y-balance-test",
		name: "Y-Balance Test",
		name_en: "Y-Balance Test Lower Quarter",
		category: "Esportiva",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose:
			"Monitorar controle neuromuscular, equilibrio dinamico e assimetrias em atletas e reabilitacao de membro inferior.",
		execution:
			"Paciente em apoio unipodal alcanca o maior deslocamento possivel nas direcoes anterior, posteromedial e posterolateral, mantendo o apoio da perna testada.",
		positive_sign:
			"Assimetria relevante entre lados, queda da qualidade do controle ou incapacidade de manter apoio estavel durante alcances.",
		reference:
			"Plisky et al. Systematic review and meta-analysis of the Y-Balance Test Lower Quarter. Int J Sports Phys Ther. DOI: 10.26603/001c.27634.",
		sensitivity_specificity:
			"Boa confiabilidade e validade moderada a alta; pontos de corte gerais para risco de lesao tem utilidade limitada fora de populacoes especificas.",
		tags: ["equilibrio", "controle-neuromuscular", "rts", "esportiva"],
		evidence_label: "Meta-análise",
		evidence_summary:
			"Excelente para follow-up e comparacao intraindividuo; menos robusto como preditor universal de lesao.",
		source_label: "Curadoria FisioFlow",
		sort_order: 110,
		illustration: "balance-reach",
		evidence_resources: [
			{
				title: "Y-Balance Test Lower Quarter",
				url: localPdf("y-balance-review-plisky-2021.pdf"),
				kind: "pdf",
				description:
					"PDF local da revisão sistemática com foco em confiabilidade e validade.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-single-hop-distance",
		name: "Single Hop for Distance",
		name_en: "Single Hop for Distance",
		category: "Esportiva",
		target_joint: "Joelho",
		type: "functional_test",
		purpose:
			"Quantificar potencia horizontal e simetria funcional em fases de retorno ao esporte, especialmente apos lesoes ligamentares.",
		execution:
			"Em apoio unipodal, o atleta salta a maior distancia possivel e estabiliza a aterrissagem por pelo menos 2 segundos sem tocar o outro pe.",
		positive_sign:
			"Diferenca importante entre membros, aterrissagem instavel ou incapacidade de desacelerar com alinhamento adequado.",
		reference:
			"Cooke et al. Lower extremity functional performance tests and their measurement properties in athletes: a systematic review. BMJ Open Sport Exerc Med. 2025. DOI: 10.1136/bmjsem-2024-002389.",
		sensitivity_specificity:
			"Confiabilidade e validade moderadas em atletas. Distancia isolada pode mascarar deficit biomecanico.",
		tags: ["acl", "hop-test", "rts", "esportiva"],
		evidence_label: "Revisão sistemática",
		evidence_summary:
			"Use com analise de aterrissagem, forca e prontidao psicologica; nao use distancia isolada como liberacao final.",
		source_label: "Curadoria FisioFlow",
		sort_order: 120,
		illustration: "hop-performance",
		evidence_resources: [
			{
				title: "Revisão crítica dos hop tests",
				url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7018781/",
				kind: "link",
				description:
					"Revisão aberta destacando limites dos hop tests como decisão isolada de RTS.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-triple-hop-distance",
		name: "Triple Hop for Distance",
		name_en: "Triple Hop for Distance",
		category: "Esportiva",
		target_joint: "Joelho",
		type: "functional_test",
		purpose:
			"Avaliar producao repetida de forca e controle em deslocamentos horizontais, util em retorno progressivo ao esporte.",
		execution:
			"O atleta realiza tres saltos consecutivos no mesmo membro inferior e estabiliza ao final, mensurando a distancia total.",
		positive_sign:
			"Assimetria, perda de controle no alinhamento de joelho/tronco ou incapacidade de estabilizar a recepcao final.",
		reference:
			"Davies et al. Critical review of hop tests after ACL reconstruction. Sports Medicine. 2020. DOI: 10.1007/s40279-019-01221-7.",
		sensitivity_specificity:
			"Boa reprodutibilidade para monitoramento; alto paralelismo com outros hop tests, exigindo leitura qualitativa para acrescentar valor clinico.",
		tags: ["acl", "triple-hop", "rts", "esportiva"],
		evidence_label: "Revisão crítica",
		evidence_summary:
			"Combina bem com single hop e side hop, mas nao substitui avaliacao de qualidade de movimento.",
		source_label: "Curadoria FisioFlow",
		sort_order: 130,
		illustration: "hop-performance",
		evidence_resources: [
			{
				title: "Revisão crítica dos hop tests",
				url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7018781/",
				kind: "link",
				description:
					"Revisão aberta sobre uso racional de hop tests na decisão de retorno ao esporte.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-side-hop-test",
		name: "Side Hop Test",
		name_en: "Side Hop Test",
		category: "Esportiva",
		target_joint: "Tornozelo",
		type: "functional_test",
		purpose:
			"Avaliar capacidade reativa e controle lateral para esportes com desaceleracao, cortes e mudancas de direcao.",
		execution:
			"O atleta salta lateralmente, ida e volta, sobre uma linha ou obstaculo baixo pelo numero de repeticoes ou tempo padronizado.",
		positive_sign:
			"Queda de performance, valgo dinamico, perda de ritmo ou dor na recepcao lateral.",
		reference:
			"Cooke et al. BMJ Open Sport Exerc Med. 2025; Culvenor et al. Hop to It! Sports Medicine. 2024.",
		sensitivity_specificity:
			"Evidencia moderada para measurement properties e boa sensibilidade para deficits em multiplanos, especialmente em RTS.",
		tags: ["tornozelo", "reactividade", "lateral", "esportiva"],
		evidence_label: "Síntese recente",
		evidence_summary:
			"Agrega informacao frontal/lateral que hop tests horizontais simples nao capturam.",
		source_label: "Curadoria FisioFlow",
		sort_order: 140,
		illustration: "hop-performance",
		evidence_resources: [
			{
				title: "Revisão crítica dos hop tests",
				url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7018781/",
				kind: "link",
				description:
					"Revisão aberta recomendando leitura qualitativa além do desempenho bruto.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-tug-test",
		name: "Timed Up and Go",
		name_en: "Timed Up and Go",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose:
			"Monitorar mobilidade funcional, transicao sentar-levantar e seguranca locomotora nas fases de reabilitacao pos-operatoria.",
		execution:
			"Cronometre o tempo para levantar de uma cadeira, caminhar 3 metros, virar, retornar e sentar novamente em ritmo seguro.",
		positive_sign:
			"Tempo elevado para o contexto clinico, hesitacao para virar, necessidade de apoio extra ou assimetria marcante nas transicoes.",
		reference:
			"Unver et al. TUG and 2MWT reliability in total knee arthroplasty. J Arthroplasty. 2017; Sarac et al. Knee Surg Relat Res. 2022. DOI: 10.1186/s43019-022-00136-4.",
		sensitivity_specificity:
			"Excelente confiabilidade apos TKA; mudancas acima de 2,27 s tendem a representar mudanca clinica real.",
		tags: ["pos-operatorio", "mobilidade", "tka", "tug"],
		evidence_label: "Validade e confiabilidade",
		evidence_summary:
			"Bom teste-sentinela para acompanhar progresso funcional precoce e medio prazo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 210,
		illustration: "gait-speed",
		evidence_resources: [
			{
				title: "Performance tests após TKA",
				url: localPdf("tka-balance-tests-sarac-2022.pdf"),
				kind: "pdf",
				description:
					"PDF local com validade e confiabilidade de TUG, SLS e 10MWT em artroplastia total de joelho.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-5xsts-test",
		name: "Five Times Sit-to-Stand",
		name_en: "5x Sit-to-Stand",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose:
			"Medir potencia funcional de membros inferiores e tolerancia a transicoes repetidas no pos-operatorio.",
		execution:
			"Paciente cruza os bracos no peito e realiza cinco repeticoes completas de sentar-levantar o mais rapido e seguro possivel.",
		positive_sign:
			"Tempo elevado, compensacoes importantes de tronco ou descarga assimetrica persistente.",
		reference:
			"Medina-Mirapeix et al. Five times sit-to-stand in total knee replacement. Gait & Posture. 2018. DOI: 10.1016/J.GAITPOST.2017.10.028.",
		sensitivity_specificity:
			"ICC interobservador 0,998 e teste-reteste 0,982 em TKR; boa correlacao com TUG e velocidade de marcha.",
		tags: ["5xsts", "forca-funcional", "tkp", "pos-operatorio"],
		evidence_label: "Estudo de confiabilidade",
		evidence_summary:
			"Excelente para follow-up seriado de potencia e independencia funcional.",
		source_label: "Curadoria FisioFlow",
		sort_order: 220,
		illustration: "sit-to-stand",
		evidence_resources: [
			{
				title: "Performance tests após TKA",
				url: localPdf("tka-balance-tests-sarac-2022.pdf"),
				kind: "pdf",
				description:
					"PDF local complementar para testes funcionais seriados no pós-operatório.",
			},
			{
				title: "Confiabilidade do 5xSTS em TKR",
				url: "https://doi.org/10.1016/J.GAITPOST.2017.10.028",
				kind: "link",
				description:
					"Estudo-base citado para confiabilidade do Five Times Sit-to-Stand.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-single-leg-stance",
		name: "Single Leg Stance Test",
		name_en: "Single Leg Stance Test",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose:
			"Acompanhar equilibrio estatico, confianca em carga unilateral e progresso do controle postural.",
		execution:
			"Paciente permanece em apoio unipodal pelo maior tempo seguro possivel, com protocolo padronizado de olhos abertos e superficie estavel.",
		positive_sign:
			"Tempo muito reduzido, oscilacao excessiva, necessidade de toques frequentes ou descarga incompleta no membro operado.",
		reference:
			"Sarac et al. Validity and reliability of performance tests as balance measures in patients with total knee arthroplasty. 2022. DOI: 10.1186/s43019-022-00136-4.",
		sensitivity_specificity:
			"Boa confiabilidade para avaliar equilibrio apos TKA, embora menor que TUG e 5xSTS.",
		tags: ["equilibrio", "apoio-unipodal", "carga", "pos-operatorio"],
		evidence_label: "Validade clínica",
		evidence_summary:
			"Complementa TUG e 5xSTS quando o foco e estabilidade e confianca em carga unilateral.",
		source_label: "Curadoria FisioFlow",
		sort_order: 230,
		illustration: "balance-reach",
		evidence_resources: [
			{
				title: "Performance tests após TKA",
				url: localPdf("tka-balance-tests-sarac-2022.pdf"),
				kind: "pdf",
				description:
					"PDF local com utilidade clínica do apoio unipodal após artroplastia total de joelho.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-10mwt-test",
		name: "10 Meter Walk Test",
		name_en: "10 Meter Walk Test",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose:
			"Mensurar velocidade funcional de marcha e tolerancia locomotora em fases de alta e progressao de carga.",
		execution:
			"Cronometre o trecho central de 10 metros em velocidade habitual ou rapida, com zona de aceleracao e desaceleracao padronizadas.",
		positive_sign:
			"Velocidade reduzida para a fase de reabilitacao, assimetria marcada ou medo evidente para acelerar.",
		reference:
			"Sarac et al. Knee Surg Relat Res. 2022. DOI: 10.1186/s43019-022-00136-4.",
		sensitivity_specificity:
			"Boa validade e excelente confiabilidade como medida funcional apos TKA.",
		tags: ["marcha", "velocidade", "alta", "pos-operatorio"],
		evidence_label: "Validade clínica",
		evidence_summary:
			"Simples, rapido e muito util para sequenciar alta, autonomia e progressao locomotora.",
		source_label: "Curadoria FisioFlow",
		sort_order: 240,
		illustration: "gait-speed",
		evidence_resources: [
			{
				title: "Performance tests após TKA",
				url: localPdf("tka-balance-tests-sarac-2022.pdf"),
				kind: "pdf",
				description:
					"PDF local com dados de validade para medidas de marcha e equilíbrio no pós-operatório.",
			},
		],
	}),
	createBuiltinTest({
		id: "builtin-anterior-drawer-knee",
		name: "Teste de Gaveta Anterior",
		name_en: "Anterior Drawer Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Avaliar a integridade do ligamento cruzado anterior (LCA).",
		execution:
			"Com o paciente em decúbito dorsal e o joelho fletido a 90 graus, o examinador senta-se sobre o pé do paciente para estabilizá-lo. As mãos são colocadas ao redor da tíbia proximal e uma força anterior é aplicada.",
		positive_sign:
			"Translação anterior excessiva da tíbia em relação ao fêmur.",
		reference: "Huang et al. 2022.",
		tags: ["joelho", "lca", "instabilidade"],
		evidence_label: "Revisão sistemática",
		evidence_summary: "Teste clássico para instabilidade anterior do joelho.",
		source_label: "Curadoria FisioFlow",
		sort_order: 25,
		illustration: "knee-stability",
		imageUrl:
			"https://media.moocafisio.com.br/illustrations/anterior_drawer_test_knee.png",
	}),
	createBuiltinTest({
		id: "builtin-phalen-test",
		name: "Teste de Phalen",
		name_en: "Phalen Test",
		category: "Ortopedia",
		target_joint: "Punho",
		type: "special_test",
		purpose: "Avaliar a compressão do nervo mediano no túnel do carpo.",
		execution:
			"O paciente é solicitado a manter os punhos em flexão máxima, encostando o dorso das mãos um no outro, por 60 segundos.",
		positive_sign: "Parestesia ou dormência no território do nervo mediano.",
		reference: "Curadoria FisioFlow 2026.",
		tags: ["punho", "tunel-do-carpo", "nervo-mediano"],
		evidence_label: "Prática clínica",
		evidence_summary:
			"Teste provocativo comum para síndrome do túnel do carpo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 90,
		illustration: "cervical-radicular",
		imageUrl:
			"https://media.moocafisio.com.br/illustrations/phalen_test_illustration.png",
	}),
	createBuiltinTest({
		id: "builtin-lasegue-test",
		name: "Teste de Lasègue",
		name_en: "Straight Leg Raise Test",
		category: "Ortopedia",
		target_joint: "Coluna",
		type: "special_test",
		purpose:
			"Avaliar tensão neural ou compressão de raiz nervosa lombar (L4-S1).",
		execution:
			"Com o paciente em decúbito dorsal, o membro inferior é elevado passivamente com o joelho em extensão até a reprodução da dor radicular.",
		positive_sign: "Dor radicular reproduzida entre 30 e 70 graus de elevação.",
		reference: "Curadoria FisioFlow 2026.",
		tags: ["coluna", "lombar", "radiculopatia", "nervo-isquiatico"],
		evidence_label: "Prática clínica",
		evidence_summary:
			"Teste de alta sensibilidade para compressão radicular lombar.",
		source_label: "Curadoria FisioFlow",
		sort_order: 100,
		illustration: "cervical-radicular",
		imageUrl:
			"https://media.moocafisio.com.br/illustrations/lasegue_test_spine_illustration.png",
	}),
	createBuiltinTest({
		id: "builtin-jobe-test",
		name: "Teste de Jobe",
		name_en: "Empty Can Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a integridade do tendão do músculo supraespinhal.",
		execution:
			"O braço é elevado a 90 graus no plano da escápula com rotação interna máxima (polegar para baixo). O examinador aplica uma força descendente enquanto o paciente resiste.",
		positive_sign: "Dor ou fraqueza durante a resistência.",
		reference: "Curadoria FisioFlow 2026.",
		tags: ["ombro", "supraespinhal", "manguito-rotador"],
		evidence_label: "Prática clínica",
		evidence_summary: "Teste específico para avaliação do supraespinhal.",
		source_label: "Curadoria FisioFlow",
		sort_order: 45,
		illustration: "shoulder-impingement",
		imageUrl:
			"https://media.moocafisio.com.br/illustrations/jobe_test_shoulder_illustration.png",
	}),
];

export const clinicalTestCategoryOptions = [
	"Todos",
	"Ortopedia",
	"Esportiva",
	"Pós-Operatório",
] as const;

export const clinicalTestJointOptions = [
	"Todos",
	"Joelho",
	"Ombro",
	"Quadril",
	"Tornozelo",
	"Cervical",
	"Membro Inferior",
] as const;

export function normalizeClinicalTestName(value: string | null | undefined) {
	return (value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

export function mergeClinicalTestsCatalog(
	remoteTests: ClinicalTestTemplateRecord[],
): ClinicalTestCatalogRecord[] {
	const merged = new Map<string, ClinicalTestCatalogRecord>();

	for (const builtin of builtinClinicalTestsCatalog) {
		merged.set(normalizeClinicalTestName(builtin.name), builtin);
	}

	for (const remoteTest of remoteTests) {
		const key = normalizeClinicalTestName(remoteTest.name);
		const builtin = merged.get(key);

		merged.set(key, {
			...builtin,
			...remoteTest,
			instructions: remoteTest.instructions ?? builtin?.instructions ?? null,
			execution:
				(remoteTest as ClinicalTestCatalogRecord).execution ??
				remoteTest.instructions ??
				builtin?.execution ??
				null,
			positive_sign:
				(remoteTest as ClinicalTestCatalogRecord).positive_sign ??
				builtin?.positive_sign ??
				null,
			positive_criteria:
				remoteTest.positive_criteria ?? builtin?.positive_criteria ?? null,
			reference:
				(remoteTest as ClinicalTestCatalogRecord).reference ??
				builtin?.reference ??
				null,
			sensitivity_specificity:
				(remoteTest as ClinicalTestCatalogRecord).sensitivity_specificity ??
				builtin?.sensitivity_specificity ??
				null,
			image_url: remoteTest.image_url ?? builtin?.image_url ?? null,
			initial_position_image_url:
				remoteTest.initial_position_image_url ??
				builtin?.initial_position_image_url ??
				null,
			final_position_image_url:
				remoteTest.final_position_image_url ??
				builtin?.final_position_image_url ??
				null,
			media_urls:
				remoteTest.media_urls && remoteTest.media_urls.length > 0
					? remoteTest.media_urls
					: (builtin?.media_urls ?? []),
			regularity_sessions:
				(remoteTest as ClinicalTestCatalogRecord).regularity_sessions ??
				builtin?.regularity_sessions ??
				null,
			layout_type:
				(remoteTest as ClinicalTestCatalogRecord).layout_type ??
				builtin?.layout_type ??
				null,
			is_custom: (remoteTest as ClinicalTestCatalogRecord).is_custom ?? true,
			is_builtin: false,
			evidence_label: builtin?.evidence_label ?? "Customizado",
			evidence_summary:
				builtin?.evidence_summary ?? "Teste criado ou adaptado pela equipe.",
			source_label: builtin?.source_label ?? "Biblioteca da clínica",
			sort_order: builtin?.sort_order ?? 900,
			evidence_resources: builtin?.evidence_resources ?? [],
		});
	}

	return Array.from(merged.values()).sort((left, right) => {
		const categoryOrder = {
			Ortopedia: 0,
			Esportiva: 1,
			"Pós-Operatório": 2,
		} as const;

		const leftCategory =
			categoryOrder[
				(left.category as keyof typeof categoryOrder) ?? "Ortopedia"
			] ?? 99;
		const rightCategory =
			categoryOrder[
				(right.category as keyof typeof categoryOrder) ?? "Ortopedia"
			] ?? 99;

		if (leftCategory !== rightCategory) return leftCategory - rightCategory;
		if ((left.sort_order ?? 999) !== (right.sort_order ?? 999)) {
			return (left.sort_order ?? 999) - (right.sort_order ?? 999);
		}
		return left.name.localeCompare(right.name, "pt-BR");
	});
}
