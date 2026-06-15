/* @ds-bundle: {"format":3,"namespace":"FisioFlowDesignSystem_019e1c","components":[],"sourceHashes":{"evolucao-sessao/conduta-autocomplete.js":"97205349a34a","image-slot.js":"9309434cb09c","ui_kits/patient-app/ios-frame.jsx":"d67eb3ffe562","ui_kits/web/AgendaView.jsx":"6e27d0af130a","ui_kits/web/ExerciseLibrary.jsx":"fb50fff2f9cb","ui_kits/web/Login.jsx":"97ee3ec9c5e4","ui_kits/web/PageHeader.jsx":"98e4663e11fd","ui_kits/web/PatientList.jsx":"40636e15fbe5","ui_kits/web/Sidebar.jsx":"43c9fbefa592","ui_kits/web/image-slot.js":"10d5f6934c92","ui_kits/web/ui.jsx":"7bfcd4d7346e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FisioFlowDesignSystem_019e1c = window.FisioFlowDesignSystem_019e1c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// evolucao-sessao/conduta-autocomplete.js
try { (() => {
/* ============================================================
   FisioFlow · Autocomplete de condutas da sessão
   Liga qualquer <div class="acwrap" data-ac> com um <input> dentro.
   Busca em exercícios, procedimentos, testes e agentes físicos.
   ============================================================ */
(function () {
  const CATS = {
    proc: {
      cls: 'ac-proc',
      icon: 'hand',
      label: 'PROCEDIMENTO'
    },
    exer: {
      cls: 'ac-exer',
      icon: 'dumbbell',
      label: 'EXERCÍCIO'
    },
    test: {
      cls: 'ac-test',
      icon: 'flask-conical',
      label: 'TESTE'
    },
    elet: {
      cls: 'ac-elet',
      icon: 'zap',
      label: 'AGENTE FÍSICO'
    }
  };
  const ITEMS = [{
    c: 'proc',
    n: 'Mobilização escapular grau III',
    s: 'Terapia manual · escápulo-torácica'
  }, {
    c: 'proc',
    n: 'Mobilização glenoumeral inferior',
    s: 'Terapia manual · grau II–III'
  }, {
    c: 'proc',
    n: 'Liberação miofascial de trapézio superior',
    s: 'Terapia manual · cervicoescapular'
  }, {
    c: 'proc',
    n: 'Pompage cervical',
    s: 'Terapia manual · coluna cervical'
  }, {
    c: 'exer',
    n: 'Rotação externa com elástico',
    s: 'Fortalecimento · manguito rotador'
  }, {
    c: 'exer',
    n: 'Rotação interna com elástico',
    s: 'Fortalecimento · manguito rotador'
  }, {
    c: 'exer',
    n: 'Wall slides (deslize na parede)',
    s: 'Controle motor · escapular'
  }, {
    c: 'exer',
    n: 'Pendular de Codman',
    s: 'Mobilidade · descompressão articular'
  }, {
    c: 'exer',
    n: 'Remada baixa com elástico',
    s: 'Fortalecimento · estabilizadores da escápula'
  }, {
    c: 'exer',
    n: 'Flexão de ombro na polia',
    s: 'Mobilidade ativa-assistida'
  }, {
    c: 'test',
    n: 'Teste de Neer',
    s: 'Impacto subacromial'
  }, {
    c: 'test',
    n: 'Teste de Hawkins-Kennedy',
    s: 'Impacto subacromial'
  }, {
    c: 'test',
    n: 'Teste de Jobe (lata vazia)',
    s: 'Supraespinhal'
  }, {
    c: 'test',
    n: 'Teste de Speed',
    s: 'Cabeça longa do bíceps'
  }, {
    c: 'elet',
    n: 'TENS — analgesia',
    s: '20 min · região subacromial'
  }, {
    c: 'elet',
    n: 'Ultrassom terapêutico 1 MHz',
    s: '5 min · modo contínuo'
  }, {
    c: 'elet',
    n: 'Crioterapia',
    s: '15 min · pós-sessão'
  }, {
    c: 'elet',
    n: 'Laser de baixa intensidade',
    s: 'Pontos dolorosos · supraespinhal'
  }];

  /* sugeridos quando o campo está vazio (protocolo de ombro) */
  const SUGGESTED = [0, 4, 6, 14, 7, 10];
  const norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function hi(name, q) {
    if (!q) return name;
    const i = norm(name).indexOf(norm(q));
    if (i < 0) return name;
    return name.slice(0, i) + '<b>' + name.slice(i, i + q.length) + '</b>' + name.slice(i + q.length);
  }
  function rowHTML(item, idx, q, selIdx) {
    const cat = CATS[item.c];
    return '<div class="acrow ' + cat.cls + (idx === selIdx ? ' sel' : '') + '" data-idx="' + idx + '">' + '<div class="aci"><i data-lucide="' + cat.icon + '"></i></div>' + '<div class="acb"><div class="acn">' + hi(item.n, q) + '</div><div class="acs">' + item.s + '</div></div>' + '<span class="acc">' + cat.label + '</span>' + '<span class="ack">↵</span>' + '</div>';
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
        results = SUGGESTED.map(i => ITEMS[i]);
        html += '<div class="acgl">Sugeridos · protocolo de ombro</div>';
        html += results.map((it, k) => rowHTML(it, k, '', sel)).join('');
      } else {
        results = ITEMS.filter(it => norm(it.n + ' ' + it.s).includes(norm(q))).slice(0, 7);
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
    function open() {
      wrap.classList.add('open');
      sel = 0;
      render();
    }
    function close() {
      wrap.classList.remove('open');
    }
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
    input.addEventListener('input', () => {
      sel = 0;
      wrap.classList.add('open');
      render();
    });
    input.addEventListener('keydown', e => {
      if (!wrap.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        sel = Math.min(sel + 1, results.length - 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sel = Math.max(sel - 1, 0);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[sel]) added(results[sel].n);else if (input.value.trim()) added(input.value.trim());
      } else if (e.key === 'Escape') {
        close();
        input.blur();
      }
    });
    panel.addEventListener('mousedown', e => {
      e.preventDefault(); /* não rouba o foco do input */
      const row = e.target.closest('.acrow');
      if (row) {
        added(results[+row.dataset.idx].n);
        return;
      }
      if (e.target.closest('[data-new]') && input.value.trim()) added(input.value.trim());
    });
    document.addEventListener('mousedown', e => {
      if (!wrap.contains(e.target)) close();
    });
  }
  function init() {
    document.querySelectorAll('.acwrap[data-ac]').forEach(wire);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);else init();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "evolucao-sessao/conduta-autocomplete.js", error: String((e && e.message) || e) }); }

// image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/patient-app/ios-frame.jsx
try { (() => {
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports: IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient-app/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/AgendaView.jsx
try { (() => {
// AgendaView — week grid recreation of /agenda
const {
  Icon,
  Button,
  Badge
} = window.FZ;
const DAYS = ['SEG. 11/05', 'TER. 12/05', 'QUA. 13/05', 'QUI. 14/05', 'SEX. 15/05', 'SÁB. 16/05'];
const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

// each appt: [dayIdx, hourIdx, name, status]
const APPTS = [[0, 2, 'Carla Ferreira', 'confirmed'], [0, 2, 'Diego Costa', 'consulta'], [1, 3, 'Elisa Rodrigues', 'pending'], [2, 3, 'Elisa Rodrigues', 'confirmed'], [2, 4, 'Felipe Oliveira', 'consulta'], [3, 1, 'Carla Ferreira', 'confirmed'], [3, 3, 'Diego Costa', 'consulta'], [3, 4, 'Felipe Oliveira', 'consulta'], [4, 1, 'Carla Ferreira', 'confirmed'], [4, 3, 'Diego Costa', 'consulta'], [4, 4, 'Felipe Oliveira', 'consulta'], [5, 1, 'Carla Ferreira', 'confirmed'], [5, 3, 'Diego Costa', 'consulta'], [5, 4, 'Felipe Oliveira', 'consulta'], [2, 6, 'Gabriela Alves', 'consulta'], [3, 6, 'Gabriela Alves', 'consulta'], [4, 6, 'Gabriela Alves', 'consulta'], [5, 6, 'Gabriela Alves', 'consulta'], [2, 7, 'Hugo Martins', 'consulta'], [3, 7, 'Hugo Martins', 'consulta'], [4, 7, 'Hugo Martins', 'consulta'], [5, 7, 'Hugo Martins', 'consulta'], [2, 8, 'Isabela Nunes', 'consulta'], [3, 8, 'Isabela Nunes', 'consulta'], [4, 8, 'Isabela Nunes', 'consulta'], [5, 8, 'Isabela Nunes', 'consulta']];
const StatusBlock = ({
  name,
  status,
  time
}) => {
  const cls = {
    consulta: 'fz-appt-consulta',
    confirmed: 'fz-appt-confirmed',
    pending: 'fz-appt-pending',
    cancelled: 'fz-appt-cancelled'
  }[status] || 'fz-appt-consulta';
  return /*#__PURE__*/React.createElement("div", {
    className: `fz-appt ${cls}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-appt-meta"
  }, /*#__PURE__*/React.createElement("span", null, status === 'consulta' ? 'CONSULTA' : status === 'confirmed' ? '● CONFIRMADO' : status === 'pending' ? '● PENDENTE' : status.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    className: "fz-appt-time"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 10
  }), " ", time)), /*#__PURE__*/React.createElement("div", {
    className: "fz-appt-name"
  }, "QA_AUTO_ ", name));
};
const AgendaView = () => {
  return /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-bar-left"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon",
    "aria-label": "prev"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 14
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, "HOJE"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "icon",
    "aria-label": "next"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-date"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 14
  }), " 12 de maio de 2026")), /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-bar-center"
  }, /*#__PURE__*/React.createElement("input", {
    className: "fz-input fz-input-sm",
    placeholder: "Buscar paciente"
  })), /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-bar-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-tabs"
  }, /*#__PURE__*/React.createElement("button", null, "DIA"), /*#__PURE__*/React.createElement("button", {
    className: "is-active"
  }, "SEMANA"), /*#__PURE__*/React.createElement("button", null, "M\xCAS")), /*#__PURE__*/React.createElement(Button, {
    variant: "warning",
    size: "sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " REENGAJAR"))), /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-grid",
    style: {
      gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-corner"
  }), DAYS.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    className: "fz-agenda-day-head"
  }, d)), HOURS.map((h, hi) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-agenda-hour"
  }, h), DAYS.map((_, di) => {
    const cellAppts = APPTS.filter(a => a[0] === di && a[1] === hi);
    return /*#__PURE__*/React.createElement("div", {
      key: di + '-' + hi,
      className: "fz-agenda-cell"
    }, cellAppts.map((a, i) => /*#__PURE__*/React.createElement(StatusBlock, {
      key: i,
      name: a[2],
      status: a[3],
      time: `${HOURS[hi]} - ${(parseInt(HOURS[hi]) + 1).toString().padStart(2, '0')}:00`
    })));
  })))));
};
window.AgendaView = AgendaView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/AgendaView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/ExerciseLibrary.jsx
try { (() => {
// ExerciseLibrary — grid of exercise cards
const {
  Icon,
  Button,
  Badge
} = window.FZ;
const EXERCISES = [{
  name: '4 Apoios (Four Point kneeling)',
  desc: 'O exercício de 4 Apoios é uma postura fundamental na reabilitação, visando estabelecer uma base de estabilização do core...',
  tag: 'Core / Estabilização',
  video: true,
  sets: '3x · 12 reps',
  tone: 'pink'
}, {
  name: 'Ab Wheel Rollout',
  desc: 'O Ab Wheel Rollout é um exercício avançado que visa fortalecer a musculatura do core, com foco primário no reto abdominal...',
  tag: 'Core / Estabilização',
  video: true,
  sets: '3x · 12 reps',
  tone: 'orange'
}, {
  name: 'Abdominal',
  desc: 'Fortalecimento do reto abdominal com foco em flexão torácica.',
  tag: 'Core',
  video: false,
  sets: '3x · 12 reps',
  tone: 'red'
}, {
  name: 'Abdominal Bicicleta',
  desc: 'Fortalecimento de oblíquos e reto abdominal em padrão dinâmico.',
  tag: 'Core',
  video: false,
  sets: '3x · 15 reps',
  tone: 'blue'
}, {
  name: 'Abdominal Crupeado',
  desc: 'O abdominal crunch (também conhecido como encolhimento abdominal ou abdominal supra) é um exercício fundamental focado...',
  tag: 'Core',
  video: true,
  sets: '3x · 20 reps',
  tone: 'orange'
}, {
  name: 'Abdominal Oblíquo',
  desc: 'O abdominal oblíquo é um exercício fundamental na fisioterapia clínica e reabilitação, focado no fortalecimento seletivo dos músculos...',
  tag: 'Core',
  video: true,
  sets: '3x · 12 reps',
  tone: 'green'
}];
const Thumb = ({
  tone
}) => {
  // placeholder anatomy-style block
  const grad = {
    pink: 'linear-gradient(160deg, #fde2e7, #f0c4d0)',
    orange: 'linear-gradient(160deg, #fee9d4, #f8c890)',
    red: 'linear-gradient(160deg, #fcd9d9, #f4a8a8)',
    blue: 'linear-gradient(160deg, #d9e8fc, #a8c5f4)',
    green: 'linear-gradient(160deg, #dcf4e3, #a8d4b6)'
  }[tone] || 'linear-gradient(160deg, #eef0f3, #cfd4dc)';
  return /*#__PURE__*/React.createElement("div", {
    className: "fz-ex-thumb",
    style: {
      background: grad
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    width: "60",
    height: "60",
    style: {
      opacity: 0.35
    }
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "30",
    rx: "14",
    ry: "16",
    fill: "#6b7280"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "30",
    y: "44",
    width: "40",
    height: "36",
    rx: "8",
    fill: "#6b7280"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "22",
    y: "50",
    width: "10",
    height: "22",
    rx: "4",
    fill: "#6b7280"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "68",
    y: "50",
    width: "10",
    height: "22",
    rx: "4",
    fill: "#6b7280"
  })));
};
const ExerciseLibrary = () => /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-lib"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-tabs"
}, /*#__PURE__*/React.createElement("button", {
  className: "is-active"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "book-open",
  size: 14
}), " Biblioteca ", /*#__PURE__*/React.createElement("span", {
  className: "count"
}, "351")), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(Icon, {
  name: "video",
  size: 14
}), " M\xEDdias"), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(Icon, {
  name: "file-text",
  size: 14
}), " Templates ", /*#__PURE__*/React.createElement("span", {
  className: "count"
}, "50")), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(Icon, {
  name: "clipboard-list",
  size: 14
}), " Protocolos ", /*#__PURE__*/React.createElement("span", {
  className: "count"
}, "55")), /*#__PURE__*/React.createElement("button", {
  className: "is-ai"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "sparkles",
  size: 14
}), " IA Assistente ", /*#__PURE__*/React.createElement(Badge, {
  variant: "default"
}, "NOVO")), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(Icon, {
  name: "activity",
  size: 14
}), " Analytics")), /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-filters"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-input-icon",
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "search",
  size: 14
}), /*#__PURE__*/React.createElement("input", {
  className: "fz-input fz-input-sm",
  placeholder: "Buscar exerc\xEDcios..."
})), /*#__PURE__*/React.createElement(Button, {
  variant: "default",
  size: "sm"
}, "Todos"), /*#__PURE__*/React.createElement(Button, {
  variant: "ghost",
  size: "sm"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "heart",
  size: 14
}), " Favoritos"), /*#__PURE__*/React.createElement(Button, {
  variant: "ghost",
  size: "sm"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "video-off",
  size: 14
}), " Sem V\xEDdeo"), /*#__PURE__*/React.createElement(Button, {
  variant: "ghost",
  size: "sm"
}, "Selecionar V\xE1rios"), /*#__PURE__*/React.createElement("span", {
  className: "fz-muted"
}, "351 resultados"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement(Button, {
  variant: "outline",
  size: "sm"
}, "Partes do Corpo \u25BE"), /*#__PURE__*/React.createElement(Button, {
  variant: "outline",
  size: "sm"
}, "Dificuldade \u25BE"), /*#__PURE__*/React.createElement(Button, {
  variant: "outline",
  size: "sm"
}, "Categoria \u25BE")), /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-grid"
}, EXERCISES.map(ex => /*#__PURE__*/React.createElement("div", {
  key: ex.name,
  className: "fz-ex-card"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-thumb-wrap"
}, /*#__PURE__*/React.createElement(Thumb, {
  tone: ex.tone
}), /*#__PURE__*/React.createElement("button", {
  className: "fz-ex-fav",
  "aria-label": "favorito"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "heart",
  size: 14
})), /*#__PURE__*/React.createElement("span", {
  className: `fz-ex-vbadge ${ex.video ? 'has' : 'no'}`
}, /*#__PURE__*/React.createElement(Icon, {
  name: ex.video ? 'video' : 'video-off',
  size: 11
}), " ", ex.video ? 'Vídeo' : 'Sem vídeo')), /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-body"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-title"
}, ex.name), /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-desc"
}, ex.desc), /*#__PURE__*/React.createElement(Badge, {
  variant: "secondary",
  className: "fz-ex-tag"
}, ex.tag), /*#__PURE__*/React.createElement("div", {
  className: "fz-ex-meta"
}, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
  name: "repeat",
  size: 12
}), " ", ex.sets.split(' · ')[0]), /*#__PURE__*/React.createElement("span", null, ex.sets.split(' · ')[1])), /*#__PURE__*/React.createElement(Button, {
  variant: "default",
  size: "sm",
  className: "fz-ex-cta"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "eye",
  size: 14
}), " Ver Detalhes"))))));
window.ExerciseLibrary = ExerciseLibrary;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/ExerciseLibrary.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Login.jsx
try { (() => {
// Login screen for FisioFlow Clínica
const {
  Button
} = window.FZ;
const Login = ({
  onLogin
}) => {
  const [email, setEmail] = React.useState('rafael@activityfisio.com.br');
  const [pwd, setPwd] = React.useState('••••••••••••');
  return /*#__PURE__*/React.createElement("div", {
    className: "fz-login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-login-card"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/activity-logo.svg",
    alt: "Activity Fisioterapia",
    className: "fz-login-logo"
  }), /*#__PURE__*/React.createElement("h1", null, "FisioFlow"), /*#__PURE__*/React.createElement("div", {
    className: "fz-login-sub"
  }, "MOOCA FISIO \xB7 Acesso cl\xEDnico"), /*#__PURE__*/React.createElement("label", null, "E-mail"), /*#__PURE__*/React.createElement("input", {
    className: "fz-input",
    value: email,
    onChange: e => setEmail(e.target.value),
    type: "email"
  }), /*#__PURE__*/React.createElement("label", null, "Senha"), /*#__PURE__*/React.createElement("input", {
    className: "fz-input",
    value: pwd,
    onChange: e => setPwd(e.target.value),
    type: "password"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "default",
    className: "fz-login-cta",
    onClick: onLogin
  }, "Entrar"), /*#__PURE__*/React.createElement("a", {
    className: "fz-login-link",
    href: "#"
  }, "Esqueci minha senha")), /*#__PURE__*/React.createElement("div", {
    className: "fz-login-foot"
  }, "v3.2.1 \xB7 LGPD \xB7 Edge Cloudflare"));
};
window.Login = Login;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/PageHeader.jsx
try { (() => {
// PageHeader — top bar for FisioFlow pages
const {
  Icon,
  Button,
  Avatar
} = window.FZ;
const PageHeader = ({
  title,
  meta,
  actions,
  alert
}) => /*#__PURE__*/React.createElement("header", {
  className: "fz-pageheader"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-top"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-live"
}, /*#__PURE__*/React.createElement("span", {
  className: "dot"
}), " REAL-TIME ACTIVE"), /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-right"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-search"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "search",
  size: 14
}), " Buscar ", /*#__PURE__*/React.createElement("kbd", null, "\u2318K")), /*#__PURE__*/React.createElement("button", {
  className: "fz-iconbtn",
  "aria-label": "notifica\xE7\xF5es"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "bell",
  size: 16
})), /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-online"
}, /*#__PURE__*/React.createElement("span", {
  className: "dot online"
}), " 0 online"), /*#__PURE__*/React.createElement("button", {
  className: "fz-iconbtn",
  "aria-label": "modo escuro"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "moon",
  size: 16
})), /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-user"
}, /*#__PURE__*/React.createElement(Avatar, {
  initials: "RM",
  size: 32,
  tone: "blue"
}), /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-user-name"
}, /*#__PURE__*/React.createElement("div", null, "RAFAEL MINATTO"), /*#__PURE__*/React.createElement("div", {
  className: "eyebrow"
}, "ADMIN")), /*#__PURE__*/React.createElement(Icon, {
  name: "chevron-down",
  size: 14
})))), /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-main"
}, /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-title"
}, /*#__PURE__*/React.createElement("h1", null, title), meta && /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-meta"
}, meta), alert && /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-alert"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "alert-triangle",
  size: 14
}), " ", alert)), /*#__PURE__*/React.createElement("div", {
  className: "fz-pageheader-actions"
}, actions)));
window.PageHeader = PageHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/PageHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/PatientList.jsx
try { (() => {
// PatientList — table view of patients
const {
  Icon,
  Button,
  Badge,
  Avatar
} = window.FZ;
const PATIENTS = [{
  name: 'Carla Ferreira',
  cpf: '342.118.***-09',
  last: '08/05/2026',
  protocol: 'Reabilitação ombro',
  sessions: '8/12',
  status: 'ativo',
  tone: 'teal'
}, {
  name: 'Diego Costa',
  cpf: '019.554.***-12',
  last: '12/05/2026',
  protocol: 'Pós-cirúrgico LCA',
  sessions: '15/20',
  status: 'ativo',
  tone: 'blue'
}, {
  name: 'Elisa Rodrigues',
  cpf: '887.221.***-44',
  last: '11/05/2026',
  protocol: 'Lombalgia crônica',
  sessions: '3/10',
  status: 'ativo',
  tone: 'amber'
}, {
  name: 'Felipe Oliveira',
  cpf: '120.987.***-66',
  last: '10/05/2026',
  protocol: 'Tendinite supraespinhal',
  'sessions': '6/8',
  'status': 'ativo',
  'tone': 'gray'
}, {
  name: 'Gabriela Alves',
  cpf: '443.116.***-21',
  last: '05/05/2026',
  protocol: 'Avaliação inicial',
  sessions: '1/12',
  status: 'novo',
  tone: 'teal'
}, {
  name: 'Hugo Martins',
  cpf: '776.334.***-08',
  last: '02/05/2026',
  protocol: 'Joelho — meniscopatia',
  'sessions': '4/15',
  'status': 'em pausa',
  'tone': 'amber'
}, {
  name: 'Isabela Nunes',
  cpf: '901.443.***-77',
  last: '12/05/2026',
  protocol: 'Pilates clínico',
  sessions: '22/24',
  status: 'ativo',
  tone: 'blue'
}, {
  name: 'João Silva',
  cpf: '554.221.***-19',
  last: '24/04/2026',
  protocol: 'Cervicalgia',
  sessions: '6/8',
  status: 'pendente',
  tone: 'gray'
}];
const statusBadge = {
  ativo: /*#__PURE__*/React.createElement(Badge, {
    variant: "success"
  }, "ATIVO"),
  novo: /*#__PURE__*/React.createElement(Badge, {
    variant: "default"
  }, "NOVO"),
  'em pausa': /*#__PURE__*/React.createElement(Badge, {
    variant: "warning"
  }, "EM PAUSA"),
  pendente: /*#__PURE__*/React.createElement(Badge, {
    variant: "outline"
  }, "PENDENTE")
};
const PatientList = () => {
  const [q, setQ] = React.useState('');
  const filtered = PATIENTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "fz-patients"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-patients-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-input-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    className: "fz-input fz-input-sm",
    placeholder: "Buscar paciente...",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 14
  }), " Filtros"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, "Exportar"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "default",
    size: "sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Novo Paciente")), /*#__PURE__*/React.createElement("table", {
    className: "fz-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", null, "Nome"), /*#__PURE__*/React.createElement("th", null, "CPF"), /*#__PURE__*/React.createElement("th", null, "\xDAltima sess\xE3o"), /*#__PURE__*/React.createElement("th", null, "Protocolo"), /*#__PURE__*/React.createElement("th", null, "Sess\xF5es"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.cpf
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Avatar, {
    initials: p.name.split(' ').map(n => n[0]).slice(0, 2).join(''),
    size: 32,
    tone: p.tone
  })), /*#__PURE__*/React.createElement("td", {
    className: "fz-table-strong"
  }, p.name), /*#__PURE__*/React.createElement("td", {
    className: "fz-table-mono"
  }, p.cpf), /*#__PURE__*/React.createElement("td", {
    className: "tabular-nums"
  }, p.last), /*#__PURE__*/React.createElement("td", null, p.protocol), /*#__PURE__*/React.createElement("td", {
    className: "tabular-nums"
  }, p.sessions), /*#__PURE__*/React.createElement("td", null, statusBadge[p.status]), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("button", {
    className: "fz-iconbtn",
    "aria-label": "a\xE7\xF5es"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "more-horizontal",
    size: 14
  }))))))));
};
window.PatientList = PatientList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/PatientList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Sidebar.jsx
try { (() => {
// Sidebar — FisioFlow web
const {
  Icon
} = window.FZ;
const NAV = [{
  group: 'ATENDIMENTO',
  items: [{
    id: 'agenda',
    label: 'AGENDA',
    icon: 'calendar-days'
  }, {
    id: 'pacientes',
    label: 'PACIENTES',
    icon: 'users'
  }, {
    id: 'whatsapp',
    label: 'WHATSAPP',
    icon: 'message-circle',
    badge: 3
  }]
}, {
  group: 'CLÍNICA',
  items: [{
    id: 'exercicios',
    label: 'EXERCÍCIOS',
    icon: 'dumbbell'
  }, {
    id: 'protocolos',
    label: 'PROTOCOLOS',
    icon: 'clipboard-list'
  }, {
    id: 'testes',
    label: 'TESTES CLÍNICOS',
    icon: 'flask-conical'
  }, {
    id: 'avaliacoes',
    label: 'AVALIAÇÕES',
    icon: 'clipboard-check'
  }, {
    id: 'biomecanica',
    label: 'BIOMECÂNICA',
    icon: 'camera'
  }]
}, {
  group: 'INTELIGÊNCIA & IA',
  items: [{
    id: 'ia-studio',
    label: 'IA STUDIO CENTRAL',
    icon: 'sparkles',
    badge: 'PRO'
  }, {
    id: 'hub',
    label: 'HUB DE INTELIGÊNCIA',
    icon: 'brain'
  }]
}, {
  group: 'GESTÃO & OPERAÇÃO',
  items: [{
    id: 'eventos',
    label: 'EVENTOS',
    icon: 'calendar-clock'
  }, {
    id: 'boards',
    label: 'BOARDS',
    icon: 'layout-dashboard'
  }, {
    id: 'cadastros',
    label: 'CADASTROS',
    icon: 'database'
  }, {
    id: 'wiki',
    label: 'WIKI CLÍNICA',
    icon: 'book-open'
  }]
}];
const Sidebar = ({
  active,
  onNavigate
}) => {
  return /*#__PURE__*/React.createElement("aside", {
    className: "fz-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-logo"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "activity",
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-brand-name"
  }, "FisioFlow"), /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-brand-sub"
  }, "MOOCA FISIO"))), /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-search"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar paciente..."
  }), /*#__PURE__*/React.createElement("kbd", null, "\u2318K")), /*#__PURE__*/React.createElement("nav", {
    className: "fz-sidebar-nav"
  }, NAV.map(group => /*#__PURE__*/React.createElement("div", {
    key: group.group,
    className: "fz-sidebar-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-group-label"
  }, group.group), group.items.map(item => {
    const isActive = item.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      className: `fz-sidebar-item ${isActive ? 'is-active' : ''}`,
      onClick: () => onNavigate?.(item.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: item.icon,
      size: 16
    }), /*#__PURE__*/React.createElement("span", null, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
      className: `fz-sidebar-badge ${typeof item.badge === 'number' ? 'is-count' : ''}`
    }, item.badge));
  })))), /*#__PURE__*/React.createElement("div", {
    className: "fz-sidebar-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "fz-sidebar-item"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "SAIR"))));
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r : fetch('../../' + STATE_FILE)).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/web/ui.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// FisioFlow Web UI Kit — primitives
const {
  useState
} = React;
const Icon = ({
  name,
  size = 16,
  className = '',
  style = {},
  ...rest
}) => /*#__PURE__*/React.createElement("i", _extends({
  "data-lucide": name,
  className: `fz-icon ${className}`,
  style: {
    width: size,
    height: size,
    display: 'inline-flex',
    ...style
  }
}, rest));
const Button = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...rest
}) => {
  const base = 'fz-btn';
  const variants = {
    default: 'fz-btn-primary',
    medical: 'fz-btn-medical',
    success: 'fz-btn-success',
    destructive: 'fz-btn-destructive',
    secondary: 'fz-btn-secondary',
    outline: 'fz-btn-outline',
    ghost: 'fz-btn-ghost',
    link: 'fz-btn-link'
  };
  const sizes = {
    sm: 'fz-btn-sm',
    default: '',
    lg: 'fz-btn-lg',
    icon: 'fz-btn-icon'
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    className: `${base} ${variants[variant] || ''} ${sizes[size] || ''} ${className}`
  }, rest), children);
};
const Badge = ({
  variant = 'default',
  children,
  className = '',
  ...rest
}) => {
  const map = {
    default: 'fz-badge-default',
    secondary: 'fz-badge-secondary',
    destructive: 'fz-badge-destructive',
    outline: 'fz-badge-outline',
    success: 'fz-badge-success',
    warning: 'fz-badge-warning'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `fz-badge ${map[variant] || ''} ${className}`
  }, rest), children);
};
const Input = props => /*#__PURE__*/React.createElement("input", _extends({
  className: "fz-input"
}, props));
const Card = ({
  children,
  className = '',
  ...rest
}) => /*#__PURE__*/React.createElement("div", _extends({
  className: `fz-card ${className}`
}, rest), children);
const Avatar = ({
  initials,
  size = 36,
  tone = 'blue'
}) => {
  const tones = {
    blue: {
      bg: 'hsl(211 100% 92%)',
      fg: 'hsl(211 100% 30%)'
    },
    teal: {
      bg: 'hsl(158 64% 92%)',
      fg: 'hsl(158 64% 25%)'
    },
    gray: {
      bg: 'hsl(220 14% 90%)',
      fg: 'hsl(220 39% 11%)'
    },
    amber: {
      bg: 'hsl(45 93% 90%)',
      fg: 'hsl(35 70% 25%)'
    }
  };
  const t = tones[tone] || tones.blue;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: t.bg,
      color: t.fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: size * 0.34,
      flexShrink: 0
    }
  }, initials);
};
window.FZ = {
  Icon,
  Button,
  Badge,
  Input,
  Card,
  Avatar
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/ui.jsx", error: String((e && e.message) || e) }); }

})();
