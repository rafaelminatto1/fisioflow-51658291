const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');

(async () => {
  const target = (await CDP.List({ port: 9222 })).find(t => t.type === 'page' && t.url.includes('zenfisio.com'));
  const client = await CDP({ target, port: 9222 });
  const { Runtime, Page, Network } = client;
  await Promise.all([Runtime.enable(), Page.enable(), Network.enable()]);
  const seen = [];
  Network.requestWillBeSent(e => { if (/contacts|patients|ajax|datatable|bootstrap-table|search|json/i.test(e.request.url)) seen.push(`${e.request.method} ${e.request.url}`); });
  Network.responseReceived(e => { if (/contacts|patients|ajax|datatable|bootstrap-table|search|json/i.test(e.response.url)) seen.push(`${e.response.status} ${e.response.url}`); });
  async function evalJs(expression, timeout = 30000) {
    const r = await Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  await Page.navigate({ url: 'https://app.zenfisio.com/contacts/patients' });
  await new Promise(r => setTimeout(r, 8000));
  const data = await evalJs(`(() => {
    const tables = Array.from(document.querySelectorAll('table')).map((t, idx) => ({
      idx,
      id: t.id,
      className: t.className,
      dataUrl: t.getAttribute('data-url'),
      dataToggle: t.getAttribute('data-toggle'),
      attrs: Array.from(t.attributes).filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]),
      headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim()),
      rows: Array.from(t.querySelectorAll('tbody tr')).slice(0,5).map(tr => Array.from(tr.children).map(td => td.innerText.trim()))
    }));
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({action:f.action, method:f.method, text:f.innerText.slice(0,500), inputs:Array.from(f.querySelectorAll('input,select')).map(i=>({name:i.name,id:i.id,type:i.type,value:i.value}))}));
    const links = Array.from(document.querySelectorAll('a[href]')).filter(a => /patients|contacts|history|edit/i.test(a.href + a.innerText)).slice(0,120).map(a => ({text:a.innerText.trim().slice(0,100), href:a.href}));
    const scripts = Array.from(document.scripts).map(s => ({src:s.src, text:s.src ? '' : s.textContent.slice(0,2000)})).filter(s => /patient|contact|bootstrapTable|data-url|ajax|history/i.test(s.src + s.text));
    return {href:location.href,title:document.title,body:document.body.innerText.slice(0,2000),tables,forms,links,scripts};
  })()`, 60000);
  console.log(JSON.stringify(data, null, 2));
  console.log('--- network ---');
  console.log([...new Set(seen)].join('\n'));
  await client.close();
})().catch(e => { console.error(e); process.exit(1); });
