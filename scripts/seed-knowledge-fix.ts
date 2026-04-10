import { Pool } from 'pg';

export const GOLD_STANDARD_SEED = [
	{
		article_id: "postop-aclr-aspetar-2023",
		title:
			"Aspetar clinical practice guideline on rehabilitation after anterior cruciate ligament reconstruction",
		article_type: "link",
		url: "https://pubmed.ncbi.nlm.nih.gov/36731908/",
		group: "Pós-Operatório",
		subgroup: "Joelho",
		tags: ["LCA", "ACLR", "Retorno ao Esporte", "Criterios"],
		evidence: "CPG",
		status: "verified",
		summary:
			"Diretriz de alta prioridade para reabilitacao criterial apos reconstrucao de LCA, com marcos de corrida, treino e retorno ao esporte.",
		year: 2023,
		source: "Br J Sports Med",
		metadata: {
			authors: [{ name: "Roula Kotsifaki" }, { name: "Vasileios Korakakis" }],
			doi: "10.1136/bjsports-2022-106158",
		},
	},
	{
		article_id: "ortho-ankle-2021",
		title:
			"Ankle Stability and Movement Coordination Impairments: Lateral Ankle Ligament Sprains Revision 2021",
		article_type: "link",
		url: "https://pubmed.ncbi.nlm.nih.gov/33789434/",
		group: "Esportiva",
		subgroup: "Tornozelo",
		tags: ["Entorse", "Instabilidade Cronica", "Retorno Funcional"],
		evidence: "CPG",
		status: "verified",
		summary:
			"Diretriz central para entorse lateral de tornozelo e instabilidade cronica, com foco em propriocepcao, treino neuromuscular e criterios funcionais.",
		year: 2021,
		source: "J Orthop Sports Phys Ther",
		metadata: {
			authors: [{ name: "Robert L Martin" }, { name: "Thomas E Davenport" }],
			doi: "10.2519/jospt.2021.0302",
		},
	},
	{
		article_id: "ortho-tka-cpg-2020",
		title: "Physical Therapist Management of Total Knee Arthroplasty",
		article_type: "link",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7462050/",
		group: "Ortopedia",
		subgroup: "Joelho",
		tags: ["Artroplastia", "TKA", "Pos-operatorio"],
		evidence: "CPG",
		status: "verified",
		summary:
			"CPG robusta para TKA com recomendacoes sobre prehab, treino motor, NMES, mobilidade precoce e fortalecimento no pos-agudo.",
		year: 2020,
		source: "Physical Therapy",
		metadata: {
			authors: [{ name: "Jennifer M Bade" }, { name: "Lynn Snyder-Mackler" }],
			doi: "10.1093/ptj/pzaa099",
		},
	},
	{
		article_id: "ortho-tha-rehab-2023",
		title: "Rehabilitation for Total Hip Arthroplasty: A Systematic Review",
		article_type: "link",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9464790/",
		group: "Ortopedia",
		subgroup: "Quadril",
		tags: ["Artroplastia", "THA", "Pos-operatorio"],
		evidence: "SystematicReview",
		status: "verified",
		summary:
			"Revisao sistematica util para protocolos de artroplastia de quadril, com comparacao entre programas de reabilitacao e foco em desfechos funcionais.",
		year: 2023,
		source: "Am J Phys Med Rehabil",
		metadata: {
			authors: [{ name: "Kristin J Konnyu" }, { name: "Dan Pinto" }],
			doi: "10.1097/PHM.0000000000002007",
		},
	},
	{
		article_id: "ortho-lca-diagnostico-2022",
		title:
			"Value of clinical tests in diagnosing anterior cruciate ligament injuries: systematic review and meta-analysis",
		article_type: "link",
		url: "https://pubmed.ncbi.nlm.nih.gov/35926253/",
		group: "Ortopedia",
		subgroup: "Joelho",
		tags: ["LCA", "Diagnostico", "Lachman", "Pivot Shift", "Gaveta Anterior"],
		evidence: "SystematicReview",
		status: "verified",
		summary: "Meta-analise abrangente que valida Lachman como o melhor teste isolado para triagem de LCA e Pivot Shift para confirmacao.",
		year: 2022,
		source: "Medicine (Baltimore)",
		metadata: {
			authors: [{ name: "W Huang" }, { name: "Y Zhang" }],
			doi: "10.1097/MD.0000000000029263",
		},
	},
	{
		article_id: "ortho-ombro-testes-2012",
		title:
			"Diagnostic accuracy of clinical tests for subacromial impingement syndrome: systematic review and meta-analysis",
		article_type: "link",
		url: "https://pubmed.ncbi.nlm.nih.gov/22647529/",
		group: "Ortopedia",
		subgroup: "Ombro",
		tags: ["Ombro", "Impacto", "Neer", "Hawkins", "Jobe"],
		evidence: "SystematicReview",
		status: "verified",
		summary: "Sintese de evidencia sobre testes provocativos do ombro, destacando a necessidade de clusters de testes para melhor acuracia.",
		year: 2012,
		source: "Arch Phys Med Rehabil",
		metadata: {
			authors: [{ name: "A Alqunaee" }, { name: "R Galvin" }],
			doi: "10.1016/j.apmr.2011.08.035",
		},
	},
	{
		article_id: "sport-ybt-meta-2021",
		title:
			"Systematic review and meta-analysis of the Y-Balance Test Lower Quarter",
		article_type: "link",
		url: "https://pubmed.ncbi.nlm.nih.gov/34458318/",
		group: "Esportiva",
		subgroup: "Membro Inferior",
		tags: ["Equilibrio", "YBT", "RTS", "Controle Neuromuscular"],
		evidence: "SystematicReview",
		status: "verified",
		summary: "Analise da confiabilidade e validade do YBT-LQ para monitoramento de atletas e identificacao de assimetrias funcionais.",
		year: 2021,
		source: "Int J Sports Phys Ther",
		metadata: {
			authors: [{ name: "P Plisky" }, { name: "R Schwartkopf" }],
			doi: "10.26603/001c.27634",
		},
	},
	{
		article_id: "postop-rotator-cuff-repair",
		title:
			"Effectiveness of early versus delayed rehabilitation following rotator cuff repair",
		article_type: "link",
		url: "https://pubmed.ncbi.nlm.nih.gov/34048450/",
		group: "Pós-Operatório",
		subgroup: "Ombro",
		tags: ["Manguito Rotador", "Reparo", "Mobilizacao"],
		evidence: "SystematicReview",
		status: "verified",
		summary:
			"Revisao sistematica sobre reabilitacao precoce versus tardia apos reparo do manguito, util para calibrar mobilidade inicial e progressao ativa.",
		year: 2021,
		source: "PLoS One",
		metadata: {
			authors: [{ name: "Imran Sheps" }, { name: "Jonathan Littlewood" }],
			doi: "10.1371/journal.pone.0252137",
		},
	},
];

const DATABASE_URL = "process.env.DATABASE_URL";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const orgRes = await pool.query('SELECT id FROM organizations LIMIT 1');
  const organizationId = orgRes.rows[0].id;

  console.log(`Seeding knowledge artifacts for org: ${organizationId}`);

  for (const item of GOLD_STANDARD_SEED) {
    try {
      await pool.query(`
        INSERT INTO knowledge_articles (
          organization_id, article_id, title, article_type, url, "group", subgroup, tags, 
          evidence, status, summary, year, source, metadata, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (organization_id, article_id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          tags = EXCLUDED.tags,
          url = EXCLUDED.url,
          year = EXCLUDED.year,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [
        organizationId,
        item.article_id,
        item.title,
        item.article_type,
        item.url,
        item.group,
        item.subgroup,
        JSON.stringify(item.tags),
        item.evidence,
        item.status,
        item.summary,
        item.year,
        item.source,
        JSON.stringify(item.metadata)
      ]);
      console.log(`✅ Seeded article: ${item.title}`);
    } catch (e) {
      console.error(`❌ Failed to seed ${item.title}:`, e);
    }
  }
  await pool.end();
}

main();
