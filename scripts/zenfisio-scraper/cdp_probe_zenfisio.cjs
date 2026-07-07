const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');

(async () => {
const targets = await CDP.List({ port: 9222 });
const target = targets.find((t) => t.type === 'page' && t.url.includes('zenfisio.com')) ?? targets.find((t) => t.type === 'page');
if (!target) throw new Error('Nenhuma aba encontrada via CDP');
console.log('Aba:', target.title, target.url);

const client = await CDP({ target, port: 9222 });
const { Runtime, Page, Network } = client;
await Promise.all([Runtime.enable(), Page.enable(), Network.enable()]);

const seen = new Set();
Network.requestWillBeSent((event) => {
  const url = event.request.url;
  if (/zenfisio|api|patients|appointments|calendar|history|datatable/i.test(url)) seen.add(`${event.request.method} ${url}`);
});
Network.responseReceived((event) => {
  const url = event.response.url;
  if (/zenfisio|api|patients|appointments|calendar|history|datatable/i.test(url)) seen.add(`${event.response.status} ${url}`);
});

async function evalJs(expression, timeout = 30000) {
  const result = await Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true, timeout });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'erro JS');
  }
  return result.result.value;
}

const snapshot = await evalJs(`(() => ({
  href: location.href,
  title: document.title,
  body: document.body.innerText.slice(0, 1500),
  links: Array.from(document.querySelectorAll('a[href]')).slice(0,50).map(a => ({text:a.innerText.trim().slice(0,120), href:a.href})),
  scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(0,50)
}))()`);
console.log('Snapshot:', JSON.stringify(snapshot, null, 2));

const endpointResults = await evalJs(`(async () => {
 const endpoints = [
  '/patients', '/contacts', '/contacts/patients', '/patients/list', '/patients/search',
  '/api/contacts/patients?page=1&per_page=5', '/api/patients?page=1', '/api/v1/patients',
  '/calendar', '/appointments', '/api/appointments', '/api/calendar/events'
 ];
 const out = [];
 for (const ep of endpoints) {
  try {
   const resp = await fetch(ep, {credentials:'include', headers:{Accept:'application/json, text/html;q=0.9'}});
   const text = await resp.text();
   out.push({ep, status: resp.status, contentType: resp.headers.get('content-type'), preview: text.slice(0,250)});
  } catch (e) { out.push({ep, error: e.message}); }
 }
 return out;
})()`);
console.log('Endpoints:', JSON.stringify(endpointResults, null, 2));

await Page.navigate({ url: 'https://app.zenfisio.com/patients/history/ricardo-almeida-2/history/2026-07-01/2026-07-07/desc' });
await new Promise((r) => setTimeout(r, 7000));
const hist = await evalJs(`(() => ({
 href: location.href,
 title: document.title,
 body: document.body.innerText.slice(0, 3000),
 links: Array.from(document.querySelectorAll('a[href]')).filter(a => /appointments|history|next|page/i.test(a.href + ' ' + a.innerText)).slice(0,80).map(a => ({text:a.innerText.trim(), href:a.href})),
 itemCount: document.querySelectorAll('li, div.timeline-item, tr.timeline-row').length
}))()`);
console.log('History Ricardo:', JSON.stringify(hist, null, 2));

console.log('Network visto:');
for (const item of Array.from(seen).slice(0, 200)) console.log(item);
await client.close();
})().catch(err => { console.error('ERRO:', err); process.exit(1); });
