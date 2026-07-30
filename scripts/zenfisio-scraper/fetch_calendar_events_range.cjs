const fs = require('fs/promises');
const path = require('path');
const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');

const PORT = Number(process.env.CDP_PORT || 9222);
const START = process.env.START_DATE || '2021-07-01';
const END = process.env.END_DATE || '2026-08-02';
const OUT_FILE = process.env.OUT_FILE || '/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/calendar_events_all_raw.json';

function addMonths(date, months) {
  const d = new Date(`${date}T00:00:00-03:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function firstOfMonth(iso) {
  return `${iso.slice(0, 7)}-01`;
}
function minDate(a, b) {
  return a < b ? a : b;
}
async function evalJs(client, expression, timeout = 120000) {
  const r = await client.Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'erro JS');
  return r.result.value;
}

(async () => {
  const targets = await CDP.List({ port: PORT });
  const target = targets.find((t) => t.type === 'page' && t.url.includes('app.zenfisio.com')) ?? targets.find((t) => t.type === 'page');
  if (!target) throw new Error('Nenhuma aba ZenFisio encontrada');
  const client = await CDP({ target, port: PORT });
  await Promise.all([client.Runtime.enable(), client.Page.enable()]);
  const all = [];
  const seen = new Set();
  let cursor = firstOfMonth(START);
  const endExclusive = END;
  while (cursor < endExclusive) {
    const next = minDate(addMonths(cursor, 1), endExclusive);
    const url = `/calendar/events?users=undefined&status=&contact=&rooms=undefined&units=0&load_google_events=false&load_online_schedules=false&load_online_gympass_slots=false&appointments_filters=null&view=timeGridMonth&start=${encodeURIComponent(`${cursor}T00:00:00-03:00`)}&end=${encodeURIComponent(`${next}T00:00:00-03:00`)}`;
    const result = await evalJs(client, `(async()=>{ const resp=await fetch(${JSON.stringify(url)}, {credentials:'include', headers:{Accept:'application/json'}}); return {ok:resp.ok,status:resp.status,text:await resp.text()}; })()`);
    if (!result.ok) throw new Error(`Falha ${result.status} em ${cursor}..${next}: ${String(result.text).slice(0, 200)}`);
    const events = JSON.parse(result.text);
    for (const event of events) {
      const key = String(event.id ?? `${event.contact_id}|${event.start}|${event.name}`);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(event);
    }
    console.log(`[${new Date().toISOString()}] ${cursor}..${next}: ${events.length} eventos (${all.length} únicos acumulados)`);
    cursor = next;
    await new Promise((r) => setTimeout(r, 300));
  }
  all.sort((a, b) => String(a.start ?? a.date).localeCompare(String(b.start ?? b.date)) || String(a.name ?? '').localeCompare(String(b.name ?? '')));
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(JSON.stringify({ outFile: OUT_FILE, events: all.length, min: all[0]?.start, max: all.at(-1)?.start }, null, 2));
  await client.close();
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
