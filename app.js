/* ============================================================
   PRISMA 2 — app: navegação, cliques e inicialização
============================================================ */
(function () {
  const S = P.store;
  const ROUTES = { hoje: 'Hoje', agenda: 'Agenda', areas: 'Áreas', notas: 'Notas', ajustes: 'Ajustes', fin: 'Financeiro+', 'fin-orcamento': 'Orçamento', 'fin-lanc': 'Lançamentos', 'fin-mais': 'Mais', 'fin-relatorio': 'Relatório', 'fin-assistente': 'Assistente', boasvindas: 'Bem-vindo', entrar: 'Entrar' };
  const PRISMA_ROUTES = ['hoje', 'agenda', 'areas', 'notas'];
  let route = 'hoje', spaceNow = 'prisma';
  // Ajustes fica no espaço em que a pessoa estava (assim quem usa só o Financeiro+ também chega nele)
  P.space = () => (route.startsWith('fin') ? 'fin' : route === 'ajustes' ? spaceNow : 'prisma');
  P.home = () => (P.hasPrisma() ? 'hoje' : P.hasFin() ? 'fin' : 'ajustes');
  P.applyFocus = () => {
    document.body.classList.toggle('no-fin', !P.hasFin());
    document.body.classList.toggle('no-prisma', !P.hasPrisma());
    document.body.classList.toggle('one-space', !(P.hasFin() && P.hasPrisma()));
  };
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
    if (!ROUTES[to]) to = P.home();
    // primeira vez no app: fluxo de boas-vindas
    if (!S.settings().onboarded && to !== 'boasvindas') to = 'boasvindas';
    if (S.settings().onboarded && to === 'boasvindas') to = P.home();
    // app com conta: sem login (sessão expirou ou saiu), mostra a tela de entrar
    if (S.settings().onboarded && P.sync?.needsLogin()) to = 'entrar';
    else if (to === 'entrar') to = P.home();
    // o app mostra só o que a pessoa escolheu usar
    if (to.startsWith('fin') && !P.hasFin()) to = P.home();
    if (PRISMA_ROUTES.includes(to) && !P.hasPrisma()) to = P.home();
    if (location.hash !== '#' + to) { location.hash = to; return; }
    if (to.startsWith('fin')) spaceNow = 'fin'; else if (to !== 'ajustes') spaceNow = 'prisma';
    route = to;
    document.body.dataset.space = P.space();
    document.body.classList.toggle('onboarding', to === 'boasvindas' || to === 'entrar');
    P.applyFocus();
    // lembra a última tela de cada espaço (Ajustes não conta: ele não é de nenhum dos dois)
    if (to.startsWith('fin')) P.ui.lastFin = to; else if (PRISMA_ROUTES.includes(to)) P.ui.lastPrisma = to;
    P.saveUI();
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
    P.applyFocus();
    // entrou numa conta que já existe durante as boas-vindas: usa o que já está na conta dela
    if (route === 'boasvindas' && S.settings().onboarded) { P.go(P.home()); return; }
    if (route === 'boasvindas' || route === 'entrar') return;   // não redesenha no meio do formulário
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
    switchSpace: () => {
      if (!(P.hasFin() && P.hasPrisma())) return P.go(P.home());
      const lastFin = String(P.ui.lastFin || '').startsWith('fin') ? P.ui.lastFin : 'fin';
      const lastPrisma = PRISMA_ROUTES.includes(P.ui.lastPrisma) ? P.ui.lastPrisma : 'hoje';
      P.go(P.space() === 'fin' ? lastPrisma : lastFin);
    },
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
    // quem já usava o Prisma antes do fluxo de boas-vindas não passa por ele de novo (e continua com tudo)
    const st0 = S.settings();
    if (!st0.onboarded && (st0.name || ['items', 'tasks', 'notes', 'fin_lanc', 'fin_conta'].some(c => S.all(c).some(r => r.updatedAt)) || P.ls.get('prisma2:owner'))) S.setSettings({ onboarded: true, focus: st0.focus || Object.keys(P.FOCUS) });
    if (!P.ui.agendaSel || P.ui.agendaSel < P.addDays(P.today(), -60)) { P.ui.agendaSel = null; P.ui.agendaMonth = null; }
    P.applyTheme();
    const inv = location.hash.match(/^#convite=(.+)$/);
    if (inv) { const ok = P.sync?.acceptInvite(decodeURIComponent(inv[1])); history.replaceState(null, '', location.pathname + '#ajustes'); if (ok) setTimeout(() => P.toast('Bem-vindo ao Prisma! Crie sua conta em Sincronização (e-mail e senha de 8+ letras).'), 600); }
    P.go(location.hash.slice(1) || P.home());
    P.renderSyncBadge();
    P.push?.registration().then(() => P.push.check());
    // depois que a sincronização conecta, confirma o cadastro deste aparelho no robô
    P.sync?.init().then(() => { P.renderSyncBadge(); if (P.sync.needsLogin() || route === 'entrar') P.go(route === 'entrar' ? P.home() : route); if (S.settings().notify.enabled) P.push?.resubscribe(); });
  };
})();
