/* ============================================================
   PRISMA — cofre do Financeiro (criptografia no aparelho)
   Analogia: cada pessoa tem uma chave só dela (a "chave do
   cofre"). O financeiro é trancado com essa chave ANTES de sair
   do aparelho, então no Appwrite fica só texto embaralhado:
   nem quem administra o projeto consegue ler.

   A chave do cofre fica guardada no Appwrite dentro de duas
   "caixinhas" trancadas:
     • uma abre com a senha da conta;
     • outra abre com o código de recuperação (24 letras).
   E uma cópia aberta fica neste aparelho (IndexedDB) enquanto a
   pessoa estiver logada. É ela que permite trocar a senha (pelo
   e-mail) sem perder nada: o aparelho tranca a chave de novo com
   a senha nova.
============================================================ */
(function () {
  const ENC_COLS = ['fin_conta', 'fin_cat', 'fin_lanc', 'fin_rec', 'fin_ciclo', 'fin_conc', 'fin_hist', 'fin_parc'];
  const PREFIX = 'enc:v1:';
  const ITER = 310000;
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
  const rand = n => crypto.getRandomValues(new Uint8Array(n));

  let dek = null, uid = null;

  /* ---------- cópia da chave neste aparelho (IndexedDB) ---------- */
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('prisma-cofre', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('keys');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  async function idbGet(k) { try { const d = await idb(); return await new Promise(res => { const q = d.transaction('keys').objectStore('keys').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } }
  async function idbSet(k, v) { try { const d = await idb(); await new Promise(res => { const t = d.transaction('keys', 'readwrite'); t.objectStore('keys').put(v, k); t.oncomplete = res; t.onerror = res; }); } catch (e) {} }
  async function idbClear() { try { const d = await idb(); await new Promise(res => { const t = d.transaction('keys', 'readwrite'); t.objectStore('keys').clear(); t.oncomplete = res; t.onerror = res; }); } catch (e) {} }

  /* ---------- chaves ---------- */
  async function kek(secret, salt) {
    const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function wrapWith(secret) {
    const salt = rand(16), iv = rand(12);
    const raw = await crypto.subtle.exportKey('raw', dek);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await kek(secret, salt), raw);
    return { salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function unwrapWith(secret, box) {
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, await kek(secret, unb64(box.salt)), unb64(box.ct));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
  function newCode() {
    const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sem 0/O, 1/I/L, para não confundir
    const r = rand(24); const s = [...r].map(x => ABC[x % ABC.length]).join('');
    return s.match(/.{4}/g).join('-');
  }

  const V = P.vault = {
    ENC_COLS,
    isEnc: (col, rid) => ENC_COLS.includes(col) || (col === 'meta' && rid === 'finprofile'),
    isCipher: s => typeof s === 'string' && s.startsWith(PREFIX),
    ready: () => !!dek,
    // ao abrir o app: pega a cópia da chave guardada neste aparelho
    async load(userId) { uid = userId; dek = (await idbGet('dek:' + userId)) || null; return !!dek; },
    async forget() { dek = null; uid = null; await idbClear(); },
    async encrypt(obj) {
      const iv = rand(12);
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, te.encode(JSON.stringify(obj)));
      return PREFIX + b64(iv) + '.' + b64(ct);
    },
    async decrypt(str) {
      const [iv, ct] = str.slice(PREFIX.length).split('.');
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, dek, unb64(ct));
      return JSON.parse(td.decode(pt));
    },
    /* cria o cofre (primeira vez desta conta) */
    async create(userId, pw, pwAt) {
      uid = userId;
      dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      await idbSet('dek:' + userId, dek);
      return { v: 1, pw: await wrapWith(pw), pwAt: pwAt || null, rc: null, rcAt: null };
    },
    /* abre o cofre com a senha; null se a senha não abre (ex.: senha trocada pelo e-mail) */
    async openWithPassword(userId, pw, row) {
      try { dek = await unwrapWith(pw, row.pw); uid = userId; await idbSet('dek:' + userId, dek); return true; } catch (e) { return false; }
    },
    async openWithCode(userId, code, row) {
      if (!row.rc) return false;
      try { dek = await unwrapWith(normCode(code), row.rc); uid = userId; await idbSet('dek:' + userId, dek); return true; } catch (e) { return false; }
    },
    /* tranca a chave de novo com a senha nova (troca de senha) */
    async rewrapPassword(row, pw, pwAt) { return { ...row, pw: await wrapWith(pw), pwAt: pwAt || null }; },
    /* novo código de recuperação: o antigo deixa de valer */
    async newRecovery(row) { const code = newCode(); return { code, row: { ...row, rc: await wrapWith(normCode(code)), rcAt: Date.now() } }; }
  };
})();

/* ---------- telas do cofre ---------- */
(function () {
  const esc = s => P.esc(s);
  const pwField = (name, label, ac = 'current-password') => `<label class="field"><span class="field-label">${label}</span><input name="${name}" type="password" autocomplete="${ac}" minlength="8" required></label>`;
  const err = (api, m) => { const p = api.body.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
  const busy = (api, on, txt) => { const b = api.body.querySelector('[type=submit]'); if (b) { b.disabled = on; if (txt) b.textContent = txt; } };

  const UI = P.vaultUI = {
    statusHTML() {
      const st = P.sync?.vault?.state?.() || 'off';
      if (!P.sync?.user()) return '';
      const map = {
        ready: ['ok', 'Financeiro protegido', 'Trancado neste aparelho antes de ir para a nuvem. Nem quem administra o servidor consegue ler.'],
        'need-password': ['idle', 'Falta proteger o financeiro', 'Digite a senha da sua conta uma vez neste aparelho.'],
        'need-recovery': ['error', 'Financeiro trancado', 'Sua senha mudou e este aparelho não tem a chave. Use o código de recuperação.'],
        'pw-changed': ['idle', 'Senha trocada', 'Confirme a senha nova para o financeiro abrir nos outros aparelhos.']
      };
      const [dot, t, sub] = map[st] || map['need-password'];
      return `<div class="sync-box vault-box"><div><span class="status-dot ${dot}"></span><strong>${t}</strong><small>${sub}</small></div>
        <div class="form-actions split"><span class="grow"></span>${st === 'ready' ? `<button class="btn ghost small" type="button" data-act="vaultCode">${P.sync.vault.hasCode() ? 'Gerar novo código de recuperação' : 'Criar código de recuperação'}</button>` : '<button class="btn primary small" type="button" data-act="vaultFix">Resolver</button>'}</div></div>`;
    },
    maybePrompt(force = false) {
      const V = P.sync?.vault; if (!V || !P.sync.user() || !P.hasFin?.()) return;
      if (V.prompted() && !force) return;
      const st = V.state();
      if (st === 'ready' || st === 'off') return;
      V.setPrompted(true);
      setTimeout(() => (st === 'need-recovery' ? UI.recovery() : st === 'pw-changed' ? UI.changed() : UI.password()), 300);
    },
    async password() {
      const exists = await P.sync.vault.exists();
      P.sheet({ title: exists ? 'Abrir o seu financeiro' : 'Proteger o seu financeiro', kicker: 'Uma vez neste aparelho',
        render: () => `<form class="form">
          <p class="ask-msg">${exists ? 'Seu financeiro está trancado na nuvem. Digite a <b>senha da sua conta</b> para abrir neste aparelho.' : 'A partir de agora seu financeiro fica <b>trancado com a sua senha</b> antes de ir para a nuvem. Ninguém além de você consegue ler, nem quem administra o servidor. Digite a <b>senha da sua conta</b>.'}</p>
          ${pwField('pw', 'Senha da conta')}${exists ? '' : pwField('pw2', 'Digite de novo')}
          <p class="form-error" hidden></p>
          <div class="form-actions"><button class="btn ghost" type="button" data-later>Agora não</button><button class="btn primary" type="submit">${exists ? 'Abrir' : 'Proteger'}</button></div></form>`,
        mount: api => {
          api.body.querySelector('[data-later]').onclick = () => api.close();
          api.body.querySelector('form').onsubmit = async e => {
            e.preventDefault(); const f = e.target;
            if (!exists && f.pw.value !== f.pw2.value) return err(api, 'As duas senhas não estão iguais.');
            busy(api, true, 'Um instante…');
            const r = await P.sync.vault.unlock(f.pw.value);
            if (r.ok) { api.close(); P.toast('Financeiro protegido ✓'); P.render(); if (!P.sync.vault.hasCode()) setTimeout(() => UI.offerCode(true), 400); return; }
            busy(api, false, exists ? 'Abrir' : 'Proteger');
            if (r.recovery) { api.close(); setTimeout(() => UI.recovery(r.erro), 300); } else err(api, r.erro);
          };
        } });
    },
    recovery(msg) {
      P.sheet({ title: 'Destravar o financeiro', kicker: 'Código de recuperação',
        render: () => `<form class="form">
          <p class="ask-msg">${msg ? esc(msg) : 'Sua senha foi trocada e este aparelho ainda não tem a chave do financeiro.'}</p>
          <p class="ask-msg"><b>Jeito mais fácil:</b> abra o Prisma no celular ou computador em que você continua logada. Ele destranca sozinho e depois funciona aqui também.</p>
          <label class="field"><span class="field-label">Ou digite o código de recuperação (24 letras)</span><input name="code" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" required></label>
          <p class="form-error" hidden></p>
          <div class="form-actions"><button class="btn ghost" type="button" data-later>Agora não</button><button class="btn primary" type="submit">Destravar</button></div></form>`,
        mount: api => {
          api.body.querySelector('[data-later]').onclick = () => api.close();
          api.body.querySelector('form').onsubmit = async e => {
            e.preventDefault(); busy(api, true, 'Um instante…');
            const st = P.sync.vault.state();
            if (st !== 'need-recovery') { api.close(); return UI.password(); }
            const r = await P.sync.vault.unlockCode(e.target.code.value);
            if (r.ok) { api.close(); P.toast('Financeiro destravado ✓'); P.render(); setTimeout(() => UI.offerCode(false, 'Por segurança, crie um código novo: o antigo já foi usado.'), 400); }
            else { busy(api, false, 'Destravar'); err(api, r.erro); }
          };
        } });
    },
    changed() {
      P.sheet({ title: 'Você trocou a senha', kicker: 'Financeiro',
        render: () => `<form class="form"><p class="ask-msg">Para o seu financeiro continuar abrindo nos outros aparelhos, confirme a <b>senha nova</b> aqui.</p>
          ${pwField('pw', 'Senha nova', 'new-password')}${pwField('pw2', 'Digite de novo', 'new-password')}
          <p class="form-error" hidden></p>
          <div class="form-actions"><button class="btn ghost" type="button" data-later>Agora não</button><button class="btn primary" type="submit">Confirmar</button></div></form>`,
        mount: api => {
          api.body.querySelector('[data-later]').onclick = () => api.close();
          api.body.querySelector('form').onsubmit = async e => {
            e.preventDefault(); const f = e.target;
            if (f.pw.value !== f.pw2.value) return err(api, 'As duas senhas não estão iguais.');
            busy(api, true, 'Um instante…');
            const r = await P.sync.vault.updatePassword(f.pw.value);
            if (r.ok) { api.close(); P.toast('Pronto ✓'); P.render(); } else { busy(api, false, 'Confirmar'); err(api, r.erro); }
          };
        } });
    },
    // código de recuperação: mostrado uma vez, a pessoa guarda
    offerCode(first, note) {
      if (!P.hasFin?.()) return;
      P.sheet({ title: 'Código de recuperação', kicker: 'Guarde em um lugar seguro', keep: true,
        render: () => `<p class="ask-msg">${note ? esc(note) + ' ' : ''}Se um dia você esquecer a senha <b>e</b> não estiver logada em nenhum aparelho, só este código abre o seu financeiro. ${first ? 'Leva 10 segundos.' : ''}</p>
          <div class="vault-code" hidden></div>
          <p class="hint">Guarde fora do Prisma: num gerenciador de senhas, num print guardado ou anotado no papel. Não mande para ninguém.</p>
          <div class="form-actions"><button class="btn ghost" type="button" data-later>${first ? 'Depois' : 'Fechar'}</button><button class="btn primary" type="button" data-gen>Gerar meu código</button></div>`,
        mount: api => {
          const b = api.body;
          b.querySelector('[data-later]').onclick = () => api.close();
          b.querySelector('[data-gen]').onclick = async e => {
            e.target.disabled = true; e.target.textContent = 'Gerando…';
            const code = await P.sync.vault.newCode();
            if (!code) { P.toast('Não consegui gerar agora. Tente de novo com internet.'); api.close(); return; }
            const box = b.querySelector('.vault-code'); box.hidden = false; box.textContent = code;
            const acts = b.querySelector('.form-actions');
            acts.innerHTML = '<button class="btn ghost" type="button" data-copy>Copiar</button><button class="btn primary" type="button" data-done>Já guardei</button>';
            acts.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText(code).then(() => P.toast('Copiado.'), () => P.toast('Não deu para copiar. Anote à mão.')); };
            acts.querySelector('[data-done]').onclick = () => { api.close(); P.render(); };
          };
        } });
    }
  };

  Object.assign(P.actions = P.actions || {}, {
    vaultCode: () => UI.offerCode(false, P.sync.vault.hasCode() ? 'Ao gerar um novo, o código antigo para de funcionar.' : ''),
    vaultFix: () => { const st = P.sync.vault.state(); st === 'need-recovery' ? UI.recovery() : st === 'pw-changed' ? UI.changed() : UI.password(); }
  });
})();
