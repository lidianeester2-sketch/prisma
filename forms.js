/* ============================================================
   PRISMA 2 — criar e editar (captura rápida, itens, tarefas,
   notas, eventos, hábitos e desenho)
============================================================ */
(function () {
  const S = P.store, esc = P.esc;

  /* ---------- peças de formulário ---------- */
  const itemOptions = (selected, area) => {
    const items = S.all('items').filter(it => !['arquivada'].includes(it.status));
    const groups = Object.entries(P.AREAS).filter(([k]) => !area || area === k).map(([k, a]) => {
      const list = items.filter(it => it.area === k).sort((x, y) => (P.isActive(y) - P.isActive(x)) || x.title.localeCompare(y.title, 'pt'));
      return list.length ? `<optgroup label="${a.label}">${list.map(it => `<option value="${it.id}" ${it.id === selected ? 'selected' : ''}>${esc(it.title)}</option>`).join('')}</optgroup>` : '';
    }).join('');
    return `<option value="">Nenhum (solto)</option>${groups}`;
  };
  const field = (label, html, hint = '') => `<label class="field"><span class="field-label">${label}</span>${html}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
  const dateChips = (name, value) => {
    const t = P.today(), tm = P.addDays(t, 1);
    return `<div class="date-pick" data-date-pick="${name}">
      <div class="chips compact">
        <button type="button" class="chip ${value === t ? 'on' : ''}" data-set-date="${t}">Hoje</button>
        <button type="button" class="chip ${value === tm ? 'on' : ''}" data-set-date="${tm}">Amanhã</button>
        <button type="button" class="chip ${value === P.addDays(t, 7) ? 'on' : ''}" data-set-date="${P.addDays(t, 7)}">Em 1 semana</button>
        <button type="button" class="chip ${!value ? 'on' : ''}" data-set-date="">Sem data</button>
      </div>
      <input type="date" name="${name}" value="${value || ''}" aria-label="Data">
    </div>`;
  };
  const wireDatePick = root => P.$$('[data-date-pick]', root).forEach(w => {
    const input = w.querySelector('input');
    const sync = () => P.$$('[data-set-date]', w).forEach(b => b.classList.toggle('on', b.dataset.setDate === input.value));
    w.addEventListener('click', e => { const b = e.target.closest('[data-set-date]'); if (!b) return; input.value = b.dataset.setDate; sync(); });
    input.addEventListener('change', sync);
  });
  const itemArea = id => S.get('items', id)?.area || null;

  /* ============================================================
     CAPTURA RÁPIDA (+)
  ============================================================ */
  P.capture = (type = 'tarefa', preset = {}) => {
    let current = type;
    const tabs = [['tarefa', 'Tarefa'], ['prazo', 'Prazo ou prova'], ['nota', 'Nota'], ['evento', 'Evento'], ['item', 'Matéria, projeto ou leitura']];
    const sheet = P.sheet({
      title: 'Adicionar', kicker: '✦ captura rápida',
      render: () => `
        <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" class="tab ${k === current ? 'on' : ''}" data-tab="${k}" aria-selected="${k === current}">${l}</button>`).join('')}</div>
        <div class="tab-body"></div>`,
      mount: api => {
        const body = api.body.querySelector('.tab-body');
        const draw = () => {
          P.$$('.tab', api.body).forEach(b => { b.classList.toggle('on', b.dataset.tab === current); b.setAttribute('aria-selected', b.dataset.tab === current); });
          if (current === 'tarefa') taskForm(body, { due: preset.due ?? null, itemId: preset.itemId || '' }, false, api);
          if (current === 'prazo') taskForm(body, { kind: 'trabalho', due: preset.due || P.addDays(P.today(), 7), itemId: preset.itemId || '' }, true, api);
          if (current === 'nota') noteForm(body, { itemId: preset.itemId || '', text: '', tags: [] }, api);
          if (current === 'evento') eventForm(body, { date: preset.due || P.today(), cat: 'evento' }, api);
          if (current === 'item') itemForm(body, { area: preset.area || P.ui.area || 'faculdade' }, api);
        };
        api.body.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; current = b.dataset.tab; draw(); });
        draw();
      }
    });
    return sheet;
  };

  /* ---------- tarefa / prazo ---------- */
  function taskForm(body, t, isDeadline, api, existing = false) {
    body.innerHTML = `<form class="form" data-f="task">
      ${field('O que precisa ser feito', `<input name="title" required autofocus value="${esc(t.title || '')}" placeholder="${isDeadline ? 'Ex.: Trabalho final de Redação' : 'Ex.: Mandar e-mail pro professor'}">`)}
      ${isDeadline ? field('Tipo', `<div class="chips compact" data-kind>${['trabalho', 'prova', 'entrega', 'reuniao'].map(k => `<button type="button" class="chip ${t.kind === k ? 'on' : ''}" data-k="${k}">${P.KINDS[k].icon} ${P.KINDS[k].label}</button>`).join('')}</div>`) : ''}
      ${field(isDeadline ? 'Data de entrega' : 'Quando', dateChips('due', t.due))}
      ${field('Ligado a', `<select name="itemId">${itemOptions(t.itemId)}</select>`)}
      ${isDeadline && !existing ? `<label class="check-line"><input type="checkbox" name="plan" checked> Montar um plano em etapas até a data</label>` : ''}
      <div class="form-actions"><button class="btn primary" type="submit">${existing ? 'Salvar' : 'Adicionar'}</button></div>
    </form>`;
    wireDatePick(body);
    let kind = t.kind || 'tarefa';
    const kWrap = body.querySelector('[data-kind]');
    kWrap && kWrap.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k; P.$$('[data-k]', kWrap).forEach(x => x.classList.toggle('on', x === b)); });
    body.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = fd.get('title').trim(); if (!title) return;
      const due = fd.get('due') || null;
      if (isDeadline && !due) { P.toast('Prazos precisam de uma data.'); return; }
      const itemId = fd.get('itemId') || null;
      const rec = { ...(existing ? t : {}), title, due, itemId, area: itemArea(itemId) || t.area || null, kind: isDeadline ? kind : (existing ? t.kind : 'tarefa') };
      if (!existing) { rec.done = false; rec.steps = isDeadline && fd.get('plan') && P.daysUntil(due) > 1 ? P.makeSteps(due, kind) : []; }
      S.put('tasks', rec);
      P.toast(existing ? 'Salvo.' : isDeadline ? `${P.KINDS[kind].label} criado${kind === 'prova' || kind === 'entrega' || kind === 'reuniao' ? 'a' : ''} para ${P.relDay(due)}.` : 'Tarefa adicionada.');
      api.close();
    });
  }

  P.openTask = id => {
    const t0 = S.get('tasks', id); if (!t0) return;
    let editing = false;
    const sheet = P.sheet({
      title: t0.title, kicker: (P.KINDS[t0.kind] || P.KINDS.tarefa).label, live: true,
      render: () => {
        const t = S.get('tasks', id); if (!t) return '<p class="faint">Essa tarefa foi apagada.</p>';
        if (editing) return '<div class="edit-host"></div>';
        const it = t.itemId && S.get('items', t.itemId);
        const pct = P.taskPct(t);
        return `
          <div class="detail-meta">
            <span class="pill ${t.due && t.due < P.today() && !t.done ? 'bad' : ''}">${t.due ? (t.done ? 'era para ' : 'vence ') + P.relDay(t.due) + (P.relDay(t.due) !== P.fmtDate(t.due) ? ' · ' + P.fmtDate(t.due) : '') : 'sem data'}</span>
            ${it ? `<button class="pill link-pill" type="button" data-act="openItem" data-id="${it.id}" style="--c:${P.color(it.color)}"><i class="dot"></i>${esc(it.title)}</button>` : ''}
            ${t.done ? '<span class="pill ok">concluída</span>' : ''}
          </div>
          ${t.steps?.length ? `<div class="bar big"><div style="width:${pct}%"></div></div>
          <div class="list steps-list">${t.steps.map(s => `<div class="row step-edit ${s.done ? 'done' : ''}">
              <button class="check small" type="button" data-step-toggle="${s.id}" aria-label="Concluir etapa"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
              <input class="inline-input" value="${esc(s.label)}" data-step-label="${s.id}" aria-label="Nome da etapa">
              <input class="inline-date" type="date" value="${s.date}" data-step-date="${s.id}" aria-label="Data da etapa">
              <button class="icon-btn small" type="button" data-step-del="${s.id}" aria-label="Remover etapa">✕</button>
            </div>`).join('')}</div>` : ''}
          <form class="quick-add slim" data-step-add><input name="s" placeholder="Adicionar etapa…" aria-label="Nova etapa"><button class="btn ghost small" type="submit">+</button></form>
          <div class="form-actions split">
            <button class="btn ghost danger-t" type="button" data-del>Apagar</button>
            <span class="grow"></span>
            <button class="btn ghost" type="button" data-edit>Editar</button>
            <button class="btn primary" type="button" data-done>${t.done ? 'Reabrir' : 'Concluir'}</button>
          </div>`;
      },
      mount: api => {
        const t = S.get('tasks', id); if (!t) return;
        if (editing) { taskForm(api.body.querySelector('.edit-host'), t, t.kind !== 'tarefa', { close: () => { editing = false; api.refresh(); api.setTitle(S.get('tasks', id)?.title || ''); } }, true); return; }
        const b = api.body;
        const patchSteps = fn => S.patch('tasks', id, cur => { cur.steps = fn(cur.steps || []); return cur; });
        b.querySelector('[data-done]').onclick = () => { P.actions.toggleTask({ dataset: { id } }); api.close(); };
        b.querySelector('[data-edit]').onclick = () => { editing = true; api.refresh(); };
        b.querySelector('[data-del]').onclick = () => { const undo = S.remove('tasks', id); api.close(); P.toast('Tarefa apagada.', { undo }); };
        P.$$('[data-step-toggle]', b).forEach(el => el.onclick = () => { patchSteps(st => st.map(s => s.id === el.dataset.stepToggle ? { ...s, done: !s.done } : s)); api.refresh(); });
        P.$$('[data-step-label]', b).forEach(el => el.onchange = () => patchSteps(st => st.map(s => s.id === el.dataset.stepLabel ? { ...s, label: el.value.trim() || s.label } : s)));
        P.$$('[data-step-date]', b).forEach(el => el.onchange = () => el.value && patchSteps(st => st.map(s => s.id === el.dataset.stepDate ? { ...s, date: el.value } : s).sort((x, y) => x.date.localeCompare(y.date))));
        P.$$('[data-step-del]', b).forEach(el => el.onclick = () => { patchSteps(st => st.filter(s => s.id !== el.dataset.stepDel)); api.refresh(); });
        b.querySelector('[data-step-add]').onsubmit = e => {
          e.preventDefault(); const v = e.target.s.value.trim(); if (!v) return;
          const cur = S.get('tasks', id);
          patchSteps(st => [...st, { id: P.uid(), label: v, date: cur.due || P.today(), done: false }]); api.refresh();
          setTimeout(() => api.body.querySelector('[data-step-add] input')?.focus(), 30);
        };
      }
    });
    return sheet;
  };

  /* ---------- nota ---------- */
  function noteForm(body, n, api, existing = false) {
    let drawing = n.drawing || null;
    let tags = [...(n.tags || [])];
    const allTags = [...new Set([...(S.settings().tags || []), ...S.all('notes').flatMap(x => x.tags || [])])];
    const render = () => {
      body.innerHTML = `<form class="form" data-f="note">
        ${field('Nota', `<textarea name="text" rows="6" autofocus placeholder="Escreva o que achou interessante…">${esc(n.text || '')}</textarea>`)}
        ${drawing ? `<div class="drawing-prev"><img src="${drawing}" alt="Desenho anexado"><button type="button" class="icon-btn small" data-rm-draw aria-label="Remover desenho">✕</button></div>` : ''}
        <div class="row-fields">
          ${field('Ligada a', `<select name="itemId">${itemOptions(n.itemId)}</select>`)}
          <div class="field"><span class="field-label">Desenho</span><button type="button" class="btn ghost" data-draw>${drawing ? 'Editar desenho' : '✎ Desenhar'}</button></div>
        </div>
        <div class="field"><span class="field-label">Etiquetas</span>
          <div class="chips compact" data-tags>${[...new Set([...allTags, ...tags])].map(t => `<button type="button" class="chip tag ${tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}
          <input class="tag-input" data-new-tag placeholder="+ nova etiqueta" aria-label="Nova etiqueta"></div></div>
        <div class="form-actions split">
          ${existing ? '<button class="btn ghost danger-t" type="button" data-del>Apagar</button>' : ''}<span class="grow"></span>
          <button class="btn primary" type="submit">${existing ? 'Salvar' : 'Salvar nota'}</button></div>
      </form>`;
      const f = body.querySelector('form');
      body.querySelector('[data-tags]').addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; tags = tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t]; b.classList.toggle('on'); });
      body.querySelector('[data-new-tag]').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return; e.preventDefault();
        const v = e.target.value.trim().replace(/^#/, ''); if (!v) return;
        n = { ...n, text: f.text.value, itemId: f.itemId.value };
        if (!tags.includes(v)) tags.push(v); if (!allTags.includes(v)) allTags.push(v); render();
        body.querySelector('[data-new-tag]').focus();
      });
      body.querySelector('[data-draw]').onclick = async () => { n = { ...n, text: f.text.value, itemId: f.itemId.value }; const d = await P.draw(drawing); if (d !== undefined) { drawing = d; render(); } };
      const rm = body.querySelector('[data-rm-draw]'); if (rm) rm.onclick = () => { n = { ...n, text: f.text.value, itemId: f.itemId.value }; drawing = null; render(); };
      const del = body.querySelector('[data-del]'); if (del) del.onclick = () => { const undo = S.remove('notes', n.id); api.close(); P.toast('Nota apagada.', { undo }); };
      f.addEventListener('submit', e => {
        e.preventDefault();
        const text = f.text.value.trim();
        if (!text && !drawing) { P.toast('Escreva algo ou faça um desenho.'); return; }
        const itemId = f.itemId.value || null;
        S.put('notes', { ...(existing ? n : {}), text, drawing, tags, itemId, area: itemArea(itemId) || (existing ? n.area : null), fav: !!n.fav });
        P.toast(existing ? 'Nota salva.' : 'Nota criada.'); api.close();
      });
    };
    render();
  }
  P.openNote = id => { const n = S.get('notes', id); if (!n) return; P.sheet({ title: 'Nota', kicker: P.itemName(n.itemId) || 'nota solta', mount: api => noteForm(api.body, n, api, true) }); };

  /* ---------- evento ---------- */
  function eventForm(body, ev, api, existing = false) {
    body.innerHTML = `<form class="form">
      ${field('Evento', `<input name="title" required autofocus value="${esc(ev.title || '')}" placeholder="Ex.: Palestra na semana acadêmica">`)}
      <div class="row-fields">${field('Data', `<input type="date" name="date" required value="${ev.date || ''}">`)}
      ${field('Tipo', `<select name="cat">${Object.entries(P.EVENT_CATS).map(([k, c]) => `<option value="${k}" ${ev.cat === k ? 'selected' : ''}>${c.label}</option>`).join('')}</select>`)}</div>
      <div class="form-actions split">${existing ? '<button class="btn ghost danger-t" type="button" data-del>Apagar</button>' : ''}<span class="grow"></span><button class="btn primary" type="submit">Salvar</button></div></form>`;
    const del = body.querySelector('[data-del]'); if (del) del.onclick = () => { const undo = S.remove('events', ev.id); api.close(); P.toast('Evento apagado.', { undo }); };
    body.querySelector('form').onsubmit = e => {
      e.preventDefault(); const f = e.target;
      S.put('events', { ...(existing ? ev : {}), title: f.title.value.trim(), date: f.date.value, cat: f.cat.value });
      P.toast('Evento salvo.'); api.close();
    };
  }
  P.openEvent = id => { const ev = S.get('events', id); if (ev) P.sheet({ title: 'Evento', mount: api => eventForm(api.body, ev, api, true) }); };

  /* ============================================================
     ITENS (matéria · projeto · leitura)
  ============================================================ */
  const READ_UNITS = { livro: 'páginas', artigo: 'páginas', podcast: 'episódios', curso: 'aulas', video: 'minutos' };

  function itemForm(body, it, api, existing = false) {
    let area = it.area || 'faculdade';
    let color = it.color ?? Math.floor(Math.random() * 8);
    let schedule = (it.schedule || []).map(s => ({ ...s }));
    const draw = () => {
      const c = it.counters || [];
      const total = k => c.find(x => x.key === k)?.total ?? '';
      body.innerHTML = `<form class="form" data-f="item">
        ${existing ? '' : `<div class="seg small">${Object.entries(P.AREAS).map(([k, a]) => `<button type="button" class="seg-btn ${k === area ? 'on' : ''} a-${k}" data-area="${k}">${a.icon} ${a.label}</button>`).join('')}</div>`}
        <div class="row-fields title-row">
          ${field('Ícone', `<input name="emoji" class="emoji-input" maxlength="4" value="${esc(it.emoji || '')}" placeholder="${P.AREAS[area].icon}">`)}
          ${field(area === 'faculdade' ? 'Nome da matéria' : area === 'projetos' ? 'Nome do projeto' : 'Título', `<input name="title" required autofocus value="${esc(it.title || '')}" placeholder="${area === 'faculdade' ? 'Ex.: História da Mídia' : area === 'projetos' ? 'Ex.: Campanha tricampeonato' : 'Ex.: Mulheres que correm com os lobos'}">`)}
        </div>
        <div class="field"><span class="field-label">Cor</span><div class="swatches">${P.COLORS.map((col, i) => `<button type="button" class="swatch ${i === color ? 'on' : ''}" style="--c:${col}" data-color="${i}" aria-label="Cor ${i + 1}"></button>`).join('')}</div></div>
        ${area === 'faculdade' ? `
          <div class="row-fields">${field('Código', `<input name="code" value="${esc(it.code || '')}" placeholder="VIV0727">`)}${field('Professor(a)', `<input name="sub" value="${esc(it.sub || '')}" placeholder="Nome">`)}</div>
          <label class="check-line"><input type="checkbox" name="online" ${it.online ? 'checked' : ''}> Matéria on-line (sem horário fixo)</label>
          <div class="field sched ${it.online ? 'is-hidden' : ''}"><span class="field-label">Horários de aula</span>
            ${schedule.map((s, i) => `<div class="sched-row"><select data-s="${i}" data-k="dow">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${s.dow === d ? 'selected' : ''}>${P.DOW_LONG[d]}</option>`).join('')}</select>
              <input type="time" data-s="${i}" data-k="start" value="${s.start || ''}" aria-label="Início"><span>–</span><input type="time" data-s="${i}" data-k="end" value="${s.end || ''}" aria-label="Fim">
              <button type="button" class="icon-btn small" data-s-del="${i}" aria-label="Remover horário">✕</button></div>`).join('')}
            <button type="button" class="btn ghost small" data-s-add>+ Horário</button></div>
          <div class="row-fields">${field('Total de aulas', `<input name="t_aulas" inputmode="numeric" value="${total('aulas')}" placeholder="não sei">`)}${field('Total de atividades', `<input name="t_ativ" inputmode="numeric" value="${total('ativ')}" placeholder="não sei">`)}</div>
          <div class="row-fields">${field('Início', `<input type="date" name="start" value="${it.start || ''}">`)}${field('Término', `<input type="date" name="end" value="${it.end || ''}">`)}</div>` : ''}
        ${area === 'projetos' ? `
          <div class="row-fields">${field('Cliente ou contexto', `<input name="sub" value="${esc(it.sub || '')}" placeholder="Ex.: Mobili, faculdade, pessoal">`)}${field('Etapas planejadas', `<input name="t_etapas" inputmode="numeric" value="${total('etapas') || (existing ? '' : 10)}">`)}</div>
          ${field('Prazo final (opcional)', `<input type="date" name="end" value="${it.end || ''}">`)}` : ''}
        ${area === 'leituras' ? `
          <div class="row-fields">${field('Autor ou fonte', `<input name="sub" value="${esc(it.sub || '')}">`)}${field('Tipo', `<select name="kind">${Object.keys(READ_UNITS).map(k => `<option value="${k}" ${(it.kind || 'livro') === k ? 'selected' : ''}>${k === 'video' ? 'Vídeo' : k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select>`)}</div>
          ${field('Total', `<input name="t_main" inputmode="numeric" value="${total('main') || (existing ? '' : 200)}">`, 'Páginas, episódios, aulas ou minutos, conforme o tipo.')}` : ''}
        ${field('Situação', `<div class="chips compact" data-status>${P.STATUS[area].map(([k, l]) => `<button type="button" class="chip ${(it.status || P.STATUS[area][area === 'leituras' ? 1 : 0][0]) === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>`)}
        <div class="form-actions"><button class="btn primary" type="submit">${existing ? 'Salvar' : 'Criar'}</button></div>
      </form>`;
      const f = body.querySelector('form');
      const keep = () => { const fd = new FormData(f); it = { ...it, title: fd.get('title'), emoji: fd.get('emoji'), sub: fd.get('sub') ?? it.sub, code: fd.get('code') ?? it.code, online: f.online ? f.online.checked : it.online }; };
      P.$$('[data-area]', body).forEach(b => b.onclick = () => { keep(); area = b.dataset.area; it = { ...it, area, status: null, counters: [] }; draw(); });
      P.$$('[data-color]', body).forEach(b => b.onclick = () => { color = +b.dataset.color; P.$$('[data-color]', body).forEach(x => x.classList.toggle('on', x === b)); });
      const stWrap = body.querySelector('[data-status]');
      stWrap.onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; it.status = b.dataset.st; P.$$('[data-st]', stWrap).forEach(x => x.classList.toggle('on', x === b)); };
      if (f.online) f.online.onchange = () => body.querySelector('.sched').classList.toggle('is-hidden', f.online.checked);
      P.$$('[data-s]', body).forEach(el => el.onchange = () => { const s = schedule[+el.dataset.s]; s[el.dataset.k] = el.dataset.k === 'dow' ? +el.value : el.value; });
      P.$$('[data-s-del]', body).forEach(b => b.onclick = () => { keep(); schedule.splice(+b.dataset.sDel, 1); draw(); });
      const add = body.querySelector('[data-s-add]'); if (add) add.onclick = () => { keep(); schedule.push({ dow: 1, start: '19:00', end: '20:40' }); draw(); };
      f.onsubmit = e => {
        e.preventDefault();
        const fd = new FormData(f);
        const title = fd.get('title').trim(); if (!title) return;
        const num = v => { const s = String(v ?? '').trim(); if (!s) return null; const n = parseInt(s, 10); return Number.isFinite(n) && n > 0 ? n : null; };
        const old = it.counters || [];
        const keepDone = k => old.find(c => c.key === k)?.done || 0;
        let counters;
        if (area === 'faculdade') counters = [{ key: 'aulas', label: 'aulas', done: keepDone('aulas'), total: num(fd.get('t_aulas')) }, { key: 'ativ', label: 'atividades', done: keepDone('ativ'), total: num(fd.get('t_ativ')) }];
        if (area === 'projetos') counters = [{ key: 'etapas', label: 'etapas', done: keepDone('etapas'), total: num(fd.get('t_etapas')) }];
        if (area === 'leituras') counters = [{ key: 'main', label: READ_UNITS[fd.get('kind')] || 'páginas', done: keepDone('main'), total: num(fd.get('t_main')) }];
        const status = it.status || P.STATUS[area][area === 'leituras' ? 1 : 0][0];
        const rec = {
          ...(existing ? it : {}), area, title, emoji: fd.get('emoji').trim(), color, status, counters,
          sub: (fd.get('sub') || '').trim(), code: (fd.get('code') || '').trim().toUpperCase(),
          kind: fd.get('kind') || it.kind || null, online: !!fd.get('online'),
          schedule: area === 'faculdade' && !fd.get('online') ? schedule.filter(s => s.start) : [],
          start: fd.get('start') || it.start || null, end: fd.get('end') || null, touchedAt: Date.now()
        };
        Object.assign(rec, P.finishFields(it, status));
        delete rec.seed;
        const saved = S.put('items', rec);
        P.toast(existing ? 'Salvo.' : `${title} criado${area === 'leituras' ? 'a' : ''}.`);
        api.close();
        if (!existing) { P.ui.area = area; P.saveUI(); }
        return saved;
      };
    };
    draw();
  }

  P.openItem = id => {
    let editing = false;
    const it0 = S.get('items', id); if (!it0) return;
    const sheet = P.sheet({
      title: it0.title, kicker: `${P.AREAS[it0.area].icon} ${P.AREAS[it0.area].label}`, wide: true, live: true,
      render: () => {
        const it = S.get('items', id); if (!it) return '<p class="faint">Esse item foi apagado.</p>';
        if (editing) return '<div class="edit-host"></div>';
        const pct = P.pct(it);
        const tasks = S.all('tasks').filter(t => t.itemId === id);
        const open = tasks.filter(t => !t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
        const done = tasks.filter(t => t.done);
        const notes = S.all('notes').filter(n => n.itemId === id).sort((a, b) => b.createdAt - a.createdAt);
        const info = [];
        if (it.code) info.push(['Código', it.code]);
        if (it.sub) info.push([it.area === 'faculdade' ? 'Professor(a)' : it.area === 'projetos' ? 'Cliente' : 'Autor', it.sub]);
        if (it.area === 'faculdade') info.push(['Aulas', it.online ? 'on-line' : (it.schedule || []).map(s => `${P.DOW_LONG[s.dow]} ${s.start}–${s.end}`).join(', ') || 'sem horário']);
        if (it.start || it.end) info.push(['Período', [it.start && P.fmtDate(it.start), it.end && P.fmtDate(it.end)].filter(Boolean).join(' → ')]);
        if (it.area === 'leituras') info.push(['Nota', `<span class="rating" role="group" aria-label="Nota">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${n}" class="${(it.rating || 0) >= n ? 'on' : ''}" aria-label="${n} estrela${n > 1 ? 's' : ''}">★</button>`).join('')}</span>`]);
        return `
          <div class="item-hero" style="--c:${P.color(it.color)}">
            <span class="item-emoji big">${esc(it.emoji || P.AREAS[it.area].icon)}</span>
            <div class="grow"><div class="chips compact">${P.STATUS[it.area].map(([k, l]) => `<button type="button" class="chip ${it.status === k ? 'on' : ''}" data-status="${k}">${l}</button>`).join('')}</div></div>
            <span class="pct-big">${pct === null ? '—' : pct + '<small>%</small>'}</span>
          </div>
          ${info.length ? `<dl class="info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${k === 'Nota' ? v : esc(v)}</dd></div>`).join('')}</dl>` : ''}
          <div class="counters">${(it.counters || []).map(c => `
            <div class="counter" style="--c:${P.color(it.color)}">
              <span class="eyebrow">${esc(c.label)}</span>
              <div class="counter-row">
                <button class="icon-btn" type="button" data-dec="${c.key}" aria-label="Menos 1 ${esc(c.label)}" ${c.done <= 0 ? 'disabled' : ''}>−</button>
                <span class="counter-num">${c.done}<small>${c.total ? ' / ' + c.total : ''}</small></span>
                <button class="icon-btn accent" type="button" data-inc="${c.key}" aria-label="Mais 1 ${esc(c.label)}">+</button>
              </div>
              ${c.total ? `<div class="bar"><div style="width:${Math.min(100, Math.round(c.done / c.total * 100))}%"></div></div>` : `<button type="button" class="link small" data-edit>Definir total</button>`}
              ${it.area === 'leituras' ? `<div class="counter-extra">
                <button class="btn ghost small" type="button" data-inc10="${c.key}">+10</button>
                <form class="set-page" data-setv="${c.key}"><input type="number" inputmode="numeric" min="0" name="v" placeholder="Parei ${c.label === 'páginas' ? 'na página' : 'em'}…" aria-label="Onde parei"><button class="btn ghost small" type="submit">Salvar</button></form>
              </div>
              ${(() => { const days = Array.from({ length: 7 }, (_, k) => P.addDays(P.today(), k - 6)); const tot = days.reduce((a, d) => a + (it.readLog?.[d] || 0), 0); return tot ? `<span class="faint small">${tot} ${esc(c.label)} nos últimos 7 dias</span>` : ''; })()}` : ''}
            </div>`).join('')}</div>

          <div class="block-head sub"><h3>Prazos e tarefas</h3><button class="btn ghost small" type="button" data-new-task>+ Prazo</button></div>
          <div class="list">${open.length ? open.map(t => P.taskRow(t)).join('') : '<p class="faint small">Nada pendente aqui.</p>'}</div>
          ${done.length ? `<details class="done-today"><summary>${done.length} concluído${done.length > 1 ? 's' : ''}</summary><div class="list">${done.map(t => P.taskRow(t)).join('')}</div></details>` : ''}

          <div class="block-head sub"><h3>Notas</h3><button class="btn ghost small" type="button" data-new-note>+ Nota</button></div>
          <div class="notes-mini">${notes.length ? notes.slice(0, 6).map(n => `<button type="button" class="note-mini" data-act="openNote" data-id="${n.id}">${n.drawing ? `<img src="${n.drawing}" alt="">` : ''}<span>${esc((n.text || '').slice(0, 140)) || 'Desenho'}</span><small class="mono faint">${P.fmtDate(P.iso(n.createdAt))}</small></button>`).join('') : '<p class="faint small">Sem notas ainda.</p>'}
          ${notes.length > 6 ? `<button class="link" type="button" data-all-notes>Ver todas as ${notes.length} notas →</button>` : ''}</div>

          <div class="form-actions split">
            <button class="btn ghost danger-t" type="button" data-delete>Apagar</button><span class="grow"></span>
            <button class="btn ghost" type="button" data-edit>Editar</button>
          </div>`;
      },
      mount: api => {
        const it = S.get('items', id); if (!it) return;
        if (editing) { itemForm(api.body.querySelector('.edit-host'), it, { close: () => { editing = false; api.refresh(); api.setTitle(S.get('items', id)?.title || ''); } }, true); return; }
        const b = api.body;
        P.$$('[data-edit]', b).forEach(x => x.onclick = () => { editing = true; api.refresh(); });
        P.$$('[data-inc]', b).forEach(x => x.onclick = () => { P.bump(id, x.dataset.inc, 1); api.refresh(); });
        P.$$('[data-dec]', b).forEach(x => x.onclick = () => { P.bump(id, x.dataset.dec, -1); api.refresh(); });
        P.$$('[data-inc10]', b).forEach(x => x.onclick = () => { P.bump(id, x.dataset.inc10, 10); api.refresh(); });
        P.$$('[data-setv]', b).forEach(f => f.onsubmit = e => {
          e.preventDefault(); const v = parseInt(f.v.value, 10); if (!Number.isFinite(v) || v < 0) return;
          const c = S.get('items', id).counters.find(x => x.key === f.dataset.setv); P.bump(id, f.dataset.setv, v - c.done); api.refresh();
        });
        P.$$('[data-status]', b).forEach(x => x.onclick = () => { S.patch('items', id, { status: x.dataset.status, ...P.finishFields(S.get('items', id), x.dataset.status) }); api.refresh(); });
        P.$$('[data-rate]', b).forEach(x => x.onclick = () => { S.patch('items', id, { rating: +x.dataset.rate }); api.refresh(); });
        b.querySelector('[data-new-task]').onclick = () => P.capture('prazo', { itemId: id });
        b.querySelector('[data-new-note]').onclick = () => P.capture('nota', { itemId: id });
        const all = b.querySelector('[data-all-notes]'); if (all) all.onclick = () => { api.close(); P.ui.notesArea = 'all'; P.ui.notesQ = it.title; P.go('notas'); };
        b.querySelector('[data-delete]').onclick = async () => {
          const n = S.all('tasks').filter(t => t.itemId === id).length + S.all('notes').filter(x => x.itemId === id).length;
          const ok = await P.ask(`Apagar “${it.title}”?${n ? ` As ${n} tarefas e notas ligadas a ele continuam existindo, mas ficam soltas.` : ''} Se só terminou, prefira marcar como concluído.`, 'Apagar');
          if (!ok) return;
          const undo = S.remove('items', id); api.close(); P.toast('Apagado.', { undo });
        };
      }
    });
    return sheet;
  };

  /* contador +1 / −1 com desfazer */
  P.finishFields = (it, status) => ['concluido', 'concluida'].includes(status)
    ? { finishedAt: it?.finishedAt || P.today() }
    : { finishedAt: null };

  P.bump = (id, key, delta) => {
    const it = S.get('items', id); if (!it) return;
    const c = it.counters.find(x => x.key === key); if (!c) return;
    const nextDone = Math.max(0, c.done + delta);
    const real = nextDone - c.done;
    if (!real) return;
    const today = P.today();
    S.patch('items', id, cur => {
      cur.counters = cur.counters.map(x => x.key === key ? { ...x, done: nextDone } : x);
      cur.touchedAt = Date.now();
      if (cur.area === 'leituras') {
        // diário de leitura: quantas páginas em cada dia (para a meta diária)
        cur.readLog = { ...(cur.readLog || {}) };
        cur.readLog[today] = Math.max(0, (cur.readLog[today] || 0) + real);
        // guarda só os últimos 60 dias
        Object.keys(cur.readLog).forEach(d => { if (d < P.addDays(today, -60)) delete cur.readLog[d]; });
        if (cur.status === 'quero' && real > 0) cur.status = 'lendo';
      }
      return cur;
    });
    if (real > 0) {
      const after = S.get('items', id); const pct = P.pct(after);
      const unit = real === 1 ? c.label.replace(/s$/, '') : c.label;
      const msg = c.total && nextDone >= c.total ? `${it.title}: ${c.label} completas! ✦` : `+${real} ${unit} em ${it.title}`;
      P.toast(msg, { undo: () => P.bump(id, key, -real) });
      if (pct === 100 && P.isActive(after)) setTimeout(() => P.toast('Chegou a 100%. Quer marcar como concluído? Abra o item.'), 600);
      const goal = S.settings().reading?.daily;
      if (it.area === 'leituras' && goal && c.label === 'páginas') {
        const before = P.pagesOn(today) - real;
        if (before < goal && before + real >= goal) setTimeout(() => P.toast(`Meta de leitura do dia batida: ${goal} páginas. ✦`), 900);
      }
    }
  };

  /* ---------- hábitos ---------- */
  P.manageHabits = () => P.sheet({
    title: 'Hábitos', kicker: 'pequenas rotinas',
    render: () => `<div class="list">${S.all('habits').sort((a, b) => a.order - b.order).map(h => `<div class="row habit-edit">
        <input class="inline-input" value="${esc(h.name)}" data-h="${h.id}" aria-label="Nome do hábito">
        <button class="icon-btn small" type="button" data-h-del="${h.id}" aria-label="Apagar ${esc(h.name)}">✕</button></div>`).join('')}</div>
      <form class="quick-add slim" data-h-add><input name="h" placeholder="Novo hábito, ex.: Ler 10 páginas" aria-label="Novo hábito"><button class="btn primary small" type="submit">Adicionar</button></form>`,
    mount: api => {
      P.$$('[data-h]', api.body).forEach(i => i.onchange = () => i.value.trim() && S.patch('habits', i.dataset.h, { name: i.value.trim() }));
      P.$$('[data-h-del]', api.body).forEach(b => b.onclick = () => { const undo = S.remove('habits', b.dataset.hDel); api.refresh(); P.toast('Hábito removido.', { undo }); });
      api.body.querySelector('[data-h-add]').onsubmit = e => {
        e.preventDefault(); const v = e.target.h.value.trim(); if (!v) return;
        S.put('habits', { name: v, order: S.all('habits').length, checks: {} }); api.refresh();
        setTimeout(() => api.body.querySelector('[data-h-add] input').focus(), 30);
      };
    }
  });

  /* ============================================================
     DESENHO
  ============================================================ */
  P.draw = (existing) => new Promise(resolve => {
    let result;
    const colors = ['#16131f', '#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed'];
    P.sheet({
      title: 'Desenhar', wide: true,
      render: () => `<div class="draw-tools">${colors.map((c, i) => `<button type="button" class="swatch ${i === 0 ? 'on' : ''}" style="--c:${c}" data-pen="${c}" aria-label="Cor ${i + 1}"></button>`).join('')}
          <span class="sep-v"></span>
          <button type="button" class="chip" data-size="3">fino</button><button type="button" class="chip on" data-size="5">médio</button><button type="button" class="chip" data-size="12">grosso</button>
          <span class="sep-v"></span><button type="button" class="chip" data-eraser>Borracha</button><button type="button" class="chip" data-undo>Desfazer</button><button type="button" class="chip" data-clear>Limpar</button></div>
        <canvas class="draw-canvas" width="1200" height="800" aria-label="Área de desenho"></canvas>
        <div class="form-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="button" data-use>Usar desenho</button></div>`,
      mount: api => {
        const cv = api.body.querySelector('canvas'), ctx = cv.getContext('2d');
        let pen = colors[0], size = 5, eraser = false, drawing = false, last = null;
        const history = [];
        const blank = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
        blank();
        if (existing) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, cv.width, cv.height); img.src = existing; }
        const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
        cv.addEventListener('pointerdown', e => { drawing = true; cv.setPointerCapture(e.pointerId); history.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (history.length > 20) history.shift(); last = pos(e); ctx.beginPath(); ctx.arc(last.x, last.y, (eraser ? size * 4 : size) / 2, 0, Math.PI * 2); ctx.fillStyle = eraser ? '#fff' : pen; ctx.fill(); });
        cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.strokeStyle = eraser ? '#fff' : pen; ctx.lineWidth = eraser ? size * 4 : size * (e.pressure && e.pointerType === 'pen' ? 0.5 + e.pressure : 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
        const end = () => { drawing = false; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
        const b = api.body;
        P.$$('[data-pen]', b).forEach(x => x.onclick = () => { pen = x.dataset.pen; eraser = false; P.$$('[data-pen]', b).forEach(y => y.classList.toggle('on', y === x)); b.querySelector('[data-eraser]').classList.remove('on'); });
        P.$$('[data-size]', b).forEach(x => x.onclick = () => { size = +x.dataset.size; P.$$('[data-size]', b).forEach(y => y.classList.toggle('on', y === x)); });
        b.querySelector('[data-eraser]').onclick = e => { eraser = !eraser; e.currentTarget.classList.toggle('on', eraser); };
        b.querySelector('[data-undo]').onclick = () => { const h = history.pop(); if (h) ctx.putImageData(h, 0, 0); };
        b.querySelector('[data-clear]').onclick = () => { history.push(ctx.getImageData(0, 0, cv.width, cv.height)); blank(); };
        b.querySelector('[data-cancel]').onclick = () => api.close();
        b.querySelector('[data-use]').onclick = () => {
          // reduz pra 900px e comprime: ~40–80 KB por desenho em vez de vários MB
          const out = document.createElement('canvas'); out.width = 900; out.height = 600;
          out.getContext('2d').drawImage(cv, 0, 0, 900, 600);
          let url = out.toDataURL('image/webp', 0.8);
          if (!url.startsWith('data:image/webp')) url = out.toDataURL('image/jpeg', 0.82);
          result = url; api.close();
        };
      },
      onClose: () => resolve(result)
    });
  });
})();
