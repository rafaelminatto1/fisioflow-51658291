import { Client } from 'pg';
import crypto from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_ID = process.env.SESSION_ID;
const APPLY = process.env.APPLY_RESTORE === '1' || process.argv.includes('--apply');
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!SESSION_ID) throw new Error('SESSION_ID não informado');

function cleanText(text) {
  return String(text ?? '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&times;/gi, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function stableId(prefix, sessionId, name) {
  return `${prefix}-${crypto.createHash('sha1').update(`${sessionId}:${name}`).digest('hex').slice(0, 12)}`;
}
function splitClinicalText(text) {
  return cleanText(text)
    .replace(/\s*&times;\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const PROCEDURE_RULES = [
  { name: 'Liberação miofascial manual', category: 'terapia_manual', anchor: /\b(?:lib\.?\s*mio|libera[cç][aã]o\s+miofascial)\b/giu },
  { name: 'Terapia combinada', category: 'eletrotermofototerapia', anchor: /\bcombinada\b/giu },
  { name: 'TENS', category: 'eletroterapia', anchor: /\btens\b/giu },
  { name: 'EENM / NMES', category: 'eletroterapia', anchor: /\b(?:eenm|eenn|nmes|estimula[cç][aã]o\s+el[eé]trica\s+neuromuscular)\b/giu },
  { name: 'Laserterapia', category: 'eletrotermofototerapia', anchor: /\b(?:laser|laserterapia)\b/giu },
  { name: 'Ultrassom terapêutico', category: 'eletrotermofototerapia', anchor: /\b(?:ultrassom|ultra\s*som|us\s+terap[eê]utico)\b/giu },
  { name: 'Crioterapia / gelo', category: 'termoterapia', anchor: /\b(?:gelo|crioterapia|crio)\b/giu },
  { name: 'Bota pneumática', category: 'recurso_fisico', anchor: /\b(?:bota|bota\s+pneum[aá]tica)\b/giu },
  { name: 'Termoterapia / calor', category: 'termoterapia', anchor: /\b(?:calor|termoterapia|compressa\s+quente)\b/giu },
  { name: 'Mobilização articular', category: 'terapia_manual', anchor: /\b(?:mob\.?\s+(?:longitudinal|passiva|ativa|pa|ap|de|do|da|articular|tor[aá]cica|patela|t[aá]lus|subtalar|prono|supino)|mobiliza[cç][aã]o\s+articular)\b/giu },
  { name: 'Mobilização neural', category: 'terapia_manual', anchor: /\b(?:mob\.?\s+neural|mobiliza[cç][aã]o\s+neural|neurodin[aâ]mica)\b/giu },
  { name: 'Tração', category: 'terapia_manual', anchor: /\btra[cç][aã]o\b/giu },
  { name: 'Bandagem funcional', category: 'recurso_fisico', anchor: /\b(?:bandagem|kinesio\s*tape|taping)\b/giu },
  { name: 'Ventosaterapia', category: 'terapia_manual', anchor: /\b(?:ventosa|ventosaterapia)\b/giu },
  { name: 'Acupuntura', category: 'agulhamento', anchor: /\b(?:acupuntura|acup\.?)(?:\s|$)/giu },
  { name: 'Agulhamento seco', category: 'agulhamento', anchor: /\b(?:agulhamento\s+seco|dry\s+needling)\b/giu },
  { name: 'Drenagem linfática', category: 'terapia_manual', anchor: /\bdrenagem\b/giu },
];
const EXERCISE_RULES = [
  { name: 'Alongamento', anchor: /\b(?:alongamento|along\.?|alongar)\b/giu },
  { name: 'Ganho de ADM / mobilidade ativa', anchor: /\b(?:ganho\s+de\s+adm|ganho\s+de\s+(?:flex[aã]o|extens[aã]o)|mobilidade|movimento\s+ativo)\b/giu },
  { name: 'Fortalecimento', anchor: /\b(?:fortalecimento|fortalecer|resistido)\b/giu },
  { name: 'Exercício isométrico', anchor: /\b(?:isometria|isom[eé]trico|isom[eé]trica)\b/giu },
  { name: 'Treino excêntrico', anchor: /\b(?:exc[eê]ntrico|exc[eê]ntrica)\b/giu },
  { name: 'Propriocepção', anchor: /\b(?:propriocep[cç][aã]o|equil[ií]brio|bosu|disco\s+proprioceptivo)\b/giu },
  { name: 'Treino de marcha', anchor: /\b(?:treino\s+de\s+marcha|marcha)\b/giu },
  { name: 'Agachamento', anchor: /\b(?:agachamento|squat)\b/giu },
  { name: 'Avanço / passada', anchor: /\b(?:avan[cç]o|passada|lunge|afundo)\b/giu },
  { name: 'Step up / step down', anchor: /\b(?:step\s*up|step\s*down|degrau)\b/giu },
  { name: 'Ponte / elevação pélvica', anchor: /\b(?:ponte|eleva[cç][aã]o\s+p[eé]lvica)\b/giu },
  { name: 'Prancha', anchor: /\b(?:prancha|plank)\b/giu },
  { name: 'Elevação de panturrilha', anchor: /\b(?:eleva[cç][aã]o\s+panturrilha|panturrilha|g[eê]meos|tr[ií]ceps\s+sural)\b/giu },
  { name: 'Bicicleta ergométrica', anchor: /\b(?:bicicleta|bike)\b/giu },
  { name: 'Esteira', anchor: /\besteira\b/giu },
  { name: 'Leg press', anchor: /\bleg\s*press\b/giu },
  { name: 'Cadeira extensora', anchor: /\b(?:cad\.?\s*ext|cadeira\s+extensora)\b/giu },
  { name: 'Cadeira flexora', anchor: /\b(?:cad\.?\s*flex|cadeira\s+flexora|mesa\s+flexora)\b/giu },
  { name: 'Exercícios de core', anchor: /\b(?:core|abd[oô]men|abdominal|perdigueiro)\b/giu },
  { name: 'Exercícios de quadril/MMII', anchor: /\b(?:abd\/ext\s+de\s+quadril|quadril|iqt|qdp)\b/giu },
];
const ALL_RULES = [
  ...PROCEDURE_RULES.map((rule) => ({ ...rule, kind: 'procedure' })),
  ...EXERCISE_RULES.map((rule) => ({ ...rule, kind: 'exercise' })),
];
function findAnchors(text) {
  const matches = [];
  for (const rule of ALL_RULES) {
    rule.anchor.lastIndex = 0;
    let match;
    while ((match = rule.anchor.exec(text)) !== null) {
      matches.push({ rule, index: match.index, end: match.index + match[0].length, label: match[0] });
      if (match.index === rule.anchor.lastIndex) rule.anchor.lastIndex += 1;
    }
  }
  return matches
    .sort((a, b) => a.index - b.index || b.end - a.end)
    .filter((item, index, arr) => index === 0 || item.index >= arr[index - 1].end || item.rule.name !== arr[index - 1].rule.name);
}
function compactNote(value, kind) {
  let note = cleanText(value)
    .replace(/^[:–—/\s-]+/, '')
    .replace(/\s*&times;\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!note) return undefined;
  if (/^(conduta|pr[oó]xima sess[aã]o|realizou a sess[aã]o|paciente|relatou)\b/i.test(note)) return undefined;
  if (kind === 'procedure') {
    const exerciseStart = note.search(/\b(?:ganho\s+de|rota[cç][aã]o\s+(?:externa|interna)|remada|b[ií]ceps|tr[ií]ceps|eleva[cç][aã]o\s+(?:frontal|lateral|p[eé]lvica)|agachamento|step\s*(?:up|down)|avan[cç]o|ponte|prancha|mesa\s+flexora|exc[eê]ntrico|tr[ií]plice|abd\/ext)\b/i);
    if (exerciseStart > 0) note = note.slice(0, exerciseStart).trim();
  }
  const max = kind === 'procedure' ? 95 : 140;
  if (note.length > max) note = note.slice(0, max).replace(/\s+\S*$/, '').trim();
  return note.length >= 3 ? note : undefined;
}
function parseSetsReps(segment) {
  const text = segment.replace(/×/g, 'x');
  const m = text.match(/\b(\d+)\s*x\s*(\d+)\s*(?:rep|reps|repeti[cç][oõ]es)?\b/i);
  if (!m) return {};
  return { sets: Number(m[1]), reps: Number(m[2]) };
}
function mergeItem(map, key, item, extraNote) {
  const current = map.get(key);
  if (!current) { map.set(key, item); return; }
  if (extraNote && !String(current.notes ?? '').includes(extraNote)) {
    current.notes = [current.notes, extraNote].filter(Boolean).join('; ');
  }
}
function classify(text, sessionId) {
  const raw = splitClinicalText(text);
  const anchors = findAnchors(raw);
  const procedureMap = new Map();
  const exerciseMap = new Map();
  const homeMap = new Map();
  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const next = anchors[index + 1];
    const segment = raw.slice(anchor.index, next ? next.index : Math.min(raw.length, anchor.index + 180)).trim();
    const afterAnchor = segment.slice(anchor.label.length);
    const note = compactNote(afterAnchor, anchor.rule.kind);
    if (anchor.rule.kind === 'procedure') {
      const item = {
        id: stableId('proc', sessionId, anchor.rule.name),
        name: anchor.rule.name,
        completed: true,
        sequenceOrder: procedureMap.size + 1,
        category: anchor.rule.category,
        ...(note ? { notes: note } : {}),
      };
      mergeItem(procedureMap, anchor.rule.name, item, note);
      continue;
    }
    const dose = parseSetsReps(segment);
    const item = {
      id: stableId('ex', sessionId, anchor.rule.name),
      name: anchor.rule.name,
      completed: true,
      sequenceOrder: exerciseMap.size + 1,
      ...(note ? { notes: note, prescription: note } : {}),
      ...dose,
    };
    mergeItem(exerciseMap, anchor.rule.name, item, note);
  }
  return {
    procedures: Array.from(procedureMap.values()).map((item, index) => ({ ...item, sequenceOrder: index + 1 })),
    exercises: Array.from(exerciseMap.values()).map((item, index) => ({ ...item, sequenceOrder: index + 1 })),
    homeExercises: Array.from(homeMap.values()),
  };
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const res = await client.query(`
    SELECT s.id, p.full_name, s.date::text AS date, s.observacao, s.procedures, s.exercises, s.home_exercises
    FROM sessions s
    JOIN patients p ON p.id = s.patient_id
    WHERE s.id = $1
    LIMIT 1
  `, [SESSION_ID]);
  if (!res.rows.length) throw new Error(`Sessão não encontrada: ${SESSION_ID}`);
  const session = res.rows[0];
  const classified = classify(session.observacao, session.id);
  const before = {
    procedures: (session.procedures ?? []).map((item) => item.name),
    exercises: (session.exercises ?? []).map((item) => item.name),
    homeExercises: (session.home_exercises ?? []).map((item) => item.name),
  };
  const after = {
    procedures: classified.procedures.map((item) => ({ name: item.name, notes: item.notes })),
    exercises: classified.exercises.map((item) => ({ name: item.name, notes: item.notes, sets: item.sets, reps: item.reps })),
    homeExercises: classified.homeExercises.map((item) => item.name),
  };
  if (APPLY) {
    await client.query(`
      UPDATE sessions
      SET procedures = $1::jsonb,
          exercises = $2::jsonb,
          home_exercises = $3::jsonb,
          updated_at = NOW()
      WHERE id = $4
    `, [JSON.stringify(classified.procedures), JSON.stringify(classified.exercises), JSON.stringify(classified.homeExercises), session.id]);
  }
  console.log(JSON.stringify({ apply: APPLY, patient: session.full_name, date: session.date, before, after }, null, 2));
} finally {
  await client.end();
}
