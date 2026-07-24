/* ============================================================
   FisioFlow · Autocomplete de condutas da sessão
   Liga qualquer <div class="acwrap" data-ac> com um <input> dentro.
   Busca em exercícios, procedimentos, testes e agentes físicos.
   ============================================================ */
(function () {
  const CATS = {
    proc: { cls: 'ac-proc', icon: 'hand',          label: 'PROCEDIMENTO' },
    exer: { cls: 'ac-exer', icon: 'dumbbell',      label: 'EXERCÍCIO' },
    test: { cls: 'ac-test', icon: 'flask-conical', label: 'TESTE' },
    elet: { cls: 'ac-elet', icon: 'zap',           label: 'AGENTE FÍSICO' }
  };

  const ITEMS = [
    { c: 'proc', n: 'Mobilização escapular grau III',            s: 'Terapia manual · escápulo-torácica' },
    { c: 'proc', n: 'Mobilização glenoumeral inferior',          s: 'Terapia manual · grau II–III' },
    { c: 'proc', n: 'Liberação miofascial de trapézio superior', s: 'Terapia manual · cervicoescapular' },
    { c: 'proc', n: 'Pompage cervical',                          s: 'Terapia manual · coluna cervical' },
    { c: 'exer', n: 'Rotação externa com elástico',              s: 'Fortalecimento · manguito rotador' },
    { c: 'exer', n: 'Rotação interna com elástico',              s: 'Fortalecimento · manguito rotador' },
    { c: 'exer', n: 'Wall slides (deslize na parede)',           s: 'Controle motor · escapular' },
    { c: 'exer', n: 'Pendular de Codman',                        s: 'Mobilidade · descompressão articular' },
    { c: 'exer', n: 'Remada baixa com elástico',                 s: 'Fortalecimento · estabilizadores da escápula' },
    { c: 'exer', n: 'Flexão de ombro na polia',                  s: 'Mobilidade ativa-assistida' },
    { c: 'test', n: 'Teste de Neer',                             s: 'Impacto subacromial' },
    { c: 'test', n: 'Teste de Hawkins-Kennedy',                  s: 'Impacto subacromial' },
    { c: 'test', n: 'Teste de Jobe (lata vazia)',                s: 'Supraespinhal' },
    { c: 'test', n: 'Teste de Speed',                            s: 'Cabeça longa do bíceps' },
    { c: 'elet', n: 'TENS — analgesia',                          s: '20 min · região subacromial' },
    { c: 'elet', n: 'Ultrassom terapêutico 1 MHz',               s: '5 min · modo contínuo' },
    { c: 'elet', n: 'Crioterapia',                               s: '15 min · pós-sessão' },
    { c: 'elet', n: 'Laser de baixa intensidade',                s: 'Pontos dolorosos · supraespinhal' }
  ];

  /* sugeridos quando o campo está vazio (protocolo de ombro) */
  const SUGGESTED = [0, 4, 6, 14, 7, 10];

  const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function hi(name, q) {
    if (!q) return name;
    const i = norm(name).indexOf(norm(q));
    if (i < 0) return name;
    return name.slice(0, i) + '<b>' + name.slice(i, i + q.length) + '</b>' + name.slice(i + q.length);
  }

  function rowHTML(item, idx, q, selIdx) {
    const cat = CATS[item.c];
    return (
      '<div class="acrow ' + cat.cls + (idx === selIdx ? ' sel' : '') + '" data-idx="' + idx + '">' +
        '<div class="aci"><i data-lucide="' + cat.icon + '"></i></div>' +
        '<div class="acb"><div class="acn">' + hi(item.n, q) + '</div><div class="acs">' + item.s + '</div></div>' +
        '<span class="acc">' + cat.label + '</span>' +
        '<span class="ack">↵</span>' +
      '</div>'
    );
  }

  function wire(wrap) {
    const input = wrap.querySelector('input');
    const panel = wrap.querySelector('.acpanel');
    if (!input || !panel) return;

    let results = [];
    let sel = 0;

    function render() {
      const q = input.value.trim();
      let html = '';
      if (!q) {
        results = SUGGESTED.map((i) => ITEMS[i]);
        html += '<div class="acgl">Sugeridos · protocolo de ombro</div>';
        html += results.map((it, k) => rowHTML(it, k, '', sel)).join('');
      } else {
        results = ITEMS.filter((it) => norm(it.n + ' ' + it.s).includes(norm(q))).slice(0, 7);
        if (results.length) {
          html += '<div class="acgl">' + results.length + ' resultado' + (results.length > 1 ? 's' : '') + '</div>';
          html += results.map((it, k) => rowHTML(it, k, q, sel)).join('');
        } else {
          html += '<div class="acempty">Nada encontrado na biblioteca.</div>';
        }
        html += '<div class="acnew" data-new><i data-lucide="plus-circle"></i> Criar <em>' + q + '</em> como nova conduta</div>';
      }
      html += '<div class="acfoot"><span><span class="kbd">↑↓</span> navegar</span><span><span class="kbd">↵</span> adicionar</span><span><span class="kbd">esc</span> fechar</span></div>';
      panel.innerHTML = html;
      if (window.lucide) lucide.createIcons();
    }

    function open()  { wrap.classList.add('open'); sel = 0; render(); }
    function close() { wrap.classList.remove('open'); }

    function added(name) {
      close();
      input.value = '';
      const toast = document.createElement('div');
      toast.className = 'actoast';
      toast.innerHTML = '<i data-lucide="check-circle-2"></i> <span><strong>' + name + '</strong> adicionado à conduta da sessão</span>';
      wrap.appendChild(toast);
      if (window.lucide) lucide.createIcons();
      setTimeout(() => toast.remove(), 1800);
    }

    input.addEventListener('focus', open);
    input.addEventListener('input', () => { sel = 0; wrap.classList.add('open'); render(); });
    input.addEventListener('keydown', (e) => {
      if (!wrap.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[sel]) added(results[sel].n);
        else if (input.value.trim()) added(input.value.trim());
      }
      else if (e.key === 'Escape') { close(); input.blur(); }
    });

    panel.addEventListener('mousedown', (e) => {
      e.preventDefault(); /* não rouba o foco do input */
      const row = e.target.closest('.acrow');
      if (row) { added(results[+row.dataset.idx].n); return; }
      if (e.target.closest('[data-new]') && input.value.trim()) added(input.value.trim());
    });

    document.addEventListener('mousedown', (e) => { if (!wrap.contains(e.target)) close(); });
  }

  function init() { document.querySelectorAll('.acwrap[data-ac]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
