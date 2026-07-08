const CDP = require('/tmp/cdp-tools/node_modules/chrome-remote-interface');
const fs = require('fs/promises');

const cases = [
  { name: 'Magali Auxiliadora Costa Gomes', appointmentId: '262255539' },
  { name: 'Wilmer Pairo Alanoca', appointmentId: '262176972' },
];

function clean(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function extractClinicalFromBodyText(body) {
  let text = clean(body);
  const startMarkers = ['AVALIAÇÃO FÍSICA', 'Inspeção', 'HMA:', 'HDA:', 'Diagnóstico', 'Queixa principal'];
  const starts = startMarkers.map((m) => text.indexOf(m)).filter((i) => i >= 0);
  let start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) {
    const adm = text.indexOf('ADM');
    if (adm >= 0) start = Math.max(0, adm - 800);
  }
  if (start < 0) return '';
  text = text.slice(start);
  const stopMarkers = ['Gerar PDF', 'Fechar', 'Dados do atendimento', 'Histórico', 'Imprimir', 'Voltar'];
  const stops = stopMarkers.map((m) => text.indexOf(m)).filter((i) => i > 200);
  if (stops.length) text = text.slice(0, Math.min(...stops));
  return clean(text);
}

(async () => {
  const target = (await CDP.List({ port: 9222 })).find((t) => t.type === 'page' && t.url.includes('zenfisio.com'));
  if (!target) throw new Error('Aba ZenFisio não encontrada');
  const client = await CDP({ target, port: 9222 });
  await client.Runtime.enable();
  async function evalJs(expr) {
    const r = await client.Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  const results = [];
  for (const item of cases) {
    const data = await evalJs(`(async()=>{
      const html = await (await fetch('/appointments/details/${item.appointmentId}', {credentials:'include'})).text();
      const doc = new DOMParser().parseFromString(html,'text/html');
      const body = doc.body.innerText;
      const candidates = Array.from(doc.querySelectorAll('.box-body, .content, .tab-content, .panel-body, .timeline-body, section, article, div'))
        .map(e => e.innerText || '')
        .filter(t => /AVALIAÇÃO FÍSICA|HMA:|ADM|PLANO TERAPÊUTICO|CONDUTA|Diagnóstico/i.test(t))
        .sort((a,b) => a.length - b.length)
        .slice(0,20);
      return { body, candidates };
    })()`);
    const candidateTexts = (data.candidates || []).map(extractClinicalFromBodyText).filter((t) => t.length > 100);
    let clinical = candidateTexts.sort((a, b) => a.length - b.length)[0] || extractClinicalFromBodyText(data.body);
    // Se o menor candidato ficou curto demais, usa um candidato mais completo, mas sem navegação.
    if (clinical.length < 500) {
      clinical = candidateTexts.sort((a, b) => b.length - a.length)[0] || clinical;
    }
    results.push({ ...item, conteudo_texto: clinical, chars: clinical.length, preview: clinical.slice(0, 500) });
  }
  await fs.writeFile('/tmp/zenfisio_dirty_clean_texts.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(r => ({ name: r.name, appointmentId: r.appointmentId, chars: r.chars, preview: r.preview })), null, 2));
  await client.close();
})().catch((error) => { console.error(error); process.exit(1); });
