import { neon } from "@neondatabase/serverless";

const sql = neon("process.env.DATABASE_URL");

async function run() {
  try {
    console.log("Adicionando coluna wiki_page_id se não existir...");
    await sql`ALTER TABLE exercise_protocols ADD COLUMN IF NOT EXISTS wiki_page_id uuid`;
    console.log("Coluna verificada.");

    const protocolsToEnrich = [
      {
        name: "Reconstrução de LCA (Enxerto Isquiotibiais)",
        evidenceLevel: "A",
        phases: JSON.stringify([
          {
            name: "Fase 1: Proteção e Mobilidade",
            weekStart: 0,
            weekEnd: 2,
            goals: [
              "Reduzir dor e edema",
              "Restaurar extensão completa (0°)",
              "Ativação do quadríceps",
            ],
            precautions: ["Evitar hiperflexão", "Carga guiada por sintomas"],
          },
          {
            name: "Fase 2: Retorno à Função",
            weekStart: 3,
            weekEnd: 6,
            goals: ["Marcha sem muletas", "Flexão > 90°", "Fortalecimento leve"],
            precautions: ["Sem pivoteamento", "Sem impacto"],
          },
        ]),
        milestones: JSON.stringify([
          {
            week: 2,
            title: "Extensão Completa",
            criteria: [
              "Extensão passiva igual ao lado contralateral",
              "Aviso: Sem dor em extensão",
            ],
            notes: "Crucial para evitar artrofibrose.",
          },
          {
            week: 6,
            title: "Marcha Normal",
            criteria: ["Marcha sem claudicação", "Sem muletas"],
          },
        ]),
        restrictions: JSON.stringify([
          {
            weekStart: 0,
            weekEnd: 4,
            description: "Uso de muletas conforme tolerância.",
            type: "weight_bearing",
          },
          {
            weekStart: 0,
            weekEnd: 12,
            description: "Evitar corrida e saltos.",
            type: "activity",
          },
        ]),
        references: JSON.stringify([
          {
            title: "Evidence-Based Rehabilitation After Anterior Cruciate Ligament Reconstruction",
            authors: "Wright et al.",
            year: 2015,
            journal: "Journal of Athletic Training",
            doi: "10.4085/1062-6050-50.1.04",
            url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4299723/",
          },
        ]),
      },
      {
        name: "Fascite Plantar (Conservador)",
        evidenceLevel: "A",
        phases: JSON.stringify([
          {
            name: "Fase Aguda",
            weekStart: 0,
            weekEnd: 4,
            goals: [
              "Controle de dor matinal",
              "Diminuir inflamação com gelo",
              "Alongamento passivo plantar",
            ],
            precautions: ["Evitar corrida", "Evitar longos períodos em pé"],
          },
          {
            name: "Fase de Fortalecimento",
            weekStart: 5,
            weekEnd: 12,
            goals: [
              "Fortalecimento intrínseco e extrínseco do pé",
              "Progressão de carga guiada (Heavy Slow Resistance)",
              "Treino Sensório-motor",
            ],
            precautions: ["Aumentar carga apenas se dor menor que 3/10"],
          },
        ]),
        milestones: JSON.stringify([
          {
            week: 4,
            title: "Redução da dor matinal",
            criteria: [
              "Dor < 4 na EVA aos primeiros passos",
              "Mobilidade de tornozelo sem restrições graves",
            ],
          },
          {
            week: 12,
            title: "Progressão Funcional",
            criteria: [
              "Caminhada sem dor por pelo menos 30 min",
              "Capaz de realizar elevação de panturrilha unilateral com carga",
            ],
          },
        ]),
        restrictions: JSON.stringify([
          {
            weekStart: 0,
            weekEnd: 4,
            description: "Evitar andar descalço, sobretudo no período da manhã",
            type: "general",
          },
          {
            weekStart: 0,
            weekEnd: 6,
            description:
              "Supressão de atividades de impacto agressivas (saltos/corrida intensa) até estar assintomático.",
            type: "activity",
          },
        ]),
        references: JSON.stringify([
          {
            title:
              "High-load strength training improves outcome in patients with plantar fasciitis: A randomized controlled trial",
            authors: "Rathleff MS, et al.",
            year: 2014,
            journal: "Scand J Med Sci Sports",
            doi: "10.1111/sms.12313",
            url: "https://pubmed.ncbi.nlm.nih.gov/25145882/",
          },
        ]),
      },
      {
        name: "Reparo do Manguito Rotador (Pequeno/Médio)",
        evidenceLevel: "B",
        phases: JSON.stringify([
          {
            name: "Fase 1: Proteção e Amplitude Passiva",
            weekStart: 0,
            weekEnd: 4,
            goals: [
              "Proteger reparo cirúrgico",
              "Ganho de Amplitude Passiva",
              "Prevenir ombro rígido",
            ],
            precautions: ["Nenhuma amplitude ativa / resistida", "Uso da tipóia em tempo integral"],
          },
          {
            name: "Fase 2: Amplitude Ativa-Assistida a Ativa",
            weekStart: 5,
            weekEnd: 8,
            goals: [
              "Transição para ADM ativa",
              "Treino de controle escapular",
              "Início de isometria suave",
            ],
            precautions: ["Evitar movimento compensatório", "Manejo da dor sem sobrecarga"],
          },
        ]),
        milestones: JSON.stringify([
          {
            week: 4,
            title: "Elevação Passiva 90 Grau",
            criteria: [
              "Conseguir elevação com ajuda até no mínimo 90°",
              "Sem dor em repouso intenso",
            ],
          },
          {
            week: 8,
            title: "Elevação Ativa Completa (Mínima carga)",
            criteria: ["Consegue elevar o braço sozinho com boa mecânica escapular"],
          },
        ]),
        restrictions: JSON.stringify([
          {
            weekStart: 0,
            weekEnd: 4,
            description: "Proibida ativação voluntária ou carga.",
            type: "range_of_motion",
          },
          {
            weekStart: 0,
            weekEnd: 8,
            description:
              "Evitar movimentos para além do plano escapular que forcem os rotadores sob estresse.",
            type: "activity",
          },
        ]),
        references: JSON.stringify([
          {
            title:
              "Rehabilitation following arthroscopic rotator cuff repair: a prospective, randomized, double-blind trial",
            authors: "Keener JD, et al.",
            year: 2014,
            journal: "J Bone Joint Surg Am",
            doi: "10.2106/JBJS.M.00008",
            url: "https://pubmed.ncbi.nlm.nih.gov/24522402/",
          },
        ]),
      },
    ];

    for (const prot of protocolsToEnrich) {
      console.log(`Enriquecendo protocolo: ${prot.name}...`);
      const result = await sql`
        UPDATE exercise_protocols
        SET 
          evidence_level = ${prot.evidenceLevel},
          phases = ${prot.phases}::jsonb,
          milestones = ${prot.milestones}::jsonb,
          restrictions = ${prot.restrictions}::jsonb,
          "references" = ${prot.references}::jsonb,
          updated_at = NOW()
        WHERE name = ${prot.name}
        RETURNING id;
      `;
      if (result.length > 0) {
        console.log(`- Protocolo "${prot.name}" atualizado com sucesso! ID: ${result[0].id}`);
      } else {
        console.log(`- Aviso: Protocolo "${prot.name}" não encontrado.`);
      }
    }

    console.log("Processo concluído!");
  } catch (err) {
    console.error("Erro na execução do script:", err);
  }
}
run();
