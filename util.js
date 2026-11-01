/* ============================================================
   PRISMA 2 — utilidades
   Datas, HTML seguro, toasts e "sheets" (janelas que sobem
   de baixo no celular e abrem no centro no computador).
============================================================ */
window.P = window.P || {};
P.actions = P.actions || {};
P.views = P.views || {};

P.$ = (s, r = document) => r.querySelector(s);
P.$$ = (s, r = document) => [...r.querySelectorAll(s)];
P.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
P.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
P.clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ---------- Datas (sempre no fuso do aparelho) ----------
   O Prisma antigo usava toISOString(), que é UTC: depois das 21h
   no Brasil ele já achava que era "amanhã". Aqui tudo é local. */
P.MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
P.MON = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
P.DOW = ['dom','seg','ter','qua','qui','sex','sáb'];
P.DOW_LONG = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

P.iso = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
P.today = () => P.iso(new Date());
P.parse = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
P.addDays = (iso, n) => { const d = P.parse(iso); d.setDate(d.getDate() + n); return P.iso(d); };
P.daysUntil = iso => Math.round((P.parse(iso) - P.parse(P.today())) / 86400000);
P.fmtDate = iso => { const d = P.parse(iso); return `${d.getDate()} ${P.MON[d.getMonth()]}`; };
P.relDay = iso => {
  if (!iso) return 'sem data';
  const n = P.daysUntil(iso);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n < 0) return `atrasado ${-n}d`;
  if (n < 7) return P.DOW_LONG[P.parse(iso).getDay()];
  return P.fmtDate(iso);
};
P.weekStart = iso => { const d = P.parse(iso); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return P.iso(d); };
P.minutes = hhmm => { if (!hhmm) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };
P.nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/* Entende "entregar slide amanhã", "ler cap 3 sex", "prova 12/11" */
P.parseQuick = text => {
  let t = text.trim(), due = null;
  const words = t.split(/\s+/);
  const last = (words[words.length - 1] || '').toLowerCase().replace(/[.,]$/, '');
  const dows = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, 'sáb': 6 };
  if (last === 'hoje') due = P.today();
  else if (last === 'amanhã' || last === 'amanha') due = P.addDays(P.today(), 1);
  else if (last.slice(0, 3) in dows || last in dows) {
    const target = dows[last] ?? dows[last.slice(0, 3)];
    const cur = new Date().getDay();
    let diff = (target - cur + 7) % 7; if (diff === 0) diff = 7;
    due = P.addDays(P.today(), diff);
  } else {
    const m = last.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (m) {
      const now = new Date();
      let y = now.getFullYear();
      const cand = new Date(y, +m[2] - 1, +m[1]);
      if (cand < new Date(now.getFullYear(), now.getMonth(), now.getDate())) y++;
      due = P.iso(new Date(y, +m[2] - 1, +m[1]));
    }
  }
  if (due && words.length > 1) t = words.slice(0, -1).join(' ');
  return { title: t, due };
};

/* ---------- Cores ---------- */
P.COLORS = ['#a78bfa', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8'];
P.color = i => P.COLORS[((i ?? 0) % P.COLORS.length + P.COLORS.length) % P.COLORS.length];

P.AREAS = {
  faculdade: { label: 'Faculdade', one: 'matéria', icon: '◆', unitMain: 'aulas' },
  projetos: { label: 'Projetos', one: 'projeto', icon: '▲', unitMain: 'etapas' },
  leituras: { label: 'Leituras', one: 'leitura', icon: '●', unitMain: 'páginas' }
};
P.STATUS = {
  faculdade: [['cursando', 'Cursando'], ['concluida', 'Concluída'], ['arquivada', 'Arquivada']],
  projetos: [['ativo', 'Ativo'], ['pausado', 'Pausado'], ['concluido', 'Concluído']],
  leituras: [['quero', 'Quero ler'], ['lendo', 'Lendo'], ['pausado', 'Pausado'], ['concluido', 'Concluída']]
};
P.ACTIVE = ['cursando', 'ativo', 'lendo'];
P.statusLabel = (area, s) => (P.STATUS[area] || []).find(x => x[0] === s)?.[1] || s;

P.KINDS = {
  tarefa: { label: 'Tarefa', icon: '○' },
  trabalho: { label: 'Trabalho', icon: '▤' },
  prova: { label: 'Prova', icon: '✎' },
  entrega: { label: 'Entrega', icon: '⬒' },
  reuniao: { label: 'Reunião', icon: '◷' }
};
P.EVENT_CATS = {
  prova: { label: 'Avaliação', color: 'var(--bad)' },
  prazo: { label: 'Prazo', color: 'var(--warn)' },
  evento: { label: 'Evento', color: 'var(--a-proj)' },
  feriado: { label: 'Feriado', color: 'var(--ok)' }
};

/* ---------- Toast ---------- */
P.toast = (msg, opts = {}) => {
  const host = P.$('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${P.esc(msg)}</span>${opts.undo ? '<button type="button">Desfazer</button>' : ''}`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  let timer;
  const close = () => { clearTimeout(timer); el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  if (opts.undo) el.querySelector('button').onclick = () => { opts.undo(); close(); };
  timer = setTimeout(close, opts.undo ? 5000 : 2800);
};

/* ---------- Sheet (janela) ---------- */
P.openSheets = [];
P.sheet = ({ title, kicker = '', render, mount, wide = false, onClose, live = false }) => {
  const host = P.$('#sheets');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `
    <div class="sheet-backdrop"></div>
    <section class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${P.esc(title)}">
      <header class="sheet-head">
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-titles">
          ${kicker ? `<div class="eyebrow">${kicker}</div>` : ''}
          <h2>${P.esc(title)}</h2>
        </div>
        <button class="icon-btn" type="button" data-close aria-label="Fechar">✕</button>
      </header>
      <div class="sheet-body"></div>
    </section>`;
  host.appendChild(wrap);
  const body = wrap.querySelector('.sheet-body');
  const api = {
    el: wrap, body, refreshOnChange: live,
    setTitle(t) { wrap.querySelector('h2').textContent = t; },
    refresh() { if (render) { const st = body.scrollTop; body.innerHTML = render(api); mount && mount(api); body.scrollTop = st; } },
    close() {
      wrap.classList.remove('show');
      P.openSheets = P.openSheets.filter(s => s !== api);
      setTimeout(() => wrap.remove(), 220);
      onClose && onClose();
      document.body.classList.toggle('has-sheet', P.openSheets.length > 0);
    }
  };
  if (render) body.innerHTML = render(api);
  mount && mount(api);
  wrap.querySelector('.sheet-backdrop').onclick = api.close;
  wrap.querySelector('[data-close]').onclick = api.close;
  P.openSheets.push(api);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => wrap.classList.add('show'));
  setTimeout(() => { const f = body.querySelector('[autofocus]'); if (f && window.matchMedia('(min-width: 760px)').matches) f.focus(); }, 60);
  return api;
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && P.openSheets.length) P.openSheets[P.openSheets.length - 1].close();
});

/* Confirmação dentro da página (sem o confirm() do navegador) */
P.ask = (message, okLabel = 'Confirmar', danger = true) => new Promise(resolve => {
  let answered = false;
  const s = P.sheet({
    title: 'Tem certeza?',
    render: () => `<p class="ask-msg">${P.esc(message)}</p>
      <div class="form-actions"><button class="btn ghost" type="button" data-no>Cancelar</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" type="button" data-yes>${P.esc(okLabel)}</button></div>`,
    mount: api => {
      api.body.querySelector('[data-no]').onclick = () => api.close();
      api.body.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); api.close(); };
    },
    onClose: () => { if (!answered) resolve(false); }
  });
  return s;
});

P.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
P.ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
