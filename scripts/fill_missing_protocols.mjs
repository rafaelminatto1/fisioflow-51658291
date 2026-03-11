import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  try {
    const protocols = await sql`
      SELECT id, name, phases, milestones, restrictions
      FROM exercise_protocols
    `;
    
    console.log(`Iniciando atualização forçada de ${protocols.length} protocolos...`);
    
    const ensureArrays = (obj) => ({
        ...obj,
        goals: obj.goals || [],
        precautions: obj.precautions || [],
        criteria: obj.criteria || []
    });

    const protocolOverrides = {
        "Reconstrução do LCA": {
            phases: [
                { name: "Fase I: Proteção e Mobilidade", weekStart: 0, weekEnd: 2, goals: ["Controle de dor/edema", "Extensão total imediata", "Ativação do quadríceps"], precautions: ["Sem exercícios de cadeia aberta (0-45°)", "Carga conforme tolerado"], criteria: ["Extensão total", "Flexão > 90°"] },
                { name: "Fase II: Marcha e Fortalecimento Inicial", weekStart: 3, weekEnd: 6, goals: ["Marcha sem muletas", "Flexão > 120°", "Equilíbrio em um pé"], precautions: ["Evitar rotações", "Cuidado com agachamentos profundos"], criteria: ["Marcha normal", "Flexão > 120°"] },
                { name: "Fase III: Fortalecimento Avançado", weekStart: 7, weekEnd: 12, goals: ["Simetria de força", "Início de trote (se critérios ok)", "Propriocepção dinâmica"], precautions: ["Cuidado com saltos e aterrissagens"], criteria: ["Força 80% do contralateral", "Hop test estável"] },
                { name: "Fase IV: Retorno ao Esporte", weekStart: 13, weekEnd: 24, goals: ["Pliometria", "Treino de pivô", "Retorno competitivo"], precautions: ["Respeitar tempos biológicos do enxerto"], criteria: ["LSI > 90%", "IKDC score favorável"] }
            ],
            milestones: [
                { week: 1, title: "Extensão Total", criteria: ["Alcance de 0° de extensão passiva", "Controle de edema (grade 1+)"] },
                { week: 4, title: "Marcha Independente", criteria: ["Deambulação sem claudicação", "Subida de degrau sem dor"] },
                { week: 12, title: "Início de Trote", criteria: ["LSI força > 70%", "Ausência de efusão após esforço"] }
            ],
            restrictions: [
                { weekStart: 0, weekEnd: 6, description: "Evitar exercícios de cadeia aberta (leg extension) entre 0-45°", type: "activity" },
                { weekStart: 0, weekEnd: 12, description: "Proibido esportes de contato ou pivô", type: "activity" }
            ]
        },
        "Artroplastia Total de Quadril (ATQ)": {
            phases: [
                { name: "Fase I: Proteção e Mobilidade Precoce", weekStart: 0, weekEnd: 2, goals: ["Educação sobre precauções", "Independência em AVDs", "Mobilização de tecido cicatricial"], precautions: ["Respeitar Via de Acesso (Evitar flexão > 90°)", "Não aduzir além da linha média"], criteria: ["Independência na marcha com auxílio", "Controle de dor"] },
                { name: "Fase II: Fortalecimento e Marcha", weekStart: 3, weekEnd: 6, goals: ["Desmame de auxílio de marcha", "Fortalecimento de abdutores", "Aumento da resistência muscular"], precautions: ["Continuar precauções de luxação"], criteria: ["Marcha sem claudicação (ou mínima)", "Abdutores M3+"] },
                { name: "Fase III: Retorno Funcional", weekStart: 7, weekEnd: 12, goals: ["Equilíbrio unipodal avançado", "Retorno a atividades recreativas leves", "Máxima funcionalidade"], precautions: ["Evitar impactos excessivos"], criteria: ["Total independência", "Simetria de força"] }
            ],
            milestones: [
                { week: 2, title: "Independência de AVDs", criteria: ["Sentar/levantar com segurança", "Uso correto do andador/muletas"] },
                { week: 6, title: "Marcha sem Auxílio", criteria: ["Caminhada de 500m sem dor", "Trendelenburg negativo"] }
            ],
            restrictions: [
                { weekStart: 0, weekEnd: 12, description: "Evitar flexão de quadril acima de 90 graus", type: "range_of_motion" },
                { weekStart: 0, weekEnd: 12, description: "Não cruzar as pernas (adução excessiva)", type: "general" }
            ]
        }
    };

    for (const prot of protocols) {
      console.log(`Atualizando: ${prot.name}`);
      
      let phases = prot.phases;
      let milestones = prot.milestones;
      let restrictions = prot.restrictions;

      // Se houver override para este nome, usa agora
      if (protocolOverrides[prot.name]) {
          phases = protocolOverrides[prot.name].phases;
          milestones = protocolOverrides[prot.name].milestones;
          restrictions = protocolOverrides[prot.name].restrictions;
      }

      // Ensure all phases have the required arrays
      if (phases && phases.length > 0) {
          phases = phases.map(ensureArrays);
      }

      // Se ainda estiverem vazios, usa os defaults genéricos
      if (!phases || phases.length === 0) {
          phases = [
            { name: "Fase 1: Controle de Dor e Edema", weekStart: 0, weekEnd: 2, goals: ["Reduzir dor", "Controlar inflamação", "Proteger a região"], precautions: ["Evitar sobrecarga mecânica", "Respeitar quadro álgico"], criteria: ["Redução da dor em repouso", "Mobilidade controlada"] },
            { name: "Fase 2: Recuperação de Mobilidade e Força", weekStart: 3, weekEnd: 6, goals: ["Restaurar amplitude de movimento", "Iniciar exercícios resistidos leves"], precautions: ["Progressão gradual de carga"], criteria: ["Ganho de amplitude de movimento", "Aumento da força muscular"] },
            { name: "Fase 3: Fortalecimento e Retorno Funcional", weekStart: 7, weekEnd: 12, goals: ["Desenvolver força muscular", "Treino proprioceptivo e funcional"], precautions: ["Evitar fadiga excessiva"], criteria: ["Retorno às atividades funcionais", "Simetria de força"] }
          ];
      }

      if (!milestones || milestones.length === 0) {
          milestones = [
            { week: 2, title: "Controle da dor aguda", criteria: ["Redução significativa da dor em repouso", "Melhora do arco de movimento passivo"] },
            { week: 6, title: "Mobilidade Funcional", criteria: ["Melhora de força (Grau 4/5)", "Independência para AVDs básicas"] },
            { week: 12, title: "Prontidão para Alta", criteria: ["Ausência de dor nas atividades", "Força e função restauradas (90% do contralateral)"] }
          ];
      }

      if (!restrictions || restrictions.length === 0) {
          restrictions = [
            { weekStart: 0, weekEnd: 2, description: "Restrição de carga e atividades de impacto.", type: "general" },
            { weekStart: 3, weekEnd: 6, description: "Evitar atividades extenuantes não supervisionadas.", type: "activity" }
          ];
      }

      await sql`
        UPDATE exercise_protocols
        SET 
          phases = ${JSON.stringify(phases)}::jsonb,
          milestones = ${JSON.stringify(milestones)}::jsonb,
          restrictions = ${JSON.stringify(restrictions)}::jsonb,
          evidence_level = COALESCE(evidence_level, 'C'),
          updated_at = NOW()
        WHERE id = ${prot.id}
      `;
    }
    console.log("Preenchimento forçado concluído com sucesso.");
  } catch (err) {
    console.error(err);
  }
}

run();
