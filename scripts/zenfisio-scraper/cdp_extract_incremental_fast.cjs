const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');
const fs = require('fs/promises');
const path = require('path');

const PORT = 9222;
const OUT_DIR = '/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast';
const START_DATE_ISO = '2026-07-06';
const END_DATE_ISO = '2026-07-07';
const START_DATE_BR = '06/07/2026';
const END_DATE_BR = '07/07/2026';
const BATCH_SIZE = 20;

function stripHtml(html) { return String(html ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim(); }
function slugFromHtml(s) {
  const m = String(s ?? '').match(/\/patients\/history\/([^/]+)\/history/i) || String(s ?? '').match(/\/contacts\/patients\/edit\/([^/]+)\/patients/i);
  return m ? m[1] : null;
}

async function connect() {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find(t => t.type === 'page' && t.url.includes('zenfisio.com')) ?? targets.find(t => t.type === 'page');
  if (!target) throw new Error('Nenhuma aba do ZenFisio encontrada via CDP');
  const client = await CDP({ target, port: PORT });
  await Promise.all([client.Runtime.enable(), client.Page.enable(), client.Network.enable()]);
  return client;
}
async function evalJs(client, expression, timeout = 120000) {
  const r = await client.Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'erro JS');
  return r.result.value;
}
async function getPatients(client) {
  await client.Page.navigate({ url: 'https://app.zenfisio.com/contacts/patients' });
  await new Promise(r => setTimeout(r, 3000));
  const result = await evalJs(client, `
    (async () => {
      const params = new URLSearchParams();
      const cols = [
        ['id','id',false,false], ['name','name',true,true], ['cellphone','cellphone',true,true],
        ['date_birth','date_birth',true,true], ['cpf','cpf',true,true], ['city','city',true,true],
        ['agreement_name','agreements.name',true,true], ['slug','slug',false,false], ['action','action',false,false]
      ];
      params.set('draw','200');
      cols.forEach((c,i) => {
        params.set('columns['+i+'][data]', c[0]); params.set('columns['+i+'][name]', c[1]);
        params.set('columns['+i+'][searchable]', String(c[2])); params.set('columns['+i+'][orderable]', String(c[3]));
        params.set('columns['+i+'][search][value]', ''); params.set('columns['+i+'][search][regex]', 'false');
      });
      params.set('order[0][column]','1'); params.set('order[0][dir]','asc');
      params.set('start','0'); params.set('length','5000'); params.set('search[value]',''); params.set('search[regex]','false');
      params.set('birthday_start',''); params.set('birthday_end',''); params.set('gender',''); params.set('fiquezen','');
      params.set('initial_date','2010-01-01'); params.set('final_date','2026-07-07'); params.set('_', String(Date.now()));
      const resp = await fetch('/contacts/data/patients?' + params.toString(), { credentials:'include', headers:{Accept:'application/json'} });
      if (!resp.ok) return { ok:false, status:resp.status, text: await resp.text() };
      return { ok:true, json: await resp.json() };
    })()
  `);
  if (!result.ok) throw new Error(`Falha ao buscar pacientes: ${result.status}`);
  return (result.json.data || []).map(row => ({
    id: row.id == null ? null : String(row.id).replace(/<[^>]*>/g, '').trim(),
    name: stripHtml(row.name),
    slug: slugFromHtml(`${row.slug ?? ''} ${row.action ?? ''}`),
    raw: row,
  })).filter(p => p.name && p.slug);
}

async function processBatch(client, patients) {
  return await evalJs(client, `
    (async () => {
      const patients = ${JSON.stringify(patients)};
      const startIso = ${JSON.stringify(START_DATE_ISO)};
      const endIso = ${JSON.stringify(END_DATE_ISO)};
      function clean(s){ return String(s||'').replace(/\\u00a0/g,' ').replace(/[ \\t]+/g,' ').trim(); }
      function strip(html){ return clean(String(html||'').replace(/<br\\s*\\/?\\s*>/gi, '\\n').replace(/<[^>]*>/g, ' ')); }
      function extractClinical(html, tipo) {
        const labels = /avalia/i.test(tipo) ? ['Avaliação:', 'Avaliação clínica:', 'Avaliação Clínica:'] : ['Evolução:', 'Evolução clínica:', 'Evolução Clínica:'];
        for (const label of labels) {
          const idx = html.toLowerCase().indexOf(label.toLowerCase());
          if (idx >= 0) {
            const after = html.slice(idx + label.length);
            const stop = after.search(/(Data do atendimento|Fisioterapeuta|Profissional|Histórico|Imprimir|Voltar|Convênio|Paciente:|Anexos|Sobre o paciente)/i);
            const frag = stop >= 0 ? after.slice(0, stop) : after.slice(0, 6000);
            const text = strip(frag);
            if (text.length > 2) return text;
          }
        }
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nodes = Array.from(doc.querySelectorAll('p, div, span, li')).map(e => clean(e.innerText)).filter(Boolean);
        let capture = false, out = [];
        for (const t of nodes) {
          if (/^(Evolução|Avaliação):?/i.test(t)) { capture = true; continue; }
          if (capture) {
            if (/^(Histórico|Imprimir|Voltar|Profissional:|Fisioterapeuta:|Data do atendimento:|Convênio:|Endereço:|Sexo:|Data de nascimento:|Sobre o paciente)/i.test(t)) break;
            if (!out.includes(t)) out.push(t);
          }
        }
        return out.join('\\n');
      }
      function parseEvents(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const items = Array.from(doc.querySelectorAll('li, div.timeline-item, tr.timeline-row'));
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
          let tipo = 'Agendado', status = null, appointmentId = null;
          const link = el.querySelector('a[href*="/appointments/details/"]');
          if (link) {
            const href = link.href || link.getAttribute('href') || '';
            const m = href.match(/appointments\\/details\\/(\\d+)/);
            if (m) appointmentId = m[1];
            const lt = (link.innerText || '').toLowerCase();
            if (lt.includes('evolu')) tipo = 'Evolução'; else if (lt.includes('avalia')) tipo = 'Avaliação';
          }
          const normalizedText = texto.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
          if (normalizedText.includes('evolucao')) tipo = 'Evolução';
          else if (normalizedText.includes('avaliacao')) tipo = 'Avaliação';
          else if (normalizedText.includes('faltou')) tipo = 'Faltou';
          else if (normalizedText.includes('nao atendido')) tipo = 'Não atendido';
          else if (normalizedText.includes('cancelado')) tipo = 'Cancelado';
          if (normalizedText.includes('faltou') && (normalizedText.includes('aviso previo') || normalizedText.includes('com aviso'))) status = 'faltou_com_aviso';
          else if (normalizedText.includes('faltou') && normalizedText.includes('sem aviso')) status = 'faltou_sem_aviso';
          else if (normalizedText.includes('faltou')) status = 'faltou';
          else if (normalizedText.includes('nao atendido') && normalizedText.includes('sem cobranca')) status = 'nao_atendido_sem_cobranca';
          else if (normalizedText.includes('nao atendido')) status = 'nao_atendido';
          else if (normalizedText.includes('cancelado')) status = 'cancelado';
          else if (normalizedText.includes('remarcar')) status = 'remarcar';
          let profissional = null;
          for (const linha of linhas) if (linha.includes('Fisioterapeuta:') || linha.includes('Profissional:')) { profissional = linha.replace(/Fisioterapeuta:|Profissional:/g, '').trim().replace(/\\s*\\(.*?\\)\\s*/g, '').trim(); break; }
          if (appointmentId && eventos.some(e => e.appointment_id === appointmentId)) continue;
          eventos.push({ data: dataCompleta.split(' ')[0], data_completa: dataCompleta, tipo, status, profissional, appointment_id: appointmentId, conteudo_texto: '', anexos: [] });
        }
        return eventos;
      }
      async function fetchText(url) {
        const resp = await fetch(url, { credentials:'include', headers:{Accept:'text/html,application/xhtml+xml'} });
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
        return await resp.text();
      }
      async function one(p) {
        try {
          const historyHtml = await fetchText('/patients/history/' + p.slug + '/history/' + startIso + '/' + endIso + '/desc');
          const events = parseEvents(historyHtml);
          for (const ev of events) {
            if (ev.appointment_id && /^(Evolução|Avaliação)/i.test(ev.tipo)) {
              const detailHtml = await fetchText('/appointments/details/' + ev.appointment_id);
              ev.conteudo_texto = extractClinical(detailHtml, ev.tipo);
            }
          }
          return { ok:true, patient:p, events };
        } catch (e) { return { ok:false, patient:p, error:e.message, events:[] }; }
      }
      const out = [];
      const concurrency = 4;
      let i = 0;
      async function worker(){ while(i < patients.length){ const p = patients[i++]; out.push(await one(p)); } }
      await Promise.all(Array.from({length: concurrency}, worker));
      return out;
    })()
  `, 180000);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const logPath = path.join(OUT_DIR, 'extracao_log.txt');
  const statePath = path.join(OUT_DIR, 'estado_execucao.json');
  const log = async (s) => { const line = `[${new Date().toISOString()}] ${s}`; console.log(line); await fs.appendFile(logPath, line + '\n'); };
  const client = await connect();
  await log(`Iniciando extração rápida ${START_DATE_BR} a ${END_DATE_BR}`);
  const patients = await getPatients(client);
  await fs.writeFile(path.join(OUT_DIR, 'pacientes_datatables.json'), JSON.stringify(patients, null, 2));
  await log(`Pacientes encontrados: ${patients.length}`);
  let processed = 0, withEvents = 0, totalEvents = 0, totalClinical = 0, failures = 0;
  const failuresList = [];
  for (let start = 0; start < patients.length; start += BATCH_SIZE) {
    const batch = patients.slice(start, start + BATCH_SIZE);
    const results = await processBatch(client, batch);
    for (const r of results) {
      processed++;
      if (!r.ok) { failures++; failuresList.push({ patient: r.patient, error: r.error }); continue; }
      if (r.events.length) {
        withEvents++;
        totalEvents += r.events.length;
        totalClinical += r.events.filter(e => e.conteudo_texto && /^(Evolução|Avaliação)/i.test(e.tipo)).length;
        const out = { paciente_nome: r.patient.name, paciente_id: r.patient.id, slug: r.patient.slug, total_registros: r.events.length, data_extracao: new Date().toISOString(), periodo: { inicio: START_DATE_BR, fim: END_DATE_BR }, historico: r.events };
        await fs.writeFile(path.join(OUT_DIR, `paciente_${r.patient.id || 'semid'}_${r.patient.slug.replace(/[^a-z0-9-]/gi, '-')}.json`), JSON.stringify(out, null, 2));
      }
    }
    await fs.writeFile(statePath, JSON.stringify({ processed, total: patients.length, withEvents, totalEvents, totalClinical, failures }, null, 2));
    await log(`${processed}/${patients.length} | pacientes com eventos: ${withEvents} | eventos: ${totalEvents} | textos clínicos: ${totalClinical} | falhas: ${failures}`);
  }
  await fs.writeFile(path.join(OUT_DIR, 'falhas.json'), JSON.stringify(failuresList, null, 2));
  await log(`Concluído. Processados: ${processed}; pacientes com eventos: ${withEvents}; eventos: ${totalEvents}; textos clínicos: ${totalClinical}; falhas: ${failures}`);
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
