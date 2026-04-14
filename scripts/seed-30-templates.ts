import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";
import { eq } from "drizzle-orm";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = neon(connectionString);
  const db = drizzle(sql);

  console.log("Iniciando a inserção de 30 novos templates...");

  const newTemplates = [
    // ---------------------------------------------------------
    // ORTOPEDIA
    // ---------------------------------------------------------
    {
      name: "Artrose de Quadril — Manejo Conservador",
      description: "Exercícios de mobilidade suave e fortalecimento de glúteos para coxartrose.",
      category: "ortopedico", conditionName: "Artrose de Quadril", difficultyLevel: "iniciante", treatmentPhase: "fase_subaguda", bodyPart: "quadril", estimatedDuration: 30,
      clinicalNotes: "Foco em manter ADM de extensão e abdução. Uso de bicicleta ergométrica sem resistência para nutrição da cartilagem.",
      contraindications: "Impacto repetitivo (saltos, corrida). Agachamentos profundos dolorosos.",
      precautions: "Evitar flexão extrema >90° combinada com rotação interna se gerar pinçamento articular.",
      evidenceLevel: "A", bibliographicReferences: ["OARSI Guidelines Hip OA 2023", "Cochrane Review Exercise Therapy 2014"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Fascite Plantar — Fase Aguda (Alívio)",
      description: "Manejo da dor inicial com alongamento específico da fáscia e liberação miofascial.",
      category: "ortopedico", conditionName: "Fascite Plantar", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "tornozelo", estimatedDuration: 20,
      clinicalNotes: "Alongamento da fáscia plantar com os dedos em dorsiflexão (protocolo DiGiovanni). Massagem com garrafa congelada.",
      contraindications: "Infiltração recente de corticoide (< 2 semanas).",
      precautions: "Carga excessiva em pé por períodos prolongados.",
      evidenceLevel: "B", bibliographicReferences: ["DiGiovanni et al. JBJS 2003", "JOSPT Heel Pain Guidelines 2023"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Cervicalgia Irradiada — Tração e Mobilidade Neural",
      description: "Protocolo para radiculopatia cervical com foco em centralização e deslizamento neural.",
      category: "ortopedico", conditionName: "Radiculopatia Cervical", difficultyLevel: "intermediario", treatmentPhase: "fase_aguda", bodyPart: "coluna_cervical", estimatedDuration: 30,
      clinicalNotes: "Avaliar preferência direcional (geralmente retração cervical). Deslizamento do nervo mediano/radial de forma indolor.",
      contraindications: "Sintomas neurológicos progressivos severos, mielopatia cervical.",
      precautions: "Técnicas de tensão neural (tensioners) na fase aguda; usar apenas deslizamento (sliders).",
      evidenceLevel: "B", bibliographicReferences: ["Cleland et al. JOSPT 2005", "NICE Guidelines Neck Pain 2020"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Síndrome do Piriforme — Liberação e Alongamento",
      description: "Descompressão do nervo isquiático via relaxamento de rotadores externos curtos do quadril.",
      category: "ortopedico", conditionName: "Síndrome do Piriforme", difficultyLevel: "iniciante", treatmentPhase: "fase_subaguda", bodyPart: "quadril", estimatedDuration: 25,
      clinicalNotes: "Alongamento do piriforme com flexão de quadril >90°. Liberação miofascial com bola de tênis/lacrosse nos glúteos.",
      contraindications: "Compressão discal lombar confirmada simulando dor glútea (falso piriforme).",
      precautions: "O alongamento intenso pode irritar o nervo isquiático se mantido por muito tempo.",
      evidenceLevel: "C", bibliographicReferences: ["Hopayian et al. 2010", "Tonley et al. JOSPT 2010"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Espondilolistese Lombar — Estabilização",
      description: "Estabilização segmentar com viés de flexão lombar para alívio de sintomas articulares.",
      category: "ortopedico", conditionName: "Espondilolistese", difficultyLevel: "intermediario", treatmentPhase: "fase_subaguda", bodyPart: "coluna_lombar", estimatedDuration: 40,
      clinicalNotes: "Viés de flexão (William's flexions). Fortalecimento do transverso do abdome e oblíquos internos.",
      contraindications: "Exercícios de extensão lombar extrema (ex: Superman, Cobra) que aumentam o cisalhamento anterior.",
      precautions: "Evitar manipulações em alta velocidade (HVLA) na coluna lombar.",
      evidenceLevel: "B", bibliographicReferences: ["O'Sullivan et al. Spine 1997", "NASS Guidelines Spondylolisthesis"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Dedo em Gatilho — Deslizamento de Tendão",
      description: "Preservação da mobilidade do tendão flexor e prevenção de aderências na polia A1.",
      category: "ortopedico", conditionName: "Dedo em Gatilho", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "cotovelo", estimatedDuration: 15,
      clinicalNotes: "Exercícios de deslizamento tendíneo (hook fist, straight fist, full fist). Uso noturno de órtese extensora se indicado.",
      contraindications: "Movimentos repetitivos de preensão com força máxima (gripping).",
      precautions: "Evitar forçar ativamente o 'gatilho' repetidas vezes.",
      evidenceLevel: "B", bibliographicReferences: ["Evans et al. JHT 1988", "Fiona et al. Rheumatology 2018"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Bursite Trocantérica (GTPS) — Controle de Carga",
      description: "Manejo da Síndrome Dolorosa Trocantérica Maior com foco na tendinopatia do glúteo médio.",
      category: "ortopedico", conditionName: "Síndrome Dolorosa Trocantérica", difficultyLevel: "intermediario", treatmentPhase: "fase_subaguda", bodyPart: "quadril", estimatedDuration: 35,
      clinicalNotes: "Na verdade, é frequentemente uma tendinopatia glútea. Evitar cruzar as pernas. Fortalecimento isométrico em abdução para analgesia.",
      contraindications: "Alongamento do trato iliotibial (fricciona o trocânter e agrava a dor).",
      precautions: "Dormir sobre o lado afetado; orientar colocar travesseiro entre as pernas.",
      evidenceLevel: "A", bibliographicReferences: ["Mellor et al. BMJ 2018", "Grimaldi et al. Sports Med 2015"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Condromalácia Patelar — Reeducação Biomecânica",
      description: "Equilíbrio de forças na patela através de exercícios de quadril e cadeia fechada.",
      category: "ortopedico", conditionName: "Dor Femoropatelar", difficultyLevel: "intermediario", treatmentPhase: "fase_subaguda", bodyPart: "joelho", estimatedDuration: 40,
      clinicalNotes: "Ativação de glúteo médio e rotação externa de quadril (clamshells). Mini-agachamentos a 45°.",
      contraindications: "Cadeira extensora (cadeia aberta) com ângulos de maior estresse patelofemoral (30°-0°).",
      precautions: "Evitar dor patelar aguda durante as repetições.",
      evidenceLevel: "A", bibliographicReferences: ["Crossley et al. BJSM 2016", "JOSPT PFPS Guidelines 2019"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Capsulite Adesiva — Fase de Descongelamento",
      description: "Recuperação da amplitude de movimento (ADM) passiva e ativa assistida no ombro.",
      category: "ortopedico", conditionName: "Capsulite Adesiva", difficultyLevel: "intermediario", treatmentPhase: "remodelacao", bodyPart: "ombro", estimatedDuration: 35,
      clinicalNotes: "Fase de descongelamento (thawing). Alongamentos capsulares progressivos (Polia, Bastão, Sleeper stretch).",
      contraindications: "Exercícios dolorosos intensos na fase de 'congelamento' aguda (piora a inflamação capsular).",
      precautions: "Diferenciar dor muscular de restrição capsular real final.",
      evidenceLevel: "A", bibliographicReferences: ["Kelley et al. JOSPT 2013", "Cochrane Shoulder Pain 2003"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "Tenossinovite de De Quervain — Controle Funcional",
      description: "Controle da inflamação nos tendões extensor curto e abdutor longo do polegar.",
      category: "ortopedico", conditionName: "De Quervain", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "cotovelo", estimatedDuration: 20,
      clinicalNotes: "Exercícios isométricos iniciais para punho/polegar. Desvio ulnar indolor. Órtese Spica de polegar fora das sessões.",
      contraindications: "Teste de Finkelstein repetitivo. Desvio ulnar forçado associado à flexão do polegar.",
      precautions: "Evitar preensão com pinça lateral repetitiva em AVDs.",
      evidenceLevel: "B", bibliographicReferences: ["Ilyas et al. JAAOS 2007", "Rabin et al. JHS 2014"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },

    // ---------------------------------------------------------
    // ESPORTIVO
    // ---------------------------------------------------------
    {
      name: "Estiramento de Isquiotibiais — Remodelação",
      description: "Fortalecimento excêntrico progressivo para prevenção de recidivas em corredores.",
      category: "esportivo", conditionName: "Lesão de Isquiotibiais", difficultyLevel: "avancado", treatmentPhase: "remodelacao", bodyPart: "quadril", estimatedDuration: 45,
      clinicalNotes: "Introdução do Nordic Hamstring Curl modificado. Carga excêntrica com flexão de quadril (Romanian deadlift).",
      contraindications: "Alongamento estático agressivo nas primeiras 2 semanas pós-lesão.",
      precautions: "Avançar para sprints apenas com força simétrica >90%.",
      evidenceLevel: "A", bibliographicReferences: ["Askling et al. BJSM 2013 (L-Protocol)", "Erickson et al. JOSPT 2017"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Canelite (Estresse Tibial Medial) — Carga Segura",
      description: "Controle de impacto e fortalecimento do sóleo e tibial posterior.",
      category: "esportivo", conditionName: "Síndrome do Estresse Tibial Medial", difficultyLevel: "intermediario", treatmentPhase: "fase_subaguda", bodyPart: "tornozelo", estimatedDuration: 30,
      clinicalNotes: "Elevação de calcanhar sentado (ênfase no sóleo). Análise de pronação dinâmica na marcha.",
      contraindications: "Saltos pliométricos e retorno precoce à corrida em pista rígida.",
      precautions: "Avaliar densidade óssea ou fratura de estresse se a dor for pontual e não ceder ao repouso.",
      evidenceLevel: "A", bibliographicReferences: ["Winters et al. Sports Med 2013", "Moen et al. Sports Med 2009"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Tendinopatia do Aquiles — Insercional",
      description: "Protocolo HSR modificado evitando dorsiflexão profunda para não comprimir bursa.",
      category: "esportivo", conditionName: "Tendinopatia de Aquiles", difficultyLevel: "intermediario", treatmentPhase: "remodelacao", bodyPart: "tornozelo", estimatedDuration: 35,
      clinicalNotes: "Diferente da tendinopatia mid-portion, o calcanhar NÃO deve descer além da linha do degrau (evitar compressão contra o calcâneo).",
      contraindications: "Alongamento agressivo de panturrilha em degrau que gere impacto ósseo/bursal.",
      precautions: "Sugerir uso temporário de calcanheira (heel lift) nos sapatos diários.",
      evidenceLevel: "A", bibliographicReferences: ["Jonsson et al. BJSM 2008", "Silbernagel et al. JOSPT 2020"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Tendinopatia do Aquiles — Mid-Portion (HSR)",
      description: "Heavy Slow Resistance (HSR) para reestruturação do corpo do tendão de Aquiles.",
      category: "esportivo", conditionName: "Tendinopatia de Aquiles", difficultyLevel: "avancado", treatmentPhase: "remodelacao", bodyPart: "tornozelo", estimatedDuration: 40,
      clinicalNotes: "Movimentos muito lentos (3s subida, 3s descida). Cargas altas (chegando a 3-4x 6RM nas semanas finais).",
      contraindications: "Tendinite inflamatória muito aguda reativa (necessita redução de carga prévia).",
      precautions: "Pode haver aumento da dor muscular, mas a dor no tendão não deve passar de 5/10.",
      evidenceLevel: "A", bibliographicReferences: ["Beyer et al. AJSM 2015", "Kongsgaard et al. AJSM 2009"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Luxação Recidivante de Ombro — Estabilidade Dinâmica",
      description: "Melhora da propriocepção, controle neuromuscular e ritmo escapular pós-luxação anterior.",
      category: "esportivo", conditionName: "Instabilidade Glenoumeral", difficultyLevel: "avancado", treatmentPhase: "remodelacao", bodyPart: "ombro", estimatedDuration: 40,
      clinicalNotes: "Treino pliométrico de membro superior leve (lançamento de bola medicinal contra parede). Estabilidade em closed kinetic chain (pranchas na bola suíça).",
      contraindications: "Posição combinada de Abdução a 90° com Rotação Externa máxima (posição de apreensão).",
      precautions: "Atenção a sinais de frouxidão ligamentar generalizada (Beighton score).",
      evidenceLevel: "B", bibliographicReferences: ["Balke et al. AJSM 2014", "Gibson et al. JOSPT 2004"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Pubalgia (Dor na Virilha) — Protocolo Copenhague",
      description: "Protocolo de prevenção e tratamento de dor relacionada aos adutores.",
      category: "esportivo", conditionName: "Pubalgia", difficultyLevel: "avancado", treatmentPhase: "remodelacao", bodyPart: "quadril", estimatedDuration: 25,
      clinicalNotes: "Protocolo de Adutor de Copenhague (Copenhagen Adduction Exercise) excêntrico.",
      contraindications: "Fase super aguda de estiramento de adutor longo com hematoma.",
      precautions: "Exercício gera muita dor muscular tardia (DOMS). Iniciar com alavanca curta (apoio no joelho) antes da alavanca longa (apoio no pé).",
      evidenceLevel: "A", bibliographicReferences: ["Ishøi et al. BJSM 2016", "Weir et al. BJSM 2015"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Lesão Muscular de Panturrilha (Tennis Leg)",
      description: "Progressão de carga em estiramentos da cabeça medial do gastrocnêmio.",
      category: "esportivo", conditionName: "Lesão Muscular", difficultyLevel: "intermediario", treatmentPhase: "fase_subaguda", bodyPart: "tornozelo", estimatedDuration: 35,
      clinicalNotes: "Fortalecimento inicial sentado (sóleo) poupando tensão no gastrocnêmio, seguido por evolução em pé (joelhos estendidos).",
      contraindications: "Dorsiflexão forçada passiva na fase inicial de cicatrização (0-7 dias).",
      precautions: "Acompanhar assimetria na elevação unilateral (single-leg heel raise).",
      evidenceLevel: "B", bibliographicReferences: ["Dixon et al. Sports Med 2009", "Green et al. BJSM 2022"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Prevenção de Lesões de LCA — FIFA 11+",
      description: "Programa de aquecimento completo focado no controle neuromuscular para atletas de campo.",
      category: "prevencao", conditionName: "Prevenção Esportiva", difficultyLevel: "intermediario", treatmentPhase: "retorno_ao_esporte", bodyPart: "corpo_todo", estimatedDuration: 20,
      clinicalNotes: "Envolve corrida, pranchas, saltos com aterrissagem focada em evitar o valgo dinâmico. Deve ser feito antes dos treinos.",
      contraindications: "Atletas que ainda apresentam limitações agudas ou estão em reabilitação ativa (não liberados para esporte).",
      precautions: "Técnica de salto (pouso suave, joelho alinhado) é mais importante que o número de repetições.",
      evidenceLevel: "A", bibliographicReferences: ["Bizzini & Dvorak. BJSM 2015", "Sadigursky et al. BMC Sports Sci 2017"],
      templateType: "system", patientProfile: "prevencao", isActive: true, isPublic: true
    },
    {
      name: "Epicondilite Medial (Golfer's Elbow)",
      description: "Programa de carga progressiva focada em flexores de punho e pronadores.",
      category: "esportivo", conditionName: "Epicondilite Medial", difficultyLevel: "intermediario", treatmentPhase: "remodelacao", bodyPart: "cotovelo", estimatedDuration: 30,
      clinicalNotes: "Reverse Tyler Twist com FlexBar (se disponível) ou halteres para carga excêntrica da musculatura flexora-pronadora.",
      contraindications: "Lesão nervosa ulnar associada (compressão no túnel cubital) requer avaliação médica antes do fortalecimento pesado.",
      precautions: "O alongamento vigoroso contínuo pode ser pró-inflamatório.",
      evidenceLevel: "B", bibliographicReferences: ["Hoogvliet et al. BJSM 2013", "Tyler et al. J Shoulder Elbow Surg 2014"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },
    {
      name: "Síndrome do Trato Iliotibial (Runner's Knee)",
      description: "Reabilitação focada no controle pélvico, ativação de glúteo médio/máximo e reeducação de corrida.",
      category: "esportivo", conditionName: "Síndrome da Banda Iliotibial", difficultyLevel: "intermediario", treatmentPhase: "remodelacao", bodyPart: "joelho", estimatedDuration: 40,
      clinicalNotes: "Fortalecer estabilizadores do quadril. Uso do Pelvic Drop exercise e Hip Hitch. Aumentar cadência da corrida (10% de aumento pode reduzir carga no joelho).",
      contraindications: "Fazer 'alongamento da banda iliotibial' não tem eficácia estrutural, pois a banda não cede à tração manual.",
      precautions: "Evitar treinos em declive pronunciado até resolução dos sintomas.",
      evidenceLevel: "A", bibliographicReferences: ["Fredericson et al. Sports Med 2016", "van der Worp et al. Sports Med 2012"],
      templateType: "system", patientProfile: "esportivo", isActive: true, isPublic: true
    },

    // ---------------------------------------------------------
    // PÓS-OPERATÓRIO
    // ---------------------------------------------------------
    {
      name: "Pós-Op Meniscectomia Parcial — Avanço",
      description: "Recuperação funcional rápida (2-6 semanas) após retirada de fragmento meniscal.",
      category: "pos_operatorio", conditionName: "Meniscectomia", difficultyLevel: "intermediario", treatmentPhase: "remodelacao", bodyPart: "joelho", estimatedDuration: 35,
      clinicalNotes: "Pós-operatório geralmente de evolução rápida. Carga tolerada de imediato. Ganho de força funcional rápido.",
      contraindications: "Diferente do reparo (sutura) meniscal, não há grandes restrições de ADM, mas saltos precoces devem ser evitados devido ao edema.",
      precautions: "Derrame articular (inchaço) pode inibir o quadríceps temporalmente.",
      evidenceLevel: "A", bibliographicReferences: ["MGB Sports Medicine Protocol", "Cochrane Knee Surgery Rehab 2014"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },
    {
      name: "Pós-Op Reparo de Menisco (Sutura) — Proteção",
      description: "Protocolo altamente restritivo nas semanas iniciais para proteger os pontos de sutura do menisco.",
      category: "pos_operatorio", conditionName: "Reparo Meniscal", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "joelho", estimatedDuration: 30,
      clinicalNotes: "Carga geralmente restrita por 4-6 semanas (ou parcial com brace em extensão).",
      contraindications: "Flexão ativa/passiva do joelho com descarga de peso ALÉM de 90° nos primeiros 2 meses (força de cizalhamento nos meniscos posteriores).",
      precautions: "Verificar exata localização do reparo no laudo cirúrgico.",
      evidenceLevel: "A", bibliographicReferences: ["Kavanaugh et al. JOSPT 2020", "Wilk et al. JOSPT Meniscus Repair"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },
    {
      name: "Pós-Op Artrodese Lombar (0-4 semanas)",
      description: "Recuperação inicial pós-fusão espinhal. Treino de AVDs e recrutamento de transverso.",
      category: "pos_operatorio", conditionName: "Artrodese da Coluna", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "coluna_lombar", estimatedDuration: 25,
      clinicalNotes: "Rolamento em bloco (log roll) para sair da cama. Ativação isométrica de transverso do abdome. Caminhadas curtas diárias.",
      contraindications: "Técnica BLT proibida: Bending (flexão), Lifting (levantar peso > 3kg), Twisting (rotação).",
      precautions: "Uso de colete conforme indicação médica rigorosa.",
      evidenceLevel: "A", bibliographicReferences: ["Oestergaard et al. Eur Spine J 2013", "Maddox et al. JOSPT 2018"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },
    {
      name: "Pós-Op Latarjet/Bankart — Fase 1 (Ombro)",
      description: "Proteção do reparo de instabilidade glenoumeral anterior.",
      category: "pos_operatorio", conditionName: "Reparo de Bankart/Latarjet", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "ombro", estimatedDuration: 20,
      clinicalNotes: "Apenas pêndulos e mobilidade passiva limitadíssima em elevação. Uso contínuo da tipoia.",
      contraindications: "Rotação externa passiva e ativa severamente restrita (protege o coracobraquial/subescapular na cirurgia de Latarjet ou cápsula no Bankart).",
      precautions: "Mobilizar cotovelo e punho ativamente para evitar rigidez secundária.",
      evidenceLevel: "B", bibliographicReferences: ["Gaudelli et al. JSES 2018", "Wilk et al. JOSPT Instability 2016"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },
    {
      name: "Pós-Op Reparo do Ligamento Patelar",
      description: "Proteção rigorosa do tendão reparado, evitando alongamento e tensão ativa inicial.",
      category: "pos_operatorio", conditionName: "Ruptura do Tendão Patelar", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "joelho", estimatedDuration: 30,
      clinicalNotes: "Brace travado em extensão. Carga pode ser permitida dependendo da sutura, mas ADM é limitada. Isometria muito leve.",
      contraindications: "Flexão do joelho além da restrição prescrita pelo cirurgião. Ativação concêntrica forte de quadríceps.",
      precautions: "Monitorar a descida da patela (patela baja). Risco de rigidez é alto.",
      evidenceLevel: "B", bibliographicReferences: ["MGB Rehab Protocol Patellar Tendon", "Orthobullets Patellar Tendon Rupture"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },
    {
      name: "Pós-Op Fratura Rádio Distal (Osteossíntese)",
      description: "Recuperação de ADM pós-placa volar no punho.",
      category: "pos_operatorio", conditionName: "Osteossíntese de Punho", difficultyLevel: "iniciante", treatmentPhase: "fase_subaguda", bodyPart: "cotovelo", estimatedDuration: 30,
      clinicalNotes: "Inicia mobilidade passiva e ativa suave logo que liberado pelo médico. Exercícios 'dart thrower motion' para coordenação radio-carpal.",
      contraindications: "Carga de peso (apoio no punho, tipo push-up) nas primeiras 6-8 semanas.",
      precautions: "Controlar o edema nas falanges para evitar SDRC (Síndrome Dolorosa Regional Complexa).",
      evidenceLevel: "A", bibliographicReferences: ["Lucado et al. JHT 2017", "AAOS Distal Radius Fractures 2021"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },
    {
      name: "Pós-Op Reparo do Tendão de Aquiles",
      description: "Semanas iniciais de recuperação com bota robofoot com cunhas.",
      category: "pos_operatorio", conditionName: "Ruptura de Tendão de Aquiles", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "tornozelo", estimatedDuration: 25,
      clinicalNotes: "Mobilidade ativa livre plantar restrita de plantiflexão para neutro. Nunca ir para dorsiflexão máxima. Desmame das cunhas da bota progressivo.",
      contraindications: "Alongamento passivo forçado em dorsiflexão (risco de alongar o tendão em cicatrização e causar frouxidão).",
      precautions: "Descarga de peso rigorosamente de acordo com as cunhas calcanhares.",
      evidenceLevel: "A", bibliographicReferences: ["Kearney et al. Sports Med 2015", "Willits et al. JAMA 2010"],
      templateType: "system", patientProfile: "pos_operatorio", isActive: true, isPublic: true
    },

    // ---------------------------------------------------------
    // IDOSOS / GERIATRIA
    // ---------------------------------------------------------
    {
      name: "Osteoporose — Fortalecimento Axial Seguro",
      description: "Geração de piezoeletricidade (remodelamento ósseo) através de carga compressiva leve e extensão de tronco.",
      category: "idosos", conditionName: "Osteoporose", difficultyLevel: "iniciante", treatmentPhase: "remodelacao", bodyPart: "coluna_lombar", estimatedDuration: 30,
      clinicalNotes: "Focar em extensão torácica, fortalecimento de paravertebrais e exercícios posturais (Backpack, W-Y-T no elástico).",
      contraindications: "Flexão de tronco resistida ou intensa sob carga (ex: abdominais clássicos sit-up, tocar as mãos nos pés). Alto risco de fratura por cunha torácica.",
      precautions: "Movimentos abruptos de torção associados à flexão devem ser abolidos.",
      evidenceLevel: "A", bibliographicReferences: ["Sinaki et al. Bone 2010", "National Osteoporosis Foundation Guidelines"],
      templateType: "system", patientProfile: "idosos", isActive: true, isPublic: true
    },
    {
      name: "Artrose de Mãos e Dedos — Conservação Articular",
      description: "Educação em conservação de energia e exercícios de destreza motora.",
      category: "idosos", conditionName: "Osteoartrite de Mãos", difficultyLevel: "iniciante", treatmentPhase: "fase_subaguda", bodyPart: "cotovelo", estimatedDuration: 25,
      clinicalNotes: "Treino de uso de adaptações (engrossadores). Exercícios em água morna para alívio articular. Exercícios com argila/massinha leve.",
      contraindications: "O fortalecimento pesado com 'hand grips' (bolinhas duras) piora o processo inflamatório degenerativo nas pequenas articulações (nódulos de Heberden/Bouchard).",
      precautions: "Respeitar períodos de dor.",
      evidenceLevel: "B", bibliographicReferences: ["OARSI Guidelines Hand OA 2018", "Cochrane Exercícios Hand OA 2017"],
      templateType: "system", patientProfile: "idosos", isActive: true, isPublic: true
    },
    {
      name: "Reabilitação Vestibular Básica — VPPB",
      description: "Manobras de reposicionamento e habituação (Cawthorne-Cooksey).",
      category: "idosos", conditionName: "Vertigem Posicional Paroxística Benigna", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "coluna_cervical", estimatedDuration: 20,
      clinicalNotes: "Após Manobra de Epley feita pelo fisioterapeuta, paciente realiza exercícios de habituação de fixação do olhar e movimentação cefálica lenta em casa.",
      contraindications: "Manobra de Epley em pacientes com instabilidade cervical severa não estabilizada.",
      precautions: "Paciente idoso deve estar sempre acompanhado durante os exercícios devido ao risco de quedas por vertigem.",
      evidenceLevel: "A", bibliographicReferences: ["Bhattacharyya et al. Otolaryngol Head Neck Surg 2017", "Vestibular Rehab Cochrane Review 2015"],
      templateType: "system", patientProfile: "idosos", isActive: true, isPublic: true
    }
  ];

  let added = 0;
  for (const t of newTemplates) {
    const existing = await db.select().from(exerciseTemplates).where(eq(exerciseTemplates.name, t.name)).limit(1);
    
    if (existing.length > 0) {
      console.log(`Atualizando template existente: ${t.name}`);
      await db.update(exerciseTemplates).set(t).where(eq(exerciseTemplates.id, existing[0].id));
    } else {
      console.log(`Criando novo template: ${t.name}`);
      await db.insert(exerciseTemplates).values(t);
      added++;
    }
  }

  console.log(`Sucesso! Operação concluída. Inseridos ${added} novos templates.`);
}

main().catch(console.error);
