const fs = require('fs/promises');
const path = require('path');
const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');

const PORT = Number(process.env.CDP_PORT || 9222);
const CALENDAR_FILE = process.env.CALENDAR_FILE || 'scripts/zenfisio-scraper/data/calendar_events_20210701_20260802_raw.json';
const OUT_DIR = process.env.OUT_DIR || 'scripts/zenfisio-scraper/data/zenfisio-evaluations-full';
const LIMIT = Number(process.env.LIMIT || 0);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 4));

function cleanText(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&atilde;/gi, 'ã')
    .replace(/&eacute;/gi, 'é')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&iacute;/gi, 'í')
    .replace(/&aacute;/gi, 'á')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&otilde;/gi, 'õ')
    .replace(/&uacute;/gi, 'ú')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function uniqueBy(items, fn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = fn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
async function evalJs(client, expression, timeout = 120000) {
  const r = await client.Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'erro JS');
  return r.result.value;
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const calendar = JSON.parse(await fs.readFile(CALENDAR_FILE, 'utf8'));
  let patients = uniqueBy(calendar.filter(e => e.contact_slug), e => e.contact_slug)
    .map(e => ({ slug: e.contact_slug, contact_id: e.contact_id, name: e.name }));
  patients.sort((a, b) => a.slug.localeCompare(b.slug));
  if (LIMIT > 0) patients = patients.slice(0, LIMIT);

  const targets = await CDP.List({ port: PORT });
  const target = targets.find((t) => t.type === 'page' && t.url.includes('app.zenfisio.com')) ?? targets.find((t) => t.type === 'page');
  if (!target) throw new Error('Aba ZenFisio/CDP não encontrada');
  const client = await CDP({ target, port: PORT });
  await client.Runtime.enable();

  const editLinks = [];
  const historyFailures = [];
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
    try {
      const result = await evalJs(client, `(async()=>{
        const url='/patients/history/${p.slug}';
        const r=await fetch(url,{credentials:'include'});
        const html=await r.text();
        const linkRe=new RegExp('href=["\\\\']([^"\\\\']*/evaluations/edit/(\\\\d+)[^"\\\\']*)["\\\\']','gi');
        const links=[...html.matchAll(linkRe)].map(m=>({url:m[1], id:m[2]}));
        return {status:r.status, title:(html.match(/<title[^>]*>([^<]+)/i)||[])[1]||'', links};
      })()`);
      for (const link of result.links ?? []) editLinks.push({ ...p, evaluation_id: String(link.id), url: link.url });
    } catch (error) {
      historyFailures.push({ ...p, error: error.message });
    }
    if ((i + 1) % 50 === 0 || i + 1 === patients.length) {
      console.log(`[${new Date().toISOString()}] históricos ${i + 1}/${patients.length}; links=${editLinks.length}; falhas=${historyFailures.length}`);
      await fs.writeFile(path.join(OUT_DIR, 'evaluation_links_partial.json'), JSON.stringify({ patientsProcessed: i + 1, editLinks, historyFailures }, null, 2));
    }
  }
  const links = uniqueBy(editLinks, x => x.evaluation_id);
  await fs.writeFile(path.join(OUT_DIR, 'evaluation_links.json'), JSON.stringify({ patients: patients.length, links, historyFailures }, null, 2));
  console.log(`[${new Date().toISOString()}] links únicos de avaliação: ${links.length}`);

  const evaluations = [];
  const evaluationFailures = [];
  await mapLimit(links, CONCURRENCY, async (link, i) => {
    try {
      const result = await evalJs(client, `(async()=>{
        const url=${JSON.stringify(link.url)};
        const r=await fetch(url,{credentials:'include'});
        const html=await r.text();
        const doc=new DOMParser().parseFromString(html,'text/html');
        function text(el){return (el?.textContent||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
        function labelFor(el){
          const id=el.getAttribute('id');
          if(id){ const lab=doc.querySelector('label[for="'+CSS.escape(id)+'"]'); if(lab) return text(lab); }
          const parent=el.closest('.form-group,.checkbox,.radio,div');
          const lab=parent?.querySelector('label');
          if(lab) return text(lab);
          return el.getAttribute('name')||id||'';
        }
        const fields=[];
        for(const el of Array.from(doc.querySelectorAll('textarea,input,select'))){
          const name=el.getAttribute('name')||el.getAttribute('id')||'';
          if(!name || ['_token','user_audio','google_event_id','more_procedures','more_procedures_clear','more_procedures_launch_financial'].includes(name)) continue;
          let value='';
          const tag=el.tagName.toLowerCase();
          const type=(el.getAttribute('type')||'').toLowerCase();
          if(tag==='textarea') value=el.value||el.textContent||'';
          else if(tag==='select') value=Array.from(el.selectedOptions||[]).map(o=>text(o)).filter(Boolean).join('; ');
          else if(type==='checkbox'||type==='radio') { if(!el.checked) continue; value=el.value||'sim'; const lab=text(el.closest('label'))||labelFor(el); if(lab) value=lab; }
          else if(type==='file'||type==='hidden') { if(['appointment_id','contact','date','start','end'].includes(name)) value=el.value||''; else continue; }
          else value=el.value||'';
          value=value.replace(/\u00a0/g,' ').trim();
          if(!value) continue;
          fields.push({name,id:el.getAttribute('id')||'',label:labelFor(el),value});
        }
        const title=(doc.querySelector('title')?.textContent||'').trim();
        return {status:r.status, finalUrl:r.url, title, fields};
      })()`);
      evaluations[i] = { ...link, ...result };
    } catch (error) {
      evaluationFailures.push({ ...link, error: error.message });
    }
    if ((i + 1) % 20 === 0 || i + 1 === links.length) {
      console.log(`[${new Date().toISOString()}] avaliações ${i + 1}/${links.length}; falhas=${evaluationFailures.length}`);
      await fs.writeFile(path.join(OUT_DIR, 'evaluations_partial.json'), JSON.stringify({ evaluations: evaluations.filter(Boolean), evaluationFailures }, null, 2));
    }
  });

  const payload = { extractedAt: new Date().toISOString(), patients: patients.length, links: links.length, evaluations: evaluations.filter(Boolean), historyFailures, evaluationFailures };
  await fs.writeFile(path.join(OUT_DIR, 'evaluations_full.json'), JSON.stringify(payload, null, 2));
  await client.close();
  console.log(JSON.stringify({ outDir: OUT_DIR, patients: patients.length, links: links.length, evaluations: payload.evaluations.length, historyFailures: historyFailures.length, evaluationFailures: evaluationFailures.length }, null, 2));
})().catch((error) => { console.error(error.stack || error.message || String(error)); process.exit(1); });
