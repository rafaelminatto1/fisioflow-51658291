import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TECHNICAL_FIELD = /^(?:appointment_id|contact|date|start|end|btn_submit_appointment|agreement|doctor|procedure)$/i;
const TECHNICAL_LABEL = /conv[eê]nio|encaminhamento profissional|procedimento|appointment_id|btn_submit|^date$|^start$|^end$/i;
const NEGATIVE = /^(?:n[aã]o|nao|nega|negativo|sem|nenhum|nenhuma|não se aplica|na)$/i;

const KEYWORD_GROUPS = [
  ['joelho', /\bjoelh[oa]s?\b|patelar|patela|condromal[aá]cia|menisc|LCA|gonartrose/iu],
  ['lombar/coluna', /\blombar\b|coluna|h[eé]rnia\s+de\s+disco|espondilo|sacroile[ií]te|ci[aá]tic/iu],
  ['ombro', /\bombro\b|manguito|supraespinhal|supra\s*espinhal/iu],
  ['quadril', /\bquadril\b|gl[uú]teo|trocanter/iu],
  ['tornozelo/pé', /tornozelo|\bp[eé]\b|calc[aâ]neo|aquiles|haglund|fascite\s+plantar|entorse/iu],
  ['cervical', /cervical|pesco[cç]o|trap[eé]zio/iu],
  ['dor crônica', /dor\s+cr[oô]nica|cr[oô]nic[ao]|h[aá]\s+\d+\s+(?:anos|meses)/iu],
  ['pós-operatório', /p[oó]s\s*[- ]?operat[oó]rio|cirurgia|cir[uú]rgic|reconstru[cç][aã]o|artroscopia/iu],
  ['idoso/geriatria', /\b(?:8\d|9\d|idos[ao]|queda\s+de\s+fun[cç][aã]o|decl[ií]nio|dificuldade\s+para\s+caminhar)\b/iu],
  ['corrida', /\bcorrid[ao]r?\b|running|maratona|\b\d{1,2}\s*km\b/iu],
  ['musculação', /muscula[cç][aã]o|academia|treino\s+de\s+for[cç]a/iu],
  ['pilates', /\bpilates\b/iu],
  ['diabetes/hipertensão', /diabetes|hipertens[aã]o|\bHAS\b/iu],
];

const OPPORTUNITY_RULES = [
  ['Programa Corrida sem Dor / Joelho do Corredor', /corrid|maratona|\b\d{1,2}\s*km/iu, ['joelho']],
  ['Programa Longevidade e Prevenção de Quedas', /idos[ao]|\b(?:8\d|9\d)\s+anos|queda\s+de\s+fun[cç][aã]o|dificuldade\s+para\s+caminhar|equil[ií]brio|funcional/iu, ['idoso/geriatria']],
  ['Programa Coluna sem Dor', /lombar|coluna|h[eé]rnia\s+de\s+disco|cervical|ci[aá]tic|escoliose|espondilo/iu, ['lombar/coluna', 'cervical']],
  ['Programa Pós-operatório Ortopédico', /p[oó]s\s*[- ]?operat[oó]rio|cirurgia|cir[uú]rgic|reconstru[cç][aã]o|artroscopia|pr[oó]tese/iu, ['pós-operatório']],
  ['Programa Pé/Tornozelo e Retorno ao Impacto', /tornozelo|calc[aâ]neo|aquiles|haglund|fascite\s+plantar|entorse|\bp[eé]\b/iu, ['tornozelo/pé']],
  ['Programa Performance e Força', /muscula[cç][aã]o|academia|cross\s*fit|performance|for[cç]a|hipertrofia/iu, ['musculação']],
  ['Linha Crônicos Metabólicos com Exercício Seguro', /diabetes|hipertens[aã]o|obesidade|colesterol|cardio|risco\s+cardiovascular/iu, ['diabetes/hipertensão']],
];

export function normalizeClinicalText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function hasClinicalContent(value) {
  const text = normalizeClinicalText(value);
  if (!text) return false;
  if (NEGATIVE.test(text)) return false;
  if (/^(?:salvar|selecione\b|particular)$/i.test(text)) return false;
  if (/^\d+$/.test(text) && text.length < 8) return false;
  return text.length >= 2;
}

function isClinicalField(field) {
  const name = String(field?.name ?? '');
  const label = String(field?.label ?? '');
  if (TECHNICAL_FIELD.test(name) || TECHNICAL_FIELD.test(label)) return false;
  if (TECHNICAL_LABEL.test(label)) return false;
  return hasClinicalContent(field?.value);
}

function clinicalFields(ev) {
  return (ev.fields ?? []).filter(isClinicalField);
}

function clinicalText(ev) {
  return clinicalFields(ev).map(f => `${f.label || f.name}: ${normalizeClinicalText(f.value)}`).join('\n');
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function topByMap(map, total, limit = 25, keyName = 'term') {
  return [...map.entries()]
    .map(([term, patients]) => ({ [keyName]: term, patients, share: Number((patients / Math.max(total, 1)).toFixed(4)) }))
    .sort((a, b) => b.patients - a.patients || String(a[keyName]).localeCompare(String(b[keyName])))
    .slice(0, limit);
}

export function classifyBusinessOpportunity(text) {
  const out = [];
  for (const [name, direct, supportingGroups] of OPPORTUNITY_RULES) {
    const directHit = direct.test(text);
    const groupHits = supportingGroups.filter(group => (KEYWORD_GROUPS.find(([g]) => g === group)?.[1] ?? /a^/).test(text)).length;
    if (directHit && groupHits > 0) out.push(name);
  }
  if (/corrid|maratona|\b\d{1,2}\s*km/iu.test(text) && /joelho|patelar|condromal[aá]cia|menisc|LCA/iu.test(text)) out.push('Programa Corrida sem Dor / Joelho do Corredor');
  return [...new Set(out)];
}

function extractFieldLabels(evaluations) {
  return countBy(evaluations.flatMap(ev => clinicalFields(ev).map(f => ({ label: f.label || f.name }))), x => x.label).slice(0, 40);
}

export function buildEvaluationInsights(evaluations) {
  const total = evaluations.length;
  const rows = evaluations.map(ev => {
    const fields = clinicalFields(ev);
    const text = clinicalText(ev);
    const groups = KEYWORD_GROUPS.filter(([, re]) => re.test(text)).map(([name]) => name);
    const opportunities = classifyBusinessOpportunity(text);
    const charCount = text.length;
    return { ev, fields, text, groups, opportunities, charCount };
  });
  const withClinicalFields = rows.filter(r => r.fields.length > 0).length;
  const patientKeys = new Set(evaluations.map(ev => ev.slug || ev.name));
  const patientsByOpportunity = new Map();
  const patientsByKeyword = new Map();
  const patientsByField = new Map();
  for (const row of rows) {
    const patientKey = row.ev.slug || row.ev.name;
    for (const opp of row.opportunities) {
      const set = patientsByOpportunity.get(opp) ?? new Set();
      set.add(patientKey);
      patientsByOpportunity.set(opp, set);
    }
    for (const group of row.groups) {
      const set = patientsByKeyword.get(group) ?? new Set();
      set.add(patientKey);
      patientsByKeyword.set(group, set);
    }
    for (const f of row.fields) {
      const label = f.label || f.name;
      const set = patientsByField.get(label) ?? new Set();
      set.add(patientKey);
      patientsByField.set(label, set);
    }
  }
  const opportunities = [...patientsByOpportunity.entries()]
    .map(([name, set]) => ({ name, patients: set.size, shareOfPatients: Number((set.size / Math.max(patientKeys.size, 1)).toFixed(4)) }))
    .sort((a, b) => b.patients - a.patients || a.name.localeCompare(b.name));
  const topKeywords = topByMap(new Map([...patientsByKeyword.entries()].map(([k, set]) => [k, set.size])), patientKeys.size, 30, 'term');
  const topFields = topByMap(new Map([...patientsByField.entries()].map(([k, set]) => [k, set.size])), patientKeys.size, 40, 'field');
  const highValuePatients = rows
    .filter(r => r.fields.length >= 8 || r.opportunities.length >= 2 || r.charCount >= 2500)
    .map(r => ({
      name: r.ev.name,
      slug: r.ev.slug,
      evaluation_id: String(r.ev.evaluation_id),
      clinicalFields: r.fields.length,
      charCount: r.charCount,
      keywords: r.groups,
      opportunities: r.opportunities,
    }))
    .sort((a, b) => b.opportunities.length - a.opportunities.length || b.clinicalFields - a.clinicalFields || b.charCount - a.charCount)
    .slice(0, 75);
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEvaluations: total,
      uniquePatients: patientKeys.size,
      withClinicalFields,
      withoutClinicalFields: total - withClinicalFields,
      averageClinicalFieldsPerEvaluation: Number((rows.reduce((sum, r) => sum + r.fields.length, 0) / Math.max(total, 1)).toFixed(2)),
      averageClinicalTextChars: Number((rows.reduce((sum, r) => sum + r.charCount, 0) / Math.max(total, 1)).toFixed(0)),
    },
    opportunities,
    topKeywords,
    topFields,
    fieldLabels: extractFieldLabels(evaluations),
    highValuePatients,
    quality: {
      noClinicalContent: rows.filter(r => r.fields.length === 0).map(r => ({ name: r.ev.name, slug: r.ev.slug, evaluation_id: String(r.ev.evaluation_id) })),
      veryShortClinicalContent: rows.filter(r => r.fields.length > 0 && r.charCount < 80).map(r => ({ name: r.ev.name, slug: r.ev.slug, evaluation_id: String(r.ev.evaluation_id), charCount: r.charCount })).slice(0, 100),
      multipleEvaluationsByPatient: countBy(evaluations, ev => ev.slug || ev.name).filter(x => x.count > 1),
    },
  };
}

function mdTable(rows, columns) {
  if (!rows.length) return '_Sem dados._\n';
  const header = `| ${columns.map(c => c.title).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map(row => `| ${columns.map(c => String(c.value(row) ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

export function renderInsightsMarkdown(insights) {
  const s = insights.summary;
  return [
    '# Relatório clínico e de negócio — Avaliações ZenFisio',
    '',
    `Gerado em: ${insights.generatedAt}`,
    '',
    '## Sumário executivo',
    '',
    `- Avaliações processadas: ${s.totalEvaluations}`,
    `- Pacientes únicos: ${s.uniquePatients}`,
    `- Avaliações com conteúdo clínico: ${s.withClinicalFields}`,
    `- Avaliações sem conteúdo clínico: ${s.withoutClinicalFields}`,
    `- Média de campos clínicos por avaliação: ${s.averageClinicalFieldsPerEvaluation}`,
    `- Média de caracteres clínicos por avaliação: ${s.averageClinicalTextChars}`,
    '',
    '## Oportunidades de programas / linhas de cuidado',
    '',
    mdTable(insights.opportunities.slice(0, 20), [
      { title: 'Oportunidade', value: r => r.name },
      { title: 'Pacientes', value: r => r.patients },
      { title: '% pacientes', value: r => `${Math.round(r.shareOfPatients * 1000) / 10}%` },
    ]),
    '',
    '## Principais temas clínicos detectados',
    '',
    mdTable(insights.topKeywords.slice(0, 20), [
      { title: 'Tema', value: r => r.term },
      { title: 'Pacientes', value: r => r.patients },
      { title: '% pacientes', value: r => `${Math.round(r.share * 1000) / 10}%` },
    ]),
    '',
    '## Campos clínicos mais preenchidos',
    '',
    mdTable(insights.topFields.slice(0, 25), [
      { title: 'Campo', value: r => r.field },
      { title: 'Pacientes', value: r => r.patients },
      { title: '% pacientes', value: r => `${Math.round(r.share * 1000) / 10}%` },
    ]),
    '',
    '## Pacientes prioritários para revisão clínica/comercial',
    '',
    'Critério: avaliações longas, muitos campos clínicos ou múltiplas oportunidades de linha de cuidado.',
    '',
    mdTable(insights.highValuePatients.slice(0, 40), [
      { title: 'Paciente', value: r => r.name },
      { title: 'Avaliação', value: r => r.evaluation_id },
      { title: 'Campos', value: r => r.clinicalFields },
      { title: 'Temas', value: r => r.keywords.join(', ') },
      { title: 'Oportunidades', value: r => r.opportunities.join('; ') },
    ]),
    '',
    '## Qualidade e gaps de dados',
    '',
    `- Avaliações sem conteúdo clínico: ${insights.quality.noClinicalContent.length}`,
    `- Avaliações com conteúdo muito curto: ${insights.quality.veryShortClinicalContent.length}`,
    `- Pacientes com múltiplas avaliações: ${insights.quality.multipleEvaluationsByPatient.length}`,
    '',
    '### Avaliações sem conteúdo clínico',
    '',
    mdTable(insights.quality.noClinicalContent.slice(0, 30), [
      { title: 'Paciente', value: r => r.name },
      { title: 'Slug', value: r => r.slug },
      { title: 'Avaliação', value: r => r.evaluation_id },
    ]),
    '',
  ].join('\n');
}

async function main() {
  const input = process.argv[2] ?? 'scripts/zenfisio-scraper/data/zenfisio-evaluations-full/evaluations_full.json';
  const outDir = process.argv[3] ?? 'scripts/zenfisio-scraper/data/zenfisio-evaluations-full/reports';
  const data = JSON.parse(await readFile(input, 'utf8'));
  const insights = buildEvaluationInsights(data.evaluations ?? []);
  await mkdir(outDir, { recursive: true });
  const json = JSON.stringify(insights, null, 2);
  const markdown = renderInsightsMarkdown(insights);
  await writeFile(path.join(outDir, 'clinical-business-insights.json'), json);
  await writeFile(path.join(outDir, 'clinical-business-insights.md'), markdown);
  await writeFile(path.join(outDir, 'evaluation-insights.json'), json);
  await writeFile(path.join(outDir, 'evaluation-insights.md'), markdown);
  console.log(JSON.stringify({ outDir, ...insights.summary, opportunities: insights.opportunities.slice(0, 8), topKeywords: insights.topKeywords.slice(0, 8), noClinicalContent: insights.quality.noClinicalContent.length }, null, 2));
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main().catch(error => { console.error(error instanceof Error ? error.stack || error.message : String(error)); process.exit(1); });
