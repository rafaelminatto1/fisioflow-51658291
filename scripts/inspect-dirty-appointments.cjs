const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');

(async () => {
  const ids = ['262255539', '262176972'];
  const target = (await CDP.List({ port: 9222 })).find((t) => t.type === 'page' && t.url.includes('zenfisio.com'));
  if (!target) throw new Error('Aba ZenFisio não encontrada no Chrome CDP');
  const client = await CDP({ target, port: 9222 });
  await client.Runtime.enable();
  async function evalJs(expr) {
    const r = await client.Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  for (const id of ids) {
    const info = await evalJs(`(async()=>{
      const html = await (await fetch('/appointments/details/${id}', {credentials:'include'})).text();
      const doc = new DOMParser().parseFromString(html,'text/html');
      const body = doc.body.innerText;
      const keys = ['Avaliação','Evolução','Queixa','HMA','Diagnóstico','Conduta','Observações','Paciente relata','ADM','EVA'];
      const idxs = keys.map(k=>({k, idx: body.indexOf(k)}));
      const chunks = idxs.filter(x=>x.idx>=0).map(x=>({k:x.k, text: body.slice(Math.max(0,x.idx-300), x.idx+1800)}));
      const nodes = Array.from(doc.querySelectorAll('textarea, input, .note-editable, .summernote, [contenteditable="true"], p, div, section, article')).map((e,i)=>({
        i,
        tag:e.tagName,
        cls:String(e.className||''),
        id:e.id||'',
        name:e.getAttribute('name')||'',
        text:String(e.value||e.innerText||'').trim().slice(0,1200)
      })).filter(x=>/Avaliação|Queixa|HMA|Diagnóstico|Conduta|Paciente|dor|ADM|EVA|Lib|Tens|Laser|Data do atendimento/i.test(x.text+x.name+x.id+x.cls));
      return {id:'${id}', title:doc.title, bodyStart: body.slice(0,2500), idxs, chunks, nodes: nodes.slice(0,120)};
    })()`);
    console.log('---ID', id, '---');
    console.log(JSON.stringify(info, null, 2));
  }
  await client.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
