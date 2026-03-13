import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PptxGenJS = require("/tmp/fisioflow-pptxgen/node_modules/pptxgenjs/dist/pptxgen.cjs.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(
  repoRoot,
  "docs2026",
  "FISIOFLOW_DIRETORIA_CLINICA_APRESENTACAO_COM_VIDEOS.pptx",
);
const logoPath = path.join(repoRoot, "logo", "logo.png");

const COLORS = {
  navy: "0F172A",
  blue: "1D4ED8",
  cyan: "0891B2",
  teal: "0F766E",
  slate: "475569",
  muted: "64748B",
  border: "CBD5E1",
  paper: "F8FAFC",
  white: "FFFFFF",
  softBlue: "DBEAFE",
  softCyan: "CFFAFE",
  softGray: "E2E8F0",
  softGreen: "DCFCE7",
  gold: "F59E0B",
};

const VIDEO_RESOURCES = {
  personCentered: {
    title: "Person-centered care em fisioterapia",
    source: "AAOMPT | Orthopaedic Manual Physical Therapy",
    url: "https://www.youtube.com/watch?v=YPNRaVjLQOo",
    embed: "https://www.youtube.com/embed/YPNRaVjLQOo",
    date: "16/09/2024",
    why: "Ajuda a diretoria a entender que engajamento e adesao dependem de experiencia, comunicacao e confianca, nao apenas de prescricao.",
  },
  patientEngagement: {
    title: "Patient centered care and patient engagement",
    source: "Webinar no YouTube",
    url: "https://www.youtube.com/watch?v=ug3_bJH9RdU",
    embed: "https://www.youtube.com/embed/ug3_bJH9RdU",
    date: "06/12/2023",
    why: "Bom para sustentar a tese de que o paciente participa mais quando existe acompanhamento continuo e senso de progresso.",
  },
  kemtai: {
    title: "Kemtai Care tutorial",
    source: "Kemtai / YouTube",
    url: "https://www.youtube.com/watch?v=9dBMNA3fTE4",
    embed: "https://www.youtube.com/embed/9dBMNA3fTE4",
    date: "06/06/2023",
    why: "Serve para mostrar visualmente como uma categoria parecida conecta profissional, paciente e exercicios remotos.",
  },
  medbridge: {
    title: "MedBridge HEP overview",
    source: "MedBridge / YouTube",
    url: "https://www.youtube.com/watch?v=XK6gLAm7vo8",
    embed: "https://www.youtube.com/embed/XK6gLAm7vo8",
    date: "19/04/2023",
    why: "Ajuda a diretoria a visualizar o mercado de programas domiciliares com monitoramento e engajamento.",
  },
};

const WEBINAR_LINKS = [
  {
    title: "Winning with Remote Therapeutic Monitoring",
    source: "Limber Health",
    date: "10/02/2026",
    url: "https://www.limberhealth.com/blog/webinar-winning-with-rtm",
    note: "Bom para reforcar a conversa de receita, processo e escala.",
  },
  {
    title: "Understanding Remote Solutions for Rehabilitation",
    source: "American Telemedicine Association",
    date: "21/09/2023",
    url: "https://www.americantelemed.org/resources/understanding-remote-solutions-for-rehabilitation-remote-physiologic-monitoring-remote-therapeutic-monitoring/",
    note: "Bom para explicar continuidade de cuidado e monitoramento remoto em linguagem clinica.",
  },
];

function newDeck() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OpenAI Codex";
  pptx.company = "FisioFlow";
  pptx.subject = "Diretoria clinica - retorno financeiro e engajamento";
  pptx.title = "FisioFlow - Apresentacao para diretoria clinica";
  pptx.lang = "pt-BR";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: "pt-BR",
  };
  return pptx;
}

function addBg(slide, color = COLORS.paper) {
  slide.background = { color };
}

function addLogo(slide, opts = {}) {
  const x = opts.x ?? 11.2;
  const y = opts.y ?? 0.3;
  const w = opts.w ?? 1.55;
  const h = opts.h ?? 0.55;
  slide.addText("", {
    x: x - 0.12,
    y: y - 0.06,
    w: w + 0.24,
    h: h + 0.12,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, transparency: 100 },
    radius: 0.08,
  });
  slide.addImage({ path: logoPath, x, y, w, h });
}

function addFooter(slide, text) {
  slide.addText(text, {
    x: 0.5,
    y: 7.05,
    w: 8.8,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 9,
    color: COLORS.muted,
    margin: 0,
  });
}

function addHeader(slide, title, subtitle) {
  slide.addText(subtitle, {
    x: 0.6,
    y: 0.42,
    w: 4.2,
    h: 0.24,
    fontFace: "Aptos",
    fontSize: 10,
    bold: true,
    color: COLORS.cyan,
    margin: 0,
  });
  slide.addText(title, {
    x: 0.6,
    y: 0.72,
    w: 8.7,
    h: 0.6,
    fontFace: "Aptos Display",
    fontSize: 24,
    bold: true,
    color: COLORS.navy,
    margin: 0,
  });
  slide.addText("", {
    x: 0.6,
    y: 1.34,
    w: 1.05,
    h: 0.06,
    fill: { color: COLORS.blue },
    line: { color: COLORS.blue, transparency: 100 },
  });
  addLogo(slide);
}

function addCard(slide, { x, y, w, h, title, body, fill = COLORS.white, titleColor = COLORS.navy, bodyColor = COLORS.slate, line = COLORS.border, hyperlink }) {
  slide.addText("", {
    x,
    y,
    w,
    h,
    fill: { color: fill },
    line: { color: line, pt: 1 },
    radius: 0.12,
    hyperlink,
  });
  if (title) {
    slide.addText(title, {
      x: x + 0.18,
      y: y + 0.15,
      w: w - 0.36,
      h: 0.34,
      fontFace: "Aptos Display",
      fontSize: 16,
      bold: true,
      color: titleColor,
      margin: 0,
      fit: "shrink",
      hyperlink,
    });
  }
  if (body) {
    slide.addText(body, {
      x: x + 0.18,
      y: y + 0.56,
      w: w - 0.36,
      h: h - 0.72,
      fontFace: "Aptos",
      fontSize: 11,
      color: bodyColor,
      margin: 0,
      breakLine: false,
      fit: "shrink",
      valign: "top",
      hyperlink,
    });
  }
}

function addButton(slide, { x, y, w, h, text, url, fill = COLORS.blue, color = COLORS.white }) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: "Aptos",
    fontSize: 11,
    bold: true,
    align: "center",
    valign: "middle",
    color,
    fill: { color: fill },
    line: { color: fill, pt: 1 },
    radius: 0.12,
    hyperlink: { url, tooltip: text },
    margin: 0.04,
  });
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function addVideoSlide(slide, { kicker, title, source, date, why, embed, url }) {
  addBg(slide);
  addHeader(slide, title, kicker);
  addCard(slide, {
    x: 0.6,
    y: 1.8,
    w: 4.65,
    h: 4.55,
    title: "Por que este video importa",
    body: bullets([
      `Fonte: ${source}`,
      `Data: ${date}`,
      why,
      "Use este slide como apoio visual ou deixe o video para o fim da reuniao.",
    ]),
    fill: COLORS.white,
  });
  slide.addMedia({
    type: "online",
    link: embed,
    x: 5.65,
    y: 1.82,
    w: 6.55,
    h: 3.72,
  });
  addButton(slide, {
    x: 5.65,
    y: 5.78,
    w: 2.2,
    h: 0.42,
    text: "Abrir video",
    url,
  });
  addFooter(slide, "Videos online funcionam melhor no PowerPoint conectado a internet. Se o embed nao abrir no seu visualizador, use o botao.");
}

function buildSlides(pptx) {
  let slide = pptx.addSlide();
  addBg(slide, COLORS.navy);
  slide.addText("FisioFlow", {
    x: 0.7,
    y: 0.58,
    w: 2.5,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 12,
    bold: true,
    color: "93C5FD",
    margin: 0,
  });
  slide.addText("Da operacao clinica a\numa plataforma de\ncontinuidade e receita", {
    x: 0.7,
    y: 1.2,
    w: 5.6,
    h: 2.1,
    fontFace: "Aptos Display",
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    margin: 0,
    fit: "shrink",
  });
  slide.addText("Tese central: engajamento do paciente no app pode gerar mais adesao, menos evasao, mais reativacao e mais receita por paciente para a clinica.", {
    x: 0.72,
    y: 3.55,
    w: 5.15,
    h: 1.0,
    fontFace: "Aptos",
    fontSize: 14,
    color: "E2E8F0",
    margin: 0,
    fit: "shrink",
  });
  addCard(slide, {
    x: 7.1,
    y: 1.18,
    w: 5.3,
    h: 4.95,
    title: "Mensagem para a diretoria",
    body: bullets([
      "Hoje a clinica monetiza principalmente durante o tratamento ativo.",
      "O pos-alta e onde mais se perde relacionamento, prevencao e receita futura.",
      "O FisioFlow pode transformar esse vazio em continuidade de cuidado e recorrencia.",
      "O app precisa ser visto como canal de retencao e conversao, nao apenas como apoio operacional.",
    ]),
    fill: "111C3A",
    titleColor: COLORS.white,
    bodyColor: "E2E8F0",
    line: "233554",
  });
  slide.addText("Engajamento -> Adesao -> Retencao -> Reativacao -> Receita", {
    x: 0.72,
    y: 6.2,
    w: 6.4,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 12,
    bold: true,
    color: "93C5FD",
    margin: 0,
  });
  addLogo(slide, { x: 11.0, y: 0.45, w: 1.75, h: 0.62 });
  addFooter(slide, "Apresentacao executiva para diretoria clinica | foco em valor economico e continuidade de cuidado");

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "O problema economico acontece depois da alta", "Cenario atual");
  addCard(slide, {
    x: 0.65,
    y: 1.75,
    w: 3.85,
    h: 4.55,
    title: "Hoje",
    body: bullets([
      "A clinica ganha bem durante o tratamento ativo.",
      "Apos a alta, o relacionamento perde intensidade.",
      "Muitos pacientes reduzem rotina e podem regredir.",
      "O retorno acontece tarde, quando a dor ja piorou.",
    ]),
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 4.75,
    y: 1.75,
    w: 3.85,
    h: 4.55,
    title: "Perdas invisiveis",
    body: bullets([
      "Perda de continuidade assistencial.",
      "Queda de valor percebido apos a alta.",
      "Menos chances de prevencao e acompanhamento leve.",
      "Menos oportunidades de venda de outros servicos.",
    ]),
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 8.85,
    y: 1.75,
    w: 3.85,
    h: 4.55,
    title: "Oportunidade",
    body: bullets([
      "Transformar a alta em transicao estruturada.",
      "Criar programas de manutencao e monitoramento.",
      "Usar o app para reter, reativar e reconectar o paciente.",
      "Gerar recorrencia sem depender so da agenda cheia.",
    ]),
    fill: COLORS.softCyan,
    line: "A5F3FC",
  });
  addFooter(slide, "Tese: o pos-alta e o ponto onde a clinica mais perde valor e onde o FisioFlow mais pode gerar retorno.");

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "O FisioFlow ja tem a base para operar esse modelo", "Ativos existentes");
  addCard(slide, {
    x: 0.65,
    y: 1.75,
    w: 5.8,
    h: 3.85,
    title: "App profissional",
    body: bullets([
      "Agenda, pacientes, prontuario e operacao clinica.",
      "Prescricao de exercicios e acompanhamento do plano.",
      "Financeiro e relatorios para gestao.",
      "Base forte para organizar o cuidado e tomar decisao.",
    ]),
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 6.75,
    y: 1.75,
    w: 5.9,
    h: 3.85,
    title: "App do paciente",
    body: bullets([
      "Exercicios do dia, progresso e notificacoes.",
      "Feedback do paciente, bem-estar e gamificacao.",
      "Canal de contato fora da consulta.",
      "Base para manter o paciente ativo entre sessoes e apos a alta.",
    ]),
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 1.55,
    y: 5.95,
    w: 10.2,
    h: 0.62,
    title: "",
    body: "Quando os dois apps trabalham juntos, o profissional prescreve, o paciente executa, devolve sinais de adesao e a clinica ganha capacidade real de agir antes da perda de resultado.",
    fill: COLORS.softBlue,
    line: "BFDBFE",
  });
  addFooter(slide, "Leitura executiva: a estrutura principal ja existe; falta transformar uso em modelo claro de continuidade e monetizacao.");

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "Como engajamento vira retorno financeiro", "Tese economica");
  const flow = [
    ["1. Engajamento", "Paciente usa o app, recebe lembretes e executa o plano."],
    ["2. Mais adesao", "Melhor consistencia e mais resultado percebido."],
    ["3. Mais retencao", "Menos abandono silencioso e mais confianca."],
    ["4. Reativacao", "Clinica identifica risco e chama o paciente mais cedo."],
    ["5. Novas vendas", "Pilates, reavaliacao, programas preventivos e pos-alta."],
    ["6. Receita", "Mais LTV, mais recorrencia e maior valor por paciente."],
  ];
  flow.forEach(([title, body], index) => {
    const x = 0.7 + (index % 3) * 4.15;
    const y = index < 3 ? 1.9 : 4.25;
    addCard(slide, {
      x,
      y,
      w: 3.6,
      h: 1.72,
      title,
      body,
      fill: index === 5 ? COLORS.softGreen : COLORS.white,
      line: index === 5 ? "86EFAC" : COLORS.border,
    });
  });
  slide.addText("Formula simples para apresentar: Engajamento digital -> mais adesao -> melhor resultado percebido -> mais retencao -> mais reativacao -> mais receita por paciente", {
    x: 0.8,
    y: 6.55,
    w: 11.8,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 11,
    bold: true,
    color: COLORS.blue,
    margin: 0,
    fit: "shrink",
  });
  addFooter(slide, "O app nao deve ser medido apenas por uso. Deve ser medido pelo impacto em adesao, retencao e conversao.");

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "O que vender depois da alta", "Modelos de monetizacao");
  addCard(slide, {
    x: 0.65,
    y: 1.8,
    w: 3.85,
    h: 4.55,
    title: "Pos-Alta Essencial",
    body: bullets([
      "R$ 29 a R$ 39 por mes",
      "Rotina de manutencao",
      "Lembretes e progresso",
      "Check-in automatizado",
      "Kit de orientacao para recaida",
    ]),
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 4.75,
    y: 1.8,
    w: 3.85,
    h: 4.55,
    title: "Pos-Alta Plus",
    body: bullets([
      "R$ 59 a R$ 89 por mes",
      "Progressao por condicao",
      "Alertas de risco de recaida",
      "Check-in assicrono",
      "Recomendacao de retorno ou migracao",
    ]),
    fill: COLORS.softBlue,
    line: "BFDBFE",
  });
  addCard(slide, {
    x: 8.85,
    y: 1.8,
    w: 3.85,
    h: 4.55,
    title: "Pos-Alta Premium",
    body: bullets([
      "R$ 119 a R$ 199 por mes",
      "Revisao mensal humana",
      "Ajuste de plano",
      "Teleorientacao curta",
      "Suporte prioritario",
    ]),
    fill: COLORS.softCyan,
    line: "A5F3FC",
  });
  slide.addText("Complementos de receita: pilates clinico, reavaliacao trimestral, programas preventivos de coluna/joelho/ombro, grupos de educacao em dor e servicos corporativos.", {
    x: 0.75,
    y: 6.52,
    w: 12.0,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 10.5,
    color: COLORS.slate,
    margin: 0,
    fit: "shrink",
  });
  addFooter(slide, "O principal erro seria oferecer apenas o app. O correto e oferecer programas pos-alta com nome, preco e entrega.");

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "Como validar rapido com um piloto de 90 dias", "Execucao");
  addCard(slide, {
    x: 0.65,
    y: 1.82,
    w: 5.85,
    h: 4.65,
    title: "KPIs que importam",
    body: bullets([
      "Pacientes ativos no app",
      "Adesao aos exercicios",
      "Conversao para programa pos-alta",
      "Receita recorrente mensal",
      "Percentual que compra outro servico",
      "Reativacao apos alerta de recaida",
    ]),
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 6.78,
    y: 1.82,
    w: 5.88,
    h: 4.65,
    title: "Plano simples",
    body: bullets([
      "Escolher uma linha de cuidado com boa recorrencia.",
      "Definir a oferta pos-alta e o discurso comercial.",
      "Ativar jornada de alta com convite para continuidade.",
      "Monitorar uso, conversao, reativacao e receita por 90 dias.",
      "Ajustar preco, mensagem e gatilhos de retorno.",
    ]),
    fill: COLORS.softGreen,
    line: "86EFAC",
  });
  addFooter(slide, "A recomendacao e testar pequeno, provar retorno e so depois escalar para toda a clinica.");

  slide = pptx.addSlide();
  addVideoSlide(slide, {
    kicker: "Video de apoio 1",
    ...VIDEO_RESOURCES.personCentered,
  });

  slide = pptx.addSlide();
  addVideoSlide(slide, {
    kicker: "Video de apoio 2",
    ...VIDEO_RESOURCES.patientEngagement,
  });

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "Visualizando a categoria na pratica", "Video de apoio 3");
  slide.addMedia({
    type: "online",
    link: VIDEO_RESOURCES.kemtai.embed,
    x: 0.65,
    y: 1.8,
    w: 5.75,
    h: 3.2,
  });
  slide.addMedia({
    type: "online",
    link: VIDEO_RESOURCES.medbridge.embed,
    x: 6.85,
    y: 1.8,
    w: 5.75,
    h: 3.2,
  });
  addCard(slide, {
    x: 0.65,
    y: 5.25,
    w: 5.75,
    h: 1.1,
    title: "Kemtai Care tutorial",
    body: "Mostra de forma visual como uma plataforma pode conectar acompanhamento clinico e rotina de exercicios remotos.",
    fill: COLORS.white,
  });
  addCard(slide, {
    x: 6.85,
    y: 5.25,
    w: 5.75,
    h: 1.1,
    title: "MedBridge HEP overview",
    body: "Ajuda a diretoria a enxergar o mercado de programas domiciliares com monitoramento e engajamento estruturado.",
    fill: COLORS.white,
  });
  addButton(slide, {
    x: 0.65,
    y: 6.48,
    w: 1.7,
    h: 0.4,
    text: "Abrir Kemtai",
    url: VIDEO_RESOURCES.kemtai.url,
  });
  addButton(slide, {
    x: 6.85,
    y: 6.48,
    w: 1.95,
    h: 0.4,
    text: "Abrir MedBridge",
    url: VIDEO_RESOURCES.medbridge.url,
  });
  addFooter(slide, "Estes videos nao sao do FisioFlow. Eles servem como referencia visual de categoria para a diretoria.");

  slide = pptx.addSlide();
  addBg(slide);
  addHeader(slide, "Webinars extras para usar na conversa com a diretoria", "Materiais de apoio");
  addCard(slide, {
    x: 0.85,
    y: 1.9,
    w: 5.75,
    h: 3.55,
    title: WEBINAR_LINKS[0].title,
    body: bullets([
      `Fonte: ${WEBINAR_LINKS[0].source}`,
      `Data: ${WEBINAR_LINKS[0].date}`,
      WEBINAR_LINKS[0].note,
      "Clique no botao abaixo para abrir o webinar.",
    ]),
    fill: COLORS.white,
    hyperlink: { url: WEBINAR_LINKS[0].url, tooltip: WEBINAR_LINKS[0].title },
  });
  addCard(slide, {
    x: 6.75,
    y: 1.9,
    w: 5.75,
    h: 3.55,
    title: WEBINAR_LINKS[1].title,
    body: bullets([
      `Fonte: ${WEBINAR_LINKS[1].source}`,
      `Data: ${WEBINAR_LINKS[1].date}`,
      WEBINAR_LINKS[1].note,
      "Clique no botao abaixo para abrir o webinar.",
    ]),
    fill: COLORS.white,
    hyperlink: { url: WEBINAR_LINKS[1].url, tooltip: WEBINAR_LINKS[1].title },
  });
  addButton(slide, {
    x: 0.85,
    y: 5.68,
    w: 2.1,
    h: 0.42,
    text: "Abrir Limber",
    url: WEBINAR_LINKS[0].url,
  });
  addButton(slide, {
    x: 6.75,
    y: 5.68,
    w: 2.25,
    h: 0.42,
    text: "Abrir ATA",
    url: WEBINAR_LINKS[1].url,
  });
  slide.addText("Mensagem final: o valor economico do FisioFlow cresce quando o app se torna ponte entre adesao, continuidade de cuidado, reativacao e venda de outros servicos da clinica.", {
    x: 0.92,
    y: 6.35,
    w: 11.45,
    h: 0.38,
    fontFace: "Aptos",
    fontSize: 11.5,
    bold: true,
    color: COLORS.blue,
    margin: 0,
    fit: "shrink",
  });
  addFooter(slide, "Deck gerado automaticamente a partir da analise do app profissional, app do paciente e referencias pesquisadas com Exa.");
}

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const pptx = newDeck();
  buildSlides(pptx);
  await pptx.writeFile({ fileName: outputPath, compression: true });
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
