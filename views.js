/* ============================================================
   PRISMA 2 — telas principais
   Cada tela é uma função que devolve HTML. Os cliques são
   tratados em um lugar só (app.js → P.actions) via data-act.
============================================================ */
(function () {
  const S = P.store;
  const esc = P.esc;
  P.views = P.views || {};
  P.ui = P.ls.get('prisma2:ui', null) || {
    area: 'faculdade', areaFilter: 'ativos',
    agendaMonth: null, agendaSel: null, agendaFilter: 'all',
    notesArea: 'all', notesTag: '', notesFav: false, notesAsc: false, notesQ: ''
  };
  P.saveUI = () => P.ls.set('prisma2:ui', { ...P.ui, notesQ: '' });

  /* ---------- peças reutilizáveis ---------- */
  const itemColor = id => { const it = id && S.get('items', id); return it ? P.color(it.color) : 'var(--faint)'; };

  P.taskRow = (t, opts = {}) => {
    const today = P.today();
    const late = !t.done && t.due && t.due < today;
    const kind = P.KINDS[t.kind] || P.KINDS.tarefa;
    const item = t.itemId && S.get('items', t.itemId);
    const steps = t.steps?.length ? `${t.steps.filter(s => s.done).length}/${t.steps.length} etapas` : '';
    const meta = [item ? esc(item.title) : (t.area ? P.AREAS[t.area]?.label : ''), t.kind !== 'tarefa' ? kind.label : '', steps].filter(Boolean).join(' · ');
    return `<div class="row task ${t.done ? 'done' : ''} ${late ? 'late' : ''}" style="--c:${itemColor(t.itemId)}">
      <button class="check" type="button" data-act="toggleTask" data-id="${t.id}" aria-label="${t.done ? 'Reabrir' : 'Concluir'} ${esc(t.title)}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
      <button class="row-main" type="button" data-act="openTask" data-id="${t.id}">
        <span class="row-title">${t.kind !== 'tarefa' ? `<span class="kind">${kind.icon}</span>` : ''}${esc(t.title)}</span>
        ${meta ? `<span class="row-meta"><i class="dot"></i>${meta}</span>` : ''}
      </button>
      ${opts.noDate ? '' : `<span class="when ${late ? 'bad' : (t.due === today ? 'hot' : '')}">${P.relDay(t.due)}</span>`}
    </div>`;
  };

  P.stepRow = (t, s) => `<div class="row step ${s.date < P.today() ? 'late' : ''}" style="--c:${itemColor(t.itemId)}">
      <button class="check small" type="button" data-act="toggleStep" data-id="${t.id}" data-step="${s.id}" aria-label="Concluir etapa ${esc(s.label)}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
      <button class="row-main" type="button" data-act="openTask" data-id="${t.id}">
        <span class="row-title">${esc(s.label)}</span>
        <span class="row-meta"><i class="dot"></i>etapa de “${esc(t.title)}” · entrega ${P.relDay(t.due)}</span>
      </button>
      <span class="when ${s.date < P.today() ? 'bad' : ''}">${P.relDay(s.date)}</span>
    </div>`;

  P.classRow = (c, iso) => {
    const now = P.nowMinutes();
    const isToday = iso === P.today();
    const st = P.minutes(c.start), en = P.minutes(c.end);
    let tag = '';
    if (c.holiday) tag = '<span class="pill ok">feriado</span>';
    else if (isToday && st !== null && now >= st && now < (en ?? st + 100)) tag = '<span class="pill live">agora</span>';
    else if (isToday && st !== null && now >= (en ?? st + 100)) tag = '<span class="pill">já foi</span>';
    else if (isToday && st !== null) { const m = st - now; tag = `<span class="pill">em ${m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '') : m + 'min'}</span>`; }
    return `<button class="row class" type="button" data-act="openItem" data-id="${c.item.id}" style="--c:${P.color(c.item.color)}">
      <span class="time">${esc(c.start || '—')}</span>
      <span class="row-main as-text"><span class="row-title">${esc(c.item.emoji || '')} ${esc(c.item.title)}</span>
      <span class="row-meta">aula${c.end ? ' até ' + esc(c.end) : ''}${c.item.sub ? ' · ' + esc(c.item.sub) : ''}</span></span>
      ${tag}
    </button>`;
  };

  P.eventRow = e => `<div class="row event" style="--c:${P.EVENT_CATS[e.cat]?.color || 'var(--muted)'}">
      <span class="ev-mark" aria-hidden="true"></span>
      <span class="row-main as-text"><span class="row-title">${esc(e.title)}</span>
      <span class="row-meta">${P.EVENT_CATS[e.cat]?.label || 'Evento'}${e.source ? ' · calendário acadêmico' : ''}</span></span>
      <span class="when">${P.relDay(e.date)}</span>
    </div>`;

  const bar = pct => `<div class="bar"><div style="width:${pct ?? 0}%"></div></div>`;

  const empty = (title, text, act = '', label = '') => `<div class="empty"><strong>${title}</strong><span>${text}</span>${act ? `<button class="btn ghost small" type="button" ${act}>${label}</button>` : ''}</div>`;

  /* ---------- placar da semana ---------- */
  P.weekScore = () => {
    const today = P.today(), ws = P.weekStart(today), we = P.addDays(ws, 6);
    const tasks = S.all('tasks').filter(t => t.due && ((t.due >= ws && t.due <= we) || (!t.done && t.due < ws)));
    const done = tasks.filter(t => t.done).length;
    const habits = S.all('habits');
    const daysSoFar = P.daysUntil(today) - P.daysUntil(ws) + 1;
    let hDone = 0;
    habits.forEach(h => { for (let i = 0; i < daysSoFar; i++) if (h.checks?.[P.addDays(ws, i)]) hDone++; });
    const hPct = habits.length ? hDone / (habits.length * daysSoFar) : null;
    const tPct = tasks.length ? done / tasks.length : null;
    let score = null;
    if (tPct !== null && hPct !== null) score = .7 * tPct + .3 * hPct;
    else score = tPct ?? hPct;
    return { score: score === null ? null : Math.round(score * 100), done, total: tasks.length, hDone, hTotal: habits.length * daysSoFar };
  };

  const scoreLine = s => {
    if (s === null) return 'Nada com prazo nesta semana. Suspeito, mas aceito.';
    if (s >= 90) return 'Caos praticamente extinto. Pode se gabar.';
    if (s >= 70) return 'Semana sob controle. O Prisma está orgulhoso, mas não vai admitir.';
    if (s >= 45) return 'Metade do caos já virou plano. A outra metade está te olhando.';
    if (s >= 20) return 'O caos está ganhando por pontos. Ainda dá pra virar.';
    return 'O caos está confortável demais. Hora de incomodá-lo.';
  };

  /* ---------- frases ---------- */
  const PHRASES = {
    any: ['Você abriu o Prisma. Isso já conta como planejamento.', 'Mais um dia fingindo que temos controle da situação.', 'Tudo sob controle. Exceto aquilo que claramente não está.',
      'Hoje você tem duas opções: fazer ou continuar pensando em fazer.', 'O caos pode até existir. Mas aqui ele tem calendário.', 'Não precisa dominar o mundo hoje. Só a próxima tarefa.',
      'Faça direito. Depois você reclama.', 'Você pediu uma vida organizada. Agora aguenta.', 'Seu semestre mandou lembranças. E alguns prazos.', 'A faculdade não vai se formar sozinha.',
      'Você não está atrasada. Está trabalhando com uma margem estratégica questionável.', 'O plano perfeito continua sendo inferior ao plano que você realmente executa.',
      'Não é procrastinação se você estiver organizando a procrastinação.', 'Tudo bem. O Prisma está aqui. Pode parar de fingir que lembra de tudo.', 'Você trouxe os problemas. Eu trouxe os cards.',
      'Hora de pensar o que o Naruto faria...', 'Taylor Swift ficaria orgulhosa!', 'Vamos descobrir o que está pegando fogo hoje.',
      'Projeto pessoal também tem prazo. Só que a chefe é você.', 'Dez páginas hoje ainda são dez páginas a mais que ontem.',
      'Aquele livro na fila não vai se ler sozinho.', 'Ideia boa anotada vale mais que ideia genial esquecida.'],
    morning: ['Bom dia. Infelizmente, o semestre continua.', 'Bom dia. Seu café ainda não está cadastrado no sistema.', 'Seu futuro agradece. Seu presente queria estar dormindo.'],
    night: ['Boa noite. Sobreviver ao dia também foi uma entrega.', 'Encerrando o expediente. O cérebro já pediu demissão.', 'Hoje acabou. Amanhã a gente finge que começa renovada.',
      'Você fez o que deu. O que não deu fica para a versão de amanhã.', 'Hora de descansar antes que você comece a estudar por culpa.']
  };
  let phraseOfSession = null;
  const phrase = () => {
    if (phraseOfSession) return phraseOfSession;
    const h = new Date().getHours();
    const pool = PHRASES.any.concat(h < 11 ? PHRASES.morning : h >= 20 ? PHRASES.night : []);
    const last = P.ls.get('prisma2:lastPhrase');
    let p; do { p = pool[Math.floor(Math.random() * pool.length)]; } while (p === last && pool.length > 1);
    P.ls.set('prisma2:lastPhrase', p);
    return (phraseOfSession = p);
  };

  /* ============================================================
     HOJE
  ============================================================ */
  // bloco de resumo em tom pastel, com uma "ondinha" decorativa
  const WAVES = ['M2 14c4 0 4-10 8-10s4 16 8 16 4-12 8-12 4 8 8 8 4-6 8-6 4 4 8 4', 'M2 12c3-6 6-6 9 0s6 6 9 0 6-6 9 0 6 6 9 0 6-6 9 0', 'M2 16c4-2 6-12 10-12s5 14 9 14 5-10 9-10 5 6 9 6 4-4 8-4', 'M2 10c3 4 5 6 8 2s5-8 8-2 5 8 8 2 5-6 8-2 5 4 8 2'];
  P.tile = (cls, num, label, attrs) => `<button type="button" class="tile ${cls}" ${attrs || ''}><svg class="wave" viewBox="0 0 54 24" aria-hidden="true"><path d="${WAVES[(parseInt(cls.slice(1), 10) - 1) % 4]}"/></svg><b>${num}</b><span>${label}</span></button>`;
  const tile = P.tile;

  P.views.hoje = () => {
    const today = P.today(), st = S.settings();
    const now = new Date(), h = now.getHours();
    const greet = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    // filtro de área (Tudo / Faculdade / Projetos / Leituras)
    const allItems = S.all('items');
    const used = Object.keys(P.AREAS).filter(a => allItems.some(i => i.area === a && i.status !== 'arquivada'));
    let af = P.ui.hojeArea || 'all';
    if (af !== 'all' && !used.includes(af)) af = 'all';
    const areaOf = t => t.area || (t.itemId && S.get('items', t.itemId)?.area) || null;
    const inArea = t => af === 'all' || areaOf(t) === af;
    const showFac = af === 'all' || af === 'faculdade';
    const hasFac = allItems.some(i => i.area === 'faculdade' && i.status === 'cursando');

    const tasks = S.all('tasks').filter(inArea);
    const open = tasks.filter(t => !t.done);
    const overdue = open.filter(t => t.due && t.due < today).sort((a, b) => a.due.localeCompare(b.due));
    const dueToday = open.filter(t => t.due === today);
    const steps = open.flatMap(t => (t.steps || []).filter(s => !s.done && s.date <= today && s.date !== t.due).map(s => ({ t, s })));
    const classes = showFac ? P.classesOn(today) : [];
    const events = showFac ? S.all('events') : [];
    const evToday = events.filter(e => e.date === today);
    const doneToday = tasks.filter(t => t.done && t.doneAt && P.iso(t.doneAt) === today);
    const inbox = open.filter(t => !t.due).sort((a, b) => a.createdAt - b.createdAt);
    const in7 = P.addDays(today, 7);
    const upcoming = [
      ...open.filter(t => t.due > today && t.due <= in7).map(t => ({ d: t.due, html: P.taskRow(t) })),
      ...events.filter(e => e.date > today && e.date <= in7).map(e => ({ d: e.date, html: P.eventRow(e) }))
    ].sort((a, b) => a.d.localeCompare(b.d));
    const ws = P.weekScore();
    const nc = hasFac && showFac ? P.nextClass() : null;
    const active = allItems.filter(i => P.isActive(i) && (af === 'all' || i.area === af)).sort((a, b) => (b.touchedAt || b.updatedAt) - (a.touchedAt || a.updatedAt));
    const habits = S.all('habits').sort((a, b) => a.order - b.order);
    const wsDay = P.weekStart(today);
    const todayCount = overdue.length + dueToday.length + steps.length;
    const semLeft = hasFac && showFac && st.semesterEnd ? P.daysUntil(st.semesterEnd) : null;
    const showReading = (af === 'all' || af === 'leituras') && (allItems.some(i => i.area === 'leituras') || st.reading?.daily || st.reading?.yearly);

    let ncHtml;
    if (nc) {
      ncHtml = `<button class="now-card" type="button" data-act="openItem" data-id="${nc.item.id}" style="--c:${P.color(nc.item.color)}">
        <span class="eyebrow">${nc.offset === 0 ? 'Próxima aula · hoje' : nc.offset === 1 ? 'Próxima aula · amanhã' : 'Próxima aula · ' + P.DOW_LONG[P.parse(nc.day).getDay()]}</span>
        <span class="now-time">${esc(nc.start)}</span>
        <span class="now-title">${esc(nc.item.emoji || '')} ${esc(nc.item.title)}</span>
        <span class="now-meta">${nc.end ? 'até ' + esc(nc.end) : ''}${nc.item.sub ? ' · ' + esc(nc.item.sub) : ''}</span>
      </button>`;
    } else {
      // sem aula pela frente: mostra o que está em foco (o item mexido por último)
      const focus = active.find(i => i.area !== 'faculdade') || active[0];
      if (focus) {
        const pct = P.pct(focus), c = focus.counters?.[0];
        ncHtml = `<div class="now-card focus" style="--c:${P.color(focus.color)}">
          <button class="now-open" type="button" data-act="openItem" data-id="${focus.id}">
            <span class="eyebrow">Em foco · ${focus.area === 'leituras' ? 'leitura' : focus.area === 'projetos' ? 'projeto' : 'matéria'}</span>
            <span class="now-time">${pct === null ? '—' : pct + '<small>%</small>'}</span>
            <span class="now-title">${esc(focus.emoji || P.AREAS[focus.area].icon)} ${esc(focus.title)}</span>
            <span class="now-meta">${c ? `${c.done}${c.total ? ' de ' + c.total : ''} ${esc(c.label)}` : ''}${focus.sub ? ' · ' + esc(focus.sub) : ''}</span>
          </button>
          ${c ? `<button class="plus" type="button" data-act="inc" data-id="${focus.id}" data-key="${c.key}" aria-label="Mais 1 ${esc(c.label)}">+1</button>` : ''}
        </div>`;
      } else if (af === 'faculdade') {
        ncHtml = `<div class="now-card quiet"><span class="eyebrow">Próxima aula</span><span class="now-title">Nenhuma aula nos próximos dias</span><span class="now-meta">Cadastre horários nas matérias em Áreas.</span></div>`;
      } else {
        ncHtml = `<button class="now-card quiet" type="button" data-act="capture" data-type="item" data-area="${af === 'all' ? 'projetos' : af}"><span class="eyebrow">Em foco</span><span class="now-title">Nada em andamento ainda</span><span class="now-meta">Toque para criar uma matéria, um projeto ou uma leitura.</span></button>`;
      }
    }

    const filterHtml = used.length > 1 ? `<div class="chips hoje-filter" role="group" aria-label="Mostrar">
      <button type="button" class="chip ${af === 'all' ? 'on' : ''}" data-act="hojeArea" data-f="all">Tudo</button>
      ${used.map(a => `<button type="button" class="chip ${af === a ? 'on' : ''}" data-act="hojeArea" data-f="${a}">${P.AREAS[a].icon} ${P.AREAS[a].label}</button>`).join('')}
    </div>` : '';

    return `
    <header class="page-head hoje-head">
      <div class="hello"><span class="avatar" aria-hidden="true">${esc((st.name || 'P').trim().charAt(0).toUpperCase())}</span>
        <div class="hello-text"><span class="eyebrow">${greet} · ${P.DOW_LONG[now.getDay()]}, ${now.getDate()} de ${P.MONTHS[now.getMonth()]}</span>
        <h1>${st.name ? esc(st.name) : 'Olá!'}</h1></div></div>
      <p class="prisma-says">${esc(phrase())}</p>
      <span class="score-pill" title="${esc(scoreLine(ws.score))}">Caos sob controle <b>${ws.score === null ? '—' : ws.score + '%'}</b>${semLeft !== null && semLeft >= 0 ? ` · ${semLeft === 0 ? 'último dia do semestre' : `${semLeft} dias pro fim do semestre`}` : ''}</span>
    </header>
    ${filterHtml}

    <div class="tiles">
      ${tile('c1', todayCount + classes.length + evToday.length, 'Para hoje', 'data-act="scrollTo" data-id="para-hoje"')}
      ${tile('c2', overdue.length, overdue.length === 1 ? 'Atrasada' : 'Atrasadas', 'data-act="scrollTo" data-id="para-hoje"')}
      ${tile('c3', upcoming.length, 'Próximos 7 dias', 'data-act="go" data-to="agenda"')}
      ${tile('c4', active.length, 'Em andamento', 'data-act="go" data-to="areas"')}
    </div>

    <div class="hero-grid">
      ${ncHtml}
    </div>

    <div class="cols">
      <section class="block main-col" id="para-hoje">
        <div class="block-head"><h2>Para hoje</h2><span class="count">${todayCount + classes.length + evToday.length}</span></div>
        <form class="quick-add" data-form="quickTask">
          <input id="qa-today" name="t" autocomplete="off" placeholder="${af === 'projetos' ? 'Nova tarefa de projeto… ex.: revisar briefing sex' : af === 'leituras' ? 'Anotar pra ler… ex.: artigo sobre branding' : 'Nova tarefa… ex.: ler cap. 3 amanhã'}" aria-label="Nova tarefa" data-area="${af === 'all' ? '' : af}">
          <button class="btn primary small" type="submit">Adicionar</button>
        </form>
        <div class="list">
          ${classes.map(c => P.classRow(c, today)).join('')}
          ${evToday.map(P.eventRow).join('')}
          ${overdue.map(t => P.taskRow(t)).join('')}
          ${dueToday.map(t => P.taskRow(t)).join('')}
          ${steps.map(x => P.stepRow(x.t, x.s)).join('')}
          ${!todayCount && !classes.length && !evToday.length ? empty('Dia livre por aqui.', 'Nada vence hoje. Aproveite ou adiante algo da semana.') : ''}
        </div>
        ${doneToday.length ? `<details class="done-today"><summary>${doneToday.length} concluída${doneToday.length > 1 ? 's' : ''} hoje</summary><div class="list">${doneToday.map(t => P.taskRow(t, { noDate: true })).join('')}</div></details>` : ''}

        ${inbox.length ? `<details class="more"><summary>Sem data <span class="count">${inbox.length}</span></summary>
          <div class="list">${inbox.map(t => P.taskRow(t, { noDate: true })).join('')}</div></details>` : ''}

        <details class="more" ${P.ls.get('prisma2:open7', false) ? 'open' : ''} data-remember="prisma2:open7"><summary>Próximos 7 dias <span class="count">${upcoming.length}</span></summary>
          <div class="list">${upcoming.length ? upcoming.map(x => x.html).join('') : empty('Semana limpa.', 'Nenhum prazo nos próximos 7 dias.')}</div>
          <button class="link" type="button" data-act="go" data-to="agenda">Ver agenda →</button></details>
      </section>

      <aside class="side-col">
        ${showReading ? P.readingBlock() : ''}
        <section class="block">
          <div class="block-head"><h2>Hábitos</h2><button class="link" type="button" data-act="manageHabits">Editar</button></div>
          <div class="habits">
            ${habits.length ? habits.map(hb => {
              const on = !!hb.checks?.[today];
              const dots = Array.from({ length: 7 }, (_, i) => { const d = P.addDays(wsDay, i); return `<i class="${hb.checks?.[d] ? 'on' : ''} ${d === today ? 'is-today' : ''} ${d > today ? 'future' : ''}"></i>`; }).join('');
              return `<button class="habit ${on ? 'on' : ''}" type="button" data-act="toggleHabit" data-id="${hb.id}" aria-pressed="${on}">
                <span class="habit-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
                <span class="habit-name">${esc(hb.name)}</span><span class="habit-week" aria-hidden="true">${dots}</span></button>`;
            }).join('') : empty('Sem hábitos ainda.', 'Pequenas rotinas mudam o mês inteiro.', 'data-act="manageHabits"', 'Criar hábito')}
          </div>
        </section>

        ${st.playlist ? `<section class="block"><div class="block-head"><h2>Trilha de estudo</h2></div>
          <a class="playlist-link" href="https://www.youtube.com/playlist?list=${encodeURIComponent(st.playlist)}" target="_blank" rel="noopener"><span class="play">▶</span><span><strong>Abrir sua playlist</strong><small>YouTube</small></span></a>
          ${P.PREVIEW ? '' : `<button class="link" type="button" data-act="playlist">Tocar aqui dentro</button>`}</section>` : ''}
      </aside>
    </div>

    <section class="block">
      <div class="block-head"><h2>Em andamento</h2><button class="link" type="button" data-act="go" data-to="areas">Todas as áreas →</button></div>
      ${active.length ? `<div class="strip">${active.slice(0, 10).map(P.itemMini).join('')}</div>` : empty('Nada em andamento.', 'Crie uma matéria, projeto ou leitura para acompanhar o progresso.', 'data-act="capture" data-type="item"', 'Criar')}
    </section>`;
  };

  /* bloco de leitura: meta do dia + livros do ano */
  P.pagesOn = iso => S.all('items').filter(i => i.area === 'leituras').reduce((sum, i) => sum + ((i.counters?.[0]?.label === 'páginas' ? i.readLog?.[iso] : 0) || 0), 0);
  P.finishedThisYear = () => { const y = String(new Date().getFullYear()); return S.all('items').filter(i => i.area === 'leituras' && i.status === 'concluido' && (i.finishedAt || '').startsWith(y)); };
  P.readingBlock = () => {
    const st = S.settings(), goal = st.reading || {};
    const today = P.today(), pages = P.pagesOn(today);
    const done = P.finishedThisYear().length;
    return `<section class="block">
      <div class="block-head"><h2>Leitura</h2><button class="link" type="button" data-act="go" data-to="ajustes">${goal.daily || goal.yearly ? 'Metas' : 'Definir metas'}</button></div>
      <div class="reading-card">
        <div class="reading-today"><span class="eyebrow">Hoje</span><strong>${pages}${goal.daily ? `<small> / ${goal.daily} páginas</small>` : '<small> páginas</small>'}</strong>
          ${goal.daily ? `<div class="bar"><div style="width:${Math.min(100, Math.round(pages / goal.daily * 100))}%; --c: var(--a-leituras)"></div></div>` : ''}</div>
        <div class="reading-year"><span>${done}${goal.yearly ? ` de ${goal.yearly}` : ''} livro${(goal.yearly || done) === 1 ? '' : 's'} em ${new Date().getFullYear()}</span>
          ${goal.yearly ? `<div class="bar"><div style="width:${Math.min(100, Math.round(done / goal.yearly * 100))}%; --c: var(--a-leituras)"></div></div>` : ''}</div>
      </div>
    </section>`;
  };

  P.itemMini = it => {
    const pct = P.pct(it);
    const main = it.counters?.[0];
    return `<div class="mini" style="--c:${P.color(it.color)}">
      <button class="mini-open" type="button" data-act="openItem" data-id="${it.id}">
        <span class="mini-area">${P.AREAS[it.area].icon} ${P.AREAS[it.area].label}</span>
        <span class="mini-title">${esc(it.emoji || '')} ${esc(it.title)}</span>
        <span class="mini-meta">${main ? `${main.done}${main.total ? '/' + main.total : ''} ${esc(main.label)}` : ''}${pct !== null ? ` · ${pct}%` : ''}</span>
        ${bar(pct)}
      </button>
      ${main ? `<button class="plus" type="button" data-act="inc" data-id="${it.id}" data-key="${main.key}" aria-label="Mais 1 ${esc(main.label)} em ${esc(it.title)}">+1</button>` : ''}
    </div>`;
  };

  /* ============================================================
     AGENDA
  ============================================================ */
  P.views.agenda = () => {
    const today = P.today();
    const sel = P.ui.agendaSel || today;
    const month = P.ui.agendaMonth || sel.slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const lead = (first.getDay() + 6) % 7; // semana começa na segunda
    const daysIn = new Date(y, m, 0).getDate();
    const f = P.ui.agendaFilter;
    const tasks = S.all('tasks');
    const events = S.all('events');
    const show = cat => f === 'all' || f === cat;

    const marks = iso => {
      const out = [];
      if (show('tarefas')) tasks.filter(t => t.due === iso && t.kind !== 'prova').forEach(t => out.push(t.done ? 'done' : 'task'));
      if (show('provas')) { tasks.filter(t => t.due === iso && t.kind === 'prova').forEach(() => out.push('prova')); events.filter(e => e.date === iso && e.cat === 'prova').forEach(() => out.push('prova')); }
      if (show('academico')) events.filter(e => e.date === iso && (e.cat === 'prazo' || e.cat === 'evento')).forEach(e => out.push(e.cat));
      if (show('feriados')) events.filter(e => e.date === iso && e.cat === 'feriado').forEach(() => out.push('feriado'));
      return out;
    };

    let cells = '';
    ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].forEach(d => (cells += `<div class="cal-dow">${d}</div>`));
    for (let i = 0; i < lead; i++) cells += '<div class="cal-cell blank"></div>';
    for (let d = 1; d <= daysIn; d++) {
      const iso = `${month}-${String(d).padStart(2, '0')}`;
      const mk = marks(iso);
      const hasClass = P.classesOn(iso).some(c => !c.holiday);
      cells += `<button type="button" class="cal-cell ${iso === today ? 'today' : ''} ${iso === sel ? 'sel' : ''} ${iso < today ? 'past' : ''}" data-act="agendaSel" data-d="${iso}" aria-label="${d} de ${P.MONTHS[m - 1]}${mk.length ? ', ' + mk.length + ' itens' : ''}">
        <span class="cal-num">${d}</span>${hasClass ? '<span class="cal-class" aria-hidden="true"></span>' : ''}
        <span class="cal-marks">${mk.slice(0, 4).map(k => `<i class="mk-${k}"></i>`).join('')}</span></button>`;
    }

    const selTasks = tasks.filter(t => t.due === sel);
    const selSteps = tasks.filter(t => !t.done).flatMap(t => (t.steps || []).filter(s => s.date === sel && s.date !== t.due && !s.done).map(s => ({ t, s })));
    const selEvents = events.filter(e => e.date === sel);
    const selClasses = P.classesOn(sel);
    const selDate = P.parse(sel);

    const upcoming = [...tasks.filter(t => !t.done && t.due && t.due >= today).map(t => ({ d: t.due, html: P.taskRow(t), cat: t.kind === 'prova' ? 'provas' : 'tarefas' })),
      ...events.filter(e => e.date >= today).map(e => ({ d: e.date, html: P.eventRow(e), cat: e.cat === 'feriado' ? 'feriados' : e.cat === 'prova' ? 'provas' : 'academico' }))]
      .filter(x => show(x.cat)).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 14);

    // grade semanal de aulas
    const week = [1, 2, 3, 4, 5, 6].map(dow => {
      const list = S.all('items').filter(it => it.area === 'faculdade' && it.status === 'cursando').flatMap(it => (it.schedule || []).filter(s => s.dow === dow).map(s => ({ it, s }))).sort((a, b) => a.s.start.localeCompare(b.s.start));
      return { dow, list };
    }).filter(w => w.list.length);
    const online = S.all('items').filter(it => it.area === 'faculdade' && it.status === 'cursando' && it.online);

    const filters = [['all', 'Tudo'], ['tarefas', 'Tarefas'], ['provas', 'Provas'], ['academico', 'Calendário acadêmico'], ['feriados', 'Feriados']];

    return `
    <header class="page-head"><h1>Agenda</h1><p class="lede">Prazos, provas, aulas e o calendário acadêmico no mesmo lugar.</p></header>
    <div class="chips" role="group" aria-label="Filtrar agenda">${filters.map(([k, l]) => `<button type="button" class="chip ${f === k ? 'on' : ''}" data-act="agendaFilter" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="agenda-grid">
      <section class="block cal">
        <div class="cal-head">
          <button class="icon-btn" type="button" data-act="agendaMonth" data-delta="-1" aria-label="Mês anterior">‹</button>
          <h2>${P.MONTHS[m - 1]} <span>${y}</span></h2>
          <button class="icon-btn" type="button" data-act="agendaMonth" data-delta="1" aria-label="Próximo mês">›</button>
        </div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-legend"><span><i class="mk-task"></i>tarefa</span><span><i class="mk-prova"></i>prova</span><span><i class="mk-prazo"></i>prazo acadêmico</span><span><i class="mk-feriado"></i>feriado</span><span><i class="cal-class"></i>tem aula</span></div>
        ${sel !== today ? `<button class="link" type="button" data-act="agendaSel" data-d="${today}">Voltar para hoje</button>` : ''}
      </section>
      <section class="block day-panel">
        <div class="block-head"><h2>${sel === today ? 'Hoje' : P.DOW_LONG[selDate.getDay()]}<span class="faint">, ${selDate.getDate()} de ${P.MONTHS[selDate.getMonth()]}</span></h2>
          <button class="btn ghost small" type="button" data-act="capture" data-type="tarefa" data-due="${sel}">+ Nesse dia</button></div>
        <div class="list">
          ${selClasses.map(c => P.classRow(c, sel)).join('')}
          ${selEvents.map(P.eventRow).join('')}
          ${selTasks.map(t => P.taskRow(t, { noDate: true })).join('')}
          ${selSteps.map(x => P.stepRow(x.t, x.s)).join('')}
          ${!selClasses.length && !selEvents.length && !selTasks.length && !selSteps.length ? empty('Nada marcado.', 'Use “+ Nesse dia” para criar algo nessa data.') : ''}
        </div>
        <div class="block-head sub"><h3>Próximos</h3></div>
        <div class="list">${upcoming.length ? upcoming.map(x => x.html).join('') : empty('Nada pela frente.', 'Nenhum item futuro com esse filtro.')}</div>
      </section>
    </div>
    <section class="block">
      <div class="block-head"><h2>Grade de aulas</h2><button class="link" type="button" data-act="go" data-to="areas">Editar matérias →</button></div>
      ${week.length || online.length ? `<div class="week">${week.map(w => `<div class="week-day"><div class="eyebrow">${P.DOW_LONG[w.dow]}</div>${w.list.map(({ it, s }) => `<button type="button" class="week-class" data-act="openItem" data-id="${it.id}" style="--c:${P.color(it.color)}"><span class="mono">${esc(s.start)}–${esc(s.end)}</span><strong>${esc(it.title)}</strong></button>`).join('')}</div>`).join('')}
        ${online.length ? `<div class="week-day"><div class="eyebrow">on-line</div>${online.map(it => `<button type="button" class="week-class" data-act="openItem" data-id="${it.id}" style="--c:${P.color(it.color)}"><span class="mono">no seu ritmo</span><strong>${esc(it.title)}</strong></button>`).join('')}</div>` : ''}</div>`
        : empty('Sem horários cadastrados.', 'Abra uma matéria e adicione o dia e horário da aula.')}
    </section>`;
  };

  /* ============================================================
     ÁREAS (Faculdade · Projetos · Leituras)
  ============================================================ */
  P.views.areas = () => {
    const area = P.ui.area, filt = P.ui.areaFilter;
    const all = S.all('items').filter(it => it.area === area);
    const list = all.filter(it => filt === 'todos' ? it.status !== 'arquivada' : filt === 'arquivo' ? ['arquivada', 'concluida', 'concluido'].includes(it.status) : (P.isActive(it) || it.status === 'quero' || it.status === 'pausado'))
      .sort((a, b) => (P.isActive(b) - P.isActive(a)) || a.title.localeCompare(b.title, 'pt'));
    const A = P.AREAS[area];
    const tasks = S.all('tasks').filter(t => !t.done && t.due);
    const nextFor = id => tasks.filter(t => t.itemId === id).sort((a, b) => a.due.localeCompare(b.due))[0];
    const st = S.settings();
    let summary = '';
    if (area === 'faculdade') { const n = all.filter(i => i.status === 'cursando').length; const left = st.semesterEnd ? P.daysUntil(st.semesterEnd) : null; summary = `${n} matéria${n !== 1 ? 's' : ''} cursando${left !== null && left >= 0 ? ` · semestre termina em ${left} dias` : ''}`; }
    if (area === 'projetos') { const n = all.filter(i => i.status === 'ativo').length; summary = `${n} projeto${n !== 1 ? 's' : ''} ativo${n !== 1 ? 's' : ''}`; }
    if (area === 'leituras') { const n = all.filter(i => i.status === 'lendo').length, q = all.filter(i => i.status === 'quero').length, c = P.finishedThisYear().length, g = st.reading?.yearly; summary = `${n} lendo · ${q} na fila · ${c}${g ? ' de ' + g : ''} concluída${c !== 1 || g ? 's' : ''} em ${new Date().getFullYear()}`; }

    const card = it => {
        const pct = P.pct(it); const nx = nextFor(it.id);
        const sched = it.area === 'faculdade' ? (it.online ? 'on-line' : (it.schedule || []).map(s => `${P.DOW[s.dow]} ${s.start}`).join(' · ')) : '';
        const extra = it.area === 'leituras' && it.status === 'concluido' && it.finishedAt ? `terminado em ${P.fmtDate(it.finishedAt)}${it.rating ? ' · ' + '★'.repeat(it.rating) : ''}` : '';
        return `<article class="item-card" style="--c:${P.color(it.color)}">
          <button class="item-open" type="button" data-act="openItem" data-id="${it.id}">
            <span class="item-top"><span class="item-emoji">${esc(it.emoji || A.icon)}</span><span class="pill">${P.statusLabel(it.area, it.status)}</span></span>
            <span class="item-title">${esc(it.title)}</span>
            <span class="item-sub">${[it.code, it.sub, sched].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</span>
            <span class="item-progress">${bar(pct)}<span class="mono">${pct === null ? 'sem meta' : pct + '%'}</span></span>
            <span class="item-counters">${extra ? `<span>${esc(extra)}</span>` : (it.counters || []).map(c => `<span>${c.done}${c.total ? '/' + c.total : ''} ${esc(c.label)}</span>`).join('')}</span>
            ${nx ? `<span class="item-next ${nx.due < P.today() ? 'bad' : ''}">${P.KINDS[nx.kind]?.icon || '○'} ${esc(nx.title)} · ${P.relDay(nx.due)}</span>` : ''}
          </button>
          ${it.counters?.[0] && P.isActive(it) ? `<button class="plus" type="button" data-act="inc" data-id="${it.id}" data-key="${it.counters[0].key}" aria-label="Mais 1 ${esc(it.counters[0].label)}">+1 ${esc(it.counters[0].label.replace(/s$/, ''))}</button>` : ''}
        </article>`;
    };
    const addCard = `<button class="item-card add" type="button" data-act="capture" data-type="item" data-area="${area}"><span>+</span>${area === 'projetos' ? 'Novo projeto' : area === 'leituras' ? 'Nova leitura' : 'Nova matéria'}</button>`;
    let groupsHtml;
    if (area === 'leituras' && filt === 'ativos') {
      // leituras: separadas em Lendo agora / Na fila / Pausadas
      const groups = [['lendo', 'Lendo agora'], ['quero', 'Na fila'], ['pausado', 'Pausadas']].map(([st, label]) => [label, list.filter(i => i.status === st)]).filter(([, l]) => l.length);
      groupsHtml = groups.length ? groups.map(([label, l], gi) => `<div class="group-title"><h3>${label}</h3><span class="count">${l.length}</span></div><div class="item-grid">${l.map(card).join('')}${gi === groups.length - 1 ? addCard : ''}</div>`).join('') : `<div class="item-grid">${addCard}</div>`;
    } else {
      groupsHtml = `<div class="item-grid">${list.map(card).join('')}${addCard}</div>`;
    }

    return `
    <header class="page-head"><h1>Áreas</h1><p class="lede">${summary}</p></header>
    <div class="seg" role="tablist" aria-label="Área">
      ${Object.entries(P.AREAS).map(([k, a]) => `<button type="button" role="tab" aria-selected="${k === area}" class="seg-btn ${k === area ? 'on' : ''} a-${k}" data-act="setArea" data-a="${k}"><span aria-hidden="true">${a.icon}</span> ${a.label}</button>`).join('')}
    </div>
    <div class="chips">
      ${[['ativos', 'Em andamento'], ['todos', 'Todos'], ['arquivo', 'Concluídos e arquivados']].map(([k, l]) => `<button type="button" class="chip ${filt === k ? 'on' : ''}" data-act="areaFilter" data-f="${k}">${l}</button>`).join('')}
    </div>
    ${groupsHtml}`;
  };

  /* ============================================================
     NOTAS
  ============================================================ */
  P.views.notas = () => {
    const u = P.ui;
    const q = (u.notesQ || '').trim().toLowerCase();
    let notes = S.all('notes');
    const tags = [...new Set(notes.flatMap(n => n.tags || []))].sort((a, b) => a.localeCompare(b, 'pt'));
    if (u.notesArea !== 'all') notes = notes.filter(n => (n.area || 'geral') === u.notesArea);
    if (u.notesTag) notes = notes.filter(n => (n.tags || []).includes(u.notesTag));
    if (u.notesFav) notes = notes.filter(n => n.fav);
    if (q) notes = notes.filter(n => (n.text + ' ' + P.itemName(n.itemId) + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q));
    notes.sort((a, b) => u.notesAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);

    return `
    <header class="page-head row-head"><div><h1>Notas</h1><p class="lede">Ideias, trechos, conceitos e rabiscos de tudo que você estuda.</p></div>
      <button class="btn primary" type="button" data-act="capture" data-type="nota">+ Nova nota</button></header>
    <div class="notes-tools">
      <label class="search"><span aria-hidden="true">⌕</span><input id="notes-q" type="search" placeholder="Buscar nas notas" value="${esc(u.notesQ || '')}" data-input="notesQ" aria-label="Buscar nas notas"></label>
      <div class="chips">
        ${[['all', 'Todas'], ['faculdade', 'Faculdade'], ['projetos', 'Projetos'], ['leituras', 'Leituras'], ['geral', 'Soltas']].map(([k, l]) => `<button type="button" class="chip ${u.notesArea === k ? 'on' : ''}" data-act="notesArea" data-f="${k}">${l}</button>`).join('')}
        <button type="button" class="chip ${u.notesFav ? 'on' : ''}" data-act="notesFav">★ Favoritas</button>
        <button type="button" class="chip" data-act="notesSort">${u.notesAsc ? 'Mais antigas ↑' : 'Mais recentes ↓'}</button>
      </div>
      ${tags.length ? `<div class="chips tags">${tags.map(t => `<button type="button" class="chip tag ${u.notesTag === t ? 'on' : ''}" data-act="notesTag" data-t="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="notes-grid">
      ${notes.length ? notes.map(n => {
        const it = n.itemId && S.get('items', n.itemId);
        return `<article class="note" style="--c:${it ? P.color(it.color) : 'var(--faint)'}">
          <button class="note-open" type="button" data-act="openNote" data-id="${n.id}">
            <span class="note-src">${it ? esc(it.title) : (n.area ? P.AREAS[n.area]?.label : 'Nota solta')}</span>
            ${n.drawing ? `<img src="${n.drawing}" alt="Desenho da nota" loading="lazy">` : ''}
            ${n.text ? `<span class="note-text">${esc(n.text)}</span>` : ''}
            <span class="note-foot">${(n.tags || []).map(t => `<span class="tagpill">#${esc(t)}</span>`).join('')}<span class="mono faint">${P.fmtDate(P.iso(n.createdAt))}</span></span>
          </button>
          <button class="star ${n.fav ? 'on' : ''}" type="button" data-act="toggleFav" data-id="${n.id}" aria-label="${n.fav ? 'Remover dos favoritos' : 'Favoritar'}" aria-pressed="${!!n.fav}">★</button>
        </article>`;
      }).join('') : empty(q || u.notesTag || u.notesFav || u.notesArea !== 'all' ? 'Nenhuma nota com esse filtro.' : 'Nenhuma nota ainda.', 'Anote conceitos da aula, trechos de livros e decisões de projeto.', 'data-act="capture" data-type="nota"', 'Escrever a primeira')}
    </div>`;
  };
})();
