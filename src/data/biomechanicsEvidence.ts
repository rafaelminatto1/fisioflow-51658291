export type BiomechanicsEvidenceMode =
	| "jump"
	| "gait"
	| "posture"
	| "functional";

export interface BiomechanicsEvidenceArticle {
	id: string;
	title: string;
	authors: string;
	year: number;
	journal: string;
	url: string;
	doi?: string;
	summary: string;
	clinicalTakeaway: string;
	group: "Esportiva" | "Ortopedia";
	subgroup: string;
	evidence: "SystematicReview" | "Guideline" | "Consensus";
	tags: string[];
}

export interface BiomechanicsProtocolDefinition {
	mode: BiomechanicsEvidenceMode;
	title: string;
	subtitle: string;
	description: string;
	keyPoints: string[];
	preparationChecklist: string[];
	captureAngles: string[];
	executionSteps: string[];
	measuredOutputs: string[];
	articles: BiomechanicsEvidenceArticle[];
}

export const biomechanicsProtocols: Record<
	BiomechanicsEvidenceMode,
	BiomechanicsProtocolDefinition
> = {
	jump: {
		mode: "jump",
		title: "Salto vertical e potência",
		subtitle: "CMJ / My Jump / Bosco",
		description:
			"Fluxo voltado para countermovement jump, tempo de voo, altura estimada, potência e comparação entre tentativas.",
		keyPoints: [
			"Frame a frame para decolagem e aterrissagem",
			"Comparação entre tentativas e snapshots-chave",
			"IA opcional para landmarks e trajetórias",
		],
		preparationChecklist: [
			"Gravar em plano sagital com o celular estabilizado na altura do quadril.",
			"Manter corpo inteiro visível do agachamento até a aterrissagem.",
			"Registrar 2 a 3 tentativas com intervalo curto entre repetições.",
		],
		captureAngles: [
			"Perfil lateral para tempo de voo, agachamento e aterrissagem.",
			"Frontal opcional para assimetria de joelho e tronco.",
		],
		executionSteps: [
			"Importe o vídeo ou use a webcam.",
			"Marque decolagem e aterrissagem frame a frame.",
			"Ative IA apenas se quiser overlay assistido de landmarks.",
			"Compare snapshots-chave entre tentativas antes de exportar.",
		],
		measuredOutputs: [
			"Tempo de voo",
			"Altura estimada do salto",
			"Potência estimada",
			"Snapshots de decolagem e aterrissagem",
		],
		articles: [
			{
				id: "cmj-portable-devices-2018",
				title:
					"Countermovement Jump Analysis Using Different Portable Devices: Implications for Field Testing",
				authors: "Pérez-Castilla A, et al.",
				year: 2018,
				journal: "Sports",
				doi: "10.3390/sports6030091",
				url: "https://doi.org/10.3390/sports6030091",
				summary:
					"Compara diferentes dispositivos portáteis para análise de CMJ em contexto de campo.",
				clinicalTakeaway:
					"Ajuda a sustentar o uso clínico de medidas simples de salto fora do laboratório.",
				group: "Esportiva",
				subgroup: "Salto",
				evidence: "SystematicReview",
				tags: ["cmj", "my jump", "salto vertical", "potencia"],
			},
			{
				id: "my-jump-review-2019",
				title:
					"Using Smartphones for Jump Diagnostics: A Brief Review of the Validity and Reliability of the My Jump App",
				authors: "Balsalobre-Fernández C, et al.",
				year: 2019,
				journal: "Strength and Conditioning Journal",
				doi: "10.1519/SSC.0000000000000472",
				url: "https://doi.org/10.1519/SSC.0000000000000472",
				summary:
					"Revisão breve sobre validade e confiabilidade do app My Jump para diagnóstico de salto.",
				clinicalTakeaway:
					"Reforça que vídeo e smartphone podem ser suficientes para análise prática de salto.",
				group: "Esportiva",
				subgroup: "Salto",
				evidence: "SystematicReview",
				tags: ["my jump", "salto", "video analysis"],
			},
			{
				id: "my-jump-2-validity-2024",
				title:
					"Validity and reliability of My Jump 2 app for measuring countermovement jump in recreational runners",
				authors: "Montalvo S, et al.",
				year: 2024,
				journal: "PeerJ",
				doi: "10.7717/peerj.17387",
				url: "https://doi.org/10.7717/peerj.17387",
				summary:
					"Valida o My Jump 2 para medir countermovement jump em corredores recreacionais.",
				clinicalTakeaway:
					"Fortalece o uso de análise por vídeo como ferramenta prática em clínica esportiva.",
				group: "Esportiva",
				subgroup: "Salto",
				evidence: "SystematicReview",
				tags: ["my jump 2", "cmj", "corredor"],
			},
		],
	},
	gait: {
		mode: "gait",
		title: "Marcha e corrida em esteira",
		subtitle: "2D video running analysis",
		description:
			"Fluxo para análise clínica de marcha e corrida em esteira com eventos, cadência, contato e comparação entre vídeos.",
		keyPoints: [
			"Frame a frame para contato inicial e toe-off",
			"Corrida em esteira com vista sagital e frontal",
			"Comparação lado a lado e export de snapshots",
		],
		preparationChecklist: [
			"Gravar 10 a 20 segundos contínuos em esteira.",
			"Capturar pelo menos uma vista sagital e, se possível, uma frontal/posterior.",
			"Manter velocidade da esteira registrada antes da análise.",
		],
		captureAngles: [
			"Vista sagital para contato inicial, meio apoio e toe-off.",
			"Vista frontal para alinhamento de joelho, pelve e tronco.",
		],
		executionSteps: [
			"Importe o vídeo e avance frame a frame até os eventos-chave.",
			"Marque contato inicial e toe-off nos dois lados.",
			"Use trajetórias e snapshots para comparar ciclos consecutivos.",
			"Ative IA só quando precisar de referência de landmarks.",
		],
		measuredOutputs: [
			"Eventos do ciclo de marcha/corrida",
			"Cadência observacional",
			"Assimetrias visuais de apoio",
			"Snapshots comparativos por ciclo",
		],
		articles: [
			{
				id: "morin-running-stiffness-2005",
				title: "A simple method for measuring stiffness during running",
				authors: "Morin JB, et al.",
				year: 2005,
				journal: "Journal of Applied Biomechanics",
				url: "https://pubmed.ncbi.nlm.nih.gov/16095411/",
				summary:
					"Descreve método simples para estimar stiffness e parâmetros temporais durante corrida.",
				clinicalTakeaway:
					"Serve de base para métricas temporais e interpretação clínica de corrida em esteira.",
				group: "Esportiva",
				subgroup: "Corrida",
				evidence: "Consensus",
				tags: ["corrida", "marcha", "stiffness", "esteira"],
			},
			{
				id: "2d-running-reliability-2018",
				title: "Reliability of Two-Dimensional Video-Based Running Gait Analysis",
				authors: "Reinking MF, et al.",
				year: 2018,
				journal: "International Journal of Sports Physical Therapy",
				url: "https://pubmed.ncbi.nlm.nih.gov/30038831/",
				summary:
					"Estuda confiabilidade inter e intraexaminador da análise 2D de corrida em esteira.",
				clinicalTakeaway:
					"Valida a proposta de usar vídeo 2D em clínica para corrida, especialmente com protocolo consistente.",
				group: "Esportiva",
				subgroup: "Corrida",
				evidence: "SystematicReview",
				tags: ["2d video", "running gait", "reliability", "treadmill"],
			},
		],
	},
	posture: {
		mode: "posture",
		title: "Postura e escoliose",
		subtitle: "Fotogrametria e alinhamento",
		description:
			"Fluxo para postura estática, linhas de referência, goniometria visual e triagem de escoliose por imagem comum.",
		keyPoints: [
			"Linhas de prumo e goniometria visual",
			"Snapshots comparativos por vista",
			"Triagem orientada para encaminhamento",
		],
		preparationChecklist: [
			"Fotografar paciente em posição ortostática com fundo limpo.",
			"Capturar vistas anterior, lateral e posterior.",
			"Usar referências anatômicas visíveis e iluminação uniforme.",
		],
		captureAngles: [
			"Vista lateral para alinhamento cabeça-ombro-pelve.",
			"Vista posterior para assimetria escapular e escoliose visual.",
		],
		executionSteps: [
			"Importe imagem ou vídeo curto de postura.",
			"Ative linha de prumo e goniometria conforme a necessidade.",
			"Salve snapshots das vistas relevantes para comparação futura.",
			"Registre observações de triagem e decisão clínica.",
		],
		measuredOutputs: [
			"Ângulos visuais e alinhamentos posturais",
			"Snapshots por vista",
			"Observações de triagem",
			"Comparação antes x depois",
		],
		articles: [
			{
				id: "sapo-validation-2010",
				title:
					"Postural Assessment Software (PAS/SAPO): Validation and Reliability",
				authors: "Ferreira EAG, et al.",
				year: 2010,
				journal: "Clinics",
				doi: "10.1590/S1807-59322010000700005",
				url: "https://pubmed.ncbi.nlm.nih.gov/20668624/",
				summary:
					"Validação e confiabilidade do PAS/SAPO para mensuração angular e de distâncias corporais.",
				clinicalTakeaway:
					"Justifica o uso clínico de fotogrametria e medições por software em postura.",
				group: "Ortopedia",
				subgroup: "Postura",
				evidence: "SystematicReview",
				tags: ["postura", "sapo", "fotogrametria", "escoliose"],
			},
			{
				id: "adams-forward-bending-1999",
				title:
					"Is the forward-bending test an accurate diagnostic criterion for the screening of scoliosis?",
				authors: "Karachalios T, et al.",
				year: 1999,
				journal: "Spine",
				url: "https://pubmed.ncbi.nlm.nih.gov/10543034/",
				summary:
					"Avalia o valor diagnóstico do teste de Adams como critério de triagem para escoliose.",
				clinicalTakeaway:
					"Dá base para a triagem clínica de escoliose usando imagem comum e encaminhamento apropriado.",
				group: "Ortopedia",
				subgroup: "Postura",
				evidence: "Consensus",
				tags: ["adams", "escoliose", "triagem", "postura"],
			},
		],
	},
	functional: {
		mode: "functional",
		title: "Gesto funcional e testes clínicos",
		subtitle: "Vídeo 2D + observação clínica",
		description:
			"Fluxo livre para agachamento, gesto esportivo, controle motor, mobilidade e testes funcionais capturados por vídeo.",
		keyPoints: [
			"Análise livre com ângulos e trajetórias",
			"Checkpoints e observações clínicas guiadas",
			"Comparação antes x depois",
		],
		preparationChecklist: [
			"Escolher o teste funcional antes de iniciar a gravação.",
			"Posicionar câmera para manter o gesto completo visível.",
			"Registrar pelo menos uma repetição de referência e uma repetição alvo.",
		],
		captureAngles: [
			"Plano principal do gesto com boa visibilidade articular.",
			"Vista complementar quando houver dúvida de alinhamento.",
		],
		executionSteps: [
			"Selecione o protocolo funcional desejado.",
			"Marque checkpoints, trajetórias ou goniometria conforme o teste.",
			"Use snapshots e observações clínicas para documentar compensações.",
			"Exporte relatório apenas após revisar os frames-chave.",
		],
		measuredOutputs: [
			"Ângulos clínicos relevantes",
			"Trajetórias e checkpoints",
			"Observações funcionais",
			"Snapshots comparativos",
		],
		articles: [
			{
				id: "fms-meta-analysis-2017",
				title:
					"Reliability, Validity, and Injury Predictive Value of the Functional Movement Screen: A Systematic Review and Meta-analysis",
				authors: "Bonazza NA, et al.",
				year: 2017,
				journal: "American Journal of Sports Medicine",
				doi: "10.1177/0363546516641937",
				url: "https://pubmed.ncbi.nlm.nih.gov/27159297/",
				summary:
					"Revisão sistemática sobre confiabilidade, validade e valor preditivo do Functional Movement Screen.",
				clinicalTakeaway:
					"Serve como base para testes funcionais guiados e interpretação clínica conservadora.",
				group: "Esportiva",
				subgroup: "Funcional",
				evidence: "SystematicReview",
				tags: ["fms", "movimento funcional", "screening", "video analysis"],
			},
		],
	},
};

export function normalizeEvidenceText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}
