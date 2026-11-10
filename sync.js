/* ============================================================
   PRISMA 2 — sincronização com o Appwrite
   Analogia: o aparelho tem um caderno (localStorage). O Appwrite
   é o cofre na nuvem. A cada mudança, o Prisma manda só as
   páginas alteradas pro cofre e pergunta: "o que mudou aí desde
   a última vez?". Se a mesma coisa mudou nos dois lugares, vale
   a versão editada por último.

   No cofre, cada registro vira uma linha da tabela "records":
     rid      → id do registro no app
     col      → coleção (items, tasks, notes, events, habits, meta)
     data     → o registro inteiro em texto (JSON)
     deleted  → se foi apagado
============================================================ */
(function () {
  const S = P.store;
  const CFG_KEY = 'prisma2:appwrite';
  const PULL_KEY = 'prisma2:lastPull';
  const OWNER_KEY = 'prisma2:owner';   // de quem são os dados guardados neste aparelho
  // o que é pessoal e fica só no aparelho (PIN, conversa do assistente etc.): sai junto na troca de conta
  const PERSONAL = ['prisma2:finpin', 'prisma2:aiChat', 'prisma2:aiCfg', 'prisma2:finHide', 'prisma2:open7', 'prisma2:pushSaved', 'prisma2:ui', 'prisma2:lancDraft'];
  function clearPersonal() {
    try { Object.keys(localStorage).filter(k => k.startsWith(PULL_KEY) || PERSONAL.includes(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    P.fin?.lock?.();
  }
  const LIB = 'https://cdn.jsdelivr.net/npm/appwrite@16.1.0';
  const DB = 'prisma', TABLE = 'records';
  let A = null, client = null, account = null, db = null, user = null;
  // noSession: o Appwrite respondeu e NÃO há login neste aparelho (sem internet não conta)
  let noSession = false;
  let status = 'idle', lastSync = null, running = false, again = false, errorMsg = '';

  const cfg = () => (P.CONFIG?.appwriteEndpoint && P.CONFIG?.appwriteProject
    ? { endpoint: P.CONFIG.appwriteEndpoint, project: P.CONFIG.appwriteProject }
    : P.ls.get(CFG_KEY));

  function setStatus(s, msg = '') { status = s; errorMsg = msg; P.renderSyncBadge?.(); }

  function loadLib() {
    if (window.Appwrite?.Client) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIB; s.onload = res; s.onerror = () => rej(new Error('Sem internet para carregar a sincronização.')); document.head.appendChild(s); });
  }

  /* id da linha no Appwrite: 32 letras derivadas do usuário + id do registro
     (o Appwrite aceita no máximo 36 caracteres e os ids precisam ser únicos) */
  async function rowId(rid) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(user.$id + ':' + rid));
    return 'r' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 31);
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function retry(fn) {
    for (let i = 0; ; i++) {
      try { return await fn(); }
      catch (e) { if (e.code === 429 && i < 4) { await sleep(1500 * (i + 1)); continue; } throw e; }
    }
  }

  async function init() {
    const c = cfg(); if (!c?.endpoint || !c?.project || P.PREVIEW) return;
    try {
      await loadLib();
      A = window.Appwrite;
      client = new A.Client().setEndpoint(c.endpoint).setProject(c.project);
      account = new A.Account(client);
      db = new A.Databases(client);
      try { user = await account.get(); noSession = false; }
      catch (e) { user = null; noSession = e?.code === 401 || e?.code === 403; if (!noSession) setStatus('offline', 'sem conexão'); }
      if (user && !P.ls.get(OWNER_KEY)) P.ls.set(OWNER_KEY, user.$id);
      P.renderSyncBadge?.();
      if (user) { await vaultOnStart(); now(); P.vaultUI?.maybePrompt(); }
    } catch (e) { setStatus('offline', e.message); }
  }

  async function upsertRow(rid, col, payloadData, deleted = false) {
    const id = await rowId(rid);
    const payload = { rid, col, data: typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData), deleted: !!deleted };
    try {
      await retry(() => db.updateDocument(DB, TABLE, id, payload));
    } catch (e) {
      if (e.code !== 404) throw e;
      const perms = [A.Permission.read(A.Role.user(user.$id)), A.Permission.update(A.Role.user(user.$id)), A.Permission.delete(A.Role.user(user.$id))];
      await retry(() => db.createDocument(DB, TABLE, id, payload, perms));
    }
  }
  // o financeiro sai do aparelho já trancado (P.vault); sem a chave, ele espera aqui
  const V = P.vault;
  const locked = d => V.isEnc(d.col, d.id) && !V.ready();
  const pushOne = async d => upsertRow(d.id, d.col, V.isEnc(d.col, d.id) ? await V.encrypt(d.rec) : d.rec, d.rec.deleted);

  /* Avisos de contas com o app fechado: o robô não consegue ler o financeiro (está trancado).
     Então o aparelho manda só "quantas contas vencem em cada dia" (sem nome e sem valor). */
  let lastAvisos = '';
  async function saveFinAvisos() {
    try {
      if (!db || !user || !P.hasFin?.() || !P.fin) return;
      const n = S.settings().notify || {};
      const today = P.today(), end = P.addDays(today, 35);
      const d = {};
      if (n.enabled && n.fin !== false) {
        P.fin.ensureOccurrences?.(today, end);
        P.fin.txs().filter(t => t.kind === 'despesa' && t.status === 'previsto' && !t.envelope && !t.noDue && t.date >= today && t.date <= end).forEach(t => { d[t.date] = (d[t.date] || 0) + 1; });
      }
      const late = n.enabled && n.fin !== false ? P.fin.txs().filter(t => t.kind === 'despesa' && t.status === 'previsto' && !t.envelope && !t.noDue && t.date < today).length : 0;
      const body = JSON.stringify({ d, late, lateAt: today });
      if (body === lastAvisos) return;
      await upsertRow('fin-avisos', 'fin_avisos', body); lastAvisos = body;
    } catch (e) { console.warn('Prisma: avisos do financeiro não subiram.', e); }
  }

  /* cadastra este aparelho para receber avisos do robô (Etapa 3) */
  async function savePush(sub) {
    if (!db || !user || !sub?.endpoint) return false;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint));
    const rid = 'push-' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
    await upsertRow(rid, 'push', { endpoint: sub.endpoint, keys: sub.keys, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo', ua: navigator.userAgent.slice(0, 160), updatedAt: Date.now() });
    return true;
  }

  async function now(manual = false) {
    if (!db || !user) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    if (running) { again = true; return; }
    running = true; setStatus('syncing');
    try {
      const pullKey = PULL_KEY + ':' + user.$id;
      const first = !P.ls.get(pullKey);
      const plainSeen = [];

      const push = async () => {
        const dirty = S.dirtyRecords().filter(d => !locked(d));
        // 4 envios por vez, pra não esbarrar no limite de pedidos por minuto
        for (let i = 0; i < dirty.length; i += 4) {
          const chunk = dirty.slice(i, i + 4);
          await Promise.all(chunk.map(pushOne));
          S.markClean(chunk.map(d => d.key));
        }
      };

      const pull = async () => {
        const since = P.ls.get(pullKey) || '1970-01-01T00:00:00.000+00:00';
        let maxSeen = since, cursor = null;
        while (true) {
          const q = [A.Query.greaterThanEqual('$updatedAt', since), A.Query.orderAsc('$updatedAt'), A.Query.limit(100)];
          if (cursor) q.push(A.Query.cursorAfter(cursor));
          const res = await retry(() => db.listDocuments(DB, TABLE, q));
          const docs = res.documents || [];
          if (!docs.length) break;
          const rows = (await Promise.all(docs.map(async doc => {
            if (V.isCipher(doc.data)) {
              if (!V.ready()) return null;                       // trancado e sem a chave: fica para depois
              try { return { id: doc.rid, collection: doc.col, data: await V.decrypt(doc.data), deleted: doc.deleted }; }
              catch (e) { console.warn('Prisma: não consegui destrancar', doc.rid); return null; }
            }
            let data = {}; try { data = JSON.parse(doc.data); } catch (e) { return null; }
            // financeiro que ainda está aberto na nuvem (de antes do cofre): volta trancado no próximo envio
            if (V.isEnc(doc.col, doc.rid) && V.ready() && !doc.deleted) plainSeen.push(doc.col + ':' + doc.rid);
            return { id: doc.rid, collection: doc.col, data, deleted: doc.deleted };
          }))).filter(Boolean);
          // 1ª vez neste aparelho: o que já está na nuvem vale mais que os dados de exemplo daqui
          S.applyRemote(rows, first);
          maxSeen = docs[docs.length - 1].$updatedAt;
          cursor = docs[docs.length - 1].$id;
          if (docs.length < 100) break;
        }
        P.ls.set(pullKey, maxSeen);
      };

      if (first) { await pull(); await push(); await pull(); }
      else { await push(); await pull(); }
      if (plainSeen.length) { S.markDirty(plainSeen); await push(); }
      saveFinAvisos();

      lastSync = new Date();
      setStatus('ok');
      if (manual) P.toast('Sincronizado.');
    } catch (e) {
      console.error('Prisma sync:', e);
      setStatus(navigator.onLine ? 'error' : 'offline', explain(e));
      if (manual) P.toast('Não consegui sincronizar: ' + explain(e));
    } finally {
      running = false;
      if (again) { again = false; setTimeout(() => now(), 300); }
    }
  }

  function explain(e) {
    const m = e?.message || String(e);
    if (e?.code === 401) return 'sem permissão. Confira as permissões da tabela (passo 4 do guia).';
    if (/Database not found/i.test(m)) return 'banco "prisma" não encontrado. Confira o ID do banco (passo 3 do guia).';
    if (/Collection.*not found|Table.*not found/i.test(m)) return 'tabela "records" não encontrada. Confira o ID da tabela (passo 4 do guia).';
    if (/Unknown attribute|Invalid document structure|column/i.test(m)) return 'faltam colunas na tabela: ' + m;
    if (/Failed to fetch|NetworkError|CORS/i.test(m)) return 'o Appwrite recusou este site. Confira a plataforma Web (passo 2 do guia).';
    return m;
  }

  const schedule = P.debounce(() => now(), 1500);

  /* ============ cofre do financeiro ============ */
  // estados: off · ready · need-password (logado, sem a chave neste aparelho) ·
  //          need-recovery (a senha não abre: foi trocada e nenhum aparelho tem a chave) · pw-changed
  let vstate = 'off', vrow = null, pendingPw = null, prompted = false;
  async function readVault() {
    try { const doc = await db.getDocument(DB, TABLE, await rowId('vault')); return JSON.parse(doc.data); }
    catch (e) { if (e.code === 404) return null; throw e; }
  }
  const saveVault = async row => { vrow = row; await upsertRow('vault', 'vault', row); };
  // depois de destrancar: busca tudo de novo (agora dá para abrir) e tranca o que estava aberto na nuvem
  async function afterUnlock() { vstate = 'ready'; pendingPw = null; P.ls.set(PULL_KEY + ':' + user.$id, '1970-01-01T00:00:00.000+00:00'); await now(); P.render?.(); }

  async function vaultAfterLogin(pw) {
    await V.load(user.$id);
    let row; try { row = await readVault(); } catch (e) { vstate = V.ready() ? 'ready' : 'need-password'; return; }
    if (!row) {
      row = V.ready() ? await V.rewrapPassword({ v: 1, rc: null }, pw, user.passwordUpdate) : await V.create(user.$id, pw, user.passwordUpdate);
      await saveVault(row); P.vaultUI?.offerCode(true);
      return afterUnlock();
    }
    vrow = row;
    if (await V.openWithPassword(user.$id, pw, row)) { if (row.pwAt !== user.passwordUpdate) await saveVault({ ...row, pwAt: user.passwordUpdate }); return afterUnlock(); }
    // a senha não abre: ela foi trocada (pelo e-mail). Se este aparelho tem a chave, tranca de novo com a senha nova.
    if (V.ready()) { await saveVault(await V.rewrapPassword(row, pw, user.passwordUpdate)); return afterUnlock(); }
    vstate = 'need-recovery'; pendingPw = pw;
  }
  async function vaultOnStart() {
    await V.load(user.$id);
    let row; try { row = await readVault(); } catch (e) { row = undefined; }      // undefined = sem internet
    vrow = row || null;
    if (V.ready()) {
      vstate = row === null ? 'need-password' : row && row.pwAt && user.passwordUpdate && row.pwAt !== user.passwordUpdate ? 'pw-changed' : 'ready';
      if (vstate === 'need-password') V.forget();   // chave sem cofre na nuvem: refaz com a senha
    } else vstate = 'need-password';
  }


  P.sync = {
    init, now, schedule,
    state: () => ({ configured: !!cfg()?.project && !P.PREVIEW, builtIn: !!(P.CONFIG?.appwriteEndpoint && P.CONFIG?.appwriteProject), user: user ? { email: user.email } : null, status }),
    // app "de conta": quando o Appwrite já vem configurado no app, é preciso estar logado
    needsLogin: () => !!(P.CONFIG?.appwriteEndpoint && P.CONFIG?.appwriteProject) && !P.PREVIEW && noSession && !user,
    label() {
      if (status === 'syncing') return 'sincronizando…';
      if (status === 'error') return 'erro: ' + errorMsg;
      if (status === 'offline') return 'sem internet · salvo no aparelho';
      if (lastSync) return 'sincronizado às ' + lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return 'conectado';
    },
    async configure(endpoint, project) {
      endpoint = endpoint.trim().replace(/\/$/, '');
      if (!/^https:\/\/.+\/v1$/.test(endpoint)) { P.toast('O endpoint deve terminar em /v1, por exemplo https://nyc.cloud.appwrite.io/v1'); return; }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,35}$/.test(project.trim())) { P.toast('O Project ID parece incompleto.'); return; }
      P.ls.set(CFG_KEY, { endpoint, project: project.trim() });
      await init(); P.toast('Projeto conectado. Agora crie sua conta ou entre.');
    },
    reset() { P.ls.del(CFG_KEY); client = account = db = user = null; },
    async auth(mode, email, pw) {
      if (!account) await init();
      if (!account) { P.toast('Não consegui conectar ao Appwrite.'); return false; }
      try {
        if (mode === 'signup') await account.create(A.ID.unique(), email, pw);
        try { await account.deleteSession('current'); } catch (e) {}
        await account.createEmailPasswordSession(email, pw);
        user = await account.get(); noSession = false;
      } catch (e) {
        const m = e?.message || '';
        P.toast(e.code === 401 ? 'E-mail ou senha incorretos.' : e.code === 409 ? 'Já existe uma conta com esse e-mail. Use “Entrar”.' : /password/i.test(m) ? 'A senha precisa ter pelo menos 8 caracteres.' : m || 'Erro ao entrar.');
        return false;
      }
      // Outra pessoa já usou este aparelho: os dados dela saem daqui (continuam na conta dela)
      const owner = P.ls.get(OWNER_KEY);
      if (owner && owner !== user.$id) {
        S.resetDevice(); clearPersonal(); await V.forget();
        P.toast('Este aparelho estava com os dados de outra conta. Eles saíram daqui e continuam guardados na conta da outra pessoa.');
      } else if (!P.ls.get(PULL_KEY + ':' + user.$id)) S.markAllDirty();   // primeiro login: sobe o que já existe aqui
      P.ls.set(OWNER_KEY, user.$id);
      try { await vaultAfterLogin(pw); } catch (e) { console.error('Prisma cofre:', e); vstate = V.ready() ? 'ready' : 'need-password'; }
      await now(true);
      P.push?.resubscribe?.();
      setTimeout(() => P.vaultUI?.maybePrompt(true), 900);
      return true;
    },
    // Sair: antes manda para a nuvem o que ainda não subiu. Com "apagar", tira tudo deste aparelho.
    async signOut(wipeDevice = false) {
      try { if (user) await now(true); } catch (e) {}
      if (wipeDevice && S.pendingCount()) { P.toast('Ainda há alterações que não subiram para a nuvem. Conecte à internet e tente de novo.'); return false; }
      try { await account?.deleteSession('current'); } catch (e) {}
      user = null; noSession = true; setStatus('idle'); vstate = 'off';
      await V.forget();   // a chave do cofre sai do aparelho junto com a sessão; volta no próximo login (com a senha)
      if (wipeDevice) { S.resetDevice(); clearPersonal(); P.ls.del(OWNER_KEY); }
      return true;
    },
    pending: () => S.pendingCount(),
    // link de convite: abre o Prisma já ligado ao mesmo Appwrite (endpoint e projeto não são segredo)
    inviteLink() { const c = cfg(); if (!c) return null; return `${location.origin}${location.pathname}#convite=${btoa(c.endpoint + '|' + c.project)}`; },
    acceptInvite(code) {
      try { const [endpoint, project] = atob(code).split('|'); if (!/^https:\/\/.+\/v1$/.test(endpoint) || !project) return false; if (!cfg()?.project) P.ls.set(CFG_KEY, { endpoint, project }); return true; } catch (e) { return false; }
    },
    user: () => user,
    // chama uma função do Appwrite como o usuário logado (usado pelo assistente)
    async execute(functionId, payload) {
      if (!client) await init();
      if (!client) throw new Error('Conecte o Appwrite em Ajustes → Sincronização.');
      if (!user) throw new Error('Entre na sua conta em Ajustes → Sincronização para usar a IA.');
      const fn = new A.Functions(client);
      const ex = await fn.createExecution(functionId, JSON.stringify(payload), false, '/', 'POST', { 'content-type': 'application/json' });
      let out = {}; try { out = JSON.parse(ex.responseBody || '{}'); } catch (e) { out = { ok: false, erro: 'Resposta estranha da função.' }; }
      if (ex.status === 'failed' && !out.erro) out = { ok: false, erro: 'A função falhou. Veja em Appwrite → Functions → prisma-assistente → Executions.' };
      return out;
    },
    savePush,
    // recuperação de senha pelo e-mail (o Appwrite manda o link)
    async recover(email) {
      if (!account) await init();
      if (!account) throw new Error('Sem conexão com o servidor.');
      await account.createRecovery(email, location.origin + location.pathname + '?nova-senha=1');
    },
    async completeRecovery(userId, secret, pw) { if (!account) await init(); await account.updateRecovery(userId, secret, pw); },
    vault: {
      state: () => vstate,
      hasCode: () => !!vrow?.rc,
      // logado, mas sem a chave neste aparelho: confirma a senha e abre (ou cria) o cofre
      // (o Appwrite não deixa conferir a senha com a sessão aberta; quem confere é o próprio cofre,
      //  e na primeira vez a tela pede a senha duas vezes)
      async unlock(pw) {
        try { await vaultAfterLogin(pw); } catch (e) { return { ok: false, erro: 'Sem conexão. Tente de novo com internet.' }; }
        return vstate === 'ready' ? { ok: true } : { ok: false, recovery: true, erro: 'Essa senha não abre o cofre. Confira se digitou certo. Se você trocou a senha pelo e-mail, use o código de recuperação ou abra o Prisma no aparelho em que você continua logada.' };
      },
      exists: async () => { if (vrow) return true; try { vrow = await readVault(); } catch (e) {} return !!vrow; },
      async unlockCode(code) {
        if (!vrow) vrow = await readVault();
        if (!vrow || !(await V.openWithCode(user.$id, code, vrow))) return { ok: false, erro: 'Código incorreto.' };
        if (pendingPw) await saveVault(await V.rewrapPassword(vrow, pendingPw, user.passwordUpdate));
        else { vstate = 'pw-changed'; }
        if (pendingPw) await afterUnlock(); else { P.ls.set(PULL_KEY + ':' + user.$id, '1970-01-01T00:00:00.000+00:00'); await now(); }
        return { ok: true };
      },
      // trocou a senha pelo e-mail e este aparelho tem a chave: tranca de novo com a senha nova
      async updatePassword(pw) {
        await saveVault(await V.rewrapPassword(vrow || { v: 1, rc: null }, pw, user.passwordUpdate));
        vstate = 'ready'; return { ok: true };
      },
      async newCode() {
        if (!V.ready()) return null;
        if (!vrow) vrow = await readVault();
        const { code, row } = await V.newRecovery(vrow || { v: 1, pw: null });
        await saveVault(row); return code;
      },
      setPrompted: v => { prompted = v; }, prompted: () => prompted
    }
  };

  S.on(info => { if (!info.remote) schedule(); });
  window.addEventListener('online', () => now());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') now(); });
  setInterval(() => { if (document.visibilityState === 'visible') now(); }, 60000);
})();
