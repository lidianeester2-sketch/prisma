/* ============================================================
   PRISMA 2 — app: navegação, cliques e inicialização
============================================================ */
(function () {
  const S = P.store;
  const ROUTES = { hoje: 'Hoje', agenda: 'Agenda', areas: 'Áreas', notas: 'Notas', ajustes: 'Ajustes', fin: 'Financeiro+', 'fin-orcamento': 'Orçamento', 'fin-lanc': 'Lançamentos', 'fin-mais': 'Mais', 'fin-relatorio': 'Relatório', 'fin-assistente': 'Assistente' };
  P.space = () => (route.startsWith('fin') ? 'fin' : 'prisma');
  let route = 'hoje';
  let pendingRender = false;

  /* ---------- tema ---------- */
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  P.applyTheme = () => {
    // temas antigos viram os novos (claro → Lavanda, grafite → Escuro, âmbar → Sol)
    const OLD = { claro: 'prisma', grafite: 'escuro', ambar: 'sol' };
    const t = OLD[S.settings().theme] || S.settings().theme || 'prisma';
    const resolved = t === 'auto' ? (mq.matches ? 'prisma' : 'escuro') : t;
    document.documentElement.setAttribute('data-theme', resolved);
    try { localStorage.setItem('prisma2:theme', resolved); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#eef0fa';
  };
  mq.addEventListener?.('change', () => S.settings().theme === 'auto' && P.applyTheme());

  /* ---------- render ---------- */
  P.render = () => {
    const view = P.$('#view');
    const act = document.activeElement;
    const keepId = act && view.contains(act) && act.id ? act.id : null;
    const caret = keepId && 'selectionStart' in act ? act.selectionStart : null;
    const y = window.scrollY;
    try {
      if (typeof P.views[route] !== 'function') throw new Error(`A tela "${route}" não carregou. Provavelmente falta o arquivo ${route === 'ajustes' ? 'settings.js' : route.startsWith('fin') ? 'fin-views.js' : 'views.js'} no GitHub.`);
      view.innerHTML = P.views[route]();
      P.mounts?.[route]?.(view);
    } catch (err) {
      console.error(err);
      view.innerHTML = `<header class="page-head"><h1>Ops.</h1><p class="lede">Esta tela não abriu. Copie a mensagem abaixo e mande para quem está te ajudando.</p></header>
        <pre class="err-box">${P.esc(err.message)}\n${P.esc((err.stack || '').split('\n').slice(1, 4).join('\n'))}</pre>
        <div class="form-actions split"><button class="btn primary" type="button" data-act="repair">Reparar e recarregar</button><span class="grow"></span></div>`;
    }
    if (keepId) { const el = document.getElementById(keepId); if (el) { el.focus({ preventScroll: true }); if (caret !== null) try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    window.scrollTo(0, y);
    pendingRender = false;
  };

  P.go = to => {
    if (!ROUTES[to]) to = 'hoje';
    if (location.hash !== '#' + to) { location.hash = to; return; }
    route = to;
    document.body.dataset.space = P.space();
    P.ui[P.space() === 'fin' ? 'lastFin' : 'lastPrisma'] = to; P.saveUI();
    [...P.openSheets].forEach(sh => sh.close());
    P.$$('[data-nav]').forEach(b => { const on = b.dataset.nav === to; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    P.$('#mobile-title').textContent = ROUTES[to];
    document.title = to === 'hoje' ? 'Prisma' : to === 'fin' ? 'Financeiro+' : `${ROUTES[to]} · ${P.space() === 'fin' ? 'Financeiro+' : 'Prisma'}`;
    const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#eef0fa';
    P.render();
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', () => P.go(location.hash.slice(1)));

  P.renderSyncBadge = () => {
    const st = P.sync?.state() || {};
    const cls = !st.configured || !st.user ? 'local' : st.status;
    const txt = !st.configured || !st.user ? 'Só neste aparelho' : P.sync.label();
    P.$$('.sync-badge').forEach(el => { el.dataset.state = cls; el.querySelector('span').textContent = txt; el.title = txt; });
  };

  /* ---------- quando os dados mudam ---------- */
  S.on(() => {
    const act = document.activeElement;
    const typing = act && P.$('#view').contains(act) && /^(INPUT|TEXTAREA|SELECT)$/.test(act.tagName) && !act.dataset.input && act.type !== 'checkbox';
    if (typing) { pendingRender = true; return; }
    P.render();
    P.openSheets.forEach(s => s.refreshOnChange && s.refresh());
    P.renderSyncBadge();
  });
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !P.$('#view').contains(document.activeElement)) P.render(); }, 50));

  /* ---------- cliques (data-act) ---------- */
  Object.assign(P.actions, {
    go: el => P.go(el.dataset.to),
    scrollTo: el => { const t = document.getElementById(el.dataset.id); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - (innerWidth <= 700 ? 70 : 20), behavior: 'smooth' }); },
    repair: async () => {
      // apaga a cópia guardada do app (não apaga seus dados) e recarrega
      try { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; await Promise.all(regs.map(r => r.unregister())); } catch (e) {}
      try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch (e) {}
      location.reload();
    },
    capture: el => {
      if (P.space() === 'fin') { if (!P.fin.locked()) P.fin.lancar(); else P.render(); return; }
      P.capture(el.dataset.type || 'tarefa', { due: el.dataset.due, area: el.dataset.area });
    },
    switchSpace: () => P.go(P.space() === 'fin' ? (P.ui.lastPrisma || 'hoje') : (P.ui.lastFin || 'fin')),
    openTask: el => P.openTask(el.dataset.id),
    openItem: el => P.openItem(el.dataset.id),
    openNote: el => P.openNote(el.dataset.id),
    manageHabits: () => P.manageHabits(),
    inc: el => P.bump(el.dataset.id, el.dataset.key, 1),
    toggleTask: el => {
      const t = S.get('tasks', el.dataset.id); if (!t) return;
      const done = !t.done;
      S.patch('tasks', t.id, { done, doneAt: done ? Date.now() : null });
      if (done) P.toast(['Feito. ✦', 'Menos uma.', 'Riscado. O caos diminuiu.', 'Concluída. Pode se gabar.'][Math.floor(Math.random() * 4)], { undo: () => S.patch('tasks', t.id, { done: false, doneAt: null }) });
    },
    toggleStep: el => {
      const t = S.get('tasks', el.dataset.id); if (!t) return;
      const steps = t.steps.map(s => s.id === el.dataset.step ? { ...s, done: !s.done } : s);
      const all = steps.every(s => s.done);
      S.patch('tasks', t.id, { steps, ...(all ? { done: true, doneAt: Date.now() } : {}) });
      P.toast(all ? `Todas as etapas feitas: “${t.title}” concluído.` : 'Etapa concluída.', { undo: () => S.patch('tasks', t.id, { steps: t.steps, done: t.done, doneAt: t.doneAt }) });
    },
    toggleHabit: el => {
      const today = P.today();
      S.patch('habits', el.dataset.id, h => { h.checks = { ...(h.checks || {}) }; if (h.checks[today]) delete h.checks[today]; else h.checks[today] = true; return h; });
    },
    toggleFav: el => { const n = S.get('notes', el.dataset.id); if (n) S.patch('notes', n.id, { fav: !n.fav }); },
    agendaSel: el => { P.ui.agendaSel = el.dataset.d; P.ui.agendaMonth = el.dataset.d.slice(0, 7); P.saveUI(); P.render(); },
    agendaMonth: el => {
      const cur = P.ui.agendaMonth || (P.ui.agendaSel || P.today()).slice(0, 7);
      const [y, m] = cur.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.delta), 1);
      P.ui.agendaMonth = P.iso(d).slice(0, 7); P.saveUI(); P.render();
    },
    agendaFilter: el => { P.ui.agendaFilter = el.dataset.f; P.saveUI(); P.render(); },
    hojeArea: el => { P.ui.hojeArea = el.dataset.f; P.saveUI(); P.render(); },
    setArea: el => { P.ui.area = el.dataset.a; P.saveUI(); P.render(); },
    areaFilter: el => { P.ui.areaFilter = el.dataset.f; P.saveUI(); P.render(); },
    notesArea: el => { P.ui.notesArea = el.dataset.f; P.saveUI(); P.render(); },
    notesTag: el => { P.ui.notesTag = P.ui.notesTag === el.dataset.t ? '' : el.dataset.t; P.saveUI(); P.render(); },
    notesFav: () => { P.ui.notesFav = !P.ui.notesFav; P.saveUI(); P.render(); },
    notesSort: () => { P.ui.notesAsc = !P.ui.notesAsc; P.saveUI(); P.render(); },
    playlist: () => {
      const id = S.settings().playlist; if (!id) return;
      P.sheet({ title: 'Trilha de estudo', wide: true, render: () => `<div class="embed"><iframe src="https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(id)}" title="Playlist do YouTube" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>` });
    }
  });

  // blocos recolhíveis lembram se você deixou abertos
  document.addEventListener('toggle', e => { const k = e.target?.dataset?.remember; if (k) P.ls.set(k, e.target.open); }, true);

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = P.actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    if (el.type === 'checkbox') { fn(el, e); return; }
    fn(el, e);
  });

  document.addEventListener('input', e => {
    const el = e.target.closest('[data-input]'); if (!el) return;
    P.ui[el.dataset.input] = el.value; P.render();
  });

  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form="quickTask"]'); if (!f) return;
    e.preventDefault();
    const raw = f.t.value.trim(); if (!raw) return;
    const { title, due } = P.parseQuick(raw);
    S.put('tasks', { title, due: due || P.today(), kind: 'tarefa', done: false, steps: [], itemId: null, area: f.t.dataset.area || null });
    P.toast(`Adicionada para ${P.relDay(due || P.today())}.`);
    f.t.value = '';
    pendingRender = false; P.render();
    setTimeout(() => P.$('#qa-today')?.focus(), 0);
  });

  document.addEventListener('keydown', e => {
    if (P.openSheets.length || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); P.actions.capture({ dataset: {} }); }
    const map = P.space() === 'fin' ? { '1': 'fin', '2': 'fin-orcamento', '3': 'fin-lanc', '4': 'fin-mais' } : { '1': 'hoje', '2': 'agenda', '3': 'areas', '4': 'notas' };
    if (map[e.key]) P.go(map[e.key]);
  });

  /* atualiza "em 20min", "agora" e a virada do dia */
  let lastDay = P.today();
  setInterval(() => {
    if (P.openSheets.length) return;
    const act = document.activeElement;
    if (act && /^(INPUT|TEXTAREA|SELECT)$/.test(act.tagName)) return;
    if (route === 'hoje' || route === 'agenda' || route === 'fin' || P.today() !== lastDay) { lastDay = P.today(); P.render(); }
  }, 60000);

  /* ---------- início ---------- */
  P.start = () => {
    S.load();
    if (!P.ui.agendaSel || P.ui.agendaSel < P.addDays(P.today(), -60)) { P.ui.agendaSel = null; P.ui.agendaMonth = null; }
    P.applyTheme();
    P.go(location.hash.slice(1) || 'hoje');
    P.renderSyncBadge();
    P.push?.registration().then(() => P.push.check());
    // depois que a sincronização conecta, confirma o cadastro deste aparelho no robô
    P.sync?.init().then(() => { P.renderSyncBadge(); if (S.settings().notify.enabled) P.push?.resubscribe(); });
  };
})();
