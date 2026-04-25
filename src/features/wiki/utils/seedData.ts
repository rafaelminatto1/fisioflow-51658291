import { knowledgeService } from "../services/knowledgeService";
import type { KnowledgeArtifact } from "../types/knowledge";

export const GOLD_STANDARD_SEED: Omit<KnowledgeArtifact, "id" | "createdAt" | "updatedAt">[] = [
  {
    organizationId: "demo-org",
    title:
      "Aspetar clinical practice guideline on rehabilitation after anterior cruciate ligament reconstruction",
    type: "link",
    url: "https://pubmed.ncbi.nlm.nih.gov/36731908/",
    group: "Pós-Operatório",
    subgroup: "Joelho",
    tags: ["LCA", "ACLR", "Retorno ao Esporte", "Criterios"],
    evidenceLevel: "CPG",
    status: "verified",
    summary:
      "Diretriz de alta prioridade para reabilitacao criterial apos reconstrucao de LCA, com marcos de corrida, treino e retorno ao esporte.",
    vectorStatus: "pending",
    metadata: {
      year: 2023,
      authors: [{ name: "Roula Kotsifaki" }, { name: "Vasileios Korakakis" }],
      journal: "Br J Sports Med",
      doi: "10.1136/bjsports-2022-106158",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title:
      "Ankle Stability and Movement Coordination Impairments: Lateral Ankle Ligament Sprains Revision 2021",
    type: "link",
    url: "https://pubmed.ncbi.nlm.nih.gov/33789434/",
    group: "Esportiva",
    subgroup: "Tornozelo",
    tags: ["Entorse", "Instabilidade Cronica", "Retorno Funcional"],
    evidenceLevel: "CPG",
    status: "verified",
    summary:
      "Diretriz central para entorse lateral de tornozelo e instabilidade cronica, com foco em propriocepcao, treino neuromuscular e criterios funcionais.",
    vectorStatus: "pending",
    metadata: {
      year: 2021,
      authors: [{ name: "Robert L Martin" }, { name: "Thomas E Davenport" }],
      journal: "J Orthop Sports Phys Ther",
      doi: "10.2519/jospt.2021.0302",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title: "Physical Therapist Management of Total Knee Arthroplasty",
    type: "link",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7462050/",
    group: "Ortopedia",
    subgroup: "Joelho",
    tags: ["Artroplastia", "TKA", "Pos-operatorio"],
    evidenceLevel: "CPG",
    status: "verified",
    summary:
      "CPG robusta para TKA com recomendacoes sobre prehab, treino motor, NMES, mobilidade precoce e fortalecimento no pos-agudo.",
    vectorStatus: "pending",
    metadata: {
      year: 2020,
      authors: [{ name: "Jennifer M Bade" }, { name: "Lynn Snyder-Mackler" }],
      journal: "Physical Therapy",
      doi: "10.1093/ptj/pzaa099",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title: "Rehabilitation for Total Hip Arthroplasty: A Systematic Review",
    type: "link",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9464790/",
    group: "Ortopedia",
    subgroup: "Quadril",
    tags: ["Artroplastia", "THA", "Pos-operatorio"],
    evidenceLevel: "SystematicReview",
    status: "verified",
    summary:
      "Revisao sistematica util para protocolos de artroplastia de quadril, com comparacao entre programas de reabilitacao e foco em desfechos funcionais.",
    vectorStatus: "pending",
    metadata: {
      year: 2023,
      authors: [{ name: "Kristin J Konnyu" }, { name: "Dan Pinto" }],
      journal: "Am J Phys Med Rehabil",
      doi: "10.1097/PHM.0000000000002007",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title:
      "Value of clinical tests in diagnosing anterior cruciate ligament injuries: systematic review and meta-analysis",
    type: "link",
    url: "https://pubmed.ncbi.nlm.nih.gov/35926253/",
    group: "Ortopedia",
    subgroup: "Joelho",
    tags: ["LCA", "Diagnostico", "Lachman", "Pivot Shift", "Gaveta Anterior"],
    evidenceLevel: "SystematicReview",
    status: "verified",
    summary:
      "Meta-analise abrangente que valida Lachman como o melhor teste isolado para triagem de LCA e Pivot Shift para confirmacao.",
    vectorStatus: "pending",
    metadata: {
      year: 2022,
      authors: [{ name: "W Huang" }, { name: "Y Zhang" }],
      journal: "Medicine (Baltimore)",
      doi: "10.1097/MD.0000000000029263",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title:
      "Diagnostic accuracy of clinical tests for subacromial impingement syndrome: systematic review and meta-analysis",
    type: "link",
    url: "https://pubmed.ncbi.nlm.nih.gov/22647529/",
    group: "Ortopedia",
    subgroup: "Ombro",
    tags: ["Ombro", "Impacto", "Neer", "Hawkins", "Jobe"],
    evidenceLevel: "SystematicReview",
    status: "verified",
    summary:
      "Sintese de evidencia sobre testes provocativos do ombro, destacando a necessidade de clusters de testes para melhor acuracia.",
    vectorStatus: "pending",
    metadata: {
      year: 2012,
      authors: [{ name: "A Alqunaee" }, { name: "R Galvin" }],
      journal: "Arch Phys Med Rehabil",
      doi: "10.1016/j.apmr.2011.08.035",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title: "Systematic review and meta-analysis of the Y-Balance Test Lower Quarter",
    type: "link",
    url: "https://pubmed.ncbi.nlm.nih.gov/34458318/",
    group: "Esportiva",
    subgroup: "Membro Inferior",
    tags: ["Equilibrio", "YBT", "RTS", "Controle Neuromuscular"],
    evidenceLevel: "SystematicReview",
    status: "verified",
    summary:
      "Analise da confiabilidade e validade do YBT-LQ para monitoramento de atletas e identificacao de assimetrias funcionais.",
    vectorStatus: "pending",
    metadata: {
      year: 2021,
      authors: [{ name: "P Plisky" }, { name: "R Schwartkopf" }],
      journal: "Int J Sports Phys Ther",
      doi: "10.26603/001c.27634",
    },
    viewCount: 0,
    createdBy: "system",
  },
  {
    organizationId: "demo-org",
    title: "Effectiveness of early versus delayed rehabilitation following rotator cuff repair",
    type: "link",
    url: "https://pubmed.ncbi.nlm.nih.gov/34048450/",
    group: "Pós-Operatório",
    subgroup: "Ombro",
    tags: ["Manguito Rotador", "Reparo", "Mobilizacao"],
    evidenceLevel: "SystematicReview",
    status: "verified",
    summary:
      "Revisao sistematica sobre reabilitacao precoce versus tardia apos reparo do manguito, util para calibrar mobilidade inicial e progressao ativa.",
    vectorStatus: "pending",
    metadata: {
      year: 2021,
      authors: [{ name: "Imran Sheps" }, { name: "Jonathan Littlewood" }],
      journal: "PLoS One",
      doi: "10.1371/journal.pone.0252137",
    },
    viewCount: 0,
    createdBy: "system",
  },
];

export async function seedKnowledgeBase(organizationId: string) {
  console.log(`Starting seed for organization: ${organizationId}`);
  let count = 0;

  for (const item of GOLD_STANDARD_SEED) {
    // Override demo-org with actual org
    const itemWithOrg = { ...item, organizationId };
    try {
      await knowledgeService.createArtifact(itemWithOrg);
      count++;
      console.log(`Seeded: ${item.title}`);
    } catch (e) {
      console.error(`Failed to seed ${item.title}:`, e);
    }
  }

  return count;
}
