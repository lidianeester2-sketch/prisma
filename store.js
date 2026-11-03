/* ============================================================
   PRISMA 2 — banco de dados local
   Tudo fica primeiro no aparelho (abre sem internet e é rápido).
   Cada registro tem id + updatedAt. O sync (sync.js) só envia
   os registros que mudaram ("sujos") e baixa os que mudaram lá.
============================================================ */
(function () {
  const KEY = 'prisma2:db';
  const DIRTY_KEY = 'prisma2:dirty';
  const COLS = ['items', 'tasks', 'notes', 'events', 'habits', 'meta', 'fin_conta', 'fin_cat', 'fin_lanc', 'fin_rec', 'fin_ciclo', 'fin_conc', 'fin_hist', 'fin_parc'];
  let db = {};
  let dirty = new Set();
  const listeners = new Set();

  const DEFAULT_SETTINGS = {
    id: 'settings',
    name: '',
    theme: 'prisma',
    playlist: '',
    semesterEnd: '2026-12-08',
    notify: { enabled: false, daysBefore: [0, 1, 3], classReminder: true, digestHour: '08:00' },
    tags: ['Conceito', 'Para a prova', 'Ideia', 'Referência', 'Citação', 'Decisão'],
    reading: { daily: null, yearly: null }
  };

  function blank() { const o = {}; COLS.forEach(c => (o[c] = {})); return o; }

  function load() {
    db = blank();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const parsed = JSON.parse(raw); COLS.forEach(c => (db[c] = parsed[c] || {})); }
    } catch (e) { console.warn('Prisma: banco local ilegível, começando do zero.', e); }
    try { dirty = new Set(JSON.parse(localStorage.getItem(DIRTY_KEY) || '[]')); } catch (e) { dirty = new Set(); }
    if (!db.meta.settings) seed();
    // garante campos novos em configurações antigas
    db.meta.settings = { ...DEFAULT_SETTINGS, ...db.meta.settings, notify: { ...DEFAULT_SETTINGS.notify, ...(db.meta.settings.notify || {}) } };
  }

  const persist = P.debounce(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      localStorage.setItem(DIRTY_KEY, JSON.stringify([...dirty]));
    } catch (e) {
      P.toast('O armazenamento do aparelho encheu. Apague desenhos antigos ou ative a sincronização.');
    }
  }, 150);

  function emit(info) { persist(); listeners.forEach(fn => { try { fn(info); } catch (e) { console.error(e); } }); }

  function touch(col, rec) {
    const now = Date.now();
    rec.updatedAt = now;
    if (!rec.createdAt) rec.createdAt = now;
    db[col][rec.id] = rec;
    dirty.add(col + ':' + rec.id);
  }

  const S = P.store = {
    load,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all(col) { return Object.values(db[col] || {}).filter(r => !r.deleted); },
    get(col, id) { const r = db[col]?.[id]; return r && !r.deleted ? r : null; },
    put(col, rec, opts = {}) {
      rec = { ...rec };
      if (!rec.id) rec.id = P.uid();
      touch(col, rec);
      if (!opts.silent) emit({ col, id: rec.id });
      return rec;
    },
    patch(col, id, changes) {
      const cur = db[col]?.[id]; if (!cur) return null;
      const next = typeof changes === 'function' ? changes(structuredClone(cur)) : { ...cur, ...changes };
      touch(col, next); emit({ col, id }); return next;
    },
    remove(col, id) {
      const cur = db[col]?.[id]; if (!cur) return;
      const backup = structuredClone(cur);
      touch(col, { id, deleted: true, createdAt: cur.createdAt });
      emit({ col, id });
      return () => { touch(col, { ...backup }); emit({ col, id }); };
    },
    batch(fn) { fn(); emit({ col: '*' }); },

    settings() { return db.meta.settings; },
    setSettings(changes) {
      const cur = db.meta.settings;
      const next = { ...cur, ...changes };
      touch('meta', next); emit({ col: 'meta', id: 'settings' });
    },

    /* ---- usados pelo sync ---- */
    dirtyRecords() {
      return [...dirty].map(k => { const [col, ...rest] = k.split(':'); const id = rest.join(':'); return { key: k, col, id, rec: db[col]?.[id] }; }).filter(x => x.rec);
    },
    markClean(keys) { keys.forEach(k => dirty.delete(k)); persist(); },
    applyRemote(rows, remoteWins = false) {
      let changed = 0;
      rows.forEach(row => {
        const col = row.collection; if (!COLS.includes(col)) return;
        const local = db[col][row.id];
        const remote = { ...row.data, id: row.id, deleted: row.deleted || undefined };
        const isDirty = dirty.has(col + ':' + row.id);
        if (remoteWins || !local || !isDirty || (remote.updatedAt || 0) >= (local.updatedAt || 0)) {
          db[col][row.id] = remote; dirty.delete(col + ':' + row.id); changed++;
        }
      });
      if (changed) emit({ col: '*', remote: true });
      return changed;
    },
    markAllDirty() { COLS.forEach(c => Object.keys(db[c]).forEach(id => dirty.add(c + ':' + id))); persist(); },

    /* ---- backup ---- */
    exportJSON() { return JSON.stringify({ app: 'prisma', version: 2, exportedAt: new Date().toISOString(), db }, null, 1); },
    importJSON(obj) {
      if (!obj || !obj.db) throw new Error('Arquivo não parece um backup do Prisma 2.');
      db = blank(); COLS.forEach(c => (db[c] = obj.db[c] || {}));
      if (!db.meta.settings) db.meta.settings = { ...DEFAULT_SETTINGS };
      S.markAllDirty(); emit({ col: '*' });
    },
    /* Apaga todos os registros, mas guarda as preferências (nome, tema, notificações).
       Cada registro vira uma "lápide" (deleted) para o apagamento chegar na nuvem e nos outros aparelhos. */
    wipe() {
      ['items', 'tasks', 'notes', 'events', 'habits'].forEach(c => Object.values(db[c]).forEach(r => { if (!r.deleted) touch(c, { id: r.id, deleted: true, createdAt: r.createdAt }); }));
      emit({ col: '*' });
    },
    removeSeeded() { ['items', 'tasks', 'notes', 'habits'].forEach(c => Object.values(db[c]).forEach(r => { if (r.seed && !r.deleted) touch(c, { id: r.id, deleted: true }); })); },
    /* Registro "de partida" (categorias padrão, contas fixas do ciclo): fica só no aparelho,
       com data antiga, até você mexer nele. Assim nunca sobrescreve o que veio de outro aparelho. */
    seed(col, rec) {
      if (db[col][rec.id]) return db[col][rec.id];
      db[col][rec.id] = { ...rec, createdAt: Date.now(), updatedAt: 0 };
      persist();
      return db[col][rec.id];
    },
    /* Remove registros SÓ deste aparelho (não apaga na nuvem). Usado no "Esqueci o PIN". */
    purgeLocal(cols) {
      cols.forEach(c => { db[c] = {}; [...dirty].forEach(k => { if (k.startsWith(c + ':')) dirty.delete(k); }); });
      if (db.meta.finprofile) { delete db.meta.finprofile; dirty.delete('meta:finprofile'); }
      emit({ col: '*', remote: true });
    },
    raw() { return db; }
  };

  /* ---------- primeiros dados ---------- */
  function seed() {
    db.meta.settings = { ...DEFAULT_SETTINGS };
    dirty.add('meta:settings');
    // Semestre 2026.2 — mesmas matérias e calendário que estavam fixos no código antigo.
    // Agora são dados normais: dá pra editar, arquivar e trocar no próximo semestre.
    const subjects = [
      ['VIV0106', 'Inovação e Empreendedorismo', 5, '20:50', '22:30', 3, '💡'],
      ['VIV0481', 'Profissões em Comunicação', 2, '19:00', '20:40', 4, '🎙️'],
      ['VIV0727', 'História da Mídia', 3, '19:00', '20:40', 1, '📺'],
      ['VIV0750', 'Computação Gráfica e Editoração', 4, '20:50', '22:30', 6, '🖥️'],
      ['ARA6403', 'LABVIDA Publicidade e Propaganda 1', null, '', '', 0, '🎨'],
      ['ARA1739', 'Língua Portuguesa', null, '', '', 2, '📖']
    ];
    // ids fixos: assim dois aparelhos novos não duplicam as mesmas matérias ao sincronizar
    subjects.forEach(([code, title, dow, start, end, color, emoji]) => {
      const id = 'seed-' + code;
      db.items[id] = {
        id, area: 'faculdade', title, code, sub: '', color, emoji, status: 'cursando', seed: true,
        online: dow === null, schedule: dow === null ? [] : [{ dow, start, end }],
        counters: [{ key: 'aulas', label: 'aulas', done: 0, total: null }, { key: 'ativ', label: 'atividades', done: 0, total: null }],
        start: '2026-08-04', end: '2026-12-08', createdAt: Date.now(), updatedAt: Date.now()
      };
      dirty.add('items:' + id);
    });
    ['Fui à aula', 'Estudei um pouco', 'Revisei anotações', 'Bebi água'].forEach((name, i) => {
      const id = 'seed-habit-' + i;
      db.habits[id] = { id, name, order: i, checks: {}, seed: true, createdAt: Date.now(), updatedAt: Date.now() };
      dirty.add('habits:' + id);
    });
    P.ACADEMIC_2026_2.forEach(([date, cat, title]) => {
      const id = 'ev-' + date + '-' + title.slice(0, 18).normalize('NFD').replace(/[^\w]/g, '').toLowerCase();
      db.events[id] = { id, date, cat, title, source: 'calendario-2026.2', createdAt: Date.now(), updatedAt: Date.now() };
      dirty.add('events:' + id);
    });
  }

  P.ACADEMIC_2026_2 = [
    ['2026-04-03','feriado','Sexta-feira Santa'],['2026-04-21','feriado','Tiradentes'],['2026-06-04','feriado','Corpus Christi'],
    ['2026-06-24','evento','Boleto para renovação de matrícula 2026.2 disponível'],['2026-07-10','prazo','Início da matrícula dirigida'],
    ['2026-07-11','prazo','Término da matrícula dirigida'],
    ['2026-07-16','prazo','Início: renovação de matrícula, movimentação de grade, inclusão/exclusão sem taxa, trancamento sem taxa e transferências'],
    ['2026-07-28','evento','Liberação da Sala de Aula Virtual e acesso às disciplinas on-line'],['2026-08-04','evento','Início das aulas — Veteranos'],
    ['2026-08-18','evento','Início das aulas — Calouros'],['2026-09-07','feriado','Independência do Brasil'],
    ['2026-09-15','prova','Início do simulado — disciplinas on-line'],['2026-09-16','prazo','Início do agendamento da Prova AV — on-line/TEAMS'],
    ['2026-09-21','prazo','Término das solicitações de MSV, TE e 2º curso'],['2026-09-21','prova','Início do simulado 1 — disciplinas TEAMS'],
    ['2026-09-24','prazo','Início do agendamento da Prova AVS — on-line/TEAMS'],['2026-09-26','prova','Término do simulado 1 — disciplinas TEAMS'],
    ['2026-09-28','evento','Início da Semana Acadêmica de Cursos'],['2026-09-29','prova','Início da Prova AV — disciplinas on-line'],
    ['2026-10-02','evento','Término da Semana Acadêmica de Cursos'],['2026-10-05','prazo','Término da reabertura de matrícula'],
    ['2026-10-06','prova','Início da Prova AVS — disciplinas on-line'],
    ['2026-10-08','prazo','Término: renovação de matrícula, movimentação de grade, exclusão sem taxa, trancamento sem taxa e transferências'],
    ['2026-10-09','prazo','Início: exclusão de disciplina e trancamento com cobrança de taxa'],['2026-10-12','feriado','Nossa Senhora Aparecida'],
    ['2026-10-15','evento','Dia do Professor'],['2026-10-21','prazo','Início da pré-matrícula 2027.1 (contrato educacional)'],
    ['2026-11-02','feriado','Finados'],['2026-11-09','prova','Início do simulado 2 — disciplinas TEAMS'],
    ['2026-11-14','prova','Término do simulado 2 — disciplinas TEAMS'],['2026-11-15','feriado','Proclamação da República'],
    ['2026-11-19','prazo','Término do agendamento da Prova AV — on-line/TEAMS'],['2026-11-19','prova','Término do simulado — disciplinas on-line'],
    ['2026-11-20','feriado','Consciência Negra'],['2026-11-21','prova','Término da Prova AV — disciplinas on-line'],
    ['2026-11-23','prova','Início das Provas AV e AVS — disciplinas TEAMS'],['2026-11-25','prazo','Término da pré-matrícula 2027.1'],
    ['2026-11-28','prazo','Data limite de permanência em campo de estágio obrigatório'],
    ['2026-12-01','prazo','Término das disciplinas on-line NF (Estágio, Extensão e TCC) e data limite documentação de estágio'],
    ['2026-12-03','prazo','Término do agendamento da Prova AVS — on-line/TEAMS'],
    ['2026-12-05','prova','Término das Provas AV e AVS — TEAMS, e da Prova AVS on-line'],
    ['2026-12-08','prazo','Encerramento do semestre letivo: notas, exclusão/trancamento com taxa, AAC externa'],
    ['2026-12-25','feriado','Natal']
  ];

  /* ---------- regras de negócio compartilhadas ---------- */
  P.pct = item => {
    const cs = (item.counters || []).filter(c => c.total);
    if (!cs.length) return null;
    return Math.round(cs.reduce((s, c) => s + P.clamp(c.done / c.total, 0, 1), 0) / cs.length * 100);
  };
  P.taskPct = t => t.done ? 100 : (t.steps?.length ? Math.round(t.steps.filter(s => s.done).length / t.steps.length * 100) : 0);
  P.isActive = it => P.ACTIVE.includes(it.status);
  P.itemName = id => { const it = id && S.get('items', id); return it ? it.title : ''; };

  /* Plano automático até a data (mesma lógica do antigo, com datas locais) */
  P.makeSteps = (dueISO, kind) => {
    const total = Math.max(1, P.daysUntil(dueISO));
    let tpl;
    if (kind === 'prova') tpl = total > 10 ? [['Montar resumo', .3], ['Fazer exercícios', .65], ['Revisão final', .9]] : [['Resumo', .4], ['Revisão final', .85]];
    else if (kind === 'reuniao') tpl = [['Preparar pauta', .7]];
    else if (total > 14) tpl = [['Pesquisar e planejar', .15], ['Fazer o rascunho', .5], ['Revisar', .8], ['Entregar', 1]];
    else if (total > 6) tpl = [['Planejar', .2], ['Desenvolver', .65], ['Revisar e entregar', 1]];
    else tpl = [['Fazer', .5], ['Entregar', 1]];
    return tpl.map(([label, f]) => ({ id: P.uid(), label, date: P.addDays(P.today(), Math.round(total * f)), done: false }));
  };

  /* Aulas que acontecem num dia */
  P.classesOn = iso => {
    const dow = P.parse(iso).getDay();
    const holiday = S.all('events').some(e => e.date === iso && e.cat === 'feriado');
    return S.all('items')
      .filter(it => it.area === 'faculdade' && it.status === 'cursando' && (!it.start || iso >= it.start) && (!it.end || iso <= it.end))
      .flatMap(it => (it.schedule || []).filter(s => s.dow === dow).map(s => ({ item: it, start: s.start, end: s.end, holiday })))
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  };

  P.nextClass = () => {
    for (let i = 0; i < 14; i++) {
      const day = P.addDays(P.today(), i);
      const list = P.classesOn(day).filter(c => !c.holiday && (i > 0 || P.minutes(c.end || c.start) > P.nowMinutes()));
      if (list.length) return { ...list[0], day, offset: i };
    }
    return null;
  };
})();
