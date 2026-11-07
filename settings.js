/* ============================================================
   PRISMA 2 — Ajustes, backup e importação do Prisma antigo
============================================================ */
(function () {
  const S = P.store, esc = P.esc;
  P.mounts = P.mounts || {};

  const THEMES = [
    ['prisma', 'Lavanda', 'Claro, com lilás (padrão)'],
    ['menta', 'Menta', 'Claro, com verde'],
    ['malva', 'Malva', 'Tons rosados e terrosos'],
    ['sol', 'Sol', 'Ameixa, coral e amarelo'],
    ['escuro', 'Escuro', 'Mesmo estilo, fundo escuro'],
    ['auto', 'Automático', 'Lavanda de dia, Escuro à noite']
  ];

  P.views.ajustes = () => {
    const st = S.settings();
    const n = st.notify;
    const sync = P.sync?.state() || {};
    const notifState = !('Notification' in window) ? 'unsupported' : Notification.permission;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return `
    <header class="page-head"><h1>Ajustes</h1><p class="lede">Deixe o Prisma com a sua cara e conecte seus aparelhos.</p></header>
    <div class="settings">

      <section class="block set">
        <h2>Seu foco</h2>
        <p class="hint">O Prisma mostra só o que você marcar. Dá para mudar quando quiser; nada é apagado.</p>
        <div class="ob-focus compact">${Object.entries(P.FOCUS).map(([k, f]) => `<button type="button" class="ob-opt ${P.focus().includes(k) ? 'on' : ''}" data-act="toggleFocus" data-k="${k}" aria-pressed="${P.focus().includes(k)}"><span class="ob-ico f-${k}">${f.icon}</span><span><b>${f.label}</b><small>${f.desc}</small></span><span class="ob-check" aria-hidden="true">✓</span></button>`).join('')}</div>
      </section>

      <section class="block set">
        <h2>Você</h2>
        <form class="form" data-form="profile">
          <label class="field"><span class="field-label">Como o Prisma te chama</span><input id="set-name" name="name" value="${esc(st.name)}" placeholder="Seu nome"></label>
          ${P.focus().includes('faculdade') ? `<label class="field"><span class="field-label">Fim do semestre</span><input id="set-sem" type="date" name="semesterEnd" value="${st.semesterEnd || ''}"></label>` : ''}
          <div class="form-actions"><button class="btn primary small" type="submit">Salvar</button></div>
        </form>
      </section>

      <section class="block set ${P.focus().includes('leituras') ? '' : 'is-hidden'}">
        <h2>Metas de leitura</h2>
        <form class="form" data-form="reading">
          <div class="row-fields">
            <label class="field"><span class="field-label">Páginas por dia</span><input id="set-rd" name="daily" inputmode="numeric" value="${st.reading?.daily || ''}" placeholder="ex.: 20"></label>
            <label class="field"><span class="field-label">Livros em ${new Date().getFullYear()}</span><input id="set-ry" name="yearly" inputmode="numeric" value="${st.reading?.yearly || ''}" placeholder="ex.: 12"></label>
          </div>
          <span class="hint">Deixe em branco para não ter meta. As páginas contam quando você usa +1, +10 ou “Parei na página” numa leitura.</span>
          <div class="form-actions"><button class="btn primary small" type="submit">Salvar</button></div>
        </form>
      </section>

      <section class="block set">
        <h2>Aparência</h2>
        <div class="themes">${THEMES.map(([k, l, d]) => `<button type="button" class="theme ${({ claro: 'prisma', grafite: 'escuro', ambar: 'sol' }[st.theme] || st.theme) === k ? 'on' : ''}" data-act="setTheme" data-t="${k}" aria-pressed="${st.theme === k}"><span class="theme-sw sw-${k}"></span><strong>${l}</strong><small>${d}</small></button>`).join('')}</div>
      </section>

      <section class="block set">
        <h2>${sync.builtIn ? 'Sua conta' : 'Sincronização'}</h2>
        <p class="lede small">${sync.builtIn ? 'Seus dados ficam guardados na sua conta e aparecem em qualquer aparelho em que você entrar.' : 'Para ver os mesmos dados no computador e no celular. Sem isso, tudo fica salvo só neste aparelho.'}</p>
        ${!sync.configured ? `
          <div class="notice">Ainda não conectado. Siga o guia <b>APPWRITE.md</b> que veio junto com o projeto (leva uns 15 minutos) e cole aqui os dois códigos.</div>
          <form class="form" data-form="appw">
            <label class="field"><span class="field-label">API Endpoint</span><input id="aw-endpoint" name="url" placeholder="https://nyc.cloud.appwrite.io/v1" autocomplete="off"></label>
            <label class="field"><span class="field-label">Project ID</span><input id="aw-project" name="key" placeholder="ex.: 6720f1a2003b4c5d6e7f" autocomplete="off"></label>
            <div class="form-actions"><button class="btn primary small" type="submit">Conectar</button></div>
          </form>` : !sync.user ? `
          <form class="form" data-form="login">
            <label class="field"><span class="field-label">E-mail</span><input id="login-email" name="email" type="email" autocomplete="email" required></label>
            <label class="field"><span class="field-label">Senha</span><input id="login-pw" name="pw" type="password" autocomplete="current-password" required minlength="8"></label>
            <div class="form-actions split"><button class="btn ghost small" type="button" data-act="supaReset">Trocar projeto</button><span class="grow"></span>
              <button class="btn ghost small" type="submit" name="mode" value="signup">Criar conta</button><button class="btn primary small" type="submit" name="mode" value="login">Entrar</button></div>
          </form>` : `
          <div class="sync-box">
            <div><span class="status-dot ${sync.status}"></span><strong>${esc(sync.user.email)}</strong><small>${P.sync.label()}</small></div>
            <div class="form-actions split"><button class="btn ghost small" type="button" data-act="signOut">Sair</button><span class="grow"></span><button class="btn primary small" type="button" data-act="syncNow">Sincronizar agora</button></div>
          </div>
          <div class="data-actions">
            <button type="button" class="data-btn" data-act="invite"><strong>Convidar alguém</strong><small>Gera um link para outra pessoa usar o Prisma com a conta dela. Cada conta só vê os próprios dados.</small></button>
          </div>`}
      </section>

      <section class="block set">
        <h2>Notificações</h2>
        ${notifState === 'unsupported' ? `<div class="notice">${isIOS && !standalone ? 'No iPhone, as notificações só funcionam com o Prisma instalado: toque em Compartilhar → “Adicionar à Tela de Início” e abra por lá.' : 'Este navegador não suporta notificações.'}</div>` : `
        <div class="sync-box"><div><span class="status-dot ${notifState === 'granted' && n.enabled ? 'ok' : notifState === 'denied' ? 'error' : 'idle'}"></span>
          <strong>${notifState === 'granted' && n.enabled ? 'Ativadas neste aparelho' : notifState === 'denied' ? 'Bloqueadas no navegador' : 'Desativadas'}</strong>
          <small>${notifState === 'denied' ? 'Libere nas configurações do site (cadeado na barra de endereço).' : P.push?.label() || ''}</small></div>
          <div class="form-actions split"><span class="grow"></span>${notifState === 'granted' && n.enabled ? `<button class="btn ghost small" type="button" data-act="testNotif">Testar</button><button class="btn ghost small" type="button" data-act="disableNotif">Desativar</button>` : notifState !== 'denied' ? `<button class="btn primary small" type="button" data-act="enableNotif">Ativar</button>` : ''}</div></div>
        <div class="field"><span class="field-label">Avisar sobre prazos</span>
          <div class="chips compact">${[[0, 'no dia'], [1, '1 dia antes'], [3, '3 dias antes'], [7, '1 semana antes']].map(([d, l]) => `<button type="button" class="chip ${n.daysBefore.includes(d) ? 'on' : ''}" data-act="notifDay" data-d="${d}">${l}</button>`).join('')}</div></div>
        <label class="check-line"><input type="checkbox" id="notif-class" data-act="notifClass" ${n.classReminder ? 'checked' : ''}> Lembrar 1 hora antes de cada aula</label>
        <label class="field inline"><span class="field-label">Resumo do dia às</span><input type="time" id="notif-hour" value="${n.digestHour || '08:00'}" data-change="digestHour"></label>`}
      </section>

      <section class="block set">
        <h2>Calendário acadêmico</h2>
        <p class="lede small">${S.all('events').length} datas cadastradas. Elas aparecem na Agenda e entram nos avisos.</p>
        <div class="form-actions split"><button class="btn ghost small" type="button" data-act="manageEvents">Ver e editar datas</button><span class="grow"></span><button class="btn ghost small" type="button" data-act="capture" data-type="evento">+ Data</button></div>
      </section>

      <section class="block set ${P.hasPrisma() ? '' : 'is-hidden'}">
        <h2>Trilha de estudo</h2>
        <form class="form" data-form="playlist">
          <label class="field"><span class="field-label">Link de uma playlist pública do YouTube</span><input id="set-pl" name="pl" value="${st.playlist ? 'https://www.youtube.com/playlist?list=' + esc(st.playlist) : ''}" placeholder="https://www.youtube.com/playlist?list=…"></label>
          <div class="form-actions"><button class="btn primary small" type="submit">Salvar</button></div>
        </form>
      </section>

      <section class="block set">
        <h2>Seus dados</h2>
        <div class="data-actions">
          <button class="data-btn" type="button" data-act="importOld"><strong>Trazer dados do Prisma antigo</strong><small>Matérias, progresso, prazos, tarefas, projetos, leituras, notas e hábitos.</small></button>
          <button class="data-btn" type="button" data-act="exportBackup"><strong>Baixar backup</strong><small>Um arquivo .json com tudo. Bom de guardar antes de mudanças grandes.</small></button>
          <label class="data-btn"><strong>Restaurar backup</strong><small>Substitui os dados deste aparelho pelos do arquivo.</small><input type="file" id="backup-file" accept="application/json,.json" data-change="restore" hidden></label>
          <button class="data-btn danger" type="button" data-act="wipe"><strong>Apagar todos os registros</strong><small>Matérias, projetos, leituras, tarefas, notas, hábitos e calendário somem de todos os aparelhos. Suas preferências continuam. Não dá pra desfazer.</small></button>
        </div>
      </section>

      <p class="credits">Prisma · versão 22 · Desenvolvido por Lidiane Tavares<br><button class="link" type="button" data-act="repair">Atualizar o app (baixa a versão mais nova; seus dados ficam)</button></p>
    </div>`;
  };

  P.mounts.ajustes = root => {
    const f = sel => root.querySelector(`[data-form="${sel}"]`);
    f('profile') && (f('profile').onsubmit = e => { e.preventDefault(); S.setSettings({ name: e.target.name.value.trim(), ...(e.target.semesterEnd ? { semesterEnd: e.target.semesterEnd.value || null } : {}) }); P.toast('Salvo.'); });
    f('reading') && (f('reading').onsubmit = e => {
      e.preventDefault();
      const n = v => { const x = parseInt(String(v).trim(), 10); return Number.isFinite(x) && x > 0 ? x : null; };
      S.setSettings({ reading: { daily: n(e.target.daily.value), yearly: n(e.target.yearly.value) } }); P.toast('Metas salvas.');
    });
    f('playlist') && (f('playlist').onsubmit = e => {
      e.preventDefault(); const v = e.target.pl.value.trim();
      const m = v.match(/[?&]list=([\w-]+)/) || v.match(/^([\w-]{12,})$/);
      if (v && !m) { P.toast('Não encontrei o código da playlist nesse link. Ele precisa ter “list=”.'); return; }
      S.setSettings({ playlist: m ? m[1] : '' }); P.toast(m ? 'Playlist salva.' : 'Playlist removida.');
    });
    f('appw') && (f('appw').onsubmit = async e => { e.preventDefault(); await P.sync.configure(e.target.url.value.trim(), e.target.key.value.trim()); P.render(); });
    f('login') && (f('login').onsubmit = async e => {
      e.preventDefault(); const mode = e.submitter?.value || 'login';
      const ok = await P.sync.auth(mode, e.target.email.value.trim(), e.target.pw.value);
      if (ok) P.render();
    });
    const hour = root.querySelector('[data-change="digestHour"]');
    hour && (hour.onchange = () => S.setSettings({ notify: { ...S.settings().notify, digestHour: hour.value } }));
    const file = root.querySelector('[data-change="restore"]');
    file && (file.onchange = async () => {
      const fl = file.files[0]; if (!fl) return;
      try {
        const obj = JSON.parse(await fl.text());
        if (!(await P.ask('Substituir os dados deste aparelho pelos do backup?', 'Restaurar'))) return;
        S.importJSON(obj); P.toast('Backup restaurado.');
      } catch (err) { P.toast(err.message || 'Arquivo inválido.'); }
      file.value = '';
    });
  };

  /* ---------- ações dos ajustes ---------- */
  Object.assign(P.actions, {
    setTheme: el => { S.setSettings({ theme: el.dataset.t }); P.applyTheme(); },
    notifDay: el => { const d = +el.dataset.d; const n = S.settings().notify; const days = n.daysBefore.includes(d) ? n.daysBefore.filter(x => x !== d) : [...n.daysBefore, d].sort((a, b) => a - b); S.setSettings({ notify: { ...n, daysBefore: days } }); },
    notifClass: el => S.setSettings({ notify: { ...S.settings().notify, classReminder: el.checked } }),
    enableNotif: () => P.push.enable(),
    disableNotif: () => P.push.disable(),
    testNotif: () => P.push.test(),
    syncNow: () => P.sync.now(true),
    signOut: () => P.sheet({
      title: 'Sair da conta', kicker: P.sync.state().user?.email || '',
      render: () => P.sync.state().builtIn ? `<p class="lede">Antes de sair, o Prisma guarda na sua conta o que ainda não subiu. Depois, os dados saem deste aparelho e voltam quando você entrar de novo.</p>
        <div class="form-actions"><button class="btn primary" type="button" data-out="wipe">Sair</button></div>` : `<p class="lede">Antes de sair, o Prisma manda para a nuvem o que ainda não subiu.</p>
        <div class="data-actions">
          <button type="button" class="data-btn" data-out="keep"><strong>Sair e manter os dados aqui</strong><small>Para quando o aparelho é só seu.</small></button>
          <button type="button" class="data-btn" data-out="wipe"><strong>Sair e apagar deste aparelho</strong><small>Para aparelho emprestado ou de outra pessoa. Tudo continua guardado na sua conta; é só entrar de novo.</small></button>
        </div>`,
      mount: api => P.$$('[data-out]', api.body).forEach(b => b.onclick = async () => {
        b.disabled = true;
        const ok = await P.sync.signOut(b.dataset.out === 'wipe');
        if (ok !== false) { api.close(); P.toast(b.dataset.out === 'wipe' ? 'Você saiu. Seus dados continuam na sua conta.' : 'Você saiu da conta.'); P.go(P.home()); } else b.disabled = false;
      })
    }),
    toggleFocus: el => {
      const k = el.dataset.k, cur = P.focus();
      const next = cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k];
      if (!next.length) { P.toast('Deixe pelo menos um foco marcado.'); return; }
      S.setSettings({ focus: next }); P.applyFocus(); P.render();
      P.toast(cur.includes(k) ? `${P.FOCUS[k].label} saiu do app (seus dados continuam guardados).` : `${P.FOCUS[k].label} voltou para o app.`);
    },
    invite: async () => {
      const link = P.sync.inviteLink(); if (!link) return;
      try { await navigator.clipboard.writeText(link); P.toast('Link copiado! Mande para a pessoa: ela abre, cria a conta dela e pronto.'); }
      catch (e) { P.ask(`Copie e mande este link:\n${link}`, 'Ok', false); }
    },
    supaReset: () => { P.sync.reset(); P.render(); },
    exportBackup: () => {
      const blob = new Blob([S.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `prisma-backup-${P.today()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      P.toast('Backup baixado.');
    },
    wipe: async () => { if (await P.ask('Apagar matérias, projetos, leituras, tarefas, notas, hábitos e todas as datas do calendário? Some do computador e do celular. Nome, tema e notificações continuam como estão.', 'Apagar tudo')) { S.wipe(); P.toast('Tudo apagado. Prisma zerado. ✦'); } },
    manageEvents: () => manageEvents(),
    importOld: () => importOldSheet()
  });

  function manageEvents() {
    P.sheet({
      title: 'Calendário acadêmico', wide: true,
      render: () => {
        const evs = S.all('events').sort((a, b) => a.date.localeCompare(b.date));
        return `<p class="lede small">Toque numa data para editar. No próximo semestre, apague as antigas e cadastre as novas.</p>
          <div class="list">${evs.map(e => `<button type="button" class="row event as-btn" data-ev="${e.id}" style="--c:${P.EVENT_CATS[e.cat]?.color}"><span class="ev-mark"></span><span class="row-main as-text"><span class="row-title">${esc(e.title)}</span><span class="row-meta">${P.EVENT_CATS[e.cat]?.label}</span></span><span class="when mono">${P.fmtDate(e.date)} ${e.date.slice(0, 4)}</span></button>`).join('')}</div>
          <div class="form-actions split"><button class="btn ghost danger-t small" type="button" data-past>Apagar datas que já passaram</button><span class="grow"></span></div>`;
      },
      mount: api => {
        P.$$('[data-ev]', api.body).forEach(b => b.onclick = () => P.openEvent(b.dataset.ev));
        api.body.querySelector('[data-past]').onclick = async () => {
          const past = S.all('events').filter(e => e.date < P.today());
          if (!past.length) { P.toast('Nenhuma data passada.'); return; }
          if (!(await P.ask(`Apagar ${past.length} datas que já passaram?`, 'Apagar'))) return;
          S.batch(() => past.forEach(e => S.remove('events', e.id))); api.refresh();
        };
      }
    });
  }

  /* ============================================================
     IMPORTAR DO PRISMA ANTIGO
     1º tenta a cópia que o app antigo guardou neste navegador
     (prisma-mirror:*). Se não houver, busca direto na planilha.
  ============================================================ */
  const OLD_SHEET = 'https://script.google.com/macros/s/AKfycbzjqZ29NlsU7x_x5FVt9325FAFJPcsHGoh0Jr1jwibo1oYKq7QG8DHLObPXXbD6-EBq/exec';
  const OLD_KEYS = ['user-name', 'subjects-list', 'subjects-archived', 'course-progress', 'quicktasks', 'assignments', 'notes-list', 'youtube-playlist', 'habits-config',
    'proj-list', 'proj-progress', 'proj-quicktasks', 'proj-deliverables', 'proj-notes-list', 'leit-list', 'leit-quicktasks', 'leit-notes-list'];

  function importOldSheet() {
    P.sheet({
      title: 'Trazer dados do Prisma antigo',
      render: () => `<p class="lede small">Vou ler os dados do app antigo e trazer tudo para o novo formato. Nada é apagado da planilha antiga.</p>
        <form class="form" data-imp>
          <label class="field"><span class="field-label">Endereço da planilha (Apps Script)</span><input id="imp-url" name="url" value="${OLD_SHEET}"></label>
          <label class="check-line"><input type="checkbox" name="replace" checked> Remover as matérias e hábitos de exemplo antes de importar</label>
          <div class="imp-log mono small" aria-live="polite"></div>
          <div class="form-actions"><button class="btn primary" type="submit">Importar</button></div>
        </form>`,
      mount: api => {
        api.body.querySelector('[data-imp]').onsubmit = async e => {
          e.preventDefault();
          const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Importando…';
          const log = api.body.querySelector('.imp-log');
          const say = t => { log.innerHTML += esc(t) + '<br>'; };
          try {
            const data = await readOld(e.target.url.value.trim(), say);
            const r = convertOld(data, e.target.replace.checked);
            say(`Pronto: ${r.items} itens, ${r.tasks} tarefas/prazos, ${r.notes} notas, ${r.habits} hábitos.`);
            P.toast('Dados importados. ✦');
            btn.textContent = 'Concluído';
          } catch (err) {
            console.error(err); say('Erro: ' + (err.message || err)); btn.disabled = false; btn.textContent = 'Tentar de novo';
          }
        };
      }
    });
  }

  async function readOld(url, say) {
    const out = {};
    let fromMirror = 0;
    OLD_KEYS.forEach(k => { try { const v = localStorage.getItem('prisma-mirror:' + k); if (v !== null) { out[k] = v; fromMirror++; } } catch (e) {} });
    if (fromMirror) say(`Encontrei ${fromMirror} conjuntos de dados salvos neste navegador.`);
    const missing = OLD_KEYS.filter(k => !(k in out));
    if (missing.length && url) {
      say('Buscando o restante na planilha…');
      const results = await Promise.all(missing.map(async k => {
        try { const res = await fetch(`${url}?action=get&key=${encodeURIComponent(k)}`); const j = await res.json(); return [k, j?.value ?? null]; }
        catch (e) { return [k, undefined]; }
      }));
      let ok = 0, fail = 0;
      results.forEach(([k, v]) => { if (v === undefined) fail++; else if (v !== null) { out[k] = v; ok++; } });
      say(`Planilha: ${ok} encontrados${fail ? `, ${fail} sem resposta` : ''}.`);
      if (fail === missing.length && !fromMirror) throw new Error('Não consegui falar com a planilha. Confira o endereço (abra ele no navegador pra testar) e sua internet.');
    }
    const parsed = {};
    Object.entries(out).forEach(([k, v]) => { try { parsed[k] = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { parsed[k] = v; } });
    return parsed;
  }

  function convertOld(d, replace) {
    const count = { items: 0, tasks: 0, notes: 0, habits: 0 };
    const now = Date.now();
    S.batch(() => {
      if (replace) S.removeSeeded();
      const settings = {};
      if (typeof d['user-name'] === 'string' && d['user-name'].trim()) settings.name = d['user-name'].trim();
      if (typeof d['youtube-playlist'] === 'string' && d['youtube-playlist']) settings.playlist = d['youtube-playlist'];
      if (Object.keys(settings).length) S.setSettings(settings);

      // matérias
      const subjIds = {};
      const prog = d['course-progress'] || {};
      const subjects = [...(Array.isArray(d['subjects-list']) ? d['subjects-list'] : []), ...(Array.isArray(d['subjects-archived']) ? d['subjects-archived'].map(s => ({ ...s, _arch: true })) : [])];
      subjects.forEach((s, i) => {
        const p = prog[s.code] || {};
        const [start, end] = String(s.time || '').split(/[–-]/).map(x => x.trim());
        const hasTime = s.dayIdx !== null && s.dayIdx !== undefined && /^\d{1,2}:\d{2}$/.test(start || '');
        const rec = S.put('items', {
          area: 'faculdade', title: s.name, code: s.code, sub: s.teacher || '', emoji: s.icon || '📚', color: i,
          status: s._arch ? 'concluida' : 'cursando', online: s.type === 'online',
          schedule: hasTime ? [{ dow: (Number(s.dayIdx) + 1) % 7, start, end: end || '' }] : [],
          counters: [{ key: 'aulas', label: 'aulas', done: +p.aulas || 0, total: p.aulasTotal ?? null }, { key: 'ativ', label: 'atividades', done: +p.ativ || 0, total: p.ativTotal ?? null }],
          start: s.startDate || null, end: s.endDate || null, importedFrom: 'v1'
        }, { silent: true });
        subjIds[s.code] = rec.id; count.items++;
      });

      // projetos
      const projIds = {};
      const pprog = d['proj-progress'] || {};
      (Array.isArray(d['proj-list']) ? d['proj-list'] : []).forEach((p, i) => {
        const pg = pprog[p.id] || {};
        const rec = S.put('items', { area: 'projetos', title: p.name, sub: p.client || '', emoji: '', color: i + 2, status: p.status || 'ativo',
          counters: [{ key: 'etapas', label: 'etapas', done: +pg.done || 0, total: pg.total || null }], importedFrom: 'v1' }, { silent: true });
        projIds[p.id] = rec.id; count.items++;
      });

      // leituras
      const readIds = {};
      const units = { livro: 'páginas', artigo: 'páginas', podcast: 'episódios', curso: 'aulas', video: 'minutos' };
      (Array.isArray(d['leit-list']) ? d['leit-list'] : []).forEach((r, i) => {
        const rec = S.put('items', { area: 'leituras', title: r.title, sub: r.author || '', kind: r.type || 'livro', emoji: '', color: i + 4,
          status: r.status === 'quero-ler' ? 'quero' : (r.status || 'quero'), rating: r.rating || 0,
          counters: [{ key: 'main', label: units[r.type] || 'páginas', done: +r.pagesCurrent || 0, total: r.pagesTotal || null }], importedFrom: 'v1' }, { silent: true });
        readIds[r.id] = rec.id; count.items++;
      });

      // tarefas rápidas
      [['quicktasks', 'faculdade'], ['proj-quicktasks', 'projetos'], ['leit-quicktasks', 'leituras']].forEach(([k, area]) => {
        (Array.isArray(d[k]) ? d[k] : []).forEach(t => { S.put('tasks', { title: t.text, done: !!t.done, doneAt: t.done ? now : null, due: null, area, kind: 'tarefa', steps: [], itemId: null }, { silent: true }); count.tasks++; });
      });

      // prazos com etapas
      const fromAssign = (a, itemId, area, kind) => {
        const steps = (a.milestones || []).map(m => ({ id: m.id || P.uid(), label: m.label, date: m.date, done: !!m.done }));
        const done = steps.length > 0 && steps.every(s => s.done);
        S.put('tasks', { title: a.title, due: a.due, itemId, area, kind, steps, done, doneAt: done ? now : null }, { silent: true }); count.tasks++;
      };
      (Array.isArray(d.assignments) ? d.assignments : []).forEach(a => fromAssign(a, subjIds[a.subject] || null, 'faculdade', a.type === 'prova' ? 'prova' : 'trabalho'));
      (Array.isArray(d['proj-deliverables']) ? d['proj-deliverables'] : []).forEach(a => fromAssign(a, projIds[a.project] || null, 'projetos', a.type === 'reuniao' ? 'reuniao' : 'entrega'));

      // notas
      const noteOf = (n, itemId, area) => {
        const created = n.createdAt ? Date.parse(n.createdAt) : (n.date ? P.parse(n.date).getTime() : now);
        const rec = S.put('notes', { text: n.text || '', drawing: n.drawing || null, fav: !!n.favorite, tags: n.category ? [n.category] : [], itemId, area }, { silent: true });
        S.raw().notes[rec.id].createdAt = created; count.notes++;
      };
      (Array.isArray(d['notes-list']) ? d['notes-list'] : []).forEach(n => noteOf(n, subjIds[n.subject] || null, 'faculdade'));
      (Array.isArray(d['proj-notes-list']) ? d['proj-notes-list'] : []).forEach(n => noteOf(n, projIds[n.project] || null, 'projetos'));
      (Array.isArray(d['leit-notes-list']) ? d['leit-notes-list'] : []).forEach(n => noteOf(n, readIds[n.reading] || null, 'leituras'));

      // hábitos
      if (Array.isArray(d['habits-config'])) d['habits-config'].forEach((name, i) => { S.put('habits', { name, order: i, checks: {} }, { silent: true }); count.habits++; });
    });
    return count;
  }
  P._convertOld = convertOld; // usado nos testes
})();
