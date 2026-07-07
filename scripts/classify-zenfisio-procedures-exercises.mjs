import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from 'pg';

const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast');
const DATABASE_URL = process.env.DATABASE_URL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const REPORT_PATH = path.join(SOURCE_DIR, APPLY ? 'classificacao_procedimentos_exercicios_apply.json' : 'classificacao_procedimentos_exercicios_dryrun.json');
const SUMMARY_MD = path.join(SOURCE_DIR, 'procedimentos_exercicios_relatorio.md');

if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');

function normalizeText(text) {
  return String(text ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function cleanText(text) {
  return String(text ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function stableId(prefix, sessionId, name) {
  return `${prefix}-${crypto.createHash('sha1').update(`${sessionId}:${name}`).digest('hex').slice(0, 12)}`;
}
function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: item.id ?? '',
      name: item.name ?? '',
      completed: item.completed ?? undefined,
      sequenceOrder: item.sequenceOrder ?? undefined,
      intensity: item.intensity ?? undefined,
      notes: item.notes ?? undefined,
      category: item.category ?? undefined,
      durationMinutes: item.durationMinutes ?? undefined,
      exerciseId: item.exerciseId ?? undefined,
      prescription: item.prescription ?? undefined,
      sets: item.sets ?? undefined,
      reps: item.reps ?? undefined,
      duration: item.duration ?? undefined,
      patientFeedback: item.patientFeedback ?? undefined,
      frequency: item.frequency ?? undefined,
    }))
    .sort((a, b) => `${a.sequenceOrder ?? 9999}:${a.name}:${a.id}`.localeCompare(`${b.sequenceOrder ?? 9999}:${b.name}:${b.id}`));
}
function sameItems(a, b) {
  return JSON.stringify(normalizeItems(a)) === JSON.stringify(normalizeItems(b));
}
function parseBrDateTime(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = '12', min = '00'] = match;
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
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
  { name: 'Acupuntura', category: 'agulhamento', anchor: /\bacupuntura\b/giu },
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
  { name: 'Ponte', anchor: /\bponte\b/giu },
  { name: 'Prancha', anchor: /\b(?:prancha|plank)\b/giu },
  { name: 'Elevação de panturrilha', anchor: /\b(?:eleva[cç][aã]o\s+panturrilha|panturrilha|g[eê]meos|tr[ií]ceps\s+sural)\b/giu },
  { name: 'Bicicleta ergométrica', anchor: /\b(?:bicicleta|bike)\b/giu },
  { name: 'Esteira', anchor: /\besteira\b/giu },
  { name: 'Leg press', anchor: /\bleg\s*press\b/giu },
  { name: 'Cadeira extensora', anchor: /\b(?:cad\.?\s*ext|cadeira\s+extensora)\b/giu },
  { name: 'Cadeira flexora', anchor: /\b(?:cad\.?\s*flex|cadeira\s+flexora)\b/giu },
  { name: 'Exercícios de core', anchor: /\b(?:core|abd[oô]men|abdominal|perdigueiro)\b/giu },
  { name: 'Exercícios de ombro/MMSS', anchor: /\b(?:manguito|rotadores|eleva[cç][aã]o\s+lateral|eleva[cç][aã]o\s+frontal|b[ií]ceps|tr[ií]ceps|remada|pull\s*over)\b/giu },
];

const ALL_RULES = [
  ...PROCEDURE_RULES.map((rule) => ({ ...rule, kind: 'procedure' })),
  ...EXERCISE_RULES.map((rule) => ({ ...rule, kind: 'exercise' })),
];

function splitClinicalText(text) {
  return cleanText(text)
    .replace(/\s*&times;\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    .replace(/^[:\-–—\/\s]+/, '')
    .replace(/\s*&times;\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!note) return undefined;
  if (/^(conduta|pr[oó]xima sess[aã]o|realizou a sess[aã]o|paciente|relatou)\b/i.test(note)) return undefined;
  if (kind === 'procedure') {
    const exerciseStart = note.search(/\b(?:ganho\s+de|rota[cç][aã]o\s+(?:externa|interna)|remada|b[ií]ceps|tr[ií]ceps|eleva[cç][aã]o\s+(?:frontal|lateral)|agachamento|step\s*(?:up|down)|avan[cç]o|ponte|prancha)\b/i);
    if (exerciseStart > 0) note = note.slice(0, exerciseStart).trim();
  }
  const max = kind === 'procedure' ? 95 : 140;
  if (note.length > max) {
    const cut = note.slice(0, max);
    note = cut.replace(/\s+\S*$/, '').trim();
  }
  return note.length >= 3 ? note : undefined;
}

function parseSetsReps(segment) {
  const text = segment.replace(/×/g, 'x');
  const m = text.match(/\b(\d+)\s*x\s*(\d+)\s*(?:rep|reps|repeti[cç][oõ]es)?\b/i);
  if (!m) return {};
  return { sets: Number(m[1]), reps: Number(m[2]) };
}

function looksLikeExerciseSegment(segment) {
  return /\b\d+\s*x\s*\d+|\brep(?:s)?\b|\bposi[cç][aã]o\b|\bem\s+p[eé]\b|\bbast[aã]o\b|\bthera\s*(?:band|tube)\b|\bhalter\b|\bkg\b/i.test(segment);
}

function mergeItem(map, key, item, extraNote) {
  const current = map.get(key);
  if (!current) {
    map.set(key, item);
    return;
  }
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
      if (anchor.rule.name === 'Mobilização articular' && looksLikeExerciseSegment(segment)) {
        const exerciseName = 'Ganho de ADM / mobilidade ativa';
        const dose = parseSetsReps(segment);
        const item = {
          id: stableId('ex', sessionId, exerciseName),
          name: exerciseName,
          completed: true,
          sequenceOrder: exerciseMap.size + 1,
          ...(note ? { notes: note, prescription: note } : {}),
          ...dose,
        };
        mergeItem(exerciseMap, exerciseName, item, note);
        continue;
      }
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

    const homeContext = /\b(casa|domiciliar|orientad[oa]s?\s+para\s+casa|realizar\s+em\s+casa|exerc[ií]cios?\s+para\s+casa|hep)\b/i.test(raw.slice(Math.max(0, anchor.index - 120), Math.min(raw.length, anchor.index + 160)));
    if (homeContext) {
      homeMap.set(anchor.rule.name, {
        id: stableId('home', sessionId, anchor.rule.name),
        name: anchor.rule.name,
        ...(note ? { prescription: note } : {}),
        notes: 'Detectado em orientação domiciliar no texto importado do ZenFisio.',
        ...dose,
      });
    }
  }

  return {
    procedures: Array.from(procedureMap.values()).map((item, index) => ({ ...item, sequenceOrder: index + 1 })),
    exercises: Array.from(exerciseMap.values()).map((item, index) => ({ ...item, sequenceOrder: index + 1 })),
    homeExercises: Array.from(homeMap.values()),
  };
}

async function loadFiles() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  return entries.filter(e => e.isFile() && /^paciente_.*\.json$/i.test(e.name)).map(e => path.join(SOURCE_DIR, e.name)).sort();
}

const report = {
  apply: APPLY,
  sourceDir: SOURCE_DIR,
  sessionsAnalyzed: 0,
  sessionsMatched: 0,
  sessionsUpdated: 0,
  procedureFrequency: {},
  exerciseFrequency: {},
  homeExerciseFrequency: {},
  sessionItems: [],
  skipped: [],
};

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const files = await loadFiles();
  for (const file of files) {
    const patientJson = JSON.parse(await readFile(file, 'utf8'));
    const patientName = String(patientJson.paciente_nome ?? '').trim();
    for (const event of patientJson.historico ?? []) {
      if (!/^(Evolução|Avaliação)/i.test(String(event.tipo ?? ''))) continue;
      const date = parseBrDateTime(event.data_completa ?? event.data);
      if (!date) continue;
      report.sessionsAnalyzed += 1;
      const sessionRes = await client.query(`
        SELECT s.id, p.full_name, s.date::text AS date_text, s.observacao, s.procedures, s.exercises, s.home_exercises
        FROM sessions s
        JOIN patients p ON p.id = s.patient_id
        WHERE s.organization_id = $1
          AND lower(regexp_replace(p.full_name, '\\s+', ' ', 'g')) = lower($2)
          AND s.date >= ($3::timestamp - interval '2 minutes')
          AND s.date <= ($3::timestamp + interval '2 minutes')
        ORDER BY ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp))) ASC
        LIMIT 1
      `, [ORG_ID, patientName, date]);
      if (!sessionRes.rows.length) {
        report.skipped.push({ patientName, date, reason: 'session_not_found' });
        continue;
      }
      const session = sessionRes.rows[0];
      report.sessionsMatched += 1;
      const sourceText = String(session.observacao ?? event.conteudo_texto ?? '');
      const classified = classify(sourceText, session.id);
      for (const item of classified.procedures) report.procedureFrequency[item.name] = (report.procedureFrequency[item.name] ?? 0) + 1;
      for (const item of classified.exercises) report.exerciseFrequency[item.name] = (report.exerciseFrequency[item.name] ?? 0) + 1;
      for (const item of classified.homeExercises) report.homeExerciseFrequency[item.name] = (report.homeExerciseFrequency[item.name] ?? 0) + 1;
      const alreadySame = sameItems(session.procedures, classified.procedures)
        && sameItems(session.exercises, classified.exercises)
        && sameItems(session.home_exercises, classified.homeExercises);
      if (!alreadySame) {
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
        report.sessionsUpdated += 1;
      }
      report.sessionItems.push({
        sessionId: session.id,
        patientName,
        date: session.date_text,
        procedureNames: classified.procedures.map(p => p.name),
        exerciseNames: classified.exercises.map(e => e.name),
        homeExerciseNames: classified.homeExercises.map(e => e.name),
        procedures: classified.procedures,
        exercises: classified.exercises,
        homeExercises: classified.homeExercises,
      });
    }
  }
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  const procLines = Object.entries(report.procedureFrequency).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `- ${k}: ${v}`).join('\n') || '- Nenhum';
  const exLines = Object.entries(report.exerciseFrequency).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `- ${k}: ${v}`).join('\n') || '- Nenhum';
  const homeLines = Object.entries(report.homeExerciseFrequency).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `- ${k}: ${v}`).join('\n') || '- Nenhum';
  await writeFile(SUMMARY_MD, `# Relatório ZenFisio — procedimentos e exercícios\n\nModo: ${APPLY ? 'APLICADO' : 'DRY-RUN'}\n\n- Sessões clínicas analisadas: ${report.sessionsAnalyzed}\n- Sessões encontradas no FisioFlow: ${report.sessionsMatched}\n- Sessões ${APPLY ? 'atualizadas' : 'que seriam atualizadas'}: ${report.sessionsUpdated}\n- Sessões não encontradas: ${report.skipped.length}\n\n## Procedimentos detectados\n${procLines}\n\n## Exercícios detectados\n${exLines}\n\n## Exercícios domiciliares detectados\n${homeLines}\n`);
  console.log(JSON.stringify({
    apply: report.apply,
    sessionsAnalyzed: report.sessionsAnalyzed,
    sessionsMatched: report.sessionsMatched,
    sessionsUpdated: report.sessionsUpdated,
    skipped: report.skipped.length,
    procedureFrequency: report.procedureFrequency,
    exerciseFrequency: report.exerciseFrequency,
    homeExerciseFrequency: report.homeExerciseFrequency,
    reportPath: REPORT_PATH,
    summaryPath: SUMMARY_MD,
  }, null, 2));
} finally {
  await client.end();
}
