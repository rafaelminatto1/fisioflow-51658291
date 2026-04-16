import type { ClinicalTestTemplateRecord } from "@/types/workers";

const CATALOG_TIMESTAMP = "2026-04-01T00:00:00.000Z";

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
	lr_positive?: number | null;
	lr_negative?: number | null;
	cluster_id?: string | null;
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
	| "gait-speed"
	| "wrist-test"
	| "elbow-test"
	| "nerve-compression"
	| "thoracic-outlet"
	| "foot-test"
	| "postural-test";

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
	fieldsDefinition?: any[];
	lr_positive?: number;
	lr_negative?: number;
	cluster_id?: string;
}

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
				<path d="M75 132 54 182m54-38 52 10" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
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
		case "wrist-flexion":
			return `
				<path d="M60 180c0-40 20-100 80-100s80 60 80 100" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<path d="M140 80c20-20 40-20 40 0s-20 40-40 40-40-20-40-40Z" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M140 80L100 140" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" stroke-dasharray="5 5"/>
			`;
		case "ankle-stability":
			return `
				<path d="M80 60v100h60" fill="none" stroke="#0f172a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M140 160l40 20" fill="none" stroke="#0f172a" stroke-width="12" stroke-linecap="round"/>
				<path d="M150 120l30 30" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
				<path d="M150 120l30-30" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
			`;
		case "nerve-tension":
			return `
				<path d="M60 180l60-120 60 120" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M120 60v120" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round" stroke-dasharray="4 4"/>
				<circle cx="120" cy="40" r="15" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
			`;
		case "elbow-test":
			return `
				<path d="M60 160h120l40 40H20" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<circle cx="120" cy="160" r="12" fill="#ffffff" stroke="#14b8a6" stroke-width="5"/>
				<path d="M120 160l-40-40" fill="none" stroke="#0ea5e9" stroke-width="8" stroke-linecap="round"/>
				<path d="M80 120c10-20 30-20 40 0" fill="none" stroke="#f97316" stroke-width="4" stroke-dasharray="4 4"/>
			`;
		case "wrist-test":
			return `
				<path d="M100 200V100l60 60" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<circle cx="100" cy="100" r="15" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M100 100l40 0" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
			`;
		case "nerve-compression":
			return `
				<path d="M40 160h200" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<path d="M140 160c0-30-20-50-50-50s-50 20-50 50" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
				<circle cx="140" cy="160" r="8" fill="#ef4444"/>
			`;
		case "thoracic-outlet":
			return `
				<path d="M140 60c0 20-10 40-30 40s-30-20-30-40" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<path d="M80 100l-40 60m140-60l40 60" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round"/>
				<path d="M110 100v80" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="5 5"/>
			`;
		case "foot-test":
			return `
				<path d="M80 200l20-120 100 120" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M100 120c30 0 50 20 50 50" fill="none" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
			`;
		case "postural-test":
			return `
				<path d="M120 60v160m-40 0h80" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round"/>
				<circle cx="120" cy="40" r="15" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="4"/>
				<path d="M120 80l-30 40m30-40l30 40" fill="none" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/>
			`;
	}
}

function escapeXml(value: string) {
	if (!value) return "";
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
		fields_definition: input.fieldsDefinition ?? [],
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
		sensitivity_specificity: "Sensibilidade: 0.83, Especificidade: 0.55.",
		tags: ["coluna", "lombar", "radiculopatia", "tensão neural", "isquiático"],
		evidence_label: "Padrão-ouro neurodinâmico",
		evidence_summary: "Teste fundamental para avaliação de mecanossensibilidade neural.",
		source_label: "Curadoria FisioFlow",
		sort_order: 5,
		illustration: "nerve-tension",
		imageUrl: "/clinical-tests/illustrations/slump-test.png",
		initialPositionImageUrl: "/clinical-tests/illustrations/slump-test-initial.avif",
		finalPositionImageUrl: "/clinical-tests/illustrations/slump-test-final.avif",
		fieldsDefinition: [
			{ id: 'pain_nprs', label: 'Intensidade da Dor (0-10)', type: 'nprs' },
			{ id: 'angle_relief', label: 'Ângulo de alívio cervical (°)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-lachman-test",
		name: "Teste de Lachman",
		name_en: "Lachman Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Rastrear instabilidade anterior do joelho em suspeita de lesão do LCA.",
		execution: "Paciente em decúbito dorsal with joelho entre 20 e 30 graus de flexão. Estabilize o fêmur distal com uma mão e tracione a tíbia proximal anteriormente com a outra.",
		positive_sign: "Translação anterior aumentada e/ou end-feel amolecido.",
		reference: "Huang et al. 2022. Medicine.",
		sensitivity_specificity: "Sensibilidade 0,81; especificidade 0,85.",
		tags: ["lca", "joelho", "instabilidade", "ortopedia"],
		evidence_label: "Revisão sistemática",
		evidence_summary: "Melhor teste isolado para triagem clínica de LCA.",
		source_label: "Curadoria FisioFlow",
		sort_order: 10,
		imageUrl: "/clinical-tests/illustrations/lachman-test.png",
		evidence_resources: [
			{ title: "Validity of the Lachman Test", url: "https://pubmed.ncbi.nlm.nih.gov/3451234/" }
		],
		fieldsDefinition: [
			{ id: 'laxity_grade', label: 'Grau de Laxidez', type: 'select', options: ['Grau I (1-5mm)', 'Grau II (6-10mm)', 'Grau III (>10mm)'] },
			{ id: 'end_feel', label: 'End-feel', type: 'select', options: ['Firme', 'Bando/Ausente'] }
		],
		lr_positive: 42.0,
		lr_negative: 0.1,
		cluster_id: "cluster-acl-instability"
	}),
	createBuiltinTest({
		id: "builtin-pivot-shift-test",
		name: "Pivot Shift Test",
		name_en: "Pivot Shift Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Avaliar a instabilidade rotatória anterolateral por lesão do LCA.",
		execution: "1. Paciente em decúbito dorsal. 2. Examinador realiza rotação interna da tíbia e aplica estresse em valgo enquanto flete o joelho.",
		positive_sign: "Subluxação ou redução brusca do planalto tibial lateral.",
		reference: "Galway, H. R. (1980). Pivot shift sign.",
		sensitivity_specificity: "Sensibilidade: 0.24, Especificidade: 0.98.",
		tags: ["joelho", "lca", "instabilidade", "pivot"],
		evidence_label: "Evidência Específica",
		evidence_summary: "Altamente específico para ruptura total do LCA.",
		source_label: "Curadoria FisioFlow",
		sort_order: 12,
		imageUrl: "/clinical-tests/illustrations/pivot-shift-knee.png",
		illustration: "knee-stability",
		fieldsDefinition: [
			{ id: 'grade', label: 'Grau', type: 'select', options: ['Grau 0 (Normal)', 'Grau 1 (Glide)', 'Grau 2 (Clunk)', 'Grau 3 (Gross)'] }
		],
		lr_positive: 28.0,
		lr_negative: 0.8,
		cluster_id: "cluster-acl-instability"
	}),
	createBuiltinTest({
		id: "builtin-thessaly-test",
		name: "Teste de Thessaly",
		name_en: "Thessaly Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Provocar sintomas meniscais em carga.",
		execution: "Paciente em apoio unipodal com joelho a 20° de flexão. O paciente roda tronco e joelho para ambos os lados.",
		positive_sign: "Dor na linha articular, sensacao de bloqueio ou clique.",
		reference: "Blyth et al. 2015.",
		tags: ["menisco", "joelho", "carga"],
		evidence_label: "Estudo pragmático",
		evidence_summary: "Provocação de sintomas meniscais em carga e rotação.",
		source_label: "Curadoria FisioFlow",
		sort_order: 30,
		imageUrl: "/clinical-tests/illustrations/thessaly-test.png",
		illustration: "knee-stability",
		fieldsDefinition: [
			{ id: 'pain_nprs', label: 'Dor na Rotação (0-10)', type: 'nprs' },
			{ id: 'clicking', label: 'Presença de Estalido', type: 'boolean' }
		],
		lr_positive: 3.0,
		lr_negative: 0.5,
		cluster_id: "cluster-meniscal-tear"
	}),
	createBuiltinTest({
		id: "builtin-neer-sign",
		name: "Sinal de Neer",
		name_en: "Neer Sign",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Rastrear irritacao subacromial.",
		execution: "Estabilize a escapula e leve o ombro passivamente para elevacao em rotacao interna.",
		positive_sign: "Dor anterior ou anterolateral no ombro.",
		reference: "Alqunaee et al. 2012.",
		tags: ["ombro", "impacto", "subacromial"],
		evidence_label: "Revisão sistemática",
		evidence_summary: "Teste de provocação subacromial com alta sensibilidade.",
		source_label: "Curadoria FisioFlow",
		sort_order: 40,
		illustration: "shoulder-impingement",
		imageUrl: "/clinical-tests/illustrations/neer-sign.avif",
		fieldsDefinition: [
			{ id: 'pain_nprs', label: 'Dor no Arco (0-10)', type: 'nprs' }
		],
		lr_positive: 1.7,
		lr_negative: 0.3,
		cluster_id: "cluster-subacromial-impingement"
	}),
	createBuiltinTest({
		id: "builtin-hawkins-kennedy",
		name: "Hawkins-Kennedy",
		name_en: "Hawkins-Kennedy Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar o impacto subacromial.",
		execution: "1. Paciente sentado ou em pé. 2. O examinador flete o ombro e o cotovelo a 90°. 3. Realiza rotação interna passiva forçada do úmero.",
		positive_sign: "Reprodução da dor no aspecto anterior ou lateral do ombro.",
		reference: "Hawkins, R. J., & Kennedy, J. C. (1980). Impingement syndrome in the athlete.",
		sensitivity_specificity: "Sensibilidade: 0.79, Especificidade: 0.59.",
		tags: ["ombro", "impacto", "manguito", "subacromial"],
		evidence_label: "Evidência de Alta Sensibilidade",
		evidence_summary: "Frequentemente positivo em síndromes de impacto, mas pouco específico.",
		source_label: "Curadoria FisioFlow",
		sort_order: 102,
		illustration: "shoulder-impingement",
		imageUrl: "/clinical-tests/illustrations/hawkins-kennedy.avif",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' }
		],
		lr_positive: 1.9,
		lr_negative: 0.3,
		cluster_id: "cluster-subacromial-impingement"
	}),
	createBuiltinTest({
		id: "builtin-painful-arc-test",
		name: "Arco Doloroso",
		name_en: "Painful Arc Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar o impacto subacromial durante a abdução ativa.",
		execution: "Solicitar ao paciente que realize abdução ativa total do braço no plano escapular.",
		positive_sign: "Dor sentida entre 60° e 120° de abdução.",
		reference: "Kessel, L., & Watson, M. (1977).",
		sensitivity_specificity: "Sensibilidade: 0.53, Especificidade: 0.76.",
		tags: ["ombro", "impacto", "manguito"],
		evidence_label: "Forte Indicador",
		evidence_summary: "Componente mais específico do cluster de Park et al. para impacto.",
		source_label: "Curadoria FisioFlow",
		sort_order: 105,
		illustration: "shoulder-impingement",
		lr_positive: 3.7,
		lr_negative: 0.5,
		cluster_id: "cluster-subacromial-impingement"
	}),
	createBuiltinTest({
		id: "builtin-apprehension-test-shoulder",
		name: "Teste de Apreensão (Ombro)",
		name_en: "Shoulder Apprehension Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a instabilidade anterior do ombro.",
		execution: "1. Paciente em decúbito dorsal. 2. Ombro em 90° de abdução e 90° de rotação externa. 3. Examinador aplica pressão anterior suave na cabeça do úmero.",
		positive_sign: "O paciente demonstra apreensão ou resistência muscular por medo de luxação.",
		reference: "Rowe, C. R. (1981). The apprehension test for anterior instability of the shoulder.",
		tags: ["ombro", "instabilidade", "luxação", "apreensão"],
		evidence_label: "Teste Clínico Específico",
		evidence_summary: "Altamente clínico para detectar instabilidade anterior crônica.",
		source_label: "Curadoria FisioFlow",
		sort_order: 103,
		imageUrl: "/clinical-tests/illustrations/shoulder-apprehension.png",
		illustration: "shoulder-rotation",
		fieldsDefinition: [
			{ id: 'positive_apprehension', label: 'Presença de Apreensão', type: 'boolean' },
			{ id: 'guarding_reflex', label: 'Reflexo de Defesa Muscular', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-fadir-test",
		name: "FADIR",
		name_en: "Flexion Adduction Internal Rotation",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose: "Rastrear conflito femoroacetabular.",
		execution: "Leve o quadril para flexao, aducao e rotacao interna.",
		positive_sign: "Dor inguinal ou anterior do quadril.",
		reference: "Reiman et al. 2015.",
		tags: ["quadril", "fai", "labral"],
		evidence_label: "Meta-análise",
		evidence_summary: "Altamente sensível para impacto femoroacetabular anterior.",
		source_label: "Curadoria FisioFlow",
		sort_order: 60,
		illustration: "hip-rotation",
		imageUrl: "/clinical-tests/illustrations/fadir-test.avif",
		fieldsDefinition: [
			{ id: 'pain_nprs', label: 'Dor Inguinal (0-10)', type: 'nprs' },
			{ id: 'restricted_ir', label: 'RI Limitada', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-faber-test",
		name: "Teste de Patrick (FABER)",
		name_en: "FABER Test",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose: "Detectar patologias da articulação sacroilíaca ou coxofemoral.",
		execution: "1. Paciente em decúbito dorsal. 2. Flexão, Abdução e Rotação Externa (FABER) da perna, colocando o maléolo lateral sobre o joelho oposto. 3. Pressionar o joelho testado em direção à maca.",
		positive_sign: "Dor na região inguinal (frequentemente quadril) ou na região glútea posterior (sacroilíaca).",
		reference: "Patrick, H. T. (1917). Diagnosis of some common diskette conditions.",
		tags: ["quadril", "sacroiliaca", "dor", "patrick"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Útil para diferenciar dor lombar de dor sacroilíaca.",
		source_label: "Curadoria FisioFlow",
		sort_order: 55,
		illustration: "hip-rotation",
		imageUrl: "/clinical-tests/illustrations/faber-test.avif",
		fieldsDefinition: [
			{ id: 'pain_location', label: 'Local da Dor', type: 'select', options: ['Inguinal', 'Glútea/SI', 'Lateral', 'Ausente'] },
			{ id: 'distance_cm', label: 'Distância Joelho-Maca (cm)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-spurling-test",
		name: "Teste de Spurling",
		name_en: "Spurling Test",
		category: "Ortopedia",
		target_joint: "Cervical",
		type: "special_test",
		purpose: "Confirmar radiculopatia cervical.",
		execution: "Pescoco em extensao e inclinacao lateral com compressao axial.",
		positive_sign: "Reproducao da dor irradiada para o membro superior.",
		reference: "Lin et al. 2025.",
		tags: ["cervical", "radiculopatia", "spurling"],
		evidence_label: "Meta-análise",
		evidence_summary: "Alta especificidade para diagnóstico de radiculopatia cervical.",
		source_label: "Curadoria FisioFlow",
		sort_order: 80,
		illustration: "cervical-radicular",
		imageUrl: "/clinical-tests/illustrations/spurling-test.avif",
		fieldsDefinition: [
			{ id: 'dermatome', label: 'Território da Dor', type: 'select', options: ['C5', 'C6', 'C7', 'C8', 'T1'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-y-balance-test",
		name: "Y-Balance Test",
		name_en: "Y-Balance Test",
		category: "Esportiva",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose: "Monitorar controle neuromuscular.",
		execution: "Paciente em apoio unipodal alcanca o maior deslocamento em 3 direções.",
		positive_sign: "Assimetria relevante (LSI < 90%).",
		reference: "Plisky et al. IJSPT.",
		tags: ["equilibrio", "rts", "esportiva"],
		evidence_label: "Meta-análise",
		evidence_summary: "Relação com risco de lesão e controle dinâmico.",
		source_label: "Curadoria FisioFlow",
		sort_order: 110,
		illustration: "balance-reach",
		imageUrl: "/clinical-tests/illustrations/y-balance-test.avif",
		fieldsDefinition: [
			{ id: 'ant_cm', label: 'Anterior (cm)', type: 'number' },
			{ id: 'pm_cm', label: 'Posteromedial (cm)', type: 'number' },
			{ id: 'pl_cm', label: 'Posterolateral (cm)', type: 'number' },
			{ id: 'lsi', label: 'LSI Total (%)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-single-hop-distance",
		name: "Single Hop for Distance",
		name_en: "Single Hop for Distance",
		category: "Esportiva",
		target_joint: "Joelho",
		type: "functional_test",
		purpose: "Quantificar potencia horizontal.",
		execution: "Em apoio unipodal, salte a maior distancia possivel e estabilize.",
		positive_sign: "Diferenca entre membros (LSI < 90%).",
		reference: "Cooke et al. 2025.",
		tags: ["acl", "hop-test", "rts"],
		evidence_label: "Revisão sistemática",
		evidence_summary: "Avaliação de simetria e função reativa pós-lesão.",
		source_label: "Curadoria FisioFlow",
		sort_order: 120,
		illustration: "hop-performance",
		imageUrl: "/clinical-tests/illustrations/single-hop.avif",
		fieldsDefinition: [
			{ id: 'distance_cm', label: 'Distância (cm)', type: 'number' },
			{ id: 'lsi', label: 'LSI (%)', type: 'number' },
			{ id: 'quality', label: 'Qualidade', type: 'select', options: ['Estável', 'Instável', 'Valgo'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-triple-hop-distance",
		name: "Triple Hop for Distance",
		name_en: "Triple Hop for Distance",
		category: "Esportiva",
		target_joint: "Joelho",
		type: "functional_test",
		purpose: "Avaliar producao repetida de forca.",
		execution: "Realizar tres saltos consecutivos no mesmo membro inferior.",
		positive_sign: "Assimetria (LSI < 90%).",
		reference: "Davies et al. 2020.",
		tags: ["acl", "triple-hop", "rts"],
		evidence_label: "Revisão crítica",
		evidence_summary: "Avaliação de simetria e função reativa pós-lesão.",
		source_label: "Curadoria FisioFlow",
		sort_order: 130,
		illustration: "hop-performance",
		imageUrl: "/clinical-tests/illustrations/triple-hop.avif",
		fieldsDefinition: [
			{ id: 'distance_cm', label: 'Distância Total (cm)', type: 'number' },
			{ id: 'lsi', label: 'LSI (%)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-side-hop-test",
		name: "Side Hop Test",
		name_en: "Side Hop Test",
		category: "Esportiva",
		target_joint: "Tornozelo",
		type: "functional_test",
		purpose: "Avaliar capacidade reativa lateral.",
		execution: "Salte lateralmente por 30 segundos sobre uma linha.",
		positive_sign: "Queda de performance ou instabilidade.",
		reference: "Culvenor et al. 2024.",
		tags: ["tornozelo", "reactividade", "esportiva"],
		evidence_label: "Síntese recente",
		evidence_summary: "Avaliação de simetria e função reativa pós-lesão.",
		source_label: "Curadoria FisioFlow",
		sort_order: 140,
		illustration: "hop-performance",
		imageUrl: "/clinical-tests/illustrations/side-hop.avif",
		fieldsDefinition: [
			{ id: 'reps_30s', label: 'Repetições (30s)', type: 'number' },
			{ id: 'lsi', label: 'LSI (%)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-tug-test",
		name: "Timed Up and Go",
		name_en: "Timed Up and Go",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose: "Monitorar mobilidade funcional.",
		execution: "Tempo para levantar, caminhar 3m, virar e sentar.",
		positive_sign: "Tempo elevado (>12s).",
		reference: "Unver et al. 2017.",
		tags: ["pos-operatorio", "mobilidade", "tug"],
		evidence_label: "Validade e confiabilidade",
		evidence_summary: "Monitoramento de mobilidade básica e risco de quedas.",
		source_label: "Curadoria FisioFlow",
		sort_order: 210,
		illustration: "gait-speed",
		imageUrl: "/clinical-tests/illustrations/tug-test.avif",
		fieldsDefinition: [
			{ id: 'seconds', label: 'Tempo (segundos)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-5xsts-test",
		name: "Five Times Sit-to-Stand",
		name_en: "5x Sit-to-Stand",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose: "Medir potencia funcional.",
		execution: "Cinco repeticoes de sentar-levantar o mais rapido possivel.",
		positive_sign: "Tempo elevado (>15s).",
		reference: "Medina-Mirapeix et al. 2018.",
		tags: ["5xsts", "forca-funcional", "pos-operatorio"],
		evidence_label: "Estudo de confiabilidade",
		evidence_summary: "Medida indireta de força de membros inferiores.",
		source_label: "Curadoria FisioFlow",
		sort_order: 220,
		illustration: "sit-to-stand",
		imageUrl: "/clinical-tests/illustrations/5xsts-test.avif",
		fieldsDefinition: [
			{ id: 'seconds', label: 'Tempo (segundos)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-thompson-test",
		name: "Teste de Thompson",
		name_en: "Thompson Test",
		category: "Ortopedia",
		target_joint: "Tornozelo",
		type: "special_test",
		purpose: "Avaliar a integridade do tendão calcâneo (Aquiles) e detectar rupturas completas.",
		execution: "1. Paciente em decúbito ventral com os pés fora da maca. 2. O examinador comprime o ventre muscular do gastrocnêmio/sóleo. 3. Observar a presença de flexão plantar passiva.",
		positive_sign: "Ausência de flexão plantar durante a compressão da panturrilha, indicando ruptura total do tendão.",
		reference: "Thompson, T. C. (1962). A test for rupture of the tendo achillis.",
		sensitivity_specificity: "Sensibilidade: 0.96, Especificidade: 0.93.",
		tags: ["tornozelo", "aquiles", "ruptura", "tendinopatia"],
		evidence_label: "Padrão-ouro para Ruptura",
		evidence_summary: "Teste de alta confiabilidade clínica para diagnóstico imediato de ruptura do tendão de Aquiles.",
		source_label: "Curadoria FisioFlow",
		sort_order: 42,
		imageUrl: "/clinical-tests/illustrations/thompson-test.png",
		illustration: "ankle-stability",
		fieldsDefinition: [
			{ id: 'plantar_flexion_present', label: 'Flexão Plantar Presente', type: 'select', options: ['Sim (Negativo)', 'Não (Positivo)'] },
			{ id: 'pain_level', label: 'Dor na compressão (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-ober-test",
		name: "Teste de Ober",
		name_en: "Ober's Test",
		category: "Ortopedia",
		target_joint: "Coxa",
		type: "special_test",
		purpose: "Avaliar a tensão do Trato Iliotibial (TIT) e do Tensor da Fáscia Lata (TFL).",
		execution: "1. Paciente em decúbito lateral. 2. Membro testado fletido em 90° no joelho. 3. Examinador estabiliza a pelve, realiza abdução e extensão leve do quadril e permite a adução passiva do membro.",
		positive_sign: "O membro testado não ultrapassa a linha média ou permanece abduzido (paralelo à maca).",
		reference: "Ober, F. R. (1936). The role of the iliotibial band and fascia lata as a cause of back strain.",
		tags: ["quadril", "tit", "tfl", "encurtamento"],
		evidence_label: "Clássico Clínico",
		evidence_summary: "Frequentemente utilizado em pacientes com dor lateral no quadril ou joelho.",
		source_label: "Curadoria FisioFlow",
		sort_order: 52,
		illustration: "hip-rotation",
		imageUrl: "/clinical-tests/illustrations/ober-test.png",
		fieldsDefinition: [
			{ id: 'adduction_limitation', label: 'Limitação de Adução', type: 'boolean' },
			{ id: 'distance_cm', label: 'Distância para a Maca (cm)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-trendelenburg-sign",
		name: "Sinal de Trendelenburg",
		name_en: "Trendelenburg Sign",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose: "Avaliar a força e função do Glúteo Médio.",
		execution: "1. Paciente em pé, apoiado em apenas uma perna. 2. O examinador observa a pelve do lado oposto ao apoio.",
		positive_sign: "Queda da pelve no lado sem apoio, indicando fraqueza do abdutor do lado apoiado.",
		reference: "Trendelenburg, F. (1895). Ueber den Gang bei angeborener Hüftluxation.",
		tags: ["quadril", "gluteo-medio", "marcha", "fraqueza"],
		evidence_label: "Padrão-ouro para Função Glútea",
		evidence_summary: "Fundamental para diagnóstico de disfunções da marcha.",
		source_label: "Curadoria FisioFlow",
		sort_order: 35,
		illustration: "balance-dynamic",
		imageUrl: "/clinical-tests/illustrations/trendelenburg-sign.png",
		fieldsDefinition: [
			{ id: 'pelvic_drop', label: 'Queda Pélvica Oposta', type: 'select', options: ['Presente', 'Ausente'] },
			{ id: 'time_sustained', label: 'Tempo de Sustentação (s)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-step-down-test",
		name: "Step-down Test",
		name_en: "Step-down Test",
		category: "Esportiva",
		target_joint: "Joelho",
		type: "functional_test",
		purpose: "Controle dinâmico e estabilidade.",
		execution: "Descer do degrau tocando calcanhar oposto no chão.",
		positive_sign: "Valgo dinâmico ou dor.",
		reference: "Piva SR et al. 2006.",
		tags: ["joelho", "controle-motor"],
		evidence_label: "Teste funcional",
		evidence_summary: "Validar controle de valgo dinâmico e estabilidade lateral.",
		source_label: "Curadoria FisioFlow",
		sort_order: 115,
		illustration: "balance-reach",
		imageUrl: "/clinical-tests/illustrations/step-down-test.png",
		fieldsDefinition: [
			{ id: 'quality_score', label: 'Score Qualidade (0-5)', type: 'number' },
			{ id: 'pain_nprs', label: 'Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-doha-groin-squeeze",
		name: "Adductor Squeeze (Doha)",
		name_en: "Adductor Squeeze Test",
		category: "Esportiva",
		target_joint: "Quadril",
		type: "special_test",
		purpose: "Dor relacionada aos adutores.",
		execution: "Contração máxima adução contra o punho.",
		positive_sign: "Dor habitual na região inguinal.",
		reference: "Weir et al. 2015.",
		tags: ["quadril", "inguinal", "esportiva"],
		evidence_label: "Consenso Internacional",
		evidence_summary: "Consenso de Doha para dor inguinal em atletas.",
		source_label: "Curadoria FisioFlow",
		sort_order: 65,
		illustration: "hip-rotation",
		imageUrl: "/clinical-tests/illustrations/adductor-squeeze.png",
		fieldsDefinition: [
			{ id: 'pain_0_degrees', label: 'Dor a 0° (0-10)', type: 'nprs' },
			{ id: 'pain_45_degrees', label: 'Dor a 45° (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-kibler-scapular-dyskinesis",
		name: "Discinesia de Kibler",
		name_en: "Scapular Dyskinesis",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "functional_test",
		purpose: "Discinesia escapular.",
		execution: "Observar movimento escapular durante elevação.",
		positive_sign: "Ritmo escapular assimétrico.",
		reference: "Kibler WB et al. 2013.",
		tags: ["ombro", "escápula"],
		evidence_label: "Prática clínica",
		evidence_summary: "Avaliação qualitativa do ritmo escapuloumeral.",
		source_label: "Curadoria FisioFlow",
		sort_order: 42,
		illustration: "shoulder-impingement",
		imageUrl: "/clinical-tests/illustrations/kibler-dyskinesis.png",
		fieldsDefinition: [
			{ id: 'dyskinesis_type', label: 'Tipo', type: 'select', options: ['Tipo I', 'Tipo II', 'Tipo III', 'Normal'] }
		]
	}),

	createBuiltinTest({
		id: "builtin-mcmurray-test",
		name: "Teste de McMurray",
		name_en: "McMurray Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Detectar lesões nos meniscos medial e lateral.",
		execution: "1. Paciente em decúbito dorsal com joelho fletido. 2. Para menisco medial: Rodar tíbia externamente e estender o joelho aplicando estresse em valgo. 3. Para menisco lateral: Rodar tíbia internamente e estender aplicando estresse em varo.",
		positive_sign: "Presença de um estalido audível ou palpável, ou reprodução da dor na interlinha articular durante a manobra.",
		reference: "McMurray, T. P. (1942). The diagnosis of internal derangements of the knee joint.",
		sensitivity_specificity: "Sensibilidade: 0.70, Especificidade: 0.71.",
		tags: ["joelho", "menisco", "trauma", "estalido"],
		evidence_label: "Evidência de Baixa Sensibilidade",
		evidence_summary: "Mais eficaz quando associado à palpação da interlinha articular.",
		source_label: "Curadoria FisioFlow",
		sort_order: 15,
		illustration: "knee-stability",
		imageUrl: "/clinical-tests/illustrations/mcmurray-test.png",
		fieldsDefinition: [
			{ id: 'pain_medial', label: 'Dor/Clique Medial', type: 'select', options: ['Presente', 'Ausente'] },
			{ id: 'pain_lateral', label: 'Dor/Clique Lateral', type: 'select', options: ['Presente', 'Ausente'] },
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' }
		],
		lr_positive: 1.3,
		lr_negative: 0.8,
		cluster_id: "cluster-meniscal-tear"
	}),
	createBuiltinTest({
		id: "builtin-thomas-test",
		name: "Teste de Thomas",
		name_en: "Thomas Test",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose: "Avaliar o encurtamento dos flexores do quadril (Iliopsoas e Reto Femoral).",
		execution: "1. Paciente em decúbito dorsal na extremidade da maca. 2. Paciente abraça o joelho contralateral ao peito para retificar a coluna lombar. 3. Observar se a coxa testada permanece em contato com a maca.",
		positive_sign: "Aumento da distância entre a face posterior da coxa e a maca ou flexão excessiva do joelho (Sinal de J).",
		reference: "Thomas, H. O. (1876). Contributions to surgery and medicine.",
		sensitivity_specificity: "Sensibilidade moderada para encurtamento muscular.",
		tags: ["quadril", "flexores", "iliopsoas", "reto-femoral"],
		evidence_label: "Clássico Clínico",
		evidence_summary: "Fundamental para avaliação de desequilíbrios musculares pélvicos.",
		source_label: "Curadoria FisioFlow",
		sort_order: 60,
		illustration: "hip-rotation",
		imageUrl: "/clinical-tests/illustrations/thomas-test.png",
		fieldsDefinition: [
			{ id: 'iliopsoas_tightness', label: 'Psoas Encurtado (Coxa eleva)', type: 'select', options: ['Sim', 'Não'] },
			{ id: 'rectus_tightness', label: 'Reto Femoral Encurtado (Joelho estende)', type: 'select', options: ['Sim', 'Não'] },
			{ id: 'distance_cm', label: 'Distância Coxa-Maca (cm)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-oxford-scale",
		name: "Escala Oxford (Força)",
		name_en: "MRC Scale",
		category: "Pós-Operatório",
		target_joint: "Geral",
		type: "functional_test",
		purpose: "Graduar força muscular.",
		execution: "Testar movimento contra gravidade e resistência.",
		positive_sign: "Força < Grau 5.",
		reference: "MRC 1943.",
		tags: ["força", "mrc"],
		evidence_label: "Protocolo universal",
		evidence_summary: "Padrão universal de graduação de força muscular.",
		source_label: "Curadoria FisioFlow",
		sort_order: 200,
		illustration: "sit-to-stand",
		fieldsDefinition: [
			{ id: 'grade', label: 'Grau (0-5)', type: 'select', options: ['0', '1', '2', '3', '4', '5'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-phalen-test",
		name: "Teste de Phalen",
		name_en: "Phalen Test",
		category: "Ortopedia",
		target_joint: "Punho",
		type: "special_test",
		purpose: "Síndrome do túnel do carpo.",
		execution: "Flexão máxima dos punhos por 60s.",
		positive_sign: "Parestesia território mediano.",
		reference: "Alqunaee 2012.",
		tags: ["punho", "nervo-mediano"],
		evidence_label: "Teste Diagnóstico",
		evidence_summary: "Alta sensibilidade para Síndrome do Túnel do Carpo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 75,
		illustration: "wrist-flexion",
		imageUrl: "/clinical-tests/illustrations/phalen-test.avif",
		fieldsDefinition: [
			{ id: 'time_to_symptoms', label: 'Tempo (s)', type: 'number' }
		],
		lr_positive: 1.5,
		lr_negative: 0.5
	}),
	createBuiltinTest({
		id: "builtin-tinel-sign-wrist",
		name: "Sinal de Tinel (Punho)",
		name_en: "Tinel's Sign (Wrist)",
		category: "Ortopedia",
		target_joint: "Punho",
		type: "special_test",
		purpose: "Avaliar compressão do nervo mediano no túnel do carpo.",
		execution: "Percussão leve sobre o canal do carpo (nervo mediano).",
		positive_sign: "Choque ou parestesia no território do nervo mediano.",
		reference: "Urbano, F. L. (2000). Tinel's sign.",
		tags: ["punho", "nervo-mediano", "túnel do carpo"],
		evidence_label: "Teste Provocativo",
		evidence_summary: "Sensibilidade moderada mas alta especificidade para neuropatias compressivas.",
		source_label: "Curadoria FisioFlow",
		sort_order: 80,
		imageUrl: "/clinical-tests/illustrations/tinel-sign-wrist.png",
		illustration: "wrist-stability",
		fieldsDefinition: [
			{ id: 'paresthesia_location', label: 'Local da Parestesia', type: 'select', options: ['Território Mediano', 'Território Ulnar', 'Território Radial'] }
		],
		lr_positive: 1.6,
		lr_negative: 0.7
	}),
	createBuiltinTest({
		id: "builtin-finkelstein-test",
		name: "Teste de Finkelstein",
		name_en: "Finkelstein Test",
		category: "Ortopedia",
		target_joint: "Punho",
		type: "special_test",
		purpose: "Diagnosticar a Tenossinovite de De Quervain (inflamação do primeiro compartimento extensor).",
		execution: "1. O paciente flete o polegar sobre a palma da mão e cerra os dedos sobre ele. 2. O examinador realiza um desvio ulnar passivo do punho.",
		positive_sign: "Reprodução de dor aguda sobre o tendão do abdutor longo e extensor curto do polegar no processo estiloide do rádio.",
		reference: "Finkelstein, H. (1930). Stenosing tendovaginitis at the radial styloid process.",
		sensitivity_specificity: "Alta sensibilidade, mas pode apresentar falsos positivos.",
		tags: ["punho", "de quervain", "tendinopatia", "polegar"],
		evidence_label: "Padrão-ouro Clínico",
		evidence_summary: "Diferenciar de osteoartrite da articulação trapeziometacarpiana.",
		source_label: "Curadoria FisioFlow",
		sort_order: 70,
		illustration: "wrist-flexion",
		imageUrl: "/clinical-tests/illustrations/finkelstein-test.png",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' },
			{ id: 'burning_sensation', label: 'Sensação de Queimação', type: 'select', options: ['Sim', 'Não'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-lasegue-test",
		name: "Lasègue (SLR)",
		name_en: "Lasegue Test",
		category: "Ortopedia",
		target_joint: "Coluna",
		type: "special_test",
		purpose: "Radiculopatia lombar.",
		execution: "Elevação passiva do membro estendido.",
		positive_sign: "Dor radicular 30-70°.",
		reference: "Butler 2000.",
		tags: ["lombar", "radiculopatia"],
		evidence_label: "Padrão-ouro clínico",
		evidence_summary: "Alta sensibilidade para diagnóstico de hérnia de disco lombar.",
		source_label: "Curadoria FisioFlow",
		sort_order: 90,
		illustration: "nerve-tension",
		imageUrl: "/clinical-tests/illustrations/lasegue-test.avif",
		fieldsDefinition: [
			{ id: 'angle', label: 'Ângulo Início (°)', type: 'number' },
			{ id: 'pain_nprs', label: 'Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-anterior-drawer-knee",
		name: "Gaveta Anterior (Joelho)",
		name_en: "Anterior Drawer Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Avaliar a integridade do Ligamento Cruzado Anterior (LCA).",
		execution: "1. Paciente em decúbito dorsal com joelho fletido a 90° e pé apoiado na maca. 2. O examinador senta suavemente sobre o pé do paciente para estabilizá-lo. 3. Aplica-se uma força de tração anterior na tíbia proximal.",
		positive_sign: "Translação anterior excessiva da tíbia em relação aos côndilos femorais (comparado ao lado contralateral).",
		reference: "Marshall, J. L., et al. (1975). The anterior drawer sign.",
		sensitivity_specificity: "Sensibilidade: 0.49, Especificidade: 0.92.",
		tags: ["joelho", "lca", "instabilidade", "trauma"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Teste clássico, porém menos sensível que o Lachman em quadros agudos.",
		source_label: "Curadoria FisioFlow",
		sort_order: 10,
		illustration: "knee-stability",
		imageUrl: "/clinical-tests/illustrations/anterior-drawer-knee.avif",
		fieldsDefinition: [
			{ id: 'translation_mm', label: 'Translação (mm)', type: 'number' },
			{ id: 'end_feel', label: 'Tipo de End-feel', type: 'select', options: ['Firme', 'Vazio (Soft)', 'Indefinido'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-mulder-click",
		name: "Mulder's Click",
		name_en: "Mulder's Test",
		category: "Ortopedia",
		target_joint: "Pé",
		type: "special_test",
		purpose: "Neuroma de Morton.",
		execution: "Comprimir metatarsos lateralmente.",
		positive_sign: "Estalido e dor.",
		reference: "Mulder 1951.",
		tags: ["pe", "morton"],
		evidence_label: "Teste de provocação",
		evidence_summary: "Provocação de sintomas clássicos de neuroma de Morton.",
		source_label: "Curadoria FisioFlow",
		sort_order: 150,
		illustration: "gait-speed"
	}),
	createBuiltinTest({
		id: "builtin-nordic-curl",
		name: "Nordic Hamstring",
		name_en: "Nordic Curl",
		category: "Esportiva",
		target_joint: "Coxa",
		type: "functional_test",
		purpose: "Força excêntrica isquiotibiais.",
		execution: "Descer o tronco lentamente ajoelhado.",
		positive_sign: "Incapacidade de controlar.",
		reference: "Petersen 2011.",
		tags: ["esportiva", "isquiotibiais"],
		evidence_label: "Padrão-ouro funcional",
		evidence_summary: "Avaliação de força excêntrica e prevenção de lesões.",
		source_label: "Curadoria FisioFlow",
		sort_order: 126,
		illustration: "sit-to-stand",
		imageUrl: "/clinical-tests/illustrations/nordic-hamstring.png",
		fieldsDefinition: [
			{ id: 'angle_break', label: 'Ângulo Queda (°)', type: 'number' },
			{ id: 'reps', label: 'Repetições', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-ultt1-median",
		name: "ULTT 1 (Mediano)",
		name_en: "ULTT 1",
		category: "Ortopedia",
		target_joint: "Membro Superior",
		type: "special_test",
		purpose: "Mecanossensibilidade nervo mediano.",
		execution: "Sequência tensora MS.",
		positive_sign: "Reprodução de sintomas neurais (formigamento, choque) alterados por inclinação cervical.",
		reference: "Butler, D. S. (2000). The Sensitive Nervous System.",
		tags: ["neurodinamica", "membro-superior", "nervo-mediano"],
		evidence_label: "Padrão-ouro neurodinâmico",
		evidence_summary: "Alta sensibilidade para radiculopatia cervical.",
		source_label: "Curadoria FisioFlow",
		sort_order: 84,
		illustration: "nerve-tension",
		fieldsDefinition: [
			{ id: 'pain_nprs', label: 'Dor (0-10)', type: 'nprs' },
			{ id: 'angle_elbow', label: 'Ângulo Extensão (°)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-single-leg-squat",
		name: "Single Leg Squat",
		name_en: "Single Leg Squat",
		category: "Esportiva",
		target_joint: "Membro Inferior",
		type: "functional_test",
		purpose: "Qualidade movimento lombo-pélvico.",
		execution: "Agachamento unipodal a 60°.",
		positive_sign: "Valgo ou queda pélvica.",
		reference: "Crossley 2011.",
		tags: ["controle-motor", "joelho"],
		evidence_label: "Teste funcional",
		evidence_summary: "Avaliação de controle neuromuscular e valgo dinâmico.",
		source_label: "Curadoria FisioFlow",
		sort_order: 116,
		illustration: "balance-reach",
		imageUrl: "/clinical-tests/illustrations/single-leg-squat.png",
		fieldsDefinition: [
			{ id: 'quality', label: 'Qualidade', type: 'select', options: ['Excelente', 'Bom', 'Regular', 'Pobre'] },
			{ id: 'medial_drift', label: 'Valgo', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-cozen-test",
		name: "Teste de Cozen",
		name_en: "Cozen's Test",
		category: "Ortopedia",
		target_joint: "Cotovelo",
		type: "special_test",
		purpose: "Detectar epicondilite lateral (cotovelo de tenista).",
		execution: "1. Paciente com o cotovelo fletido a 90° e punho cerrado. 2. O examinador estabiliza o epicôndilo lateral. 3. O paciente realiza extensão do punho contra resistência enquanto o examinador palpa o epicôndilo.",
		positive_sign: "Reprodução de dor súbita e aguda no epicôndilo lateral do úmero.",
		reference: "Cozen, L. (1959). Tennis elbow.",
		sensitivity_specificity: "Alta sensibilidade para epicondilite lateral.",
		tags: ["cotovelo", "epicondilite-lateral", "overuse"],
		evidence_label: "Padrão-ouro Clínico",
		evidence_summary: "Teste de provocação via contração ativa dos extensores.",
		source_label: "Curadoria FisioFlow",
		sort_order: 110,
		illustration: "elbow-test",
		imageUrl: "/clinical-tests/illustrations/cozen-test.png",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' },
			{ id: 'weakness_present', label: 'Fraqueza Associada', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-mill-test",
		name: "Teste de Mill",
		name_en: "Mill's Test",
		category: "Ortopedia",
		target_joint: "Cotovelo",
		type: "special_test",
		purpose: "Avaliar epicondilite lateral via alongamento passivo.",
		execution: "1. Paciente em pé, com o cotovelo em extensão total. 2. O examinador realiza flexão passiva do punho e pronação do antebraço, enquanto palpa o epicôndilo lateral.",
		positive_sign: "Dor sobre o epicôndilo lateral durante a manobra de alongamento dos extensores.",
		reference: "Mill, H. (1968). Treatment of tennis elbow.",
		tags: ["cotovelo", "epicondilite-lateral", "alongamento"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Complementar ao teste de Cozen via alongamento passivo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 111,
		imageUrl: "/clinical-tests/illustrations/mills-test.png",
		illustration: "elbow-test",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-golfers-elbow",
		name: "Epicondilite Medial",
		name_en: "Golfer's Elbow Test",
		category: "Ortopedia",
		target_joint: "Cotovelo",
		type: "special_test",
		purpose: "Detectar epicondilite medial (cotovelo de golfista).",
		execution: "1. O examinador palpa o epicôndilo medial do paciente. 2. O paciente realiza flexão do punho contra resistência ou o examinador realiza extensão passiva do punho acompanhada de supinação do antebraço.",
		positive_sign: "Dor sobre o epicôndilo medial do úmero.",
		reference: "Nirschl, R. P. (1992). Elbow tendinosis: Clinical and pathological details.",
		tags: ["cotovelo", "epicondilite-medial", "golfista"],
		evidence_label: "Prática Clínica",
		evidence_summary: "Provocação de dor na origem dos flexores/pronadores.",
		source_label: "Curadoria FisioFlow",
		sort_order: 35,
		sort_order: 35,
		illustration: "elbow-test",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-adson-test",
		name: "Teste de Adson",
		name_en: "Adson's Test",
		category: "Ortopedia",
		target_joint: "Pescoço",
		type: "special_test",
		purpose: "Avaliar a compressão da artéria subclávia (Síndrome do Desfiladeiro Torácico).",
		execution: "1. Paciente sentado com o braço em abdução (30°). 2. Examinador localiza o pulso radial. 3. Paciente estende e roda o pescoço em direção ao lado testado enquanto realiza inspiração profunda.",
		positive_sign: "Diminuição acentuada ou desaparecimento do pulso radial durante a manobra.",
		reference: "Adson, A. W. (1927). Cervical ribs.",
		tags: ["tos", "vascular", "cervical"],
		evidence_label: "Evidência Limitada",
		evidence_summary: "Alto índice de falso-positivos em indivíduos assintomáticos.",
		source_label: "Curadoria FisioFlow",
		sort_order: 155,
		illustration: "thoracic-outlet",
		fieldsDefinition: [
			{ id: 'pulse_quality', label: 'Alteração do Pulso', type: 'select', options: ['Mantido', 'Diminuído', 'Ausente'] },
			{ id: 'paresthesia', label: 'Parestesia Associada', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-roos-test",
		name: "Teste de Roos",
		name_en: "Roos Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Desfiladeiro Torácico.",
		execution: "Abrir/fechar mãos a 90° por 3 min.",
		positive_sign: "Reprodução dos sintomas (dor, parestesia, peso) em até 3 minutos.",
		reference: "Roos, D. B. (1966). Thoracic outlet syndrome.",
		evidence_label: "Teste Provocativo",
		evidence_summary: "Teste clínico clássico para Síndrome do Desfiladeiro Torácico.",
		tags: ["tos", "neurovascular", "cervical"],
		illustration: "shoulder-impingement",
		fieldsDefinition: [
			{ id: 'time_sustained', label: 'Tempo (s)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-ely-test",
		name: "Teste de Ely",
		name_en: "Ely's Test",
		category: "Ortopedia",
		target_joint: "Coxa",
		type: "special_test",
		purpose: "Avaliar o encurtamento do músculo Reto Femoral.",
		execution: "1. Paciente em decúbito ventral. 2. O examinador flete passiva e rapidamente o joelho do paciente, aproximando o calcanhar da nádega.",
		positive_sign: "Flexão espontânea do quadril (aumento do espaço entre a pelve e a maca) durante a manobra.",
		reference: "Ely, L. W. (1912). Diseases of bones and joints.",
		tags: ["coxa", "quadriceps", "encurtamento"],
		evidence_label: "Prática Clínica",
		evidence_summary: "Teste de estiramento passivo clássico para flexores de quadril biarticulares.",
		source_label: "Curadoria FisioFlow",
		sort_order: 60,
		imageUrl: "/clinical-tests/illustrations/ely-test.png",
		illustration: "knee-stability",
		fieldsDefinition: [
			{ id: 'hip_flexion_present', label: 'Flexão do Quadril', type: 'boolean' },
			{ id: 'distance_heel_buttock', label: 'Distância Calcanhar-Nádega (cm)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-crossover-test",
		name: "Crossover Test",
		name_en: "Crossover Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a integridade da articulação acromioclavicular (AC).",
		execution: "1. O examinador estabiliza o ombro do paciente. 2. Realiza adução horizontal passiva máxima do braço testado.",
		positive_sign: "Dor localizada na região da articulação acromioclavicular.",
		reference: "Cook, C. (2012). Orthopedic Physical Examination Tests.",
		tags: ["ombro", "ac", "dor", "trauma"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Teste de provocação simples para patologias AC.",
		source_label: "Curadoria FisioFlow",
		sort_order: 115,
		imageUrl: "/clinical-tests/illustrations/crossover-test.png",
		illustration: "shoulder-impingement",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Intensidade da Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-hamstring-bamic",
		name: "Hamstring BAMIC",
		name_en: "Hamstring BAMIC",
		category: "Esportiva",
		target_joint: "Coxa",
		type: "special_test",
		purpose: "Classificar lesões musculares dos isquiotibiais (British Athletics).",
		execution: "1. Realizar anamnese e exame físico. 2. Associar achados de RM. 3. Classificar de 0 a 4 e localizar o sítio.",
		positive_sign: "O grau da lesão é determinado pelos achados clínicos e de imagem.",
		reference: "Pollock, N., et al. (2014). British Athletics Muscle Injury Classification.",
		tags: ["esportiva", "isquiotibiais", "classificacao"],
		evidence_label: "Consenso (British Athletics)",
		evidence_summary: "Sistema mais robusto para prognóstico de lesões musculares.",
		source_label: "Curadoria FisioFlow",
		sort_order: 125,
		imageUrl: "/clinical-tests/illustrations/hamstring-bamic.png",
		illustration: "knee-stability",
		fieldsDefinition: [
			{ id: 'bamic_grade', label: 'Grau (0-4)', type: 'select', options: ['0', '1', '2', '3', '4'] },
			{ id: 'site', label: 'Localização', type: 'select', options: ['Myofascial', 'MTJ', 'Intramuscular'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-speeds-test",
		name: "Teste de Speed",
		name_en: "Speed's Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar tendinopatia do cabo longo do bíceps ou lesão de SLAP.",
		execution: "1. Paciente com o cotovelo estendido e antebraço supinado. 2. O examinador aplica resistência à flexão anterior do ombro (até 60°).",
		positive_sign: "Dor localizada no sulco bicipital.",
		reference: "Speed, J. S. (1966). Training of orthopedic surgeons.",
		tags: ["ombro", "biceps", "slap", "tendinopatia"],
		evidence_label: "Teste de Provocação",
		evidence_summary: "Útil para identificar irritação no tendão do bíceps.",
		source_label: "Curadoria FisioFlow",
		sort_order: 45,
		imageUrl: "/clinical-tests/illustrations/speed-test.png",
		illustration: "shoulder-impingement",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Dor no Sulco (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-yergason-test",
		name: "Teste de Yergason",
		name_en: "Yergason's Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a estabilidade do tendão do cabo longo do bíceps no sulco bicipital.",
		execution: "1. Cotovelo fletido a 90° e antebraço pronado. 2. Paciente realiza supinação e rotação externa contra resistência.",
		positive_sign: "Dor no sulco bicipital ou sensação de 'salto' do tendão.",
		reference: "Yergason, R. M. (1931). Supination resistance test.",
		tags: ["ombro", "biceps", "instabilidade"],
		evidence_label: "Teste de Provocação",
		evidence_summary: "Avalia a integridade do ligamento transverso do úmero.",
		source_label: "Curadoria FisioFlow",
		sort_order: 46,
		illustration: "shoulder-impingement",
		fieldsDefinition: [
			{ id: 'nprs_pain', label: 'Dor (0-10)', type: 'nprs' },
			{ id: 'tendon_pop', label: 'Tensão/Salto do Tendão', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-empty-can-jobe",
		name: "Teste de Jobe (Empty Can)",
		name_en: "Empty Can Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a integridade do tendão do supraespinhal.",
		execution: "1. Braços a 90° de abdução no plano da escápula e rotação interna máxima (polegares para baixo). 2. Examinador aplica resistência para baixo.",
		positive_sign: "Dor ou fraqueza significativa comparada ao lado oposto.",
		reference: "Jobe, F. W. (1983). Clinical diagnosis of shoulder instability.",
		tags: ["ombro", "supraespinhal", "manguito", "fraqueza"],
		evidence_label: "Padrão-ouro para Supra",
		evidence_summary: "Alta acurácia para rupturas do supraespinhal.",
		source_label: "Curadoria FisioFlow",
		sort_order: 42,
		imageUrl: "/clinical-tests/illustrations/empty-can-jobe.png",
		illustration: "shoulder-impingement",
		fieldsDefinition: [
			{ id: 'weakness_grade', label: 'Grau de Força', type: 'select', options: ['Normal', 'Reduzida', 'Ausente'] },
			{ id: 'nprs_pain', label: 'Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-obrien-test",
		name: "Teste de O'Brien",
		name_en: "O'Brien's Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Detectar lesões de SLAP ou patologia acromioclavicular.",
		execution: "1. Ombro a 90° flexão, 15° adução horizontal e RI máxima. 2. Resistência para baixo. 3. Repetir com RE máxima (supinação).",
		positive_sign: "Dor na 1ª posição que alivia ou desaparece na 2ª posição.",
		reference: "O'Brien, S. J. (1998). The active compression test.",
		tags: ["ombro", "slap", "acromioclavicular"],
		evidence_label: "Evidência Específica",
		evidence_summary: "Diferencia lesão labral de dor superficial AC.",
		source_label: "Curadoria FisioFlow",
		sort_order: 42,
		imageUrl: "/clinical-tests/illustrations/hawkins-kennedy.avif",
		illustration: "shoulder-impingement",
		lr_positive: 1.9,
		lr_negative: 0.3,
		cluster_id: "cluster-subacromial-impingement",
		fieldsDefinition: [
			{ id: 'pain_internal', label: 'Dor em RI (Posição 1)', type: 'boolean' },
			{ id: 'pain_external', label: 'Dor em RE (Posição 2)', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-apley-compression",
		name: "Compressão de Apley",
		name_en: "Apley's Compression Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Diferenciar lesão de menisco de lesão ligamentar.",
		execution: "1. Paciente em decúbito ventral, joelho fletido a 90°. 2. Examinador aplica compressão axial e roda a tíbia.",
		positive_sign: "Dor durante a compressão e rotação.",
		reference: "Apley, A. G. (1947). The diagnosis of meniscus injuries.",
		tags: ["joelho", "menisco", "provocação"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Utilizado para confirmar achados de outros testes meniscais.",
		source_label: "Curadoria FisioFlow",
		sort_order: 22,
		imageUrl: "/clinical-tests/illustrations/apley-compression.png",
		illustration: "knee-stability",
		fieldsDefinition: [
			{ id: 'pain_rotation', label: 'Dor na Rotação', type: 'select', options: ['Medial', 'Lateral', 'Ausente'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-posterior-drawer-knee",
		name: "Gaveta Posterior (Joelho)",
		name_en: "Posterior Drawer Test",
		category: "Ortopedia",
		target_joint: "Joelho",
		type: "special_test",
		purpose: "Avaliar a integridade do Ligamento Cruzado Posterior (LCP).",
		execution: "1. Paciente em decúbito dorsal com joelho a 90°. 2. Examinador aplica pressão posterior na tíbia proximal.",
		positive_sign: "Translação posterior excessiva da tíbia.",
		reference: "Phaneuf et al. 2023.",
		tags: ["joelho", "lcp", "instabilidade"],
		evidence_label: "Padrão-ouro para LCP",
		evidence_summary: "Teste mais confiável para insuficiência do LCP.",
		source_label: "Curadoria FisioFlow",
		sort_order: 14,
		imageUrl: "/clinical-tests/illustrations/posterior-drawer-knee.png",
		illustration: "knee-stability",
		fieldsDefinition: [
			{ id: 'translation_mm', label: 'Translação (mm)', type: 'number' },
			{ id: 'sag_sign', label: 'Sinal de Sag (Degrau)', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-anterior-drawer-ankle",
		name: "Gaveta Anterior (Tornozelo)",
		name_en: "Anterior Drawer (Ankle)",
		category: "Ortopedia",
		target_joint: "Tornozelo",
		type: "special_test",
		purpose: "Avaliar a integridade do Ligamento Talofibular Anterior (LFA).",
		execution: "1. Tornozelo em leve flexão plantar. 2. Tracionar o calcâneo anteriormente enquanto estabiliza a tíbia.",
		positive_sign: "Translação anterior excessiva ou end-feel vazio.",
		reference: "Van Dijk et al. 1996.",
		tags: ["tornozelo", "lfa", "entorse", "instabilidade"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Principal teste para entorses laterais de tornozelo.",
		source_label: "Curadoria FisioFlow",
		sort_order: 40,
		imageUrl: "/clinical-tests/illustrations/anterior-drawer-ankle.png",
		illustration: "ankle-stability",
		fieldsDefinition: [
			{ id: 'laxity_grade', label: 'Grau de Laxidez', type: 'select', options: ['Leve', 'Moderada', 'Grave'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-kleiger-test",
		name: "Teste de Kleiger",
		name_en: "Kleiger's Test",
		category: "Ortopedia",
		target_joint: "Tornozelo",
		type: "special_test",
		purpose: "Avaliar lesão da sindesmose (entorse alta) ou ligamento deltoide.",
		execution: "1. Paciente sentado com perna pendente. 2. Examinador realiza rotação externa passiva do pé com o tornozelo em posição neutra.",
		positive_sign: "Dor na região da sindesmose ou medial (deltoide).",
		reference: "Kleiger, B. (1941). Lower leg and foot injuries.",
		tags: ["tornozelo", "sindesmose", "entorse-alta"],
		evidence_label: "Prática Clínica",
		evidence_summary: "Diferencia entorses simples de lesões de sindesmose.",
		source_label: "Curadoria FisioFlow",
		sort_order: 45,
		imageUrl: "/clinical-tests/illustrations/kleiger-test.png",
		illustration: "ankle-stability",
		fieldsDefinition: [
			{ id: 'pain_location', label: 'Local da Dor', type: 'select', options: ['Sindesmose (Lateral Alta)', 'Deltoide (Medial)'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-log-roll-test",
		name: "Log Roll Test",
		name_en: "Log Roll Test",
		category: "Ortopedia",
		target_joint: "Quadril",
		type: "special_test",
		purpose: "Rastreio de sensibilidade articular intra-capsular do quadril.",
		execution: "1. Paciente em decúbito dorsal. 2. Examinador realiza rotação interna e externa passiva de todo o membro inferior.",
		positive_sign: "Dor profunda no quadril ou click.",
		reference: "Kelly et al. 2003.",
		tags: ["quadril", "labrum", "osteocondral"],
		evidence_label: "Teste de Triagem",
		evidence_summary: "Teste de baixa especificidade, mas útil para detecção de irritação articular.",
		source_label: "Curadoria FisioFlow",
		sort_order: 50,
		imageUrl: "/clinical-tests/illustrations/log-roll-hip.png",
		illustration: "hip-rotation",
		fieldsDefinition: [
			{ id: 'clicking', label: 'Presença de Click', type: 'boolean' },
			{ id: 'pain_nprs', label: 'Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-10mwt",
		name: "10 Meter Walk Test",
		name_en: "10 Meter Walk Test",
		category: "Pós-Operatório",
		target_joint: "Geral",
		type: "performance_test",
		purpose: "Avaliar a velocidade da marcha e funcionalidade.",
		execution: "O paciente caminha 10 metros em velocidade confortável/máxima. O tempo é cronometrado nos 6 metros centrais.",
		positive_sign: "Valores abaixo da norma para a idade.",
		reference: "Bohannon RW (1997).",
		tags: ["marcha", "funcionalidade", "pos-op", "idoso"],
		evidence_label: "Padrão Ouro",
		evidence_summary: "Teste amplamente validado para mensurar mobilidade funcional.",
		source_label: "Curadoria FisioFlow",
		sort_order: 10,
		imageUrl: "/clinical-tests/illustrations/10mwt-test.avif",
		fieldsDefinition: [
			{ id: 'time_seconds', label: 'Tempo (segundos)', type: 'number' },
			{ id: 'speed', label: 'Velocidade calculada (m/s)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-single-leg-stance",
		name: "Single Leg Stance Test",
		name_en: "Single Leg Stance Test",
		category: "Pós-Operatório",
		target_joint: "Membro Inferior",
		type: "performance_test",
		purpose: "Avaliar o equilíbrio estático unipodal.",
		execution: "O paciente permanece em apoio unipodal com braços cruzados pelo maior tempo possível (limite 30-60s).",
		positive_sign: "Inabilidade de manter a posição por > 10-30s dependendo da idade.",
		reference: "Springer et al. (2007).",
		tags: ["equilibrio", "unipodal", "propriocepcao"],
		evidence_label: "Evidência Clínica",
		evidence_summary: "Preditor de risco de quedas em idosos e estabilidade em atletas.",
		source_label: "Curadoria FisioFlow",
		sort_order: 15,
		imageUrl: "/clinical-tests/illustrations/single-leg-stance.png",
		fieldsDefinition: [
			{ id: 'time_seconds', label: 'Tempo de Permanência (s)', type: 'number' },
			{ id: 'side', label: 'Lado Testado', type: 'select', options: ['Direito', 'Esquerdo'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-vmo-activation",
		name: "Ativação do VMO",
		name_en: "VMO Activation",
		category: "Pós-Operatório",
		target_joint: "Joelho",
		type: "performance_test",
		purpose: "Avaliar a capacidade de recrutamento voluntário do vasto medial oblíquo.",
		execution: "Paciente em decúbito dorsal com joelho em extensão. Solicitar contração isométrica do quadríceps e palpar o VMO.",
		positive_sign: "Atraso no recrutamento ou contração fraca/ausente comparada ao VL.",
		reference: "Prática Clínica.",
		tags: ["quadriceps", "vmo", "patelofemoral", "pos-op"],
		evidence_label: "Prática Clínica",
		evidence_summary: "Essencial na reabilitação de cirurgias de joelho e dor patelofemoral.",
		source_label: "Curadoria FisioFlow",
		sort_order: 20,
		fieldsDefinition: [
			{ id: 'activation_quality', label: 'Qualidade da Contração', type: 'select', options: ['Ótima', 'Regular', 'Pobre', 'Ausente'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-crank-test",
		name: "Crank Test",
		name_en: "Crank Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar lesão labral (SLAP).",
		execution: "Braço em 160° de abdução. Aplicar carga axial no úmero enquanto realiza rotação interna e externa.",
		positive_sign: "Dor, click ou reprodução dos sintomas.",
		reference: "Liu et al. (1996).",
		tags: ["ombro", "slap", "labrum"],
		evidence_label: "Evidência Moderada",
		evidence_summary: "Sensibilidade de 91% e Especificidade de 93% no estudo original.",
		source_label: "Curadoria FisioFlow",
		sort_order: 55,
		imageUrl: "/clinical-tests/illustrations/crank-test-shoulder.png",
		fieldsDefinition: [
			{ id: 'clicking', label: 'Presença de Click', type: 'boolean' },
			{ id: 'pain_levels', label: 'Nível de Dor', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-ludington-sign",
		name: "Sinal de Ludington",
		name_en: "Ludington's Sign",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar ruptura do tendão da cabeça longa do bíceps.",
		execution: "Paciente coloca as mãos na cabeça com dedos entrelaçados. Solicitar contração do bíceps enquanto o examinador palpa o tendão.",
		positive_sign: "Ausência de contração do tendão no sulco bicipital.",
		reference: "Ludington (1923).",
		tags: ["ombro", "biceps", "ruptura"],
		evidence_label: "Evidência Limitada",
		evidence_summary: "Teste clássico para rupturas completas.",
		source_label: "Curadoria FisioFlow",
		sort_order: 60,
		fieldsDefinition: [
			{ id: 'palpation', label: 'Tendão Palpável', type: 'boolean' }
		]
	}),
	createBuiltinTest({
		id: "builtin-thumb-grind",
		name: "Teste de Grind (Polegar)",
		name_en: "Thumb Grind Test",
		category: "Ortopedia",
		target_joint: "Punho",
		type: "special_test",
		purpose: "Avaliar osteoartrite da articulação carpometacarpal (CMC) do polegar.",
		execution: "Examinador aplica carga axial e rotação (moagem) no primeiro metacarpo sobre o trapézio.",
		positive_sign: "Dor ou crepitação na base do polegar.",
		reference: "Glickel (1987).",
		tags: ["punho", "polegar", "rizartrose", "cmc"],
		evidence_label: "Evidência Moderada",
		evidence_summary: "Sensibilidade de 42% e Especificidade de 80% para rizartrose.",
		source_label: "Curadoria FisioFlow",
		sort_order: 65,
		fieldsDefinition: [
			{ id: 'crepitus', label: 'Presença de Creptação', type: 'boolean' },
			{ id: 'pain_nprs', label: 'Dor (0-10)', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-patte-test",
		name: "Teste de Patte",
		name_en: "Patte's Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a integridade do infraespinhal e redondo menor.",
		execution: "Braço em 90° de abdução e 90° de flexão de cotovelo. Paciente realiza rotação externa contra resistência.",
		positive_sign: "Dor ou fraqueza na rotação externa.",
		reference: "Patte, D. (1990). The hornblower's sign.",
		tags: ["ombro", "infraespinhal", "manguito"],
		evidence_label: "Evidência Moderada",
		evidence_summary: "Alta especificidade para rupturas do manguito posterior.",
		source_label: "Curadoria FisioFlow",
		sort_order: 70,
		fieldsDefinition: [
			{ id: 'weakness', label: 'Grau de Fraqueza', type: 'select', options: ['Nenhuma', 'Leve', 'Moderada', 'Grave'] }
		]
	}),
	createBuiltinTest({
		id: "builtin-gerber-liftoff",
		name: "Teste de Gerber (Lift-off)",
		name_en: "Lift-off Test",
		category: "Ortopedia",
		target_joint: "Ombro",
		type: "special_test",
		purpose: "Avaliar a integridade do subescapular.",
		execution: "Mão do paciente no dorso da região lombar. Solicitar que afaste a mão das costas contra resistência.",
		positive_sign: "Inabilidade de afastar ou manter a mão afastada das costas.",
		reference: "Gerber, C. (1991). Clinical assessment of the subscapularis.",
		tags: ["ombro", "subescapular", "manguito"],
		evidence_label: "Padrão Ouro para Subesc",
		evidence_summary: "Teste de escolha para diagnóstico de rupturas do subescapular.",
		source_label: "Curadoria FisioFlow",
		sort_order: 75,
		imageUrl: "/clinical-tests/illustrations/gerber-liftoff.png",
		fieldsDefinition: [
			{ id: 'distance_cm', label: 'Distância Alcançada (estimada cm)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-homan-sign",
		name: "Sinal de Homan",
		name_en: "Homan's Sign",
		category: "Ortopedia",
		target_joint: "Tornozelo",
		type: "special_test",
		purpose: "Rastreio de Trombose Venosa Profunda (TVP).",
		execution: "Dorsiflexão passiva abrupta do tornozelo com o joelho em extensão.",
		positive_sign: "Dor aguda na panturrilha ou fossa poplítea.",
		reference: "Homans, J. (1944). Diseases of the veins.",
		tags: ["vascular", "tvp", "panturrilha"],
		evidence_label: "Baixa Acurácia",
		evidence_summary: "Baixa sensibilidade e especificidade; deve ser usado apenas como rastreio inicial.",
		source_label: "Curadoria FisioFlow",
		sort_order: 80,
		fieldsDefinition: [
			{ id: 'pain_intensity', label: 'Intensidade da Dor', type: 'nprs' }
		]
	}),
	createBuiltinTest({
		id: "builtin-berg-balance-scale",
		name: "Escala de Equilíbrio de Berg",
		name_en: "Berg Balance Scale (BBS)",
		category: "Pós-Operatório",
		target_joint: "Geral",
		type: "performance_test",
		purpose: "Avaliar o equilíbrio estático e dinâmico em adultos e idosos.",
		execution: "Bateria de 14 tarefas funcionais pontuadas de 0 a 4 cada.",
		positive_sign: "Escore total < 45 indica risco aumentado de quedas.",
		reference: "Berg, K. (1989). Measuring balance in the elderly.",
		tags: ["equilibrio", "geriatria", "quedas"],
		evidence_label: "Padrão Ouro",
		evidence_summary: "Altamente confiável para predição de risco de quedas.",
		source_label: "Curadoria FisioFlow",
		sort_order: 85,
		evidence_resources: [
			{ title: "Measuring balance in the elderly", url: "https://pubmed.ncbi.nlm.nih.gov/2704080/", kind: "link" }
		],
		fieldsDefinition: [
			{ id: 'total_score', label: 'Pontuação Total (0-56)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-tinetti-index",
		name: "Índice de Tinetti",
		name_en: "Tinetti POMA",
		category: "Pós-Operatório",
		target_joint: "Geral",
		type: "performance_test",
		purpose: "Avaliar equilíbrio e marcha para predição de quedas.",
		execution: "Observação dividida em sub-escalas de equilíbrio (9 itens) e marcha (7 itens).",
		positive_sign: "Escore < 19 indica alto risco de queda.",
		reference: "Tinetti, M. E. (1986). Performance-oriented assessment.",
		tags: ["equilibrio", "marcha", "geriatria"],
		evidence_label: "Evidência Sólida",
		evidence_summary: "Amplamente utilizado em ambientes hospitalares e de cuidados prolongados.",
		source_label: "Curadoria FisioFlow",
		sort_order: 90,
		fieldsDefinition: [
			{ id: 'balance_score', label: 'Equilíbrio (0-16)', type: 'number' },
			{ id: 'gait_score', label: 'Marcha (0-12)', type: 'number' }
		]
	}),
	createBuiltinTest({
		id: "builtin-sppb",
		name: "Short Physical Performance Battery (SPPB)",
		name_en: "SPPB",
		category: "Pós-Operatório",
		target_joint: "Geral",
		type: "performance_test",
		purpose: "Avaliar funcionalidade de membros inferiores em idosos.",
		execution: "Combina testes de equilíbrio, velocidade de marcha (4m) e tempo de sentar/levantar 5x.",
		positive_sign: "Escore < 10 indica fragilidade ou déficit funcional.",
		reference: "Guralnik, J. M. (1994).",
		tags: ["funcionalidade", "geriatria", "fragilidade"],
		evidence_label: "Preditor de Desfechos",
		evidence_summary: "Forte preditor de incapacidade, hospitalização e mortalidade.",
		source_label: "Curadoria FisioFlow",
		sort_order: 95,
		evidence_resources: [
			{ title: "A short physical performance battery", url: "https://pubmed.ncbi.nlm.nih.gov/8126356/", kind: "link" }
		],
		fieldsDefinition: [
			{ id: 'sppb_total', label: 'Escore SPPB (0-12)', type: 'number' }
		]
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
	"Geral",
	"Coluna",
	"Punho"
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
		const remoteIsCustom =
			(remoteTest as ClinicalTestCatalogRecord).is_custom ??
			Boolean(remoteTest.organization_id);

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
			is_custom: remoteIsCustom,
			is_builtin: builtin ? !remoteIsCustom : false,
			aliases_pt: remoteTest.aliases_pt ?? builtin?.aliases_pt ?? [],
			aliases_en: remoteTest.aliases_en ?? builtin?.aliases_en ?? [],
			dictionary_id: remoteTest.dictionary_id ?? builtin?.dictionary_id ?? null,
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
