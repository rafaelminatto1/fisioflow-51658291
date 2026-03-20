export interface Pathology {
	id: string;
	label: string;
	category: "orthopedics" | "sports" | "post-op" | "other";
}

export const PATHOLOGIES: Pathology[] = [
	// Ortopedia Geral
	{
		id: "dor_lombar_cronica",
		label: "Dor Lombar Crônica",
		category: "orthopedics",
	},
	{ id: "hernia_de_disco", label: "Hérnia de Disco", category: "orthopedics" },
	{ id: "cervicalgia", label: "Cervicalgia", category: "orthopedics" },
	{ id: "escoliose", label: "Escoliose", category: "orthopedics" },
	{
		id: "artrose_joelho",
		label: "Artrose de Joelho (Gonartrose)",
		category: "orthopedics",
	},
	{
		id: "artrose_quadril",
		label: "Artrose de Quadril (Coxartrose)",
		category: "orthopedics",
	},
	{
		id: "tendinite_ombro",
		label: "Tendinite de Ombro / Manguito Rotador",
		category: "orthopedics",
	},
	{ id: "bursite", label: "Bursite", category: "orthopedics" },
	{ id: "fascite_plantar", label: "Fascite Plantar", category: "orthopedics" },
	{
		id: "sindrome_tunel_carpo",
		label: "Síndrome do Túnel do Carpo",
		category: "orthopedics",
	},
	{
		id: "epicondilite_lateral",
		label: "Epicondilite Lateral (Cotovelo de Tenista)",
		category: "orthopedics",
	},
	{
		id: "epicondilite_medial",
		label: "Epicondilite Medial (Cotovelo de Golfista)",
		category: "orthopedics",
	},
	{ id: "fibromialgia", label: "Fibromialgia", category: "orthopedics" },
	{ id: "osteoporose", label: "Osteoporose", category: "orthopedics" },
	{
		id: "estenos_canal_vertebral",
		label: "Estenose do Canal Vertebral",
		category: "orthopedics",
	},

	// Fisioterapia Esportiva
	{
		id: "lesao_lca",
		label: "Lesão de LCA (Ligamento Cruzado Anterior)",
		category: "sports",
	},
	{ id: "lesao_menisco", label: "Lesão Meniscal", category: "sports" },
	{
		id: "entorse_tornozelo",
		label: "Entorse de Tornozelo",
		category: "sports",
	},
	{
		id: "estiramento_muscular",
		label: "Estiramento / Lesão Muscular",
		category: "sports",
	},
	{
		id: "tendinopatia_aquiles",
		label: "Tendinopatia de Aquiles",
		category: "sports",
	},
	{
		id: "sindrome_patelofemoral",
		label: "Síndrome de Dor Patelofemoral",
		category: "sports",
	},
	{ id: "pubalgia", label: "Pubalgia", category: "sports" },
	{
		id: "lesao_labral_quadril",
		label: "Lesão Labral (Quadril)",
		category: "sports",
	},
	{ id: "lesao_slap_ombro", label: "Lesão SLAP (Ombro)", category: "sports" },
	{
		id: "concussao_esportiva",
		label: "Concussão Esportiva",
		category: "sports",
	},
	{ id: "fratura_estresse", label: "Fratura por Estresse", category: "sports" },

	// Pós-Operatório Ortopédico
	{
		id: "po_reconstrucao_lca",
		label: "Pós-Op Reconstrução de LCA",
		category: "post-op",
	},
	{
		id: "po_protese_total_joelho",
		label: "Pós-Op Prótese Total de Joelho (ATJ)",
		category: "post-op",
	},
	{
		id: "po_protese_total_quadril",
		label: "Pós-Op Prótese Total de Quadril (ATQ)",
		category: "post-op",
	},
	{
		id: "po_reparo_manguito",
		label: "Pós-Op Reparo de Manguito Rotador",
		category: "post-op",
	},
	{
		id: "po_artroscopia_joelho",
		label: "Pós-Op Artroscopia de Joelho",
		category: "post-op",
	},
	{
		id: "po_osteossintese_fratura",
		label: "Pós-Op Osteossíntese de Fratura",
		category: "post-op",
	},
	{
		id: "po_artrodese_coluna",
		label: "Pós-Op Artrodese de Coluna",
		category: "post-op",
	},
	{
		id: "po_liberacao_tunel_carpo",
		label: "Pós-Op Liberação de Túnel do Carpo",
		category: "post-op",
	},
	{
		id: "po_reparo_tendao_aquiles",
		label: "Pós-Op Reparo de Tendão de Aquiles",
		category: "post-op",
	},
	{
		id: "po_meniscectomia",
		label: "Pós-Op Meniscectomia",
		category: "post-op",
	},
	{
		id: "po_labrum_quadril",
		label: "Pós-Op Reparo de Labrum (Quadril)",
		category: "post-op",
	},
];

const CATEGORY_MAP: Record<string, string> = {
	orthopedics: "Ortopedia Geral",
	sports: "Fisioterapia Esportiva",
	"post-op": "Pós-Operatório",
	other: "Outros",
};

export const PATHOLOGY_OPTIONS = PATHOLOGIES.map((p) => ({
	value: p.label,
	label: p.label,
	category: CATEGORY_MAP[p.category] || p.category,
})).sort((a, b) => a.label.localeCompare(b.label));
