import { test, expect } from "@playwright/test";
import { format, subDays, addDays } from "date-fns";

/**
 * Script de Geração de Dados em Massa para Produção
 * 10 Pacientes x 10 Agendamentos cada = 100 Evoluções SOAP
 * Dados realistas baseados em condições fisioterapêuticas reais
 */

// Credenciais (Preferencialmente vindas de variáveis de ambiente no setup global)
const EMAIL = "rafael.minatto@yahoo.com.br";
const PASSWORD = "Yukari30@";

// 10 perfis realistas de pacientes brasileiros
const PATIENTS = [
  {
    name: "João Silva Santos",
    phone: "11987654321",
    condition: "Lombalgia crônica mecânica",
    diagnosis: "Hérnia de disco L4-L5",
  },
  {
    name: "Maria Oliveira Costa",
    phone: "21987654322",
    condition: "Cervicalgia por postura",
    diagnosis: "Síndrome da Cabeça em Queda",
  },
  {
    name: "Pedro Henrique Lima",
    phone: "31987654323",
    condition: "Pós-operatório ACL",
    diagnosis: "Reconstrução ligamentar joelho direito",
  },
  {
    name: "Ana Beatriz Souza",
    phone: "41987654324",
    condition: "AVC isquêmico - hemiparesia esquerda",
    diagnosis: "Sequela de AVC - 6 meses pós-agudo",
  },
  {
    name: "Carlos Eduardo Rocha",
    phone: "51987654325",
    condition: "Síndrome do Manguito Rotador",
    diagnosis: "Lesão parcial tendão supraespinhal",
  },
  {
    name: "Fernanda Lima Nascimento",
    phone: "61987654326",
    condition: "Displasia de quadril pós-parto",
    diagnosis: "Instabilidade pélvica puerperal",
  },
  {
    name: "Ricardo Almeida Castro",
    phone: "71987654327",
    condition: "Fibromialgia",
    diagnosis: "Fibromialgia primária - critérios ACR",
  },
  {
    name: "Juliana Mendes Martins",
    phone: "81987654328",
    condition: "Pós-fratura de tibia/fíbula",
    diagnosis: "Consolidação óssea 8 semanas pós-cirúrgica",
  },
  {
    name: "Marcelo Santos Pereira",
    phone: "91987654329",
    condition: "Osteoartrose joelho bilateral",
    diagnosis: "Gonartrose grau III (Kellgren-Lawrence)",
  },
  {
    name: "Patrícia Freitas Gomes",
    phone: "11987654330",
    condition: "Escoliose idiopática adolescente",
    diagnosis: "Escoliose toracolombar 25° Cobb",
  },
];

// Conteúdo SOAP realista por condição
const SOAP_TEMPLATES: Record<string, {
  subjective: string[];
  objective: string[];
  assessment: string[];
  plan: string[];
}> = {
  "Lombalgia crônica mecânica": {
    subjective: [
      "Paciente relata dor lombar de intensidade 6/10, piora ao sentar por períodos prolongados.",
      "Dor irradiada para membro inferior direito, chegando até joelho. Nenhuma parestesia.",
      "Relata melhora com caminhadas curtas. Dor ao levantar da cama pela manhã (rigidez matinal).",
      "Queixa de cansaço muscular em região paravertebral. Dor 7/10 após atividades domésticas.",
      "Paciente refere melhora significativa nas últimas sessões, dor reduzida para 3/10.",
      "Episódio de dor aguda ao tentar levantar peso de 10kg. Dor 8/10.",
      "Relata dormência ocasional em panturrilha direita. Nenhuma alteração de força.",
      "Paciente relata que a dor melhorou para 2/10 com os exercícios domiciliares.",
      "Queixa de desconforto ao dirigir por mais de 30 minutos. Dor lombar baixa.",
      "Sessão de manutenção. Paciente assintomático nas atividades diárias rotineiras.",
    ],
    objective: [
      "Flexão de tronco limitada a 45°, dor em extensão final. Teste de Lasègue 40° positivo à direita.",
      "Atrofia discreta de quadríceps direito (1cm). Força muscular grau 4+/5 nos membros inferiores.",
      "Pruits limitantes presentes em L4-L5. Hipostesia em dermátomo L5 à direita.",
      "Aumento da curvatura lombar fisiológica. Contratura de paravertebrais bilaterais.",
      "ADM de flexão melhorou para 70°. Teste de elevação da perna estendida negativo.",
      "Edema discreto em tornozelo direito. Reflexos patelares presentes e simétricos.",
      "Teste de Schober positivo (aumento < 4cm). Flexão lateral limitada à esquerda.",
      "Mudança postural adequada após orientação. Core estabilizado durante exercícios.",
      "Caminhada sem claudicação. Propriocepção preservada em apoio unipodal.",
      "Exames neurológicos dentro da normalidade. Força muscular 5/5 em todos os grupos.",
    ],
    assessment: [
      "Hérnia de disco L4-L5 com compressão radicular. Evoluição lenta, mas progressiva.",
      "Paciente apresenta melhora na mobilidade funcional. Objetivos de curto prazo atingidos.",
      "Síndrome radicular em regressão. Necessária continuidade do tratamento conservador.",
      "Estagnação na ADM de flexão. Considerar liberação miofascial complementar.",
      "Evolução favorável. Paciente demonstra aderência ao protocolo de exercícios.",
      "Piora aguda por esforço inadequado. Retorno ao nível funcional anterior.",
      "Melhora na estabilidade lombar. Progressão para exercícios funcionais.",
      "Paciente apto para iniciar treino de força progressivo. Bom prognóstico.",
      "Manutenção dos ganhos alcançados. Prevenção de recidiva sendo trabalhada.",
      "Condição estabilizada. Encaminhado para programa de exercício físico supervisionado.",
    ],
    plan: [
      "Mobilização articular L4-L5. Liberação miofascial de paravertebrais. Exercícios de estabilização core.",
      "Técnicas de Maitland grau II e III para L4-L5. Exercícios de Williams.",
      "Crioterapia pós-exercício. Treino de marcha em superfícies irregulares. Home exercise: ponte.",
      "McKenzie em extensão. Fortalecimento de abdômen profundo (abdominal hipopressivo).",
      "Propriocepção de tornozelo. Bicicleta ergométrica com resistência leve. Alongamentos.",
      "Drenagem linfática para edema. Eletroterapia (TENS) para controle álgico.",
      "Mobilização neurodinâmica do nervo ciático. Exercícios de equilibrio unipodal.",
      "Treino funcional: agachamento parcial, subida em step. Orientação postural no trabalho.",
      "Treino de força resistido (Theraband). Exercícios de flexibilidade progressiva.",
      "Sessão educativa sobre ergonomia. Finalização com alongamento global ativo.",
    ],
  },
  "Cervicalgia por postura": {
    subjective: [
      "Dor cervical 5/10 após jornada de trabalho no computador. Rigidez matinal.",
      "Cefaleia tensional associada. Dor irradiada para região escapular direita.",
      "Parestesia em mão direita (dedos 3 e 4). Formigamento à noite.",
      "Melhora com aplicação de calor local. Dor reduzida para 3/10.",
      "Crise de dor após trabalhar 6h seguidas sem intervalo. Náuseas leves.",
      "Paciente relata melhora significativa. Dor 2/10. Consegue trabalhar com pausas.",
      "Tensão muscular em trapézio superior. Cefaleia ocasional ao final do dia.",
      "Dor em região occiptal. Irradiação para testa. Componente stress-related.",
      "Paciente refere recuperação completa da força e sensibilidade.",
      "Sessão de manutenção. Postura melhorada, mas requer reforço de hábitos.",
    ],
    objective: [
      "Limitação de rotação cervical direita (45°). Contratura de trapézio superior e elevador da escápula.",
      "Teste de Spurling negativo. Reflexos bicipital e tricipital normais. Força 5/5.",
      "Hipostesia em dermátomo C7 à direita. Mobilidade cervical global reduzida em 30%.",
      "Flexão cervical dolorosa aos 40°. Sem sinais de comprometimento medular.",
      "ADM quase completa recuperada. Teste de compressão cervical negativo.",
      "Persiste tensão em músculos suboccipitais. Flexão lateral limitada à esquerda.",
      "Trigger points em trapézio médio. Resposta motora preservada em MMSS.",
      "Melhora significativa da mobilidade. Flexão e extensão com AROM completo.",
      "Sem alterações neurológicas. Força e sensibilidade normais em MMSS bilateral.",
      "Postura cérvico-torácica adequada durante avaliação. Estabilidade motora ótima.",
    ],
    assessment: [
      "Síndrome cervicobraquial direita. Postura pró-ativa de cabeça (Forward Head).",
      "Condição em regressão. Ergonomia no trabalho sendo gradualmente implementada.",
      "Possível compressão de raiz C7. Evolução favorável com fisioterapia manual.",
      "Síndrome de T4. Melhora com mobilização costovertebral.",
      "Crise aguda por sobrecarga ocupacional. Retorno ao nível funcional basal.",
      "Evolução excelente. Paciente aderiu às pausas de 15min a cada 2h.",
      "Tensão muscular residual. Benefício com técnicas de relaxamento progressivo.",
      "Componente emocional/stress contribuindo para tensão cervical. Abordagem biopsicossocial.",
      "Recuperação neurológica completa. Foco agora em fortalecimento de suporte.",
      "Estabilização das melhorias. Fase de prevenção de recidiva e manutenção.",
    ],
    plan: [
      "Mobilização cervical grau II e III. Liberação de trapézio e levantador da escápula. Alongamento.",
      "Técnicas de Jones (Strain-Counterstrain). Aplicação de calor úmido. Exercícios de retração cervical.",
      "Deslizamento neural do plexo braquial. Exercícios de banda elástica para rotação C.",
      "McKenzie em flexão cervical. Fortalecimento de flexores profundos do pescoço.",
      "TENS para controle álgico. Mobilização de articulações costovertebrais T1-T4.",
      "Treino de consciência postural. Espelho postural (biofeedback visual). Home: retração cervical.",
      "Massagem de tecidos profundos em suboccipitais. Exercícios oculares de convergência.",
      "Liberação miofascial global. Yoga terapêutica para relaxamento. Técnicas de respiração.",
      "Fortalecimento progressivo de extensoras de pescoço. Exercícios proprioceptivos.",
      "Educação em saúde: ergonomia. Liberação final e alongamento global. Alta programada.",
    ],
  },
  // Add more templates for other conditions...
};

// Template padrão para condições não mapeadas
const DEFAULT_SOAP = {
  subjective: [
    "Paciente relata progresso na reabilitação. Dor 4/10 atualmente.",
    "Melhora na função motora. Consegue realizar mais atividades diárias.",
    "Dor presente em algumas atividades específicas. Intensidade 5/10.",
    "Paciente relata cansaço muscular moderado após sessões anteriores.",
    "Excelente aderência ao programa de exercícios domiciliares.",
    "Algumas dificuldades com exercícios de fortalecimento. Necessita ajuste.",
    "Paciente motivado e demonstrando melhora consistente semanal.",
    "Dor residual leve (2/10). Mobilidade quase completa recuperada.",
    "Sessão focada em ganho de força e resistência muscular.",
    "Paciente relata satisfação com a evolução clínica até o momento.",
  ],
  objective: [
    "ADM preservada na maioria dos planos. Força muscular 4+/5 em grupos principais.",
    "Melhora na marcha e equilíbrio. Testes funcionais dentro da normalidade.",
    "Contraturas leves persistindo. Resposta tecidual adequada ao tratamento.",
    "Edema diminuído significativamente. Cicatrização em evolução normal.",
    "Propriocepção preservada. Exercícios de coordenação motora fina bem executados.",
    "Necessária liberação de pontos-gatilho em musculatura acessória.",
    "Aumento da resistência muscular. Capacidade funcional em expansão.",
    "Flexibilidade melhorada. Alongamentos atingem amplitude completa.",
    "Sinais vitais estáveis. Exames neurológicos sem alterações.",
    "Recuperação estrutural adequada. Sem limiações significativas ao exame físico.",
  ],
  assessment: [
    "Evolução favorável. Paciente demonstrando progresso constante nas metas estabelecidas.",
    "Condição em melhora gradual. Aderência ao tratamento excelente.",
    "Estagnação parcial. Necessária reavaliação do plano terapêutico.",
    "Recuperação dentro do esperado para o tempo de tratamento.",
    "Melhora significativa das funções comprometidas. Prognóstico favorável.",
    "Ajuste no protocolo necessário. Introduzir novos estímulos de carga.",
    "Excelente resposta ao tratamento conservador. Paciente engajado no processo.",
    "Condição estabilizada. Transição para fase de fortalecimento avançado.",
    "Progresso constante. Metas de curto prazo sendo atingidas sistematicamente.",
    "Fase final de reabilitação. Foco em prevenção de recidiva e autonomia.",
  ],
  plan: [
    "Cinesioterapia ativa assistida. Exercícios de fortalecimento progressivo. Orientações domiciliares.",
    "Mobilização articular suave. Liberação miofascial. Início de treino funcional.",
    "Propriocepção e equilibrio. Exercícios em superfícies instáveis. Treino de marcha.",
    "Eletroterapia para controle álgico. Crioterapia pós-exercício. Home exercises.",
    "Fortalecimento específico do grupamento comprometido. Treino resistido.",
    "Alongamentos globais. Yoga terapêutica. Técnicas de relaxamento muscular.",
    "Treino funcional avançado. Atividades de vida diária simuladas. Educação em saúde.",
    "Exercícios proprioceptivos. Bicicleta ergométrica. Natação terapêutica (se disponível).",
    "Manutenção dos ganhos. Circuito de exercícios variados. Preparação para alta.",
    "Reavaliação completa. Sessão educativa sobre prevenção. Finalização do tratamento.",
  ],
};

test.setTimeout(0);

test("Gerar 10 pacientes com 10 agendamentos e evoluções cada", async ({ page, baseURL }) => {
  // 1. Verificar se está logado (Setup Global lida com isso)
  await page.goto(baseURL || "http://localhost:5173");
  await page.waitForLoadState("networkidle");
  console.log(`✅ Iniciando script. URL atual: ${page.url()}`);

  for (let p = 0; p < PATIENTS.length; p++) {
    const patient = PATIENTS[p];
    const soapData = SOAP_TEMPLATES[patient.condition] || DEFAULT_SOAP;
    const patientEmail = `${patient.name.toLowerCase().replace(/\s/g, ".")}@example.com`;

    // 3. Criar Novo Paciente
    console.log(`  👤 [${p + 1}/${PATIENTS.length}] Criando paciente: ${patient.name}`);
      await page.goto(`${baseURL}/pacientes`);
    await page.waitForLoadState("networkidle");

    const newPatientBtn = page.locator('button:has-text("Novo Paciente")').first();
    await newPatientBtn.waitFor({ state: "visible", timeout: 15000 });
    await newPatientBtn.click();

    // 4. Preencher dados do paciente no modal
    console.log("  👤 Aguardando modal de cadastro...");
    const modal = page.getByRole("dialog");
    await modal.waitFor({ state: "visible", timeout: 15000 });
    
    console.log("  👤 Preenchendo nome...");
    const nameInput = modal.locator('input#full_name, input[name="full_name"]').first();
    await nameInput.waitFor({ state: "visible", timeout: 10000 });
    await nameInput.fill(patient.name);
    
    console.log("  👤 Preenchendo e-mail e telefone...");
    await modal.locator('input#email').fill(patientEmail);
    await modal.locator('input#phone').fill(patient.phone);

    // Salvar
    console.log("  👤 Clicando em Cadastrar...");
    const submitBtn = modal.locator('button:has-text("Cadastrar Paciente")').first();
    await submitBtn.waitFor({ state: "visible", timeout: 10000 });
    await submitBtn.click();
    await modal.waitFor({ state: "hidden", timeout: 15000 });
    console.log(`✅ Paciente ${p + 1}/10 criado: ${patient.name}`);

    // 5. Criar 10 agendamentos e evoluções
    for (let a = 1; a <= 10; a++) {
      const date = format(subDays(new Date(), 30 - a * 3), "yyyy-MM-dd");
      console.log(`  📅 [${a}/10] Criando agendamento para ${patient.name} (${date})`);

        await page.goto(`${baseURL}/pacientes`);
      await page.waitForLoadState("networkidle");

      // Buscar paciente
      console.log("  🔍 Buscando paciente...");
      const searchInput = page.locator("input#search-patients").first();
      await searchInput.waitFor({ state: "visible", timeout: 15000 });
      await searchInput.fill(patient.name);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);

      // Clicar no resultado
      await page.getByText(patient.name).first().click();
      await page.waitForTimeout(500);

      // Selecionar data se houver campo
      const dateInput = page.locator('input[type="date"], input[name="date"]');
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill(date);
      }

      // Confirmar agendamento
      const confirmBtn = page.locator(
        'button:has-text("Confirmar Agendamento"), button:has-text("Salvar Agendamento"), button:has-text("Agendar"), button[type="submit"]'
      ).first();
      await confirmBtn.waitFor({ state: "visible", timeout: 10000 });
      await confirmBtn.click();

      await page.waitForTimeout(3000);
      console.log(`  ✅ Agendamento ${a}/10 criado para ${patient.name}`);

      // 4. Registrar Evolução SOAP
      console.log(`  📝 [${a}/10] Preenchendo evolução SOAP para ${patient.name}`);

      await page.goto(`${baseURL}/agenda`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Tentar encontrar o card do paciente na agenda
      const patientCard = page.getByText(patient.name).first();
      if (await patientCard.isVisible().catch(() => false)) {
        await patientCard.click();
        await page.waitForTimeout(1000);
      }

      // Botão "Iniciar Atendimento" ou similar
      const startBtn = page.locator(
        'button:has-text("Iniciar Atendimento"), button:has-text("Iniciar"), button:has-text("Abrir Evolução")'
      ).first();
      
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(1500);

        // Preencher S (Subjetivo)
        const subj = soapData.subjective[(a - 1) % soapData.subjective.length];
        const subjField = page.locator(
          'textarea[placeholder*="Subjetivo"], textarea[name="subjective"], [contenteditable="true"]:near(:text("Subjetivo"))'
        ).first();
        if (await subjField.isVisible().catch(() => false)) {
          await subjField.fill(subj);
        }

        // Preencher O (Objetivo)
        const obj = soapData.objective[(a - 1) % soapData.objective.length];
        const objField = page.locator(
          'textarea[placeholder*="Objetivo"], textarea[name="objective"], [contenteditable="true"]:near(:text("Objetivo"))'
        ).first();
        if (await objField.isVisible().catch(() => false)) {
          await objField.fill(obj);
        }

        // Preencher A (Avaliação/Assessment)
        const assess = soapData.assessment[(a - 1) % soapData.assessment.length];
        const assessField = page.locator(
          'textarea[placeholder*="Avaliação"], textarea[name="assessment"], [contenteditable="true"]:near(:text("Avaliação"))'
        ).first();
        if (await assessField.isVisible().catch(() => false)) {
          await assessField.fill(assess);
        }

        // Preencher P (Plano)
        const plan = soapData.plan[(a - 1) % soapData.plan.length];
        const planField = page.locator(
          'textarea[placeholder*="Plano"], textarea[name="plan"], [contenteditable="true"]:near(:text("Plano"))'
        ).first();
        if (await planField.isVisible().catch(() => false)) {
          await planField.fill(plan);
        }

        // 5. Criar Análise Biomecânica Fictícia (para teste de comparação)
        if (a === 1 || a === 10) { // Criar na primeira e na última sessão para comparar evolução
          console.log(`  🦴 [${a}/10] Gerando análise biomecânica para ${patient.name}`);
          
          await page.click('button[role="tab"]:has-text("Biomec.")');
          await page.waitForTimeout(1000);
          
          // Selecionar Postura se disponível
          const postureBtn = page.locator('button:has-text("Avaliação Postural")').first();
          if (await postureBtn.isVisible().catch(() => false)) {
            await postureBtn.click();
            await page.waitForTimeout(1000);
            
            // Clicar em Salvar na Sessão
            const saveBioBtn = page.locator('button:has-text("Salvar na Sessão")').first();
            if (await saveBioBtn.isVisible().catch(() => false)) {
              await saveBioBtn.click();
              await page.waitForTimeout(2000);
            }
          }
        }

        // Finalizar evolução
        const finishBtn = page.locator(
          'button:has-text("Finalizar Evolução"), button:has-text("Salvar Evolução"), button:has-text("Concluir"), button[type="submit"]'
        ).first();
        if (await finishBtn.isVisible().catch(() => false)) {
          await finishBtn.click();
          await page.waitForTimeout(1500);
        }
      }

      console.log(`  ✅ Evolução SOAP ${a}/10 finalizada para ${patient.name}`);
    }

    console.log(`\n🎉 Paciente ${p + 1}/10 COMPLETO: ${patient.name} - 10 agendamentos + 10 evoluções\n`);
  }

  console.log("🏁 Geração de dados em massa concluída com sucesso! 10 pacientes, 100 agendamentos, 100 evoluções SOAP criadas.");
});
