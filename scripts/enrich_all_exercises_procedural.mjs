import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_tmxnYprZS93L@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

// Algoritmo Procedural e Dicionários para Gerar Textos Clínicos
function generateProceduralContent(ex) {
  const name = ex.name.toLowerCase();
  
  // Base default structure
  let desc = `O exercício ${ex.name} é voltado para fortalecimento e reabilitação da região alvo.`;
  let inst = `1. Posicione-se corretamente mantendo a postura neutra.\n2. Inicie o movimento de forma controlada.\n3. Complete o número de repetições ou mantenha o tempo sugerido.\n4. Retorne suavemente à posição inicial.`;
  let tipsText = "Mantenha a respiração fluida e não bloqueie o ar (evite a manobra de Valsalva).";
  let prec = "Interrompa imediatamente se sentir dor aguda ou pinçamento na articulação.";
  let ben = "Melhora do controle motor e fortalecimento local.";

  // --- REGRAS POR CATEGORIA DE MOVIMENTO ---
  
  if (name.includes("alongamento") || name.includes("stretch")) {
    desc = `Manobra de alongamento focada em ${ex.name}. Desenvolvida para reduzir tensões fasciais, aliviar rigidez muscular e ampliar a flexibilidade articular da região.`;
    inst = `1. Adote a postura de alongamento conforme demonstrado.\n2. Avance suavemente até sentir uma leve tensão muscular, sem dor.\n3. Mantenha a posição estática respirando profundamente durante todo o tempo estipulado.\n4. Retorne lentamente e evite solavancos.`;
    tipsText = "A respiração profunda e lenta ajuda no relaxamento do músculo alvo. Evite realizar 'insistências' (movimentos curtos de ir e vir).";
    ben = "Diminuição do tônus muscular, aumento da amplitude de movimento (ADM) e alívio de sobrecarga articular.";
  } 
  else if (name.includes("mobilidade") || name.includes("cars") || name.includes("cat-cow") || name.includes("mobilização")) {
    desc = `Exercício de mobilidade ativa focado em ${ex.name}, ideal para nutrir a cartilagem articular e manter a saúde das articulações da cadeia afetada.`;
    inst = `1. Encontre uma base confortável e firme.\n2. Inicie o movimento articular em toda a sua amplitude disponível.\n3. Trabalhe no limite do seu arco de movimento indolor.\n4. Execute o número recomendado de repetições em ritmo fluido e contínuo.`;
    tipsText = "Foque na fluidez articular. O movimento deve ser como um 'óleo' nas engrenagens, nunca forçado com impacto.";
    ben = "Lubrificação articular, aumento de espaço sinovial e alívio de microtensões capsulares.";
  }
  else if (name.includes("agachamento") || name.includes("squat") || name.includes("afundo") || name.includes("lunge") || name.includes("step") || name.includes("degrau")) {
    desc = `Movimento de cadeia cinética fechada para membros inferiores (${ex.name}). Essencial para a funcionalidade diária e estabilidade de base do corpo.`;
    inst = `1. Posicione os pés estabilizados no solo.\n2. Desça flexionando as articulações do quadril, joelho e tornozelo simultaneamente.\n3. Mantenha o alinhamento corporal e o core ativado.\n4. Empurre o solo para retornar à extensão completa.`;
    tipsText = "Garanta que seus joelhos acompanhem a direção da ponta dos pés. Evite que eles desabem para dentro (valgo dinâmico). O calcanhar deve permanecer firme no chão na fase de descida.";
    ben = "Fortalecimento integrado de quadríceps, glúteos e estabilizadores, além de simular movimentos fundamentais do dia a dia.";
    prec = "Atenção ao aumento de pressão patelofemoral. Caso sinta dor no joelho anterior, reduza a amplitude da descida.";
  }
  else if (name.includes("prancha") || name.includes("plank") || name.includes("isometria") || name.includes("ponte") || name.includes("bridge") || name.includes("estabilização")) {
    desc = `Exercício de estabilização lombo-pélvica com foco em contração isométrica (${ex.name}). Promove a capacidade de transferência de força e proteção da coluna vertebral.`;
    inst = `1. Assuma a posição base de sustentação conforme demonstrado.\n2. Contraia o abdômen puxando levemente o umbigo para a coluna (bracing).\n3. Contraia ativamente os glúteos e estabilize as cinturas escapular e pélvica.\n4. Segure a posição firme sem perder o alinhamento corporal pelo tempo estipulado.`;
    tipsText = "Imagine que seu corpo é uma prancha rígida. Não permita que a lombar curve para baixo (hiperlordose) durante o exercício.";
    ben = "Resistência do Core, estabilidade da coluna e prevenção de lombalgias.";
    prec = "Evite compensações que sobrecarreguem o pescoço ou a lombar baixa.";
  }
  else if (name.includes("rotação") || name.includes("manguito") || name.includes("ombro")) {
    desc = `Fortalecimento específico ou mobilidade da articulação glenoumeral e escápulas (${ex.name}), crucial para a estabilidade do complexo do ombro.`;
    tipsText = "A escápula deve ser o pilar do movimento. Fixe-a suavemente no gradil costal para isolar a movimentação correta do braço e não tensionar excessivamente o trapézio superior.";
    prec = "Evite 'encolher' os ombros em direção às orelhas durante a execução.";
  }

  // --- REGRAS POR EQUIPAMENTO ---
  if (ex.equipment && Array.isArray(ex.equipment)) {
    const eq = ex.equipment.map(e => e.toLowerCase()).join(" ");
    if (eq.includes("elástico") || eq.includes("band") || eq.includes("theraband")) {
      tipsText += " Controle o retorno elástico! O tempo de volta à posição inicial (fase excêntrica) é o momento onde mais há ganho de controle motor. Não deixe a borracha puxar você de forma solta.";
      prec += " Verifique sempre as extremidades do elástico para garantir que estão presas e não irão soltar de forma repentina durante a tensão.";
    }
    if (eq.includes("halteres") || eq.includes("peso") || eq.includes("kettlebell")) {
      tipsText += " Movimente as sobrecargas de forma suave, sem impulsos corporais ou balanço (efeito pêndulo).";
    }
    if (eq.includes("bola") || eq.includes("bola suíça") || eq.includes("swiss ball")) {
      tipsText += " A instabilidade da bola requer constante ativação do core. O foco principal deve ser sempre manter-se equilibrado antes de realizar o movimento do exercício.";
    }
  }

  // Se a instrução antiga for "Nenhuma instrução adicional" ou genérica do script antigo
  const isGenericDescription = !ex.description || ex.description.includes(`Exercício focado em`);
  const isGenericInstructions = !ex.instructions || ex.instructions.includes(`Instruções para`) || ex.instructions === 'Nenhuma instrução adicional.';
  
  return {
    description: isGenericDescription ? desc : ex.description,
    instructions: isGenericInstructions ? inst : ex.instructions,
    tips: !ex.tips ? tipsText : ex.tips,
    precautions: !ex.precautions ? prec : ex.precautions,
    benefits: !ex.benefits ? ben : ex.benefits,
  };
}

async function run() {
  console.log("Buscando todos os exercícios...");
  const exercises = await sql`
    SELECT id, name, description, instructions, tips, precautions, benefits, equipment, muscles_primary
    FROM exercises
  `;
  
  let updatedCount = 0;

  for (const ex of exercises) {
    const isGenericDescription = !ex.description || ex.description.includes(`Exercício focado em`);
    const isGenericInstructions = !ex.instructions || ex.instructions.includes(`Instruções para`) || ex.instructions === 'Nenhuma instrução adicional.';
    const needsEnrichment = isGenericDescription || isGenericInstructions || !ex.tips || !ex.precautions || !ex.benefits;

    if (needsEnrichment) {
      const generatedData = generateProceduralContent(ex);

      await sql`
        UPDATE exercises 
        SET 
          description = ${generatedData.description}, 
          instructions = ${generatedData.instructions},
          tips = ${generatedData.tips},
          precautions = ${generatedData.precautions},
          benefits = ${generatedData.benefits},
          updated_at = NOW()
        WHERE id = ${ex.id}
      `;
      updatedCount++;
    }
  }

  console.log(`Finalizado! Total de exercícios revisados com Algoritmo Procedural Avançado: ${updatedCount}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
