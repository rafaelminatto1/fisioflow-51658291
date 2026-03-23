export type KnowledgeGroup =
	| "Ortopedia"
	| "Esportiva"
	| "Pos-operatorio esportivo";

export type EvidenceTier =
	| "CPG"
	| "Consensus"
	| "Guideline"
	| "SystematicReview"
	| "PositionStatement"
	| "Protocol";

export type KnowledgeStatus = "verified" | "pending" | "review" | "rejected";

export interface KnowledgeArticle {
	id: string;
	title: string;
	group: KnowledgeGroup;
	subgroup: string;
	focus: string[];
	evidence: EvidenceTier;
	year?: number;
	source?: string;
	url?: string;
	status: KnowledgeStatus;
	tags: string[];
	highlights: string[];
	observations: string[];
	keyQuestions: string[];
	summary?: string;
	metadata?: {
		attachments?: Array<{
			name: string;
			url: string;
			type: "image" | "video" | "document" | "link";
		}>;
		journal?: string;
		authors?: string[];
		[key: string]: any;
	};
}

export interface KnowledgeGroupMeta {
	id: KnowledgeGroup;
	label: string;
	description: string;
	accent: string;
	soft: string;
}

export const knowledgeGroups: KnowledgeGroupMeta[] = [
	{
		id: "Ortopedia",
		label: "Ortopedia",
		description:
			"Dor, disfuncao e reabilitacao musculoesqueletica baseada em evidencias.",
		accent: "text-emerald-600",
		soft: "bg-emerald-500/10",
	},
	{
		id: "Esportiva",
		label: "Esportiva",
		description:
			"Prevencao, retorno ao esporte e protocolos de alto desempenho.",
		accent: "text-amber-600",
		soft: "bg-amber-500/10",
	},
	{
		id: "Pos-operatorio esportivo",
		label: "Pos-operatorio esportivo",
		description:
			"Reabilitacao criterial apos cirurgia com foco em retorno seguro.",
		accent: "text-sky-600",
		soft: "bg-sky-500/10",
	},
];

const pendingHighlights = [
	"Curadoria pendente",
	"Revisar nivel de evidencia",
	"Definir testes e progressao",
];
const pendingObservations = [
	"Adicionar observacoes clinicas da equipe",
	"Validar recomendacoes-chave",
];

export const knowledgeBase: KnowledgeArticle[] = [
	{
		id: "ortho-lbp-2021",
		title:
			"Low back pain: diretrizes clinicas para pratica baseada em evidencias",
		group: "Ortopedia",
		subgroup: "Coluna",
		focus: ["Classificacao", "Educacao", "Exercicio"],
		evidence: "CPG",
		year: 2021,
		source: "JOSPT",
		url: "https://pubmed.ncbi.nlm.nih.gov/34719940/",
		status: "verified",
		tags: ["dor lombar", "classificacao", "educacao", "exercicio"],
		highlights: [
			"Reforca intervencoes nao farmacologicas",
			"Integra educacao e exercicios progressivos",
			"Enfatiza consistencia na aplicacao clinica",
		],
		observations: ["Usar como base para triagem e estratificacao de risco."],
		keyQuestions: ["Quais intervencoes evitar em dor lombar nao especifica?"],
		metadata: {
			attachments: [
				{
					name: "JOSPT 2021 CPG - Low Back Pain",
					url: "https://www.jospt.org/doi/pdf/10.2519/jospt.2021.0507",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-pfp-2019",
		title: "Patellofemoral pain: clinical practice guideline",
		group: "Ortopedia",
		subgroup: "Joelho",
		focus: ["Diagnostico", "Exercicio", "Carga"],
		evidence: "CPG",
		year: 2019,
		source: "JOSPT",
		url: "https://pubmed.ncbi.nlm.nih.gov/31475628/",
		status: "verified",
		tags: ["patelofemoral", "joelho", "dor anterior"],
		highlights: [
			"Define criterios clinicos e sinais associados",
			"Recomenda exercicios direcionados e educacao",
			"Estabelece diretrizes de carga e retorno gradual",
		],
		observations: ["Alinhar progressao com tolerancia a carga e funcao."],
		keyQuestions: ["Quais testes funcionais priorizar no retorno ao esporte?"],
		metadata: {
			attachments: [
				{
					name: "JOSPT 2019 CPG - Patellofemoral Pain",
					url: "https://www.jospt.org/doi/pdf/10.2519/jospt.2019.0302",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-ankle-2021",
		title: "Lateral ankle sprain: revisao 2021",
		group: "Ortopedia",
		subgroup: "Tornozelo",
		focus: ["Estabilidade", "Prevencao", "Reabilitacao"],
		evidence: "CPG",
		year: 2021,
		source: "JOSPT",
		url: "https://pubmed.ncbi.nlm.nih.gov/33789434/",
		status: "verified",
		tags: ["entorse", "tornozelo", "instabilidade"],
		highlights: [
			"Aborda instabilidade cronica e recorrencia",
			"Integra propriocepcao e treino neuromuscular",
			"Recomenda criterios para retorno funcional",
		],
		observations: ["Mapear risco de instabilidade cronica."],
		keyQuestions: ["Quais criterios objetivos usar para alta?"],
		metadata: {
			attachments: [
				{
					name: "JOSPT 2021 CPG - Lateral Ankle Sprain",
					url: "https://www.jospt.org/doi/pdf/10.2519/jospt.2021.0302",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-achilles-2018",
		title: "Achilles tendinopathy: revisao 2018",
		group: "Ortopedia",
		subgroup: "Tornozelo",
		focus: ["Tendinopatia", "Carga", "Exercicio"],
		evidence: "CPG",
		year: 2018,
		source: "JOSPT",
		url: "https://pubmed.ncbi.nlm.nih.gov/29712543/",
		status: "verified",
		tags: ["tendao de aquiles", "tendinopatia"],
		highlights: [
			"Baseia manejo em exercicio estruturado",
			"Reforca progressao de carga segura",
			"Define criterios para monitorar sintomas",
		],
		observations: ["Documentar resposta a carga e rigidez matinal."],
		keyQuestions: ["Qual janela ideal para carga excêntrica?"],
		metadata: {
			attachments: [
				{
					name: "JOSPT 2018 CPG - Achilles Tendinopathy",
					url: "https://www.jospt.org/doi/pdf/10.2519/jospt.2018.0302",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-rotator-cuff-2025",
		title: "Rotator cuff tendinopathy: CPG 2025",
		group: "Ortopedia",
		subgroup: "Ombro",
		focus: ["Avaliacao", "Reabilitacao", "Retorno"],
		evidence: "CPG",
		year: 2025,
		source: "APTA",
		url: "https://www.apta.org/patient-care/evidence-based-practice-resources/cpgs/CPG_Rotator_Cuff_Tendinopathy_Diagnosis_Non-surgical_Medical_Care_Rehabilitation",
		status: "verified",
		tags: ["manguito", "ombro", "diretrizes"],
		highlights: [
			"Diretrizes para avaliacao e prognostico",
			"Recomendacoes para manejo nao cirurgico",
			"Inclui retorno ao esporte e funcao",
		],
		observations: ["Alinhar conduta com perfil funcional e idade."],
		keyQuestions: ["Quais sinais indicam falha do manejo conservador?"],
		metadata: {
			attachments: [
				{
					name: "APTA 2025 CPG - Rotator Cuff Tendinopathy",
					url: "https://www.orthopt.org/uploads/content_files/files/Rotator_Cuff_CPG.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-glenohumeral-oa-cpg-2023",
		title: "Physical Therapist Management of Glenohumeral Joint Osteoarthritis",
		group: "Ortopedia",
		subgroup: "Ombro",
		focus: ["Osteoartrose", "Exercicio", "Manejo"],
		evidence: "CPG",
		year: 2023,
		source: "PTJ / APTA",
		url: "https://pubmed.ncbi.nlm.nih.gov/37115808/",
		status: "verified",
		tags: ["ombro", "osteoartrose", "diretriz"],
		highlights: [
			"Diretriz especifica para manejo fisioterapeutico da osteoartrose glenoumeral",
			"Integra avaliacao funcional, educacao e exercicio terapeutico",
			"Ajuda a estratificar expectativa, funcao e indicacoes de encaminhamento",
		],
		observations: [
			"Boa base para protocolos de dor e funcao em ombro degenerativo.",
		],
		keyQuestions: [
			"Quais pacientes devem seguir manejo conservador versus encaminhamento?",
		],
	},
	{
		id: "ortho-hip-oa",
		title: "Hip osteoarthritis: CPG revisao 2025",
		group: "Ortopedia",
		subgroup: "Quadril",
		focus: ["Osteoartrose", "Exercicio"],
		evidence: "CPG",
		year: 2025,
		source: "APTA Orthopedics",
		url: "https://www.orthopt.org/news/new-2025-hip-oa-clinical-practice-guideline-now-available",
		status: "verified",
		tags: ["quadril", "oa", "exercicio"],
		highlights: [
			"Atualiza recomendacoes para manejo da dor",
			"Enfatiza treino de forca e educacao",
			"Inclui estrategias de adesao e funcao",
		],
		observations: ["Mapear evolucao funcional com escalas validadas."],
		keyQuestions: ["Quais escalas de desfecho priorizar?"],
		metadata: {
			attachments: [
				{
					name: "APTA 2025 CPG - Hip Osteoarthritis",
					url: "https://www.orthopt.org/uploads/content_files/files/Hip_pain_and_mobility_deficits_hip_osteoarthritis_2025.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-knee-oa",
		title: "Knee osteoarthritis: exercicio e educacao terapeutica",
		group: "Ortopedia",
		subgroup: "Joelho",
		focus: ["Osteoartrose", "Exercicio"],
		evidence: "CPG",
		year: 2021,
		source: "AAOS/APTA",
		url: "https://www.apta.org/patient-care/evidence-based-practice-resources/cpgs/treatment-of-osteoarthritis-of-the-knee-evidence-based-guideline-3rd-edition",
		status: "verified",
		tags: ["joelho", "oa", "educacao"],
		highlights: [
			"Recomendacoes para manejo nao cirurgico",
			"Exercicio terapeutico e educacao sao centrais",
			"Integra criterios de dor e funcao",
		],
		observations: ["Usar escalas KOOS e WOMAC para acompanhamento."],
		keyQuestions: ["Como integrar treinamento de forca e dor?"],
	},
	{
		id: "ortho-fracture-rehab-cpg-review-2020",
		title:
			"Fracture rehabilitation clinical practice guidelines: systematic review for the WHO package",
		group: "Ortopedia",
		subgroup: "Fraturas",
		focus: ["Fraturas", "Reabilitacao", "Diretrizes"],
		evidence: "SystematicReview",
		year: 2020,
		source: "Journal of Orthopaedics and Traumatology",
		url: "https://jorthoptraumatol.springeropen.com/articles/10.1186/s10195-020-00560-w",
		status: "verified",
		tags: ["fratura", "diretriz", "reabilitacao"],
		highlights: [
			"Mapeia diretrizes clinicas para reabilitacao apos fraturas em adultos",
			"Mostra que ha melhor cobertura para fraturas de radio distal e femur/quadril",
			"Aponta baixa densidade de recomendacoes especificas de fisioterapia",
		],
		observations: [
			"Usar como referencia-base para paginas de fraturas e para identificar lacunas de conteudo.",
		],
		keyQuestions: [
			"Quais fraturas ainda carecem de protocolo interno robusto?",
		],
	},
	{
		id: "ortho-tka-cpg-2020",
		title: "Physical Therapist Management of Total Knee Arthroplasty",
		group: "Ortopedia",
		subgroup: "Joelho",
		focus: ["Artroplastia", "Pos-operatorio", "Exercicio"],
		evidence: "CPG",
		year: 2020,
		source: "PTJ / APTA",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7462050/",
		status: "verified",
		tags: ["artroplastia", "joelho", "tka"],
		highlights: [
			"Recomenda exercicio pre-operatorio, mobilidade precoce e treino motor",
			"Inclui NMES e fortalecimento de maior intensidade no pos-agudo inicial",
			"Desencoraja CPM em TKA primaria sem complicacoes",
		],
		observations: [
			"Boa referencia para padronizar bundles de pos-operatorio e alta funcional.",
		],
		keyQuestions: [
			"Quais componentes devem ser obrigatorios no protocolo pos-TKA?",
		],
	},
	{
		id: "ortho-tka-rehab-2023",
		title: "Rehabilitation for Total Knee Arthroplasty: A Systematic Review",
		group: "Ortopedia",
		subgroup: "Joelho",
		focus: ["Artroplastia", "Pos-operatorio", "Reabilitacao"],
		evidence: "SystematicReview",
		year: 2023,
		source: "Am J Phys Med Rehabil",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9464796/",
		status: "verified",
		tags: ["artroplastia", "joelho", "reabilitacao"],
		highlights: [
			"Sintetiza intervencoes agudas e pos-agudas apos TKA",
			"Reforca componentes de forca, flexibilidade, treino funcional e equilibrio",
			"Mostra heterogeneidade entre programas e necessidade de melhor dosagem",
		],
		observations: [
			"Complementa a CPG com panorama comparativo das estrategias de reabilitacao.",
		],
		keyQuestions: [
			"Quais componentes do protocolo geram maior impacto funcional?",
		],
		metadata: {
			attachments: [
				{
					name: "Systematic Review - Knee Arthroplasty (PMC)",
					url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9464796/pdf/nihms-1786452.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-tha-rehab-2023",
		title: "Rehabilitation for Total Hip Arthroplasty: A Systematic Review",
		group: "Ortopedia",
		subgroup: "Quadril",
		focus: ["Artroplastia", "Pos-operatorio", "Reabilitacao"],
		evidence: "SystematicReview",
		year: 2023,
		source: "Am J Phys Med Rehabil",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9464790/",
		status: "verified",
		tags: ["artroplastia", "quadril", "tha"],
		highlights: [
			"Compara diferentes programas de reabilitacao apos THA eletiva",
			"Mostra ausencia de diferencas consistentes entre programas diversos para varios desfechos",
			"Reforca individualizacao e melhor definicao de atributos do programa",
		],
		observations: [
			"Util para evitar protocolos excessivamente complexos sem ganho clinico comprovado.",
		],
		keyQuestions: [
			"Quais componentes realmente diferenciam um bom protocolo pos-THA?",
		],
		metadata: {
			attachments: [
				{
					name: "Systematic Review - Hip Arthroplasty (PMC)",
					url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9464790/pdf/nihms-1786451.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-tha-prehab-2022",
		title:
			"Effect of Prehabilitation in Form of Exercise and/or Education in Patients Undergoing Total Hip Arthroplasty",
		group: "Ortopedia",
		subgroup: "Quadril",
		focus: ["Pre-operatorio", "Artroplastia", "Funcao"],
		evidence: "SystematicReview",
		year: 2022,
		source: "Medicina (Kaunas)",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9228426/",
		status: "verified",
		tags: ["prehabilitation", "quadril", "tha"],
		highlights: [
			"Exercicio pre-operatorio melhora testes funcionais apos THA",
			"Educacao isolada nao mostrou efeito consistente nos desfechos pos-operatorios",
			"Nao foram relatados efeitos negativos relevantes da prehabilitation",
		],
		observations: [
			"Bom artigo-base para trilhas de pre-op em artroplastia de quadril.",
		],
		keyQuestions: ["Como estruturar um bundle minimo de prehab para THA?"],
		metadata: {
			attachments: [
				{
					name: "Prehabilitation - Hip Arthroplasty (PMC)",
					url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9228426/pdf/medicina-58-00742.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-tka-prehab-2025",
		title:
			"Preoperative High-Intensity Strength Training and Outcomes After Total Knee Arthroplasty",
		group: "Ortopedia",
		subgroup: "Joelho",
		focus: ["Pre-operatorio", "Artroplastia", "Forca"],
		evidence: "SystematicReview",
		year: 2025,
		source: "J Arthroplasty",
		url: "https://pubmed.ncbi.nlm.nih.gov/41320898/",
		status: "verified",
		tags: ["prehabilitation", "joelho", "tka"],
		highlights: [
			"Treino de forca pre-operatorio de maior intensidade melhora 6MWT e WOMAC",
			"Mostra beneficio tambem para flexao e qualidade de vida apos TKA",
			"Reforca prehab ativa em vez de apenas orientacao pre-operatoria",
		],
		observations: [
			"Priorizar em pacientes com boa tolerancia a treino e perda funcional pre-op.",
		],
		keyQuestions: [
			"Quem mais se beneficia de prehab de alta intensidade antes da TKA?",
		],
	},
	{
		id: "ortho-hip-fracture-exercise-2023",
		title:
			"Effectiveness of intensive versus regular or no exercise in older adults after hip fracture surgery",
		group: "Ortopedia",
		subgroup: "Quadril",
		focus: ["Fratura", "Pos-operatorio", "Exercicio"],
		evidence: "SystematicReview",
		year: 2023,
		source: "Brazilian Journal of Physical Therapy",
		url: "https://pubmed.ncbi.nlm.nih.gov/36738661/",
		status: "verified",
		tags: ["fratura de quadril", "idoso", "pos-operatorio"],
		highlights: [
			"Exercicio mais intensivo melhora funcao fisica, mobilidade e AVDs apos cirurgia",
			"Mostra ganhos em velocidade de marcha, TUG e equilibrio",
			"A qualidade da evidencia foi baixa, mas o sinal clinico foi favoravel",
		],
		observations: [
			"Valioso para protocolos de fratura de quadril com foco em mobilizacao precoce.",
		],
		keyQuestions: [
			"Como aumentar intensidade sem comprometer seguranca em idosos?",
		],
	},
	{
		id: "ortho-neck-pain",
		title: "Neck pain: triagem, classificacao e exercicio",
		group: "Ortopedia",
		subgroup: "Coluna",
		focus: ["Cervical", "Classificacao"],
		evidence: "CPG",
		year: 2017,
		source: "JOSPT",
		url: "https://pubmed.ncbi.nlm.nih.gov/28666405/",
		status: "verified",
		tags: ["cervical", "dor", "reabilitacao"],
		highlights: [
			"Revisao baseada em classificacao funcional",
			"Integra triagem e tratamento por subgrupos",
			"Recomenda intervencoes nao cirurgicas",
		],
		observations: ["Padronizar classificacao antes de definir protocolo."],
		keyQuestions: ["Quais bandeiras vermelhas priorizar?"],
	},
	{
		id: "ortho-carpal-tunnel",
		title: "Carpal tunnel: manejo conservador e sinais de alarme",
		group: "Ortopedia",
		subgroup: "Punho e Mao",
		focus: ["Neuropatia", "Educacao"],
		evidence: "CPG",
		year: 2024,
		source: "AAOS/APTA",
		url: "https://www.apta.org/patient-care/evidence-based-practice-resources/cpgs/american-academy-of-orthopaedic-surgeons-clinical-practice-guideline-on-management-of-carpal-tunnel-syndrome",
		status: "verified",
		tags: ["punho", "mao", "tunel do carpo"],
		highlights: [
			"Recomenda avaliacao clinica e testes provocativos",
			"Define indicacoes para ortese e intervencoes nao cirurgicas",
			"Sinaliza quando encaminhar para cirurgia",
		],
		observations: ["Monitorar evolucao sensitiva e funcao manual."],
		keyQuestions: ["Quando encaminhar para cirurgia?"],
	},
	{
		id: "ortho-elbow",
		title: "Lateral elbow tendinopathy: progressao de carga",
		group: "Ortopedia",
		subgroup: "Cotovelo",
		focus: ["Tendinopatia", "Carga"],
		evidence: "CPG",
		year: 2022,
		source: "JOSPT/APTA",
		url: "https://pubmed.ncbi.nlm.nih.gov/36453071/",
		status: "verified",
		tags: ["cotovelo", "tenis", "tendinopatia"],
		highlights: [
			"Diretrizes para diagnostico e prognostico funcional",
			"Recomenda intervencoes conservadoras por fase",
			"Inclui testes e medidas de desempenho",
		],
		observations: ["Definir progressao de carga com testes funcionais."],
		keyQuestions: ["Quais parametros de carga usar?"],
		metadata: {
			attachments: [
				{
					name: "JOSPT 2022 CPG - Lateral Elbow Pain",
					url: "https://www.jospt.org/doi/pdf/10.2519/jospt.2022.0302",
					type: "document",
				},
			],
		},
	},
	{
		id: "ortho-shoulder-instability",
		title: "Instabilidade anterior de ombro: manejo nao cirurgico",
		group: "Ortopedia",
		subgroup: "Ombro",
		focus: ["Estabilidade", "Controle neuromuscular"],
		evidence: "Guideline",
		status: "pending",
		tags: ["ombro", "instabilidade"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Quais testes funcionais para retorno?"],
	},
	{
		id: "ortho-plantar-fascia",
		title: "Fasciite plantar: protocolos de carga e analgesia",
		group: "Ortopedia",
		subgroup: "Pe",
		focus: ["Dor", "Carga"],
		evidence: "CPG",
		year: 2023,
		source: "JOSPT/APTA",
		url: "https://pubmed.ncbi.nlm.nih.gov/38037331/",
		status: "verified",
		tags: ["pe", "fasciite", "carga"],
		highlights: [
			"Atualiza recomendacoes para manejo nao artritico",
			"Integra mobilizacao, alongamento e carga progressiva",
			"Define medidas de funcao e dor para acompanhamento",
		],
		observations: ["Usar LEFS e escalas funcionais padrao."],
		keyQuestions: ["Qual combinacao de intervencoes e mais eficiente?"],
		metadata: {
			attachments: [
				{
					name: "JOSPT 2023 CPG - Plantar Fasciitis",
					url: "https://www.jospt.org/doi/pdf/10.2519/jospt.2023.0303",
					type: "document",
				},
			],
		},
	},
	{
		id: "sport-rtp-panther-2020",
		title: "Return to sport after ACL injury: Panther consensus",
		group: "Esportiva",
		subgroup: "Retorno ao Esporte",
		focus: ["RTS", "Testes funcionais", "Decisao"],
		evidence: "Consensus",
		year: 2020,
		source: "Panther Symposium",
		url: "https://pubmed.ncbi.nlm.nih.gov/32347344/",
		status: "verified",
		tags: ["acl", "rts", "consenso"],
		highlights: [
			"Define continuum de retorno ao esporte",
			"Desencoraja decisoes apenas por tempo",
			"Recomenda testes objetivos e prontidao psicologica",
		],
		observations: ["Usar como guia para baterias de teste."],
		keyQuestions: ["Quais testes devem ser obrigatorios?"],
		metadata: {
			attachments: [
				{
					name: "Panther Consensus 2020 - ACL RTS",
					url: "https://www.zora.uzh.ch/id/eprint/193138/1/Panther_Consensus_RTS_ZORA.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "sport-acl-prevention-cpg-2023",
		title:
			"Exercise-Based Knee and Anterior Cruciate Ligament Injury Prevention",
		group: "Esportiva",
		subgroup: "Joelho",
		focus: ["Prevencao", "ACL", "Treino neuromuscular"],
		evidence: "CPG",
		year: 2023,
		source: "JOSPT",
		url: "https://pubmed.ncbi.nlm.nih.gov/36587265/",
		status: "verified",
		tags: ["acl", "prevencao", "neuromuscular"],
		highlights: [
			"Atualiza a diretriz de prevencao de lesoes de joelho e LCA com base em exercicio",
			"Fortalece o uso de programas neuromusculares estruturados como padrao preventivo",
			"Pode ser aplicado tanto em prevencao primaria quanto secundaria",
		],
		observations: [
			"Importante para trilhas esportivas de prevencao, aquecimento e retorno gradual.",
		],
		keyQuestions: [
			"Como integrar programas preventivos de LCA na rotina da equipe?",
		],
	},
	{
		id: "sport-doha-groin-2015",
		title: "Doha agreement: terminologia de dor inguinal em atletas",
		group: "Esportiva",
		subgroup: "Quadril e Inguinal",
		focus: ["Taxonomia", "Diagnostico"],
		evidence: "Consensus",
		year: 2015,
		source: "BJSM",
		url: "https://bjsm.bmj.com/content/49/12/768",
		status: "verified",
		tags: ["inguinal", "doha", "classificacao"],
		highlights: [
			"Define tres grandes categorias de dor inguinal",
			"Padroniza terminologia clinica",
			"Facilita comunicacao entre equipes",
		],
		observations: ["Aplicar classificacao antes de exames de imagem."],
		keyQuestions: [
			"Como integrar classificacao com protocolos de reabilitacao?",
		],
		metadata: {
			attachments: [
				{
					name: "Doha Agreement 2015 - Groin Pain",
					url: "https://bjsm.bmj.com/content/bjsports/49/12/768.full.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "sport-hamstring",
		title: "Hamstring strain: consenso e retorno ao esporte",
		group: "Esportiva",
		subgroup: "Coxa",
		focus: ["Lesao muscular", "RTS"],
		evidence: "Guideline",
		year: 2017,
		source: "J Sport Health Sci",
		url: "https://doaj.org/article/76807bb8f7064a109b83880205b268d1",
		status: "verified",
		tags: ["isquiotibiais", "lesao muscular"],
		highlights: [
			"Reforca criterios funcionais para retorno",
			"Destaca alto risco de recidiva sem progressao adequada",
			"Apresenta algoritmo clinico para reabilitacao",
		],
		observations: ["Implementar bateria funcional antes de liberar RTS."],
		keyQuestions: ["Quais criterios minimizam recidiva?"],
	},
	{
		id: "sport-adductor",
		title: "Lesoes do adutor: diagnostico e reabilitacao",
		group: "Esportiva",
		subgroup: "Quadril e Inguinal",
		focus: ["Lesao muscular", "Forca"],
		evidence: "Protocol",
		status: "pending",
		tags: ["adutor", "inguinal"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Qual progressao de forca ideal?"],
	},
	{
		id: "sport-running",
		title: "Lesoes relacionadas a corrida: manejo por carga",
		group: "Esportiva",
		subgroup: "Performance",
		focus: ["Carga", "Prevencao"],
		evidence: "Guideline",
		status: "pending",
		tags: ["corrida", "prevencao"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Como ajustar volume e intensidade?"],
	},
	{
		id: "sport-stress-fracture",
		title: "Stress fracture: retorno gradual e monitoramento",
		group: "Esportiva",
		subgroup: "Osso",
		focus: ["Carga", "RTS"],
		evidence: "Guideline",
		status: "pending",
		tags: ["fratura", "estresse"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Quais marcadores indicam pronta retomada?"],
	},
	{
		id: "sport-concussion",
		title: "Concussao: protocolo interdisciplinar de retorno",
		group: "Esportiva",
		subgroup: "Neuro",
		focus: ["RTS", "Seguranca"],
		evidence: "Consensus",
		year: 2024,
		source: "Arthroscopy",
		url: "https://pubmed.ncbi.nlm.nih.gov/37414106/",
		status: "verified",
		tags: ["concussao", "rtp"],
		highlights: [
			"Delphi consensus para retorno ao esporte",
			"Recomenda protocolo graduado e individualizado",
			"Avalia sintomas, exame e testes de esforco",
		],
		observations: ["Alinhar retorno com equipe medica e neuro."],
		keyQuestions: ["Quais etapas devem ser supervisionadas?"],
	},
	{
		id: "sport-shoulder-overhead",
		title: "Ombro do atleta arremessador: manejo por fases",
		group: "Esportiva",
		subgroup: "Ombro",
		focus: ["Mobilidade", "Forca"],
		evidence: "Guideline",
		status: "pending",
		tags: ["ombro", "arremesso"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Qual equilibrio entre mobilidade e estabilidade?"],
	},
	{
		id: "sport-patellar-tendinopathy",
		title: "Tendinopatia patelar: progressao de carga e dor",
		group: "Esportiva",
		subgroup: "Joelho",
		focus: ["Carga", "Tendinopatia"],
		evidence: "SystematicReview",
		status: "pending",
		tags: ["tendinopatia", "patelar"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Qual periodo ideal de carga pesada?"],
	},
	{
		id: "sport-achilles-rupture",
		title: "Ruptura de aquiles: retorno a corrida e salto",
		group: "Esportiva",
		subgroup: "Tornozelo",
		focus: ["RTS", "Forca"],
		evidence: "Guideline",
		status: "pending",
		tags: ["aquiles", "ruptura"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Quais testes funcionais pre-retorno?"],
	},
	{
		id: "sport-load-management",
		title: "Gestao de carga no atleta: principios e metricas",
		group: "Esportiva",
		subgroup: "Performance",
		focus: ["Carga", "Prevencao"],
		evidence: "Guideline",
		status: "pending",
		tags: ["carga", "monitoramento"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Como medir carga interna e externa?"],
	},
	{
		id: "sport-hip-groin-rtp",
		title: "Quadril e inguinal: criterios para retorno seguro",
		group: "Esportiva",
		subgroup: "Quadril e Inguinal",
		focus: ["RTS", "Forca"],
		evidence: "Guideline",
		status: "pending",
		tags: ["quadril", "inguinal", "rtp"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Quais testes de forca e dor sao criticos?"],
	},
	{
		id: "postop-aclr-aspetar-2023",
		title: "ACLR: Aspetar clinical practice guideline",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Reabilitacao", "Progressao", "RTS"],
		evidence: "CPG",
		year: 2023,
		source: "Aspetar/BJSM",
		url: "https://pubmed.ncbi.nlm.nih.gov/36731908/",
		status: "verified",
		tags: ["acl", "reconstrucao", "criterios"],
		highlights: [
			"Exercicio e principal eixo da reabilitacao",
			"Modalidades podem apoiar fase inicial",
			"Marcos de retorno a corrida e treino sao centrais",
		],
		observations: ["Incluir criterios objetivos de progressao."],
		keyQuestions: ["Como padronizar criterios de alta?"],
		metadata: {
			attachments: [
				{
					name: "Aspetar 2023 CPG - ACL Reconstruction",
					url: "https://bjsm.bmj.com/content/bjsports/early/2023/02/01/bjsports-2022-106173.full.pdf",
					type: "document",
				},
			],
		},
	},
	{
		id: "postop-acl-kngf-2016",
		title: "ACLR: practice guidelines baseadas em revisao sistematica",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Reabilitacao", "Fases", "Testes"],
		evidence: "Guideline",
		year: 2016,
		source: "BJSM",
		url: "https://doi.org/10.1136/bjsports-2015-095898",
		status: "verified",
		tags: ["acl", "fases", "teste"],
		highlights: [
			"Reabilitacao em fases baseadas em criterios",
			"Bateria de testes para progressao",
			"Inclui prehabilitacao e treino neuromuscular",
		],
		observations: ["Mapear criterios por etapa no protocolo interno."],
		keyQuestions: ["Quais testes sao minimos para retorno?"],
	},
	{
		id: "postop-acl-rts-testing-2025",
		title: "RTS testing apos ACLR: validade e aplicacao clinica",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["RTS", "Testes", "Risco de recidiva"],
		evidence: "Guideline",
		year: 2025,
		source: "Orthop J Sports Med",
		url: "https://pubmed.ncbi.nlm.nih.gov/40342351/",
		status: "verified",
		tags: ["acl", "rts", "testes"],
		highlights: [
			"Avalia validade e confiabilidade de testes de retorno",
			"Inclui criterios de risco de reinjuria",
			"Recomenda combinacao de testes objetivos",
		],
		observations: ["Definir bateria minima e indicadores de risco."],
		keyQuestions: ["Quais testes sao mais factiveis no dia a dia?"],
	},
	{
		id: "postop-acl-rts-timing-2025",
		title: "Timing de testes de retorno ao esporte apos ACLR",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["RTS", "Cronograma", "Reabilitacao criterial"],
		evidence: "SystematicReview",
		year: 2025,
		source: "Appl Sci",
		url: "https://pubmed.ncbi.nlm.nih.gov/40915074/",
		status: "verified",
		tags: ["acl", "rts", "tempo"],
		highlights: [
			"Analisa janela ideal para testes de retorno",
			"Relaciona tempo e marcadores funcionais",
			"Sugere criterios progressivos por fase",
		],
		observations: ["Usar em conjunto com criterios clinicos internos."],
		keyQuestions: ["Qual janela minima segura para RTS?"],
	},
	{
		id: "postop-meniscus-repair",
		title:
			"Return-to-Play and Rehabilitation Protocols Following Isolated Meniscal Repair",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Carga", "ROM", "RTS"],
		evidence: "SystematicReview",
		year: 2021,
		source: "Arthroscopy, Sports Medicine, and Rehabilitation",
		url: "https://pubmed.ncbi.nlm.nih.gov/33615271/",
		status: "verified",
		tags: ["menisco", "reparo"],
		highlights: [
			"A literatura usa majoritariamente criterios por tempo, com 6 meses sendo o marco mais comum de retorno",
			"Ha grande heterogeneidade entre protocolos e baixa padronizacao de criterios objetivos",
			"O retorno ao esporte e frequente, mas a qualidade do criterio de progressao ainda e limitada",
		],
		observations: [
			"Bom artigo para construir protocolo interno mais criterial do que a literatura media.",
		],
		keyQuestions: [
			"Quais criterios objetivos devem complementar o criterio temporal apos reparo meniscal?",
		],
	},
	{
		id: "postop-acl-meniscus",
		title: "ACLR + menisco: combinacao de protocolos",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Carga", "RTS"],
		evidence: "Protocol",
		status: "pending",
		tags: ["acl", "menisco"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Como ajustar progressao de carga combinada?"],
	},
	{
		id: "postop-rotator-cuff-repair",
		title:
			"Effectiveness of early versus delayed rehabilitation following rotator cuff repair",
		group: "Pos-operatorio esportivo",
		subgroup: "Ombro",
		focus: ["ROM", "Forca", "Retorno"],
		evidence: "SystematicReview",
		year: 2021,
		source: "PLoS One",
		url: "https://pubmed.ncbi.nlm.nih.gov/34048450/",
		status: "verified",
		tags: ["manguito", "reparo"],
		highlights: [
			"Mobilizacao precoce melhora ROM inicial apos reparo do manguito",
			"Na maioria dos desfechos nao houve diferenca clinica relevante entre protocolos",
			"Reabilitacao precoce nao aumentou risco de re-ruptura nessa sintese",
		],
		observations: [
			"Usar para calibrar sling, progressao de movimento e expectativas por fase.",
		],
		keyQuestions: [
			"Qual timing ideal para progredir de movimento passivo para ativo?",
		],
		metadata: {
			attachments: [
				{
					name: "Meta-analysis - Rotator Cuff Repair (PLoS)",
					url: "https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0252137&type=printable",
					type: "document",
				},
			],
		},
	},
	{
		id: "postop-shoulder-instability",
		title:
			"Return to sport after surgical treatment for posterior shoulder instability",
		group: "Pos-operatorio esportivo",
		subgroup: "Ombro",
		focus: ["Estabilidade", "RTS"],
		evidence: "SystematicReview",
		year: 2020,
		source: "JSES International",
		url: "https://pubmed.ncbi.nlm.nih.gov/33345218/",
		status: "verified",
		tags: ["ombro", "instabilidade"],
		highlights: [
			"Mostra alta taxa de retorno ao esporte apos cirurgia para instabilidade posterior do ombro",
			"O tempo de retorno relatado gira em torno de 4 a 8 meses",
			"Os desfechos funcionais melhoram, mas ainda ha variacao no retorno ao nivel pre-lesao",
		],
		observations: [
			"Util para calibrar expectativa de retorno e progressao funcional apos estabilizacao.",
		],
		keyQuestions: [
			"Quais testes e marcos clinicos devem liberar retorno overhead ou de contato?",
		],
	},
	{
		id: "postop-hip-arthroscopy",
		title:
			"Criteria for Return to Play After Hip Arthroscopy in the Treatment of Femoroacetabular Impingement",
		group: "Pos-operatorio esportivo",
		subgroup: "Quadril",
		focus: ["RTS", "Forca", "Mobilidade"],
		evidence: "SystematicReview",
		year: 2022,
		source: "Am J Sports Med",
		url: "https://pubmed.ncbi.nlm.nih.gov/34591697/",
		status: "verified",
		tags: ["quadril", "artroscopia"],
		highlights: [
			"A maioria dos estudos reporta retorno ao esporte em cerca de 6 a 7 meses apos artroscopia para FAI",
			"Os criterios de RTP sao pouco padronizados apesar do alto volume de literatura",
			"Ha boa taxa global de retorno, mas variacao importante para retorno ao nivel previo",
		],
		observations: [
			"Serve de base para um protocolo interno com mais testes objetivos de forca e controle de carga.",
		],
		keyQuestions: [
			"Quais testes devem ser exigidos antes do retorno a mudancas de direcao e impacto?",
		],
	},
	{
		id: "postop-ucl",
		title: "Reconstrucao UCL: progressao de arremesso",
		group: "Pos-operatorio esportivo",
		subgroup: "Cotovelo",
		focus: ["Retorno ao arremesso", "Forca"],
		evidence: "Protocol",
		status: "pending",
		tags: ["ucl", "arremesso"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Qual janela de retorno para atletas?"],
	},
	{
		id: "postop-mpfl",
		title:
			"Fear of Reinjury, Psychological Factors, and Sport Played Following Medial Patellofemoral Ligament Reconstruction",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Estabilidade", "Forca"],
		evidence: "SystematicReview",
		year: 2024,
		source: "Arthroscopy",
		url: "https://pubmed.ncbi.nlm.nih.gov/38849062/",
		status: "verified",
		tags: ["patela", "estabilidade"],
		highlights: [
			"O retorno ao esporte apos MPFLR e geralmente alto, mas o retorno ao mesmo nivel varia bastante",
			"Medo de recidiva e prontidao psicologica influenciam fortemente o retorno",
			"O tipo de esporte interfere na chance de voltar ao nivel anterior",
		],
		observations: [
			"Incluir componente psicologico e esporte-especifico no protocolo de alta apos MPFLR.",
		],
		keyQuestions: [
			"Como incorporar prontidao psicologica ao retorno apos MPFLR?",
		],
	},
	{
		id: "postop-patellar-tendon",
		title: "Reparo tendao patelar: protecao e progressao",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Carga", "RTS"],
		evidence: "Protocol",
		status: "pending",
		tags: ["tendao patelar", "reparo"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Quando iniciar salto?"],
	},
	{
		id: "postop-achilles-rupture",
		title:
			"Successful functional outcomes and return to sport after surgery for acute Achilles tendon rupture",
		group: "Pos-operatorio esportivo",
		subgroup: "Tornozelo",
		focus: ["Forca", "RTS"],
		evidence: "SystematicReview",
		year: 2024,
		source: "Knee Surgery, Sports Traumatology, Arthroscopy",
		url: "https://pubmed.ncbi.nlm.nih.gov/41164319/",
		status: "verified",
		tags: ["aquiles", "pos-op"],
		highlights: [
			"Apos reparo cirurgico agudo do Aquiles, cerca de 77% retornam ao esporte",
			"O tempo medio de retorno fica em torno de 8 meses",
			"Re-ruptura e infeccao sao as complicacoes pos-operatorias mais reportadas",
		],
		observations: [
			"Boa referencia para fases tardias, pliometria e expectativa de retorno ao esporte.",
		],
		keyQuestions: [
			"Quais marcadores de forca plantarflexora devem anteceder corrida e salto?",
		],
	},
	{
		id: "postop-cartilage-repair",
		title:
			"High Rate of Return to Sport for Athletes Undergoing Articular Cartilage Restoration Procedures for the Knee",
		group: "Pos-operatorio esportivo",
		subgroup: "Joelho",
		focus: ["Carga", "Impacto"],
		evidence: "SystematicReview",
		year: 2025,
		source: "Am J Sports Med",
		url: "https://pubmed.ncbi.nlm.nih.gov/39790040/",
		status: "verified",
		tags: ["cartilagem", "joelho"],
		highlights: [
			"A literatura contemporanea mostra retorno ao esporte global em torno de 80% apos restauracao cartilaginosa do joelho",
			"OATS e MACI apresentam maior propensao de retorno ao mesmo ou maior nivel",
			"Microfratura se associa de forma consistente a pior capacidade de retorno esportivo",
		],
		observations: [
			"Importante para modular prognostico esportivo conforme a tecnica cartilaginosa utilizada.",
		],
		keyQuestions: [
			"Como modular impacto e expectativa conforme a tecnica de restauracao cartilaginosa?",
		],
	},
	{
		id: "postop-ankle",
		title:
			"Return to Sport After Anatomic Lateral Ankle Stabilization Surgery for Chronic Ankle Instability",
		group: "Pos-operatorio esportivo",
		subgroup: "Tornozelo",
		focus: ["Estabilidade", "RTS"],
		evidence: "SystematicReview",
		year: 2024,
		source: "Am J Sports Med",
		url: "https://pubmed.ncbi.nlm.nih.gov/37252803/",
		status: "verified",
		tags: ["tornozelo", "pos-op"],
		highlights: [
			"A cirurgia anatomica para instabilidade lateral cronica tem alta taxa de retorno ao esporte",
			"O retorno ao nivel pre-lesao tambem e alto, com media de retorno em torno de 12 semanas",
			"Idade e IMC mais altos se associam a maior risco de falha no retorno",
		],
		observations: [
			"Valioso para definir janelas de retorno e aconselhamento de risco apos cirurgia ligamentar lateral.",
		],
		keyQuestions: [
			"Quais testes funcionais devem anteceder retorno a saltos e mudancas de direcao?",
		],
	},
	{
		id: "postop-shoulder-labral",
		title: "Reparo labral: fases de mobilidade e controle",
		group: "Pos-operatorio esportivo",
		subgroup: "Ombro",
		focus: ["Mobilidade", "Controle"],
		evidence: "Protocol",
		status: "pending",
		tags: ["labrum", "ombro"],
		highlights: pendingHighlights,
		observations: pendingObservations,
		keyQuestions: ["Quando liberar movimento acima da cabeca?"],
	},
];

export const knowledgeEvidenceLabels: Record<EvidenceTier, string> = {
	CPG: "Diretriz Clinica",
	Consensus: "Consenso",
	Guideline: "Guia",
	SystematicReview: "Revisao Sistem.",
	PositionStatement: "Posicionamento",
	Protocol: "Protocolo",
};
