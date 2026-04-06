/**
 * notion-templates.ts
 *
 * Rich Notion-style templates for clinical evolution records.
 * Based on real physiotherapy evolution patterns from Brazilian clinics.
 *
 * Each template produces structured HTML content that renders beautifully
 * inside the Notion-style RichTextEditor used in NotionEvolutionPanel.
 */

import type { SOAPTemplate } from "./TemplateSelector";

// ──────────────────────────────────────────────────────────────────────────────
// Helper to wrap text in a Notion-style callout HTML block
// ──────────────────────────────────────────────────────────────────────────────
function callout(emoji: string, text: string): string {
  return `<blockquote><p>${emoji} ${text}</p></blockquote>`;
}

function bulletList(items: string[]): string {
  return `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ul>`;
}

function orderedList(items: string[]): string {
  return `<ol>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ol>`;
}

function h3(text: string): string {
  return `<h3>${text}</h3>`;
}

function paragraph(text: string): string {
  return `<p>${text}</p>`;
}

function bold(text: string): string {
  return `<strong>${text}</strong>`;
}

function divider(): string {
  return `<hr/>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// TEMPLATE COLLECTION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds the "evolutionText" section (html) for the Notion editor
 * from structured data. Mirrors what therapists write manually.
 */
function buildEvolutionBlock(opts: {
  heading: string;
  calloutText?: string;
  calloutEmoji?: string;
  orientation?: string[];
  techniques: string[];
  goniometry?: Record<string, string>;
  observations?: string;
}): string {
  const parts: string[] = [];

  if (opts.calloutText) {
    parts.push(
      callout(opts.calloutEmoji ?? "📋", opts.calloutText)
    );
  }

  if (opts.orientation && opts.orientation.length > 0) {
    parts.push(h3("🏠 Orientação Domiciliar"));
    parts.push(bulletList(opts.orientation));
    parts.push(divider());
  }

  parts.push(h3(`🩺 ${opts.heading}`));
  parts.push(bulletList(opts.techniques));

  if (opts.goniometry) {
    parts.push(divider());
    parts.push(h3("📐 Goniometria Final"));
    const gLines = Object.entries(opts.goniometry).map(
      ([k, v]) => `${bold(k)}: ${v}`
    );
    parts.push(bulletList(gLines));
  }

  if (opts.observations) {
    parts.push(divider());
    parts.push(paragraph(opts.observations));
  }

  return parts.join("\n");
}

// ──────────────────────────────────────────────────────────────────────────────
// 01 — COLUNA CERVICAL / CERVICALGIA
// ──────────────────────────────────────────────────────────────────────────────
export const CERVICALGIA_TEMPLATE: SOAPTemplate = {
  id: "notion-cervicalgia",
  name: "Cervicalgia & Coluna Cervical",
  category: "followup",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente relatou que houve melhora da dor em cervical, mas ainda tem considerável tensão em TFS e torácica E ao realizar fix da cervical.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Aplicadas",
    orientation: [
      "Melhorar postura durante o trabalho no computador",
      "Se levantar a cada 2h",
      "Realizar exerc. de mob torácica",
    ],
    techniques: [
      "Lib Mio com massagem gun em TFS e paravertebral torácico",
      "Thrust torácico",
      "Lib Mio manual em suboccipital, cervical, TFS e paravertebral torácico",
      "Combinada em ombro E",
      "Mob torácica na rolimã 3x5rep (orientação domiciliar)",
      "Mob torácica em 4 apoios 3x10 (orientação domiciliar)",
      "Mob em posição de semi afundo 3x10rep (orientação domiciliar)",
      "Mob escapular 3x10rep (Orientação domiciliar)",
      "EENM em TFI na posição sentado realizando RL com thera band amarelo 10/10 S'",
      "90/90 com thera band amarelo arklus 3x10",
      "Remada escapular no TRX 3x10rep",
      "Remada com thera band verde listrado 3x10rep",
      "Tens Acup em paravertebral torácico",
    ],
  }),
  assessment:
    "Evolução favorável com melhora gradual da dor cervical. Ainda apresenta tensão considerável em região torácica superior. Continuar protocolo de mobilização e fortalecimento escapular.",
  plan: orderedList([
    "Manter protocolo de mobilização torácica (3x/semana)",
    "Reforçar orientações posturais no trabalho",
    "Progredir carga no fortalecimento escapular",
    "Reavaliar em 2 semanas",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 02 — JOELHO / ENTORSE / SINDESMOSE
// ──────────────────────────────────────────────────────────────────────────────
export const JOELHO_TORNOZELO_TEMPLATE: SOAPTemplate = {
  id: "notion-joelho-tornozelo",
  name: "Joelho & Tornozelo – Entorse / Sindesmose",
  category: "followup",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente relatou estar bem, sem dores em tornozelo E no dia de hoje e apresentando redução de edema.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Aplicadas",
    calloutEmoji: "📍",
    calloutText:
      "PO de Fratura de Maisonneuve MIE 26/02 – 05 semanas e 00 dias",
    techniques: [
      "Lib Mio em perna MIE",
      "Laser na região da sindesmose MIF",
      "Mob (ADM reduzida) de dorsi e plantif MIE em DD",
      "SLR ant / lat / post com 9kg na coxa 3x15rep",
      "Órtese com robotfoot MIE com caneleira 9kg, 3x10rep",
      "Exercício de intrínsecos puxando a toalha 3x30''",
      "EENM em intrínsecos do pé E na posição sentado 10/10 S'",
      "Mob de tornozelo arrastando o pé E na toalha na posição sentado 3x10rep",
      "Cad ext E com velcro em terço médio da perna e thera tube 3x10rep",
      "Cad flex E com velcro em terço médio da perna e thera tube 3x10rep",
      "Bota 150mmHg",
      "Gelo no tornozelo E",
    ],
  }),
  assessment:
    "Boa evolução pós-fratura de Maisonneuve. Edema em regressão. Ganho gradual de ADM. Continuar protocolo de reabilitação funcional.",
  plan: orderedList([
    "Manter uso da bota compressiva 150mmHg",
    "Progredir carga nos exercícios de fortalecimento",
    "Iniciar propriocepção gradual em superfície estável",
    "Reavaliar ADM em próxima sessão",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 03 — OMBRO / FRATURA ÚMERO / PRAXIA
// ──────────────────────────────────────────────────────────────────────────────
export const OMBRO_FRATURA_TEMPLATE: SOAPTemplate = {
  id: "notion-ombro-fratura",
  name: "Ombro – Fratura Úmero distal / Praxia Nervo Radial",
  category: "followup",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente apresentando melhora gradual após fratura do úmero distal. Realizando exercícios domiciliares conforme orientado.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Aplicadas",
    calloutEmoji: "📍",
    calloutText:
      "Fratura de úmero distal E + Praxia do nervo radial (12/12/2025) – 15 semanas e dias",
    techniques: [
      "Drenagem em MSE",
      "EENM em extensores E e intrínseco das mãos E realizando força para extensão de punho e dedos 15/15 S'",
      "Sustentação do punho em posição neutra com 1kg 3x20''",
      "Remada com thera tube amarelo (leve) 3x10rep",
      "EENM em tríceps realizando extensão de cotovelo com faixa forçando de forma isotônica 15/10/S'",
      "Flexão do braço em pé apoiado na maca com o peso do corpo 3x8rep",
      "Extensão de punho com peso do corpo na maca 3x10rep",
      "Bíceps com 1kg 3x10rep",
      "Tríceps com thera tube amarelo 3x10rep",
      "Elevação lateral/elevação frontal com caneleira de 0,5kg 2x10rep (angulação reduzida de acordo com sintomas álgicos em região de ombro)",
      "Distribuição de cotovelo E",
      "Mob de prono e supino E",
      "Energia muscular de Fle e ext de cotovelo E",
      "Mob passiva para extensão e fix de cotovelo E",
      "Mob passiva para flexão e extensão de dedos",
      "Tens em face anterior de ombro",
    ],
    goniometry: {
      Extensão: "-15°",
      Flexão: "110°",
    },
  }),
  assessment:
    "Evolução pós-fratura de úmero distal com praxia do nervo radial. Ganho gradual de ADM. Fortalecimento progressivo em andamento.",
  plan: orderedList([
    "Continuar EENM e exercícios graduais de cotovelo e punho",
    "Progredir carga conforme tolerância álgica",
    "Manter mobilização passiva e ativa assistida",
    "Reavaliação goniométrica na próxima sessão",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 04 — MEMBROS INFERIORES / RUNNING / JOELHO + PANTURRILHA
// ──────────────────────────────────────────────────────────────────────────────
export const CORRIDA_JOELHO_TEMPLATE: SOAPTemplate = {
  id: "notion-corrida-joelho",
  name: "Corrida & Joelho – Dor + Panturrilha",
  category: "followup",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente relatou estar sem dores em joelho E, quadril E e panturrilha E no dia de hoje. Retomaremos gradualmente a corrida durante as sessões.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Aplicadas",
    techniques: [
      "Lib mio manual em glúteo E, TFL, glúteo médio, TIT E e tríceps sural E",
      "Sensório motor no solo unipodal bilateral realizando ext de quadril + rot ext com band verde tribe 3x15 reps",
      "Siri com agilidade com band verde tribe 3x1'",
      "Salto vertical uni 3x10rep",
      "Corrida na esteira 1/1' velocidade 5km/h e 9km/h 6'",
      "Salto horizontal uni 3x5rep",
      "Panturrilha unipodal bilateral 3x15 reps de cada lado",
      "Avanço na posição afundo e colocar o pé no calcote + anilha de 5kg 3x10rep de cada lado",
      "Salto do calcote para o chão 3x5rep",
      "Salta com afundo alternado 3x5rep de cada lado",
      "TENS em joelho E e região lateral",
    ],
  }),
  assessment:
    "Excelente evolução. Paciente sem dores durante atividades de corrida. Progressão gradual para retorno esportivo em andamento.",
  plan: orderedList([
    "Manter progressão de corrida em esteira (velocidade e tempo)",
    "Continuar fortalecimento excêntrico de panturrilha",
    "Aumentar volume de pliometria gradualmente",
    "Reavaliar para retorno às atividades esportivas em 3 semanas",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 05 — NEUROLÓGICO / AVC / REABILITAÇÃO FUNCIONAL
// ──────────────────────────────────────────────────────────────────────────────
export const NEUROLOGICO_AVC_TEMPLATE: SOAPTemplate = {
  id: "notion-neurologico-avc",
  name: "Neurológico – AVC / Reabilitação Funcional",
  category: "followup",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente relata melhora na movimentação do membro superior afetado. Família relata maior independência nas AVDs. Nega dor.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Neurológicas Aplicadas",
    techniques: [
      "FNP de membro superior – padrões de flexão/extensão 3x10rep",
      "Treino de alcance funcional em prono sobre cotovelos",
      "Estimulação sensorial com texturas diversas em mão afetada",
      "Treino de segurar e soltar objetos de diferentes tamanhos",
      "EENM em extensores de punho afetado 15/15 S' por 20min",
      "Mobilização escapular passiva e ativa assistida",
      "Treino de transferência sentado ↔ em pé com apoio mínimo",
      "Treino de marcha em paralelas 3x10 metros",
      "Exercícios de equilíbrio em base reduzida",
      "Treino de coordenação motora fina – pegada bimanual",
    ],
    observations:
      "Sessão de neuroreabilitação com foco em funcionalidade e independência. Paciente colaborativo e motivado.",
  }),
  assessment:
    "Progressão positiva em neuroreabilitação pós-AVC. Ganho de força distal em MSE. Melhora no controle de tronco e qualidade da marcha.",
  plan: orderedList([
    "Manter estimulação sensório-motora de MSE",
    "Progredir treino de marcha para superfícies irregulares",
    "Orientar família quanto a atividades de estimulação domiciliar",
    "Reavaliação funcional em 4 semanas",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 06 — DOR CRÔNICA / LOMBALGIA CRÔNICA
// ──────────────────────────────────────────────────────────────────────────────
export const LOMBALGIA_CRONICA_TEMPLATE: SOAPTemplate = {
  id: "notion-lombalgia-cronica",
  name: "Lombalgia Crônica – Coluna Lombar",
  category: "followup",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente refere dor lombar persistente há 6 meses, EVA 6/10 hoje. Piora com esforço físico e posição sentada prolongada. Melhora com calor local.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Aplicadas",
    orientation: [
      "Evitar ficar sentado por mais de 45 minutos sem pausas",
      "Realizar série de exercícios de Bird-Dog 2x diariamente",
      "Aplicar calor úmido por 15 minutos antes dos exercícios",
    ],
    techniques: [
      "Lib Mio paravertebral lombar bilateral com massagem gun",
      "Mobilização vertebral L4-L5-S1 grau III",
      "Thrust lombar unilateral",
      "Exercício Bird-Dog 3x10rep cada lado",
      "Ponte com ativação de glúteos 3x15rep",
      "Prancha isométrica frontal 3x30''",
      "Prancha lateral 3x20'' cada lado",
      "Exercício de controle motor – ativação de multífidos",
      "Agachamento parcial com biopode 3x12rep",
      "TENS lombar paravertebral 80Hz por 20min",
      "Crioterapia pós-sessão em região lombar",
    ],
  }),
  assessment:
    "Lombalgia crônica inespecífica com progressão satisfatória. EVA reduzida de 8 para 6. Fortalecimento do core em desenvolvimento.",
  plan: orderedList([
    "Continuar protocolo de estabilização lombar",
    "Progredir para exercícios em superfície instável",
    "Incluir pilates terapêutico 2x/semana como complemento",
    "Revisar ergonomia do posto de trabalho",
    "Reavaliar em 3 semanas",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 07 — PÓS-CIRÚRGICO JOELHO / LCA / ARTROSCOPIA
// ──────────────────────────────────────────────────────────────────────────────
export const POS_CIRURGICO_LCA_TEMPLATE: SOAPTemplate = {
  id: "notion-pos-cirurgico-lca",
  name: "Pós-Cirúrgico – LCA / Artroscopia de Joelho",
  category: "procedure",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente em pós-operatório de reconstrução de LCA. Refere dor 4/10 e edema moderado. Nega febre ou secreção na cicatriz.",
  objective: buildEvolutionBlock({
    heading: "Protocolo Pós-Op LCA",
    calloutEmoji: "⚕️",
    calloutText: "Protocolo pós-reconstrução de LCA – Semana 4",
    techniques: [
      "Crioterapia em joelho operado 15min",
      "Drenagem linfática manual em joelho e coxa",
      "EENM em quadríceps 15/15 S' – contrações isométricas",
      "SLR (elevação do membro reto) 3x15rep",
      "Extensão isométrica de joelho em 60° 3x10rep",
      "Flexão ativa de joelho a 90° com suporte 3x10rep",
      "Fortalecimento de cadeia posterior – leg curl 3x12rep leve",
      "Propriocepção em equilíbrio bipodal estático 3x30''",
      "Mobilização patelar – todos os planos",
      "Treino de marcha sem muleta em ambiente seguro",
    ],
    goniometry: {
      "Extensão ativa": "0° (completa)",
      "Flexão ativa": "95°",
      "Flexão passiva": "105°",
    },
  }),
  assessment:
    "Evolução pós-op de LCA dentro do esperado. Ganho de ADM de flexão de 85° para 95°. Extensão completa. Edema em regressão.",
  plan: orderedList([
    "Progredir flexão para 110° na próxima semana",
    "Iniciar bicicleta ergométrica sem resistência quando flexão ≥ 105°",
    "Manter crioterapia pós-sessão por 20 minutos",
    "Reavaliação ortopédica programada em 2 semanas",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 08 — RESPIRATÓRIO / DPOC / FISIOTERAPIA RESPIRATÓRIA
// ──────────────────────────────────────────────────────────────────────────────
export const RESPIRATORIO_TEMPLATE: SOAPTemplate = {
  id: "notion-respiratorio",
  name: "Fisioterapia Respiratória – DPOC / Pneumonia",
  category: "procedure",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente refere melhora da dispneia em repouso. Tosse produtiva com expectoração esbranquiçada. SpO₂ 94% em ar ambiente.",
  objective: buildEvolutionBlock({
    heading: "Técnicas Respiratórias Aplicadas",
    techniques: [
      "Oximetria: SpO₂ 94% → 97% após sessão",
      "Inaloterapia com SF 0,9% 3ml por 10min",
      "Vibração manual em bases e ápices pulmonares bilaterais",
      "Percussão torácica em decúbito lateral D e E",
      "Drenagem postural em todos os segmentos",
      "Huffing (Técnica de exalação forçada) – 3 séries",
      "Ciclo ativo de técnicas respiratórias (CATR)",
      "Exercícios diafragmáticos com carga 1kg",
      "Exercícios com Threshold IMT – 30% da PiMáx",
      "Cinesioterapia respiratória – expansão costal",
      "Deambulação supervisionada 10 minutos com SpO₂ monitorada",
    ],
    observations:
      "Paciente tolerou bem a sessão. SpO₂ mantida acima de 95% durante todos os exercícios.",
  }),
  assessment:
    "Melhora da clearance mucociliar e capacidade de expansão torácica. SpO₂ em melhora progressiva. Dispneia reduzida de 4 para 2 na escala de Borg.",
  plan: orderedList([
    "Manter sessões de fisioterapia respiratória diária",
    "Progredir carga no Threshold IMT em 5% semanalmente",
    "Treino aeróbico de baixa intensidade quando SpO₂ estável",
    "Orientar exercícios respiratórios domiciliares 2x/dia",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// 09 — ALTA CLÍNICA / FINALIZAÇÃO DE TRATAMENTO
// ──────────────────────────────────────────────────────────────────────────────
export const ALTA_CLINICA_TEMPLATE: SOAPTemplate = {
  id: "notion-alta-clinica",
  name: "Alta Clínica – Finalização de Tratamento",
  category: "discharge",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente relata ausência de dor há 3 semanas. Retornou a todas as atividades funcionais e esportivas sem limitações.",
  objective: buildEvolutionBlock({
    heading: "Testes Funcionais de Alta",
    techniques: [
      "Hop Test unipodal: D 90cm / E 88cm (≥ 85% do contralateral ✓)",
      "Y-Balance Test: dentro dos valores normativos bilateralmente",
      "Força de extensão de joelho: 90% do contralateral (dinamometria)",
      "Escala Lysholm: 95/100",
      "IKDC: 88/100",
      "Sem déficit de propriocepção nos testes funcionais",
      "ADM completa e simétrica bilateralmente",
    ],
    observations:
      "Alta com orientações de manutenção. Paciente consciente sobre prevenção de recidivas e importância da manutenção física.",
  }),
  assessment:
    "Critérios de alta atingidos. Paciente com função completa restaurada, sem dor e sem limitações funcionais.",
  plan: [
    h3("📋 Orientações de Alta"),
    bulletList([
      "Manter atividade física regular 3x/semana",
      "Continuar série de exercícios preventivos domiciliares",
      "Retornar em caso de recidiva ou nova lesão",
      "Consulta de follow-up em 6 meses",
    ]),
    callout(
      "✅",
      "Alta fisioterapêutica concedida. Objetivo terapêutico alcançado."
    ),
  ].join("\n"),
};

// ──────────────────────────────────────────────────────────────────────────────
// 10 — PRIMEIRA CONSULTA / AVALIAÇÃO INICIAL
// ──────────────────────────────────────────────────────────────────────────────
export const PRIMEIRA_CONSULTA_TEMPLATE: SOAPTemplate = {
  id: "notion-primeira-consulta",
  name: "Primeira Consulta – Avaliação Inicial",
  category: "initial",
  isFavorite: false,
  usageCount: 0,
  subjective:
    "Paciente comparece à primeira consulta referindo queixa principal de ___. Início do quadro há ___. Piora com ___ e melhora com ___. Histórico de: ___.",
  objective: [
    h3("👤 Dados Gerais"),
    paragraph(
      "Postura: ___ | Marcha: ___ | Padrão respiratório: ___"
    ),
    divider(),
    h3("🔍 Testes Especiais"),
    bulletList([
      "Teste ___ : Positivo / Negativo",
      "Amplitude de movimento: ___",
      "Força muscular grau ___/5",
      "Sensibilidade: Preservada / Alterada",
      "Reflexos: Normais / Diminuídos / Aumentados",
    ]),
    divider(),
    h3("📐 Goniometria Inicial"),
    bulletList([
      "Flexão: ___°",
      "Extensão: ___°",
      "Rotação interna: ___°",
      "Rotação externa: ___°",
    ]),
  ].join("\n"),
  assessment:
    "Impressão clínica: ___. Hipótese diagnóstica fisioterapêutica: ___. Prognóstico: ___.",
  plan: orderedList([
    "Controle da dor e inflamação (fase 1)",
    "Restauração da ADM e mobilidade articular (fase 2)",
    "Fortalecimento muscular progressivo (fase 3)",
    "Treino funcional e retorno às atividades (fase 4)",
    "Previsão de alta: ___ sessões",
    "Frequência recomendada: ___ vezes/semana",
  ]),
};

// ──────────────────────────────────────────────────────────────────────────────
// EXPORTED COLLECTION
// ──────────────────────────────────────────────────────────────────────────────
export const NOTION_TEMPLATES: SOAPTemplate[] = [
  PRIMEIRA_CONSULTA_TEMPLATE,
  CERVICALGIA_TEMPLATE,
  JOELHO_TORNOZELO_TEMPLATE,
  OMBRO_FRATURA_TEMPLATE,
  CORRIDA_JOELHO_TEMPLATE,
  NEUROLOGICO_AVC_TEMPLATE,
  LOMBALGIA_CRONICA_TEMPLATE,
  POS_CIRURGICO_LCA_TEMPLATE,
  RESPIRATORIO_TEMPLATE,
  ALTA_CLINICA_TEMPLATE,
];
