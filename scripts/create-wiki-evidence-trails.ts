import { Client } from "pg";

type TrailPageInput = {
	slug: string;
	title: string;
	icon: string;
	category: string;
	tags: string[];
	content: string;
	parentId?: string | null;
};

type TrailArticle = {
	article_id: string;
	title: string;
	source: string | null;
	year: number | null;
	url: string | null;
	summary: string | null;
	highlights: string[];
};

const MAX_RETRIES = 4;
const RETRYABLE_ERROR_CODES = new Set([
	"ECONNRESET",
	"ETIMEDOUT",
	"ENOTFOUND",
	"ECONNREFUSED",
	"57P01",
	"53300",
]);

function getArg(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const code = "code" in error ? String(error.code) : "";
	return RETRYABLE_ERROR_CODES.has(code);
}

async function loadArticles(
	client: Client,
	organizationId: string,
	ids: string[],
): Promise<TrailArticle[]> {
	const result = await client.query(
		`
			SELECT
				article_id,
				title,
				source,
				year,
				url,
				summary,
				COALESCE(highlights, '[]'::jsonb) AS highlights
			FROM knowledge_articles
			WHERE organization_id = $1
				AND article_id = ANY($2::text[])
			ORDER BY year DESC NULLS LAST, title ASC
		`,
		[organizationId, ids],
	);

	return result.rows.map((row) => ({
		article_id: String(row.article_id),
		title: String(row.title),
		source: row.source ? String(row.source) : null,
		year: row.year == null ? null : Number(row.year),
		url: row.url ? String(row.url) : null,
		summary: row.summary ? String(row.summary) : null,
		highlights: Array.isArray(row.highlights)
			? row.highlights.map(String)
			: [],
	}));
}

function articleSection(label: string, articles: TrailArticle[]): string {
	const blocks = articles.map((article) => {
		const highlights = article.highlights.slice(0, 3).map((item) => `- ${item}`);
		const sourceLine = [article.source, article.year].filter(Boolean).join(" ");
		const linkLine = article.url ? `Link: ${article.url}` : "Link: não informado";
		return [
			`### ${article.title}`,
			sourceLine ? `Fonte: ${sourceLine}` : "Fonte: não informada",
			linkLine,
			article.summary ? `Resumo: ${article.summary}` : "",
			highlights.length ? "Pontos-chave:" : "",
			...highlights,
		]
			.filter(Boolean)
			.join("\n");
	});

	return [`## ${label}`, ...blocks].join("\n\n");
}

function protocolSection(
	title: string,
	items: string[],
	intro?: string,
): string {
	return [
		`## ${title}`,
		intro ?? "",
		...items.map((item) => `- ${item}`),
	]
		.filter(Boolean)
		.join("\n");
}

async function upsertPage(
	client: Client,
	organizationId: string,
	userId: string,
	page: TrailPageInput,
): Promise<{ id: string; slug: string }> {
	const existing = await client.query(
		`
			SELECT id, version
			FROM wiki_pages
			WHERE slug = $1
				AND organization_id = $2
				AND deleted_at IS NULL
			LIMIT 1
		`,
		[page.slug, organizationId],
	);

	if (existing.rows.length) {
		const id = String(existing.rows[0].id);
		const nextVersion = Number(existing.rows[0].version) + 1;

		await client.query(
			`
				UPDATE wiki_pages
				SET
					title = $2,
					content = $3,
					icon = $4,
					category = $5,
					tags = $6::text[],
					parent_id = $7,
					is_published = true,
					is_public = true,
					version = $8,
					updated_by = $9,
					updated_at = NOW()
				WHERE id = $1
			`,
			[
				id,
				page.title,
				page.content,
				page.icon,
				page.category,
				page.tags,
				page.parentId ?? null,
				nextVersion,
				userId,
			],
		);

		await client.query(
			`
				INSERT INTO wiki_page_versions (
					page_id,
					title,
					content,
					version,
					comment,
					created_by,
					created_at
				) VALUES ($1,$2,$3,$4,$5,$6,NOW())
			`,
			[
				id,
				page.title,
				page.content,
				nextVersion,
				"Atualização automática das trilhas de evidência",
				userId,
			],
		);

		return { id, slug: page.slug };
	}

	const inserted = await client.query(
		`
			INSERT INTO wiki_pages (
				slug,
				title,
				content,
				icon,
				parent_id,
				category,
				tags,
				is_published,
				is_public,
				view_count,
				version,
				organization_id,
				created_by,
				updated_by,
				created_at,
				updated_at
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7::text[],true,true,0,1,$8,$9,$10,NOW(),NOW()
			)
			RETURNING id
		`,
		[
			page.slug,
			page.title,
			page.content,
			page.icon,
			page.parentId ?? null,
			page.category,
			page.tags,
			organizationId,
			userId,
			userId,
		],
	);

	const id = String(inserted.rows[0].id);

	await client.query(
		`
			INSERT INTO wiki_page_versions (
				page_id,
				title,
				content,
				version,
				comment,
				created_by,
				created_at
			) VALUES ($1,$2,$3,1,$4,$5,NOW())
		`,
		[
			id,
			page.title,
			page.content,
			"Criação automática das trilhas de evidência",
			userId,
		],
	);

	return { id, slug: page.slug };
}

async function runOnce(
	connectionString: string,
	organizationId: string,
	userId: string,
): Promise<{ rootPage: string; createdOrUpdatedChildren: number; organizationId: string }> {
	const client = new Client({ connectionString });
	await client.connect();

	try {
		const lcaIds = [
			"postop-aclr-aspetar-2023",
			"postop-acl-kngf-2016",
			"sport-rtp-panther-2020",
			"sport-acl-prevention-cpg-2023",
			"ortho-tka-prehab-2025",
			"ortho-lca-diagnostico-2022"
		];
		const arthroplastyIds = [
			"ortho-tka-cpg-2020",
			"ortho-tka-rehab-2023",
			"ortho-tha-rehab-2023",
			"ortho-tha-prehab-2022",
			"ortho-hip-fracture-exercise-2023",
		];
		const shoulderIds = [
			"ortho-rotator-cuff-2025",
			"ortho-glenohumeral-oa-cpg-2023",
			"postop-rotator-cuff-repair",
			"postop-shoulder-instability",
			"ortho-ombro-testes-2012"
		];
		const ankleIds = [
			"ortho-ankle-2021",
			"ortho-achilles-2018",
			"postop-achilles-rupture",
			"postop-ankle",
		];

		const [
			lcaArticles,
			arthroplastyArticles,
			shoulderArticles,
			ankleArticles,
		] = await Promise.all([
			loadArticles(client, organizationId, lcaIds),
			loadArticles(client, organizationId, arthroplastyIds),
			loadArticles(client, organizationId, shoulderIds),
			loadArticles(client, organizationId, ankleIds),
		]);

		await client.query("BEGIN");

		const rootContent = [
			"# Trilhas de Evidência em Fisioterapia Ortopédica e Esportiva",
			"",
			"Esta página organiza a base curada da wiki em trilhas clínicas de alto valor para uso rápido pela equipe.",
			"",
			"## Trilhas disponíveis",
			"- **LCA e Retorno ao Esporte**: Foco em joelho e performance esportiva.",
			"- **Artroplastia de Joelho e Quadril**: Reabilitação geriátrica e pós-operatória complexa.",
			"- **Ombro Ortopédico e Pós-Operatório**: Manejo de manguito rotador e instabilidades.",
			"- **Tornozelo, Aquiles e Instabilidade**: Lesões ligamentares e tendinopatias do membro inferior.",
			"",
			"## Como usar",
			"- Comece pela pergunta clínica principal da sessão.",
			"- Use os artigos-base para definir progressão, critérios de alta e retorno ao esporte.",
			"- Consulte a **Biblioteca de Testes Clínicos** para validar sua evolução com dados objetivos.",
			"- Adapte a dosagem ao contexto funcional do paciente, não apenas ao tempo pós-lesão ou pós-cirurgia.",
			"",
			"## Observação operacional",
			"Os artigos desta trilha já foram sincronizados para `knowledge_articles` e podem ser consultados também pelo hub de conhecimento.",
		].join("\n");

		const root = await upsertPage(client, organizationId, userId, {
			slug: "trilhas-evidencia-fisioterapia",
			title: "Trilhas de Evidência em Fisioterapia",
			icon: "BookOpen",
			category: "knowledge",
			tags: ["wiki", "evidencia", "trilhas", "ortopedia", "esportiva"],
			content: rootContent,
		});

		const lcaContent = [
			"# Trilha: LCA e Retorno ao Esporte",
			"",
			"## Objetivo clínico",
			"Padronizar prevenção, reabilitação e retorno ao esporte após lesão ou reconstrução de LCA com base em critérios e não apenas em tempo.",
			"",
			"## Perguntas que esta trilha responde",
			"- Quando avançar de força para corrida, mudança de direção e retorno ao treino?",
			"- Quais testes mínimos usar antes da alta esportiva?",
			"- Como integrar prevenção de reinjúria no fim da reabilitação?",
			"",
			"## Testes Clínicos Essenciais",
			"- **Teste de Lachman**: Padrão-ouro para rastreio de instabilidade anterior.",
			"- **Pivot Shift**: Fundamental para confirmar instabilidade rotacional.",
			"- **Gaveta Anterior**: Útil em lesões crônicas.",
			"- **Thessaly Test**: Para investigar lesões meniscais associadas.",
			"- **Single/Triple Hop Tests**: Para mensurar potência e simetria (LSI).",
			"",
			articleSection("Artigos-base", lcaArticles),
			"",
			"## Aplicação prática",
			"- Use esta trilha para consultas de pré-temporada, ACLR, critérios de corrida e testes de retorno.",
			"- Combine critérios físicos com prontidão psicológica e exposição progressiva ao gesto esportivo.",
		].join("\n");

		const lcaTrail = await upsertPage(client, organizationId, userId, {
			slug: "trilha-lca-retorno-esporte",
			title: "Trilha: LCA e Retorno ao Esporte",
			icon: "Target",
			category: "knowledge",
			tags: ["lca", "acl", "retorno ao esporte", "joelho", "esportiva"],
			content: lcaContent,
			parentId: root.id,
		});

		const lcaProtocolContent = [
			"# Protocolo Prático: LCA e Retorno ao Esporte",
			"",
			"Este protocolo resume a trilha principal em decisões de progressão clínica, critérios de alta e pontos de atenção para sessões semanais.",
			"",
			protocolSection("Critérios de Progressão", [
				"Controlar dor e derrame antes de aumentar corrida, pliometria ou mudança de direção.",
				"Avançar força quando houver boa mecânica em agachamento, avanço e tarefas unipodais.",
				"Introduzir corrida apenas com tolerância a carga repetida, boa aterrissagem e assimetria funcional reduzida.",
				"Antes de treino esportivo completo, exigir desempenho consistente em testes funcionais e exposição progressiva ao gesto.",
			]),
			"",
			protocolSection("Testes de Alta e Retorno", [
				"Testes de salto unilateral (Single, Triple, Side Hop) e comparação entre membros.",
				"Força de quadríceps e cadeia posterior com assimetria clinicamente aceitável (LSI > 90%).",
				"Qualidade de movimento em aterrissagem, desaceleração e corte (Step-down test).",
				"Prontidão psicológica e confiança para retorno ao esporte (Escalas ACL-RSI).",
			]),
			"",
			protocolSection("Red Flags Clínicas", [
				"Derrame persistente após progressão de carga.",
				"Dor anterior de joelho com piora de volume e perda de extensão.",
				"Insegurança importante em tarefas de corte ou aterrissagem.",
				"Retorno prematuro baseado só em tempo cirúrgico.",
			]),
			"",
			articleSection("Artigos de Apoio", lcaArticles),
		].join("\n");

		await upsertPage(client, organizationId, userId, {
			slug: "protocolo-lca-retorno-esporte",
			title: "Protocolo Prático: LCA e Retorno ao Esporte",
			icon: "ClipboardCheck",
			category: "knowledge",
			tags: ["lca", "acl", "protocolo", "retorno ao esporte", "alta"],
			content: lcaProtocolContent,
			parentId: lcaTrail.id,
		});

		const arthroplastyContent = [
			"# Trilha: Artroplastia de Joelho e Quadril",
			"",
			"> [!INFO] **Objetivo clínico:** Organizar condutas para pré-habilitação, mobilização precoce e progressão funcional após TKA (Total Knee Arthroplasty), THA (Total Hip Arthroplasty) e fratura de quadril.",
			"",
			"## Perguntas que esta trilha responde",
			"- **Protocolo:** O que realmente deve entrar no protocolo pós-artroplastia?",
			"- **Pré-hab:** Quando a pré-habilitação vale a pena e quais os critérios?",
			"- **Intensidade:** Como equilibrar carga, segurança e ganho funcional em idosos?",
			"",
			"## Testes Clínicos Essenciais",
			"- **Timed Up and Go (TUG)**: Monitorar mobilidade e risco de queda.",
			"- **5x Sit-to-Stand**: Avaliar potência de membros inferiores.",
			"- **10 Meter Walk Test**: Mensurar velocidade funcional de marcha.",
			"- **Teste de Thomas**: Avaliar encurtamento de flexores pós-THA.",
			"- **Escala de Oxford**: Graduar evolução da força muscular.",
			"",
			"## Fases da Reabilitação",
			"",
			"<details>",
			"<summary>Fase 1: Proteção Máxima (0-3 semanas)</summary>",
			"",
			"- Controle de dor e edema (Crioterapia, Compressão)",
			"- Ativação de quadríceps e glúteo (Exercícios isométricos, **Ativação do VMO**)",
			"- Ganho de ADM passiva e ativa assistida",
			"- Treino de marcha com dispositivo de auxílio (Andador/Muletas)",
			"- Educação do paciente sobre transferências seguras",
			"",
			"</details>",
			"",
			"<details>",
			"<summary>Fase 2: Proteção Moderada (3-8 semanas)</summary>",
			"",
			"- Progressão de carga conforme tolerância",
			"- Fortalecimento em cadeia cinética fechada (Agachamentos parciais, Step-up)",
			"- Treino de equilíbrio estático e dinâmico (Single Leg Stance)",
			"- Ganho de ADM funcional (0-110° para joelho)",
			"- Início de desmame do dispositivo de auxílio",
			"",
			"</details>",
			"",
			"<details>",
			"<summary>Fase 3: Retorno à Função Plena (8+ semanas)</summary>",
			"",
			"- Fortalecimento avançado e resistência muscular",
			"- Treino de tarefas complexas (Escadas, Terrenos irregulares)",
			"- Agilidade básica e propriocepção avançada",
			"- Preparação para retorno às atividades instrumentais da vida diária",
			"",
			"</details>",
			"",
			"## Artigos-base de Evidência",
			"",
			articleSection("Principais Referências", arthroplastyArticles),
			"",
			"## Aplicação Clínica Estratégica",
			"- **Avaliação Pré-op:** Use o TUG e Velocidade de Marcha como baseline.",
			"- **Educação:** Reduzir ansiedade correlacionando dor com processo de cura, não com dano.",
			"- **Metas:** Priorize autonomia nas transferências e marcha comunitária segura.",
			"",
			"> [!WARNING] **Red Flags:** Febre persistente, vermelhidão local excessiva, ou dor desproporcional ao esforço devem ser reportadas à equipe médica imediatamente.",
		].join("\n");

		const arthroplastyTrail = await upsertPage(client, organizationId, userId, {
			slug: "trilha-artroplastia-joelho-quadril",
			title: "Trilha: Artroplastia de Joelho e Quadril",
			icon: "Activity",
			category: "knowledge",
			tags: ["artroplastia", "tka", "tha", "quadril", "joelho"],
			content: arthroplastyContent,
			parentId: root.id,
		});

		const arthroplastyProtocolContent = [
			"# Protocolo Prático: Artroplastia de Joelho e Quadril",
			"",
			"Página operacional para organizar pré-habilitação, mobilização precoce e progressão funcional após TKA, THA e fratura de quadril.",
			"",
			protocolSection("Critérios de Progressão", [
				"Progredir quando dor, edema e fadiga pós-sessão permanecerem compatíveis com recuperação em 24 horas.",
				"Ganhar amplitude funcional para sentar, levantar, caminhar e realizar transferências antes de aumentar carga complexa.",
				"Avançar marcha para tarefas comunitárias conforme segurança, tolerância e independência.",
				"Em idosos e pós-fratura, combinar carga progressiva com treino de equilíbrio e prevenção de queda.",
			]),
			"",
			protocolSection("Testes de Alta e Função", [
				"Teste sentar-levantar (5xSTS) e velocidade de marcha (10MWT).",
				"Tolerância a escadas, transferências e marcha comunitária (TUG).",
				"Força funcional de quadríceps, glúteos e panturrilha (Escala de Oxford).",
				"Autonomia nas atividades diárias relevantes para o contexto do paciente.",
			]),
			"",
			protocolSection("Red Flags Clínicas", [
				"Piora progressiva da dor, calor ou edema sem relação clara com a sessão.",
				"Queda funcional importante após aumento de carga.",
				"Sinais de intolerância sistêmica, tontura ou insegurança relevante em deambulação.",
				"Rigidez acentuada sem resposta à progressão planejada.",
			]),
			"",
			articleSection("Artigos de Apoio", arthroplastyArticles),
		].join("\n");

		await upsertPage(client, organizationId, userId, {
			slug: "protocolo-artroplastia-joelho-quadril",
			title: "Protocolo Prático: Artroplastia de Joelho e Quadril",
			icon: "ClipboardCheck",
			category: "knowledge",
			tags: ["artroplastia", "tka", "tha", "protocolo", "reabilitacao"],
			content: arthroplastyProtocolContent,
			parentId: arthroplastyTrail.id,
		});

		const shoulderContent = [
			"# Trilha: Ombro Ortopédico e Pós-Operatório",
			"",
			"## Objetivo clínico",
			"Guiar conduta em manguito rotador, osteoartrose glenoumeral e instabilidade pós-cirúrgica com foco em função, dor e retorno.",
			"",
			"## Perguntas que esta trilha responde",
			"- Quando progredir mobilidade, força e atividade acima da cabeça?",
			"- Como diferenciar um ombro degenerativo de um ombro cirúrgico em termos de progressão?",
			"- Quais expectativas de retorno fazem sentido após estabilização ou reparo?",
			"",
			"## Testes Clínicos Essenciais",
			"- **Sinal de Neer / Hawkins-Kennedy**: Triagem de impacto subacromial.",
			"- **Teste de Jobe (Empty Can)**: Avaliação do supraespinhal.",
			"- **Crank Test / Teste de O'Brien**: Investigação de lesões labrais (SLAP).",
			"- **Speed's Test**: Para patologia da cabeça longa do bíceps.",
			"",
			articleSection("Artigos-base", shoulderArticles),
			"",
			"## Aplicação prática",
			"- Use esta trilha para planejar fases, reduzir variação de conduta e padronizar orientação clínica.",
			"- Evite liberar carga ou gesto esportivo apenas por tempo; use resposta funcional.",
		].join("\n");

		const shoulderTrail = await upsertPage(client, organizationId, userId, {
			slug: "trilha-ombro-ortopedico-pos-operatorio",
			title: "Trilha: Ombro Ortopédico e Pós-Operatório",
			icon: "ShieldCheck",
			category: "knowledge",
			tags: ["ombro", "manguito", "osteoartrose", "instabilidade", "pos-operatorio"],
			content: shoulderContent,
			parentId: root.id,
		});

		const shoulderProtocolContent = [
			"# Protocolo Prático: Ombro Ortopédico e Pós-Operatório",
			"",
			"Resumo clínico para progressão segura em reparo do manguito, instabilidade e ombro degenerativo, com foco em função e retorno.",
			"",
			protocolSection("Critérios de Progressão", [
				"Avançar mobilidade respeitando irritabilidade, qualidade do movimento e proteção do reparo quando houver cirurgia.",
				"Introduzir carga externa quando o paciente sustentar elevação e rotação com controle escapuloumeral adequado.",
				"Usar função acima da cabeça apenas após boa tolerância a tarefas abaixo da linha do ombro e sem piora tardia.",
				"Em instabilidade, progredir confiança e controle em posições de risco antes de expor ao gesto esportivo completo.",
			]),
			"",
			protocolSection("Testes de Alta e Função", [
				"Amplitude funcional suficiente para atividades de autocuidado, trabalho e esporte-alvo.",
				"Força do manguito e cintura escapular compatível com a demanda do paciente.",
				"Boa mecânica em alcance, apoio e tarefas acima da cabeça.",
				"Tolerância a volume funcional sem recrudescimento relevante de dor noturna.",
			]),
			"",
			protocolSection("Red Flags Clínicas", [
				"Perda progressiva de movimento ou dor noturna persistente após aumento de carga.",
				"Sensação recorrente de falseio ou apreensão importante.",
				"Compensação escapular marcada em tarefas simples.",
				"Retorno a gesto acima da cabeça antes de força e controle mínimos.",
			]),
			"",
			articleSection("Artigos de Apoio", shoulderArticles),
		].join("\n");

		await upsertPage(client, organizationId, userId, {
			slug: "protocolo-ombro-ortopedico-pos-operatorio",
			title: "Protocolo Prático: Ombro Ortopédico e Pós-Operatório",
			icon: "ClipboardCheck",
			category: "knowledge",
			tags: ["ombro", "protocolo", "manguito", "instabilidade", "pos-operatorio"],
			content: shoulderProtocolContent,
			parentId: shoulderTrail.id,
		});

		const ankleContent = [
			"# Trilha: Tornozelo, Aquiles e Instabilidade",
			"",
			"## Objetivo clínico",
			"Concentrar evidência para entorse lateral, tendão de Aquiles, instabilidade crônica e retorno ao esporte após cirurgia ou tratamento conservador.",
			"",
			"## Perguntas que esta trilha responde",
			"- Como organizar progressão de carga após entorse, tendinopatia ou cirurgia ligamentar?",
			"- Quando liberar corrida, salto e mudança de direção?",
			"- Quais fatores aumentam risco de falha no retorno?",
			"",
			"## Testes Clínicos Essenciais",
			"- **Gaveta Anterior (Tornozelo)**: Integridade do LTFA.",
			"- **Talar Tilt**: Integridade do ligamento calcaneofibular.",
			"- **Teste de Thompson**: Ruptura do tendão de Aquiles.",
			"- **Side Hop Test**: Capacidade reativa e controle lateral.",
			"- **Star Excursion Balance Test (SEBT)**: Equilíbrio dinâmico.",
			"",
			articleSection("Artigos-base", ankleArticles),
			"",
			"## Aplicação prática",
			"- Use esta trilha em atletas de salto, corrida e esportes de corte, além de pacientes com instabilidade recorrente.",
			"- Foque em controle neuromuscular, força de panturrilha e testes funcionais antes do retorno completo.",
		].join("\n");

		const ankleTrail = await upsertPage(client, organizationId, userId, {
			slug: "trilha-tornozelo-aquiles-instabilidade",
			title: "Trilha: Tornozelo, Aquiles e Instabilidade",
			icon: "TrendingUp",
			category: "knowledge",
			tags: ["tornozelo", "aquiles", "instabilidade", "retorno ao esporte"],
			content: ankleContent,
			parentId: root.id,
		});

		const ankleProtocolContent = [
			"# Protocolo Prático: Tornozelo, Aquiles e Instabilidade",
			"",
			"Guia operacional para progressão de carga, testes funcionais e retorno ao esporte em entorse lateral, Aquiles e pós-cirúrgico do tornozelo.",
			"",
			protocolSection("Critérios de Progressão", [
				"Progredir carga quando marcha, saltitos leves e tarefas unipodais forem tolerados sem piora importante nas 24 horas seguintes.",
				"Antes de correr, buscar boa rigidez funcional do tornozelo, força de panturrilha e controle em apoio unipodal.",
				"Expor a saltos e mudanças de direção de forma gradual, com atenção à confiança e à qualidade da aterrissagem.",
				"Em instabilidade crônica, manter treino proprioceptivo e reação postural mesmo após melhora da dor.",
			]),
			"",
			protocolSection("Testes de Alta e Retorno", [
				"Elevação de panturrilha unilateral com volume e qualidade suficientes.",
				"Saltos unipodais, hop tests e tarefas de desaceleração.",
				"Controle postural em apoio unipodal e tarefas dinâmicas (Y-Balance Test).",
				"Tolerância a corrida, aceleração e mudança de direção conforme a modalidade.",
			]),
			"",
			protocolSection("Red Flags Clínicas", [
				"Edema persistente e perda de função após progressão aparentemente leve.",
				"Dor insercional ou rigidez matinal em piora contínua no Aquiles.",
				"Episódios repetidos de falseio com limitação de confiança.",
				"Retorno esportivo sem recuperação mínima de panturrilha e testes funcionais.",
			]),
			"",
			articleSection("Artigos de Apoio", ankleArticles),
		].join("\n");

		await upsertPage(client, organizationId, userId, {
			slug: "protocolo-tornozelo-aquiles-instabilidade",
			title: "Protocolo Prático: Tornozelo, Aquiles e Instabilidade",
			icon: "ClipboardCheck",
			category: "knowledge",
			tags: ["tornozelo", "aquiles", "protocolo", "instabilidade", "retorno"],
			content: ankleProtocolContent,
			parentId: ankleTrail.id,
		});

		await client.query("COMMIT");

		return {
			rootPage: root.slug,
			createdOrUpdatedChildren: 8,
			organizationId,
		};
	} catch (error) {
		try {
			await client.query("ROLLBACK");
		} catch {
			// Ignora rollback quando a conexao ja foi perdida.
		}
		throw error;
	} finally {
		await client.end().catch(() => undefined);
	}
}

async function main() {
	const connectionString = getArg("--connection-string") || process.env.DATABASE_URL;
	const organizationId = getArg("--organization-id");
	const userId = getArg("--user-id");

	if (!connectionString) throw new Error("Passe --connection-string ou defina DATABASE_URL.");
	if (!organizationId) throw new Error("Passe --organization-id.");
	if (!userId) throw new Error("Passe --user-id.");

	let lastError: unknown;

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
		try {
			const result = await runOnce(connectionString, organizationId, userId);
			console.log(JSON.stringify(result, null, 2));
			return;
		} catch (error) {
			lastError = error;
			if (!isRetryable(error) || attempt === MAX_RETRIES) {
				throw error;
			}
			console.warn(
				`Tentativa ${attempt} falhou com erro transitorio; repetindo em ${attempt}s...`,
			);
			await sleep(attempt * 1000);
		}
	}

	throw lastError;
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
