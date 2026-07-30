const fs = require('fs/promises');
const path = require('path');
const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');

const PORT = Number(process.env.CDP_PORT || 9222);
const CALENDAR_FILE = process.env.CALENDAR_FILE || 'scripts/zenfisio-scraper/data/calendar_events_20210701_20260802_raw.json';
const OUT_DIR = process.env.OUT_DIR || 'scripts/zenfisio-scraper/data/zenfisio-evaluations-full';
const LIMIT = Number(process.env.LIMIT || 0);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 6));
const HISTORY_CONCURRENCY = Math.max(1, Number(process.env.HISTORY_CONCURRENCY || CONCURRENCY));
const BASE = 'https://app.zenfisio.com';
const HISTORY_START_DATE = process.env.HISTORY_START_DATE || '2010-01-01';
const HISTORY_END_DATE = process.env.HISTORY_END_DATE || new Date().toISOString().slice(0, 10);

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&atilde;/gi, 'ã')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&otilde;/gi, 'õ')
    .replace(/&eacute;/gi, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&aacute;/gi, 'á')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&agrave;/gi, 'à')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function stripTags(value) {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function attr(tag, name) {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i');
  return decodeHtml(tag.match(re)?.[1] ?? '');
}
function uniqueBy(items, fn) {
  const seen = new Set(); const out = [];
  for (const item of items) { const k = fn(item); if (!k || seen.has(k)) continue; seen.add(k); out.push(item); }
  return out;
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length); let index = 0;
  async function worker() { while (index < items.length) { const i = index++; out[i] = await fn(items[i], i); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
async function getCookieHeader() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page' && t.url.includes('app.zenfisio.com')) ?? targets.find(t => t.type === 'page');
  if (!target) throw new Error('Aba ZenFisio/CDP não encontrada');
  const client = await CDP({ target, port: PORT });
  const cookies = await client.Network.getAllCookies().catch(async () => {
    await client.Network.enable();
    return client.Network.getAllCookies();
  });
  await client.close();
  return cookies.cookies.filter(c => c.domain.includes('zenfisio.com')).map(c => `${c.name}=${c.value}`).join('; ');
}
async function fetchText(url, cookieHeader) {
  const full = url.startsWith('http') ? url : `${BASE}${url}`;
  const r = await fetch(full, { headers: { Cookie: cookieHeader, Accept: 'text/html,application/xhtml+xml,application/json' } });
  const text = await r.text();
  return { ok: r.ok, status: r.status, url: r.url, text };
}
function findEvaluationLinks(html) {
  return [...html.matchAll(/href=["']([^"']*\/evaluations\/edit\/(\d+)[^"']*)["']/gi)]
    .map(m => ({ url: decodeHtml(m[1]), evaluation_id: String(m[2]) }));
}
function labelMap(html) {
  const map = new Map();
  for (const m of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const f = attr(m[1], 'for');
    const txt = stripTags(m[2]);
    if (f && txt) map.set(f, txt);
  }
  return map;
}
function parseFields(html) {
  const labels = labelMap(html);
  const fields = [];
  function pushField(tag, rawName, rawId, rawLabel, rawValue) {
    const name = decodeHtml(rawName || rawId || '').trim();
    const id = decodeHtml(rawId || '').trim();
    const label = stripTags(rawLabel || labels.get(id) || name);
    const value = stripTags(rawValue);
    if (!name || !value) return;
    if (['_token','user_audio','google_event_id','area_deselected','area_selected','more_procedures','more_procedures_clear','more_procedures_launch_financial'].includes(name)) return;
    fields.push({ tag, name, id, label, value });
  }
  for (const m of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)) pushField('textarea', attr(m[1], 'name'), attr(m[1], 'id'), '', m[2]);
  for (const m of html.matchAll(/<input\b([^>]*)>/gi)) {
    const attrs = m[1]; const type = attr(attrs, 'type').toLowerCase();
    const name = attr(attrs, 'name'); const id = attr(attrs, 'id');
    if (type === 'file') continue;
    if (type === 'checkbox' || type === 'radio') {
      if (!/\bchecked(?:=|\b)/i.test(attrs)) continue;
      const labelRe = new RegExp(`<label[^>]*for=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<\\/label>`, 'i');
      const label = html.match(labelRe)?.[1] || labels.get(id) || '';
      pushField('input', name, id, label, label || attr(attrs, 'value') || 'sim');
    } else if (['hidden'].includes(type)) {
      if (!['appointment_id','contact','date','start','end'].includes(name)) continue;
      pushField('input', name, id, '', attr(attrs, 'value'));
    } else {
      pushField('input', name, id, '', attr(attrs, 'value'));
    }
  }
  for (const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const attrs = m[1]; const body = m[2];
    const selected = [...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].filter(o => /\bselected(?:=|\b)/i.test(o[1])).map(o => stripTags(o[2])).filter(Boolean).join('; ');
    pushField('select', attr(attrs, 'name'), attr(attrs, 'id'), '', selected);
  }
  return fields;
}
(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) throw new Error('Sem cookies ZenFisio; faça login no Chrome CDP');
  const calendar = JSON.parse(await fs.readFile(CALENDAR_FILE, 'utf8'));
  let patients = uniqueBy(calendar.filter(e => e.contact_slug), e => e.contact_slug).map(e => ({ slug: e.contact_slug, contact_id: e.contact_id, name: e.name }));
  patients.sort((a, b) => a.slug.localeCompare(b.slug));
  if (LIMIT > 0) patients = patients.slice(0, LIMIT);
  const historyFailures = [];
  const historyResults = await mapLimit(patients, HISTORY_CONCURRENCY, async (p, i) => {
    try {
      const historyPath = `/patients/history/${encodeURIComponent(p.slug)}/history/${HISTORY_START_DATE}/${HISTORY_END_DATE}/desc`;
      const res = await fetchText(historyPath, cookieHeader);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const links = findEvaluationLinks(res.text).map(link => ({ ...p, ...link }));
      if ((i + 1) % 50 === 0 || i + 1 === patients.length) {
        console.log(`[${new Date().toISOString()}] históricos ${i + 1}/${patients.length}; falhas=${historyFailures.length}`);
      }
      return links;
    } catch (error) { historyFailures.push({ ...p, error: error.message }); }
    return [];
  });
  const editLinks = historyResults.flat();
  await fs.writeFile(path.join(OUT_DIR, 'evaluation_links_partial.json'), JSON.stringify({ patientsProcessed: patients.length, editLinks, historyFailures }, null, 2));
  const links = uniqueBy(editLinks, x => x.evaluation_id);
  await fs.writeFile(path.join(OUT_DIR, 'evaluation_links.json'), JSON.stringify({ patients: patients.length, historyStartDate: HISTORY_START_DATE, historyEndDate: HISTORY_END_DATE, links, historyFailures }, null, 2));
  console.log(`[${new Date().toISOString()}] links únicos de avaliação: ${links.length}`);
  const evaluationFailures = [];
  const evaluations = (await mapLimit(links, CONCURRENCY, async (link, i) => {
    try {
      const res = await fetchText(link.url, cookieHeader);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const title = stripTags(res.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
      const fields = parseFields(res.text);
      const item = { ...link, status: res.status, finalUrl: res.url, title, fields };
      if ((i + 1) % 20 === 0 || i + 1 === links.length) console.log(`[${new Date().toISOString()}] avaliações ${i + 1}/${links.length}; falhas=${evaluationFailures.length}`);
      return item;
    } catch (error) { evaluationFailures.push({ ...link, error: error.message }); return null; }
  })).filter(Boolean);
  const payload = { extractedAt: new Date().toISOString(), patients: patients.length, links: links.length, evaluations, historyFailures, evaluationFailures };
  await fs.writeFile(path.join(OUT_DIR, 'evaluations_full.json'), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ outDir: OUT_DIR, patients: patients.length, links: links.length, evaluations: evaluations.length, historyFailures: historyFailures.length, evaluationFailures: evaluationFailures.length }, null, 2));
})().catch(e => { console.error(e.stack || e.message || String(e)); process.exit(1); });
