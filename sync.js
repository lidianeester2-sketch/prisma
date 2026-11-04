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
  const LIB = 'https://cdn.jsdelivr.net/npm/appwrite@16.1.0';
  const DB = 'prisma', TABLE = 'records';
  let A = null, client = null, account = null, db = null, user = null;
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
      try { user = await account.get(); } catch (e) { user = null; }
      P.renderSyncBadge?.();
      if (user) now();
    } catch (e) { setStatus('offline', e.message); }
  }

  async function upsertRow(rid, col, payloadData, deleted = false) {
    const id = await rowId(rid);
    const payload = { rid, col, data: JSON.stringify(payloadData), deleted: !!deleted };
    try {
      await retry(() => db.updateDocument(DB, TABLE, id, payload));
    } catch (e) {
      if (e.code !== 404) throw e;
      const perms = [A.Permission.read(A.Role.user(user.$id)), A.Permission.update(A.Role.user(user.$id)), A.Permission.delete(A.Role.user(user.$id))];
      await retry(() => db.createDocument(DB, TABLE, id, payload, perms));
    }
  }
  const pushOne = d => upsertRow(d.id, d.col, d.rec, d.rec.deleted);

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

      const push = async () => {
        const dirty = S.dirtyRecords();
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
          const rows = docs.map(doc => {
            let data = {}; try { data = JSON.parse(doc.data); } catch (e) {}
            return { id: doc.rid, collection: doc.col, data, deleted: doc.deleted };
          });
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

  P.sync = {
    init, now, schedule,
    state: () => ({ configured: !!cfg()?.project && !P.PREVIEW, user: user ? { email: user.email } : null, status }),
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
        user = await account.get();
      } catch (e) {
        const m = e?.message || '';
        P.toast(e.code === 401 ? 'E-mail ou senha incorretos.' : e.code === 409 ? 'Já existe uma conta com esse e-mail. Use “Entrar”.' : /password/i.test(m) ? 'A senha precisa ter pelo menos 8 caracteres.' : m || 'Erro ao entrar.');
        return false;
      }
      // Primeiro login neste aparelho: prepara tudo que já existe aqui para subir
      if (!P.ls.get(PULL_KEY + ':' + user.$id)) S.markAllDirty();
      await now(true);
      P.push?.resubscribe?.();
      return true;
    },
    async signOut() { try { await account?.deleteSession('current'); } catch (e) {} user = null; setStatus('idle'); },
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
    savePush
  };

  S.on(info => { if (!info.remote) schedule(); });
  window.addEventListener('online', () => now());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') now(); });
  setInterval(() => { if (document.visibilityState === 'visible') now(); }, 60000);
})();
