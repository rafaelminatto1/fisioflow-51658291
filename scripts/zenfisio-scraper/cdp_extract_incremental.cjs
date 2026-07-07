const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');
const fs = require('fs/promises');
const path = require('path');

const PORT = 9222;
const OUT_DIR = '/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental';
const START_DATE_ISO = '2026-07-06';
const END_DATE_ISO = '2026-07-07';
const START_DATE_BR = '06/07/2026';
const END_DATE_BR = '07/07/2026';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cleanText(s) { return String(s ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim(); }
function stripHtml(html) { return cleanText(String(html ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ' ')); }
function slugFromHref(href) {
  const m = String(href ?? '').match(/\/patients\/history\/([^/]+)\/history/i) || String(href ?? '').match(/\/contacts\/patients\/edit\/([^/]+)\/patients/i);
  return m ? m[1] : null;
}
function idFromActionOrId(row) {
  if (row.id != null && String(row.id).match(/\d+/)) return String(row.id).replace(/<[^>]+>/g, '').trim();
  const text = `${row.action ?? ''} ${row.slug ?? ''} ${row.name ?? ''}`;
  const m = text.match(/destroy\/[^/]+\/patients[^\d]*(\d+)/i);
  return m ? m[1] : null;
}

async function connect() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page' && t.url.includes('zenfisio.com')) ?? targets.find(t => t.type === 'page');
  if (!target) throw new Error('Nenhuma aba do Chrome encontrada via CDP');
  const client = await CDP({ target, port: PORT });
  await Promise.all([client.Runtime.enable(), client.Page.enable(), client.Network.enable()]);
  return client;
}

async function evalJs(client, expression, timeout = 60000) {
  const r = await client.Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'erro JS');
  return r.result.value;
}

async function navigate(client, url, waitMs = 2500) {
  await client.Page.navigate({ url });
  await sleep(waitMs);
}

async function getPatients(client) {
  await navigate(client, 'https://app.zenfisio.com/contacts/patients', 5000);
  const result = await evalJs(client, `
    (async () => {
      const params = new URLSearchParams();
      const cols = [
        ['id','id',false,false], ['name','name',true,true], ['cellphone','cellphone',true,true],
        ['date_birth','date_birth',true,true], ['cpf','cpf',true,true], ['city','city',true,true],
        ['agreement_name','agreements.name',true,true], ['slug','slug',false,false], ['action','action',false,false]
      ];
      params.set('draw','99');
      cols.forEach((c,i) => {
        params.set('columns['+i+'][data]', c[0]);
        params.set('columns['+i+'][name]', c[1]);
        params.set('columns['+i+'][searchable]', String(c[2]));
        params.set('columns['+i+'][orderable]', String(c[3]));
        params.set('columns['+i+'][search][value]', '');
        params.set('columns['+i+'][search][regex]', 'false');
      });
      params.set('order[0][column]','1'); params.set('order[0][dir]','asc');
      params.set('start','0'); params.set('length','5000');
      params.set('search[value]',''); params.set('search[regex]','false');
      params.set('birthday_start',''); params.set('birthday_end',''); params.set('gender',''); params.set('fiquezen','');
      params.set('initial_date','2010-01-01'); params.set('final_date','2026-07-07');
      params.set('_', String(Date.now()));
      const resp = await fetch('/contacts/data/patients?' + params.toString(), { credentials:'include', headers:{Accept:'application/json'} });
      if (!resp.ok) return { ok:false, status:resp.status, text: await resp.text() };
      return { ok:true, json: await resp.json() };
    })()
  `, 120000);
  if (!result.ok) throw new Error(`Falha ao buscar pacientes: ${result.status} ${result.text?.slice(0,200)}`);
  const rows = result.json.data || [];
  return rows.map(row => {
    const blob = `${row.name ?? ''} ${row.slug ?? ''} ${row.action ?? ''}`;
    const slug = slugFromHref(blob) || (typeof row.slug === 'string' && !row.slug.includes('<') ? row.slug : null);
    return {
      id: idFromActionOrId(row),
      name: stripHtml(row.name),
      slug,
      raw: row,
    };
  }).filter(p => p.name && p.slug);
}

async function extractEventsOnHistoryPage(client) {
  const json = await evalJs(client, `(() => {
    const items = Array.from(document.querySelectorAll('li, div.timeline-item, tr.timeline-row'));
    const eventos = [];
    for (const el of items) {
      const texto = el.innerText || '';
      if (!texto.includes('Data:')) continue;
      const linhas = texto.split('\\n').map(l => l.trim()).filter(Boolean);
      let dataCompleta = null;
      for (const linha of linhas) if (linha.startsWith('Data:')) { dataCompleta = linha.replace('Data:', '').trim(); break; }
      if (!dataCompleta) {
        const m = texto.match(/Data:\\s*(\\d{2}\\/\\d{2}\\/\\d{4}(?:\\s+\\d{2}:\\d{2})?)/);
        if (m) dataCompleta = m[1];
      }
      if (!dataCompleta) continue;
      let tipo = 'Agendado';
      let appointmentId = null;
      const link = el.querySelector('a[href*="/appointments/details/"]');
      if (link) {
        const href = link.href || link.getAttribute('href') || '';
        const m = href.match(/appointments\\/details\\/(\\d+)/);
        if (m) appointmentId = m[1];
        const lt = (link.innerText || '').toLowerCase();
        if (lt.includes('evolu')) tipo = 'Evolução';
        else if (lt.includes('avalia')) tipo = 'Avaliação';
        else if (lt.includes('atendimento')) tipo = 'Atendimento';
      }
      if (!link) {
        if (texto.includes('Evolução')) tipo = 'Evolução';
        else if (texto.includes('Avaliação')) tipo = 'Avaliação';
        else if (texto.includes('Faltou')) tipo = 'Faltou';
        else if (texto.includes('Não atendido')) tipo = 'Não atendido';
        else if (texto.includes('Cancelado')) tipo = 'Cancelado';
      }
      let profissional = null;
      for (const linha of linhas) if (linha.includes('Fisioterapeuta:') || linha.includes('Profissional:')) { profissional = linha.replace(/Fisioterapeuta:|Profissional:/g, '').trim().replace(/\\s*\\(.*?\\)\\s*/g, '').trim(); break; }
      if (appointmentId && eventos.some(e => e.appointment_id === appointmentId)) continue;
      eventos.push({ data: dataCompleta.split(' ')[0], data_completa: dataCompleta, tipo, profissional, appointment_id: appointmentId, conteudo_texto: '', anexos: [] });
    }
    return JSON.stringify(eventos);
  })()`, 30000);
  return JSON.parse(json || '[]');
}

async function extractClinicalText(client, tipo) {
  const text = await evalJs(client, `(() => {
    function clean(s){ return String(s||'').replace(/\\u00a0/g,' ').replace(/[ \\t]+/g,' ').trim(); }
    const html = document.body.innerHTML;
    const type = ${JSON.stringify(tipo)};
    const labels = type && type.toLowerCase().includes('avalia') ? ['Avaliação:', 'Avaliação clínica:', 'Avaliação Clínica:'] : ['Evolução:', 'Evolução clínica:', 'Evolução Clínica:'];
    for (const label of labels) {
      const idx = html.toLowerCase().indexOf(label.toLowerCase());
      if (idx >= 0) {
        const after = html.slice(idx + label.length);
        const stop = after.search(/(Data do atendimento|Fisioterapeuta|Profissional|Histórico|Imprimir|Voltar|Convênio|Paciente:|Anexos)/i);
        const frag = stop >= 0 ? after.slice(0, stop) : after.slice(0, 4000);
        const stripped = clean(frag.replace(/<br\\s*\\/?\\s*>/gi, '\\n').replace(/<[^>]+>/g, ' '));
        if (stripped.length > 2) return stripped;
      }
    }
    const ps = Array.from(document.querySelectorAll('p, div, span, li')).map(e => clean(e.innerText)).filter(Boolean);
    let out = [];
    let capture = false;
    for (const t of ps) {
      if (/^(Evolução|Avaliação):?/i.test(t)) { capture = true; continue; }
      if (capture) {
        if (/^(Histórico|Imprimir|Voltar|Profissional:|Fisioterapeuta:|Data do atendimento:|Convênio:|Endereço:|Sexo:|Data de nascimento:)/i.test(t)) break;
        if (!out.includes(t)) out.push(t);
      }
    }
    return out.join('\\n');
  })()`, 30000);
  return text || '';
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const client = await connect();
  const statePath = path.join(OUT_DIR, 'estado_execucao.json');
  const logPath = path.join(OUT_DIR, 'extracao_log.txt');
  const log = async (s) => { const line = `[${new Date().toISOString()}] ${s}`; console.log(line); await fs.appendFile(logPath, line + '\n'); };
  await log(`Iniciando extração incremental ${START_DATE_BR} a ${END_DATE_BR}`);
  const patients = await getPatients(client);
  await fs.writeFile(path.join(OUT_DIR, 'pacientes_datatables.json'), JSON.stringify(patients, null, 2));
  await log(`Pacientes encontrados: ${patients.length}`);

  let processed = 0, withEvents = 0, totalEvents = 0, totalClinical = 0, failures = 0;
  const failuresList = [];
  for (const p of patients) {
    processed++;
    try {
      const histUrl = `https://app.zenfisio.com/patients/history/${p.slug}/history/${START_DATE_ISO}/${END_DATE_ISO}/desc`;
      await navigate(client, histUrl, 1800);
      const events = await extractEventsOnHistoryPage(client);
      if (events.length) {
        for (const ev of events) {
          if (ev.appointment_id && /^(Evolução|Avaliação)/i.test(ev.tipo)) {
            await navigate(client, `https://app.zenfisio.com/appointments/details/${ev.appointment_id}`, 1200);
            ev.conteudo_texto = await extractClinicalText(client, ev.tipo);
            if (ev.conteudo_texto) totalClinical++;
          }
        }
        const out = { paciente_nome: p.name, paciente_id: p.id, slug: p.slug, total_registros: events.length, data_extracao: new Date().toISOString(), periodo: { inicio: START_DATE_BR, fim: END_DATE_BR }, historico: events };
        const safeSlug = p.slug.replace(/[^a-z0-9-]/gi, '-');
        await fs.writeFile(path.join(OUT_DIR, `paciente_${p.id || 'semid'}_${safeSlug}.json`), JSON.stringify(out, null, 2));
        withEvents++;
        totalEvents += events.length;
      }
      if (processed === 1 || processed % 25 === 0 || events.length) await log(`${processed}/${patients.length} ${p.name} | eventos: ${events.length}`);
      await fs.writeFile(statePath, JSON.stringify({ processed, total: patients.length, withEvents, totalEvents, totalClinical, failures, last: p }, null, 2));
    } catch (e) {
      failures++;
      failuresList.push({ patient: p, error: e.message });
      await log(`ERRO ${p.name}: ${e.message}`);
    }
  }
  await fs.writeFile(path.join(OUT_DIR, 'falhas.json'), JSON.stringify(failuresList, null, 2));
  await log(`Concluído. Processados: ${processed}; pacientes com eventos: ${withEvents}; eventos: ${totalEvents}; evoluções/avaliações com texto: ${totalClinical}; falhas: ${failures}`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
