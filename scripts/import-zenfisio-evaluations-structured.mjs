import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const SOURCE_FILE = path.resolve(process.env.SOURCE_FILE ?? 'scripts/zenfisio-scraper/data/zenfisio-evaluations-full/evaluations_full.json');
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

const SPORT_ALIASES = [
  ['corrida', /\b(corrida|corre|running|runner|10\s*km|21\s*km|maratona)\b/i],
  ['musculação', /\b(muscula[cç][aã]o|academia|treino\s+de\s+for[cç]a|bodybuilding)\b/i],
  ['pilates', /\bpilates\b/i],
  ['caminhada', /\bcaminhad[ao]s?\b/i],
  ['dança', /\bdan[cç]a\b/i],
  ['futebol', /\bfutebol\b/i],
  ['tênis', /\bt[eê]nis\b/i],
  ['ciclismo', /\b(ciclismo|bike|bicicleta)\b/i],
  ['natação', /\bnata[cç][aã]o\b/i],
  ['crossfit', /\bcross\s*fit|crossfit\b/i],
  ['vôlei', /\bv[oô]lei|voleibol\b/i],
  ['basquete', /\bbasquete\b/i],
  ['luta', /\b(jud[oô]|jiu\s*jitsu|boxe|muay\s*thai|luta)\b/i],
  ['yoga', /\byoga\b/i],
];
const PATHOLOGY_ALIASES = [
  ['Diabetes', /\bdiabetes\b/i],
  ['Hipertensão', /\bhipertens[aã]o|(?<![\p{L}\p{N}_])HAS(?![\p{L}\p{N}_])/iu],
  ['Gastrite', /\bgastrite\b/i],
  ['Doença respiratória', /\b(asma|bronquite|doen[cç]a respirat[oó]ria|dpoc)\b/i],
  ['Doença vascular', /\b(doen[cç]a vascular|varizes|trombose|vascular)\b/i],
  ['Depressão', /\bdepress[aã]o\b/i],
  ['Ansiedade', /\bansiedade\b/i],
  ['Hipotireoidismo', /\bhipotire(?:o|oi)dismo\b/i],
  ['Hipertireoidismo', /\bhipertire(?:o|oi)dismo\b/i],
  ['Hérnia de disco', /\bh[eé]rnia\s+de\s+disco\b/i],
  ['Tendinopatia', /\btendin(?:ite|opatia)\b/i],
  ['Bursite', /\bbursite\b/i],
  ['Condromalácia', /\bcondromal[aá]cia\b/i],
  ['Fratura', /\bfratura\b/i],
  ['Lesão de LCA', /\b(?:LCA|ligamento cruzado anterior)\b/i],
  ['Lesão meniscal', /\bmenisc(?:o|al)\b/i],
  ['Lesão do manguito rotador', /\bmanguito\b/i],
  ['Escoliose', /\bescoliose\b/i],
  ['Artrose', /\bartrose|osteoartrose\b/i],
  ['Endometriose', /\bendometriose\b/i],
  ['Labirintite', /\blabirintite\b/i],
  ['Febre reumática', /\bfebre reum[aá]tica\b/i],
  ['Fascite plantar', /\bfascite plantar\b/i],
];
const SURGERY_WORDS = /\b(cirurgia|cirurgias|cir[uú]rgic|artroscopia|reconstru[cç][aã]o|pr[oó]tese|sutura|meniscectomia|herniorrafia|ces[aá]rea|apendicectomia)\b/i;
const SURGERY_LINE_WORDS = /\b(cirurgia|cirurgias|cir[uú]rgic|artroscopia|pr[oó]tese|meniscectomia|herniorrafia|ces[aá]rea|apendicectomia)\b/i;
const NEGATIVE_ANSWER = /^(?:n[aã]o|nao|nega|sem(?:\s+(?:hist[oó]rico\s+de\s+)?)?|nenhum|nenhuma|0|não se aplica|na)$/i;
const GARBAGE_FIELD = /^(?:appointment_id|date|start|end|btn_submit_appointment|agreement|doctor|procedure)$/i;

function clean(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function normalizeName(value) {
  return clean(value).normalize('NFKC').replace(/\s+/g, ' ');
}
function hasContent(value) {
  const text = clean(value);
  if (!text) return false;
  if (NEGATIVE_ANSWER.test(text)) return false;
  if (/^(sim|ok|x)$/i.test(text)) return false;
  return text.length >= 2;
}
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function fieldText(ev, matcher) {
  return ev.fields
    .filter(f => !GARBAGE_FIELD.test(`${f.name}`) && !GARBAGE_FIELD.test(`${f.label}`) && matcher(`${f.name} ${f.label}`))
    .map(f => clean(f.value))
    .filter(hasContent)
    .join('\n');
}
function sectionText(text, labels) {
  const source = clean(text);
  const out = [];
  for (const label of labels) {
    const re = new RegExp(`${escapeRegExp(label)}\\s*:?\\s*([\\s\\S]{0,700}?)(?=\\n\\s*(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÿ /()]{2,55}:|AVALIAÇÃO FÍSICA|PLANO TERAPÊUTICO|CONDUTA)|$)`, 'gi');
    for (const m of source.matchAll(re)) out.push(clean(m[1]));
  }
  return out.filter(hasContent).join('\n');
}
function fieldAndSectionText(ev, matcher, labels) {
  const fromFields = fieldText(ev, matcher);
  const fromSections = ev.fields
    .filter(f => !GARBAGE_FIELD.test(`${f.name}`) && !GARBAGE_FIELD.test(`${f.label}`))
    .map(f => sectionText(f.value, labels))
    .filter(hasContent)
    .join('\n');
  return [fromFields, fromSections].filter(hasContent).join('\n');
}
function unique(values) {
  return [...new Set(values.map(v => clean(v)).filter(Boolean))];
}
function splitSports(text) {
  const out = [];
  for (const [name, re] of SPORT_ALIASES) if (re.test(text)) out.push(name);
  return unique(out);
}
function looksClinicalDiagnosis(line) {
  return /\b(h[eé]rnia\s+de\s+disco|endometriose|labirintite|fascite\s+plantar|febre\s+reum[aá]tica|fratura|LCA|ligamento\s+cruzado|menisc|bursite|tendin(?:ite|opatia)|condromal[aá]cia|artrose|escoliose|diabetes|hipertens[aã]o|asma|bronquite|dpoc|les[aã]o\s+(?:muscular|condral|menisc|de)|p[oó]s?\s*[- ]?operat[oó]rio)\b/i.test(line);
}
function splitPathologies(...texts) {
  const text = texts.filter(Boolean).join('\n');
  const out = [];
  for (const [name, re] of PATHOLOGY_ALIASES) if (re.test(text)) out.push(name);
  const explicit = sectionText(text, ['Diagnóstico médico', 'Diagnostico medico', 'Patologias associadas']);
  for (const line of explicit.split(/\n|;|,/).map(clean)) {
    if (!hasContent(line)) continue;
    if (/^(diagn[oó]stico\s*(m[eé]dico)?\s*:?)?\s*$/i.test(line)) continue;
    const value = line.replace(/^(diagn[oó]stico\s*(m[eé]dico)?\s*:?)\s*/i, '').slice(0, 120);
    if (looksClinicalDiagnosis(value)) out.push(value);
  }
  return unique(out).filter(x => !/^(n[aã]o|sem|nega)$/i.test(x));
}
function extractSurgery(text) {
  const t = clean(text);
  if (!hasContent(t)) return [];
  if (/^(n[aã]o|nao|nega|sem\s+cirurgias?|nenhuma?)\b/i.test(t)) return [];
  if (/\b(?:cirurgias?\s+pr[eé]vias?|hist[oó]rico\s+de\s+cirurgias?)\s*:\s*(?:n[aã]o|nao|nega|nenhuma?|sem)\b/i.test(t)) return [];
  if (/\b(?:nunca|n[aã]o|nao)\s+(?:realizou|fez|teve)\s+cirurgia\b/i.test(t)) return [];
  if (!SURGERY_WORDS.test(t)) return [];
  return unique(t
    .split(/\n|;|,/)
    .map(x => x.trim().replace(/^[-•]\s*/, ''))
    .filter(x => x.length >= 3 && x.length <= 140)
    .filter(x => SURGERY_LINE_WORDS.test(x))
    .filter(x => !/^(n[aã]o|nao|nega|sem|nunca|e\b|mas\b|assim\b|como\b|atualmente\b|tamb[eé]m\b|paciente\b|exames?\b|em\s+\w+\/\d+|sequela\b|antes\s+da\s+cirurgia\b|cirurgias?\s*:?$|sendo\s+ent[aã]o\s+indicada\s+cirurgia\b)/i.test(x))
    .filter(x => !/\b(?:n[aã]o|nao|nega|sem|nenhuma?|nunca)\s+(?:realizou|fez|teve|cirurgia|cirurgias?)\b/i.test(x))
    .filter(x => !/\bn[aã]o\s+pode\s+realizar\s+cirurgia\b/i.test(x))
    .filter(x => !/\bj[aá]\s+realizou\s+cirurgias?\s+previamente\b/i.test(x))
    .filter(x => !/\b(?:primeira|1[ªa])\s+cirurgia\b/i.test(x)))
    .map(x => x.slice(0, 140));
}
function looksLikeMedication(item) {
  if (!hasContent(item)) return false;
  const text = clean(item);
  if (/[?？]/.test(text)) return false;
  if (/^(?:esta|est[aá]|estava|ficou|segue|continua)?\s*(?:tomando|fazendo\s+uso\s+de)?\s*(?:medicamento|rem[eé]dio)\s*$/i.test(text)) return false;
  if (/\b(?:mas\s+)?(?:n[aã]o\s+)?lembra\s+o\s+nome\s+do\s+rem[eé]dio\b/i.test(text)) return false;
  if (/^parou\s+de\s+tomar\b/i.test(text)) return false;
  if (/^(?:diabetes\/?hipertens[aã]o(?:\/colesterol alto)?|hipertens[oa]|colesterol alto|dor|dores?|n[aã]o sente dores?|repouso\s+ou\s+medica[cç][aã]o)\s*:?.*$/i.test(text)) return false;
  if (/\b(?:onde vc sente|piora com|o\s*que ajuda|oque ajuda|ja teve|já teve|sentia ou ainda sente|realizou alguma cirurgia)\b/i.test(text)) return false;
  return /\b(?:mg|mcg|ml|rem[eé]dio|medica[cç][aã]o|medicamento|puran|eutirox|gabapentina|pregabalina|losartana|lozartana|diur[eé]tico|doxazosina|novalgina|tadalafila|rosuvastatina|rusovastatina|sertralina|cetralina|sibutramina|simbotramina|r[yi]belsus|reposi[cç][aã]o hormonal|asma di[aá]ria)\b/i.test(text);
}
function splitClinicalList(text, predicate = () => true) {
  const cleaned = clean(text);
  if (!hasContent(cleaned)) return [];
  if (/^(?:n[aã]o|nao|nega|sem|nenhuma?)\b/i.test(cleaned)) return [];
  return unique(cleaned
    .split(/\n|;|,(?=\s*[A-Za-zÀ-ÿ])/) 
    .map(item => item.replace(/^[-•]\s*/, '').trim())
    .filter(item => hasContent(item) && item.length >= 3)
    .filter(predicate))
    .map(item => item.slice(0, 120));
}
function buildRawResponses(ev) {
  const mapped = {};
  for (const f of ev.fields) {
    if (!hasContent(f.value)) continue;
    const key = f.label || f.name;
    mapped[key] = mapped[key] ? `${mapped[key]}\n${f.value}` : f.value;
  }
  return mapped;
}
function parseBrDate(value) {
  const m = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  return iso?.[1] ?? null;
}
async function getForm(client, organizationId, therapistId) {
  const name = 'ZenFisio - Avaliação completa importada';
  const r = await client.query(`select id from evaluation_forms where organization_id=$1 and nome=$2 limit 1`, [organizationId, name]);
  if (r.rows.length) return r.rows[0].id;
  if (!APPLY) return null;
  const ins = await client.query(`insert into evaluation_forms (organization_id, created_by, nome, descricao, referencias, tipo, ativo, is_favorite, usage_count, created_at, updated_at) values ($1,$2,$3,'Formulário completo extraído de /evaluations/edit do ZenFisio','ZenFisio','anamnesis',true,false,0,now(),now()) returning id`, [organizationId, therapistId, name]);
  return ins.rows[0].id;
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
let transactionStarted = false;
try {
  if (APPLY) {
    await client.query('begin');
    transactionStarted = true;
  }
  const data = JSON.parse(await readFile(SOURCE_FILE, 'utf8'));
  const profile = await client.query(`select id, organization_id from profiles where lower(email)=lower($1) order by updated_at desc nulls last, created_at desc nulls last limit 1`, [IMPORT_USER_EMAIL]);
  if (!profile.rows.length) throw new Error('Perfil não encontrado');
  const therapistId = profile.rows[0].id;
  const organizationId = profile.rows[0].organization_id;
  const formId = await getForm(client, organizationId, therapistId);
  const state = { apply: APPLY, evaluations: data.evaluations.length, patientsMatched: 0, patientsMissing: [], responsesWouldUpsert: 0, responsesWouldInsert: 0, responsesWouldUpdate: 0, responsesUpserted: 0, recordsWouldUpsert: 0, recordsWouldInsert: 0, recordsWouldUpdate: 0, recordsUpserted: 0, patientsWouldUpdate: 0, patientsUpdated: 0, surgeriesWouldCreate: 0, surgeriesCreated: 0, pathologiesWouldCreate: 0, pathologiesCreated: 0, medicationsExtracted: 0, allergiesExtracted: 0, extracted: [], failures: [] };
  for (const ev of data.evaluations) {
    try {
      const name = normalizeName(ev.name);
      const patient = await client.query(`select id, sports_practiced, pathologies_active, medications_in_use, allergies_general, notes from patients where organization_id=$1 and deleted_at is null and lower(regexp_replace(full_name,'\\s+',' ','g'))=lower($2) order by updated_at desc nulls last limit 1`, [organizationId, name]);
      if (!patient.rows.length) { state.patientsMissing.push({ name, evaluation_id: ev.evaluation_id }); continue; }
      state.patientsMatched += 1;
      const patientId = patient.rows[0].id;
      const date = parseBrDate(fieldText(ev, s => /\bdate\b/i.test(s))) ?? parseBrDate(ev.finalUrl) ?? null;
      const appointmentIdText = fieldText(ev, s => /appointment_id/i.test(s));
      const appointment = appointmentIdText ? await client.query(`select id from appointments where organization_id=$1 and notes ilike $2 and deleted_at is null limit 1`, [organizationId, `%ZenFisio appointment_id: ${appointmentIdText}%`]) : { rows: [] };
      const appointmentId = appointment.rows[0]?.id ?? null;
      const sportText = fieldAndSectionText(ev, s => /esporte|atividade\s+f[ií]sica|physical_objective|physical_parq/i.test(s), ['Esporte', 'Pratica algum esporte/atividade física', 'Pratica algum esporte/atividade fisica', 'Atividade física', 'Atividade fisica']);
      const surgeryText = fieldAndSectionText(ev, s => /cirurg|data-da-cirurgia|tipo-de-cirurgia|recuperacao-da-cirurgia|hist[oó]rico-de-doencas-cirurgias/i.test(s), ['Cirurgias Prévias', 'Cirurgias prévias', 'Cirurgias Previas', 'Cirurgias previas', 'Procedimento realizado', 'Procedimento cirúrgico']);
      const diagnosisText = fieldAndSectionText(ev, s => /diagn[oó]stico|cid|patolog|hmp|hma|hist[oó]ria|medical_history|previous_medical_history|medical_diagnostic/i.test(s), ['Diagnóstico médico', 'Diagnostico medico', 'História da Doença atual', 'Historia da Doenca atual', 'HMA', 'HMP', 'Patologias associadas']);
      const medsText = fieldAndSectionText(ev, s => /rem[eé]dio|medica[cç][aã]o|medicamento/i.test(s), ['Remédios controlados', 'Remedios controlados', 'Medicamentos de uso continuo', 'Medicamentos de uso contínuo', 'Medicação', 'Medicacao']);
      const allergiesText = fieldAndSectionText(ev, s => /alerg/i.test(s), ['Alergias', 'Alergia']);
      const rawResponses = buildRawResponses(ev);
      const sports = splitSports(sportText);
      const diabetesText = ev.fields
        .filter(f => /diabetes|hipertens/i.test(`${f.name} ${f.label} ${f.id}`) && !/(não|nao|nega|309295)/i.test(`${f.id} ${f.value}`))
        .map(f => `${f.label}: ${f.value}`)
        .join('\n');
      const pathologies = splitPathologies(diagnosisText, diabetesText);
      const surgeries = extractSurgery(surgeryText);
      const medications = splitClinicalList(medsText, looksLikeMedication);
      const medicationsText = medications.length ? medications.join('\n') : null;
      const allergies = splitClinicalList(allergiesText);
      state.medicationsExtracted += medications.length;
      state.allergiesExtracted += allergies.length;
      const existingRecord = await client.query(`select id from medical_records where organization_id=$1 and patient_id=$2 and physical_exam->>'zenfisio_evaluation_id'=$3 and deleted_at is null limit 1`, [organizationId, patientId, String(ev.evaluation_id)]);
      const existingResponse = await client.query(`select id from patient_evaluation_responses where organization_id=$1 and patient_id=$2 and responses->>'zenfisio_evaluation_id'=$3 limit 1`, [organizationId, patientId, String(ev.evaluation_id)]);
      const currentSports = patient.rows[0].sports_practiced ?? [];
      const currentPaths = patient.rows[0].pathologies_active ?? [];
      const currentMeds = patient.rows[0].medications_in_use ?? [];
      const currentAllergies = patient.rows[0].allergies_general ?? [];
      const nextSports = unique([...currentSports, ...sports]);
      const nextPaths = unique([...currentPaths, ...pathologies]);
      const nextMeds = unique([...currentMeds, ...medications]);
      const nextAllergies = unique([...currentAllergies, ...allergies]);
      const shouldPatientUpdate = JSON.stringify([...nextSports].sort()) !== JSON.stringify([...currentSports].sort()) || JSON.stringify([...nextPaths].sort()) !== JSON.stringify([...currentPaths].sort()) || JSON.stringify([...nextMeds].sort()) !== JSON.stringify([...currentMeds].sort()) || JSON.stringify([...nextAllergies].sort()) !== JSON.stringify([...currentAllergies].sort());
      if (shouldPatientUpdate) {
        state.patientsWouldUpdate += 1;
        if (APPLY) {
          await client.query(`update patients set sports_practiced=$1::text[], pathologies_active=$2::text[], medications_in_use=$3::text[], allergies_general=$4::text[], updated_at=now() where id=$5`, [nextSports, nextPaths, nextMeds, nextAllergies, patientId]);
          state.patientsUpdated += 1;
        }
      }
      for (const surgery of surgeries) {
        const exists = await client.query(`select id from patient_surgeries where organization_id=$1 and patient_id=$2 and lower(surgery_name)=lower($3) limit 1`, [organizationId, patientId, surgery]);
        if (!exists.rows.length) {
          state.surgeriesWouldCreate += 1;
          if (APPLY) {
            await client.query(`insert into patient_surgeries (organization_id, patient_id, surgery_name, notes, created_by, created_at, updated_at) values ($1,$2,$3,$4,$5,now(),now())`, [organizationId, patientId, surgery, `Extraído da avaliação ZenFisio ${ev.evaluation_id}`, therapistId]);
            state.surgeriesCreated += 1;
          }
        }
      }
      for (const pathology of pathologies) {
        const exists = await client.query(`select id from patient_pathologies where organization_id=$1 and patient_id=$2 and deleted_at is null and lower(name)=lower($3) limit 1`, [organizationId, patientId, pathology]);
        if (!exists.rows.length) {
          state.pathologiesWouldCreate += 1;
          if (APPLY) {
            await client.query(`insert into patient_pathologies (organization_id, patient_id, name, status, is_primary, description, created_by, created_at, updated_at) values ($1,$2,$3,'active',false,$4,$5,now(),now())`, [organizationId, patientId, pathology, `Extraído da avaliação ZenFisio ${ev.evaluation_id}`, therapistId]);
            state.pathologiesCreated += 1;
          }
        }
      }
      state.recordsWouldUpsert += 1;
      if (existingRecord.rows.length) state.recordsWouldUpdate += 1;
      else state.recordsWouldInsert += 1;
      if (APPLY) {
        const physicalExam = { source: 'zenfisio_evaluation_edit', zenfisio_evaluation_id: ev.evaluation_id, fields: rawResponses };
        if (existingRecord.rows.length) {
          await client.query(`update medical_records set chief_complaint=$1, current_history=$2, past_history=$3, previous_surgeries=$4, physical_activity=$5, medical_history=$6, current_medications=$7, allergies=$8::jsonb, medications=$9::jsonb, physical_exam=$10::jsonb, updated_at=now() where id=$11`, [fieldText(ev, s => /queixa|main_complaint/i.test(s)) || null, diagnosisText || null, fieldText(ev, s => /previous_medical_history|hist[oó]ria/i.test(s)) || null, surgeryText || null, sportText || null, diagnosisText || null, medicationsText, JSON.stringify(allergies.map(allergen => ({ allergen }))), JSON.stringify(medications.map(medication => ({ name: medication }))), JSON.stringify(physicalExam), existingRecord.rows[0].id]);
        } else {
          await client.query(`insert into medical_records (patient_id, organization_id, record_date, chief_complaint, current_history, past_history, previous_surgeries, physical_activity, medical_history, current_medications, allergies, medications, physical_exam, created_by, created_at, updated_at) values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14,now(),now())`, [patientId, organizationId, date, fieldText(ev, s => /queixa|main_complaint/i.test(s)) || null, diagnosisText || null, fieldText(ev, s => /previous_medical_history|hist[oó]ria/i.test(s)) || null, surgeryText || null, sportText || null, diagnosisText || null, medicationsText, JSON.stringify(allergies.map(allergen => ({ allergen }))), JSON.stringify(medications.map(medication => ({ name: medication }))), JSON.stringify(physicalExam), therapistId]);
        }
        state.recordsUpserted += 1;
      }
      state.responsesWouldUpsert += 1;
      if (existingResponse.rows.length) state.responsesWouldUpdate += 1;
      else state.responsesWouldInsert += 1;
      if (APPLY && formId) {
        const responses = { zenfisio_evaluation_id: ev.evaluation_id, zenfisio_url: ev.finalUrl, fields: rawResponses, extracted: { sports, surgeries, pathologies, medications, allergies } };
        if (existingResponse.rows.length) await client.query(`update patient_evaluation_responses set responses=$1::jsonb,status='completed',appointment_id=coalesce(appointment_id,$2::uuid),updated_at=now() where id=$3`, [JSON.stringify(responses), appointmentId, existingResponse.rows[0].id]);
        else await client.query(`insert into patient_evaluation_responses (organization_id, patient_id, form_id, appointment_id, responses, status, scheduled_for, started_at, completed_at, created_by, created_at, updated_at) values ($1,$2,$3,$4::uuid,$5::jsonb,'completed',$6::date,$6::date,$6::date,$7,now(),now())`, [organizationId, patientId, formId, appointmentId, JSON.stringify(responses), date, therapistId]);
        state.responsesUpserted += 1;
      }
      state.extracted.push({ patient: name, evaluation_id: ev.evaluation_id, sports, surgeries, pathologies, medications, allergies });
    } catch (error) {
      state.failures.push({ evaluation_id: ev.evaluation_id, name: ev.name, error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (APPLY && state.failures.length) {
    throw new Error(`Importação interrompida: ${state.failures.length} falha(s) durante o apply`);
  }
  if (transactionStarted) {
    await client.query('commit');
    transactionStarted = false;
  }
  const out = path.join(path.dirname(SOURCE_FILE), APPLY ? 'structured_import_apply.json' : 'structured_import_dryrun.json');
  await writeFile(out, JSON.stringify(state, null, 2));
  console.log(JSON.stringify({ ...state, extracted: state.extracted.slice(0, 20) }, null, 2));
} finally {
  if (transactionStarted) await client.query('rollback').catch(() => {});
  await client.end();
}
