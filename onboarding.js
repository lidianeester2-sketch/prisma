/* ============================================================
   PRISMA — boas-vindas (primeira vez no app)
   1) Como podemos te chamar?  2) Qual seu foco?  3) Criar conta
   O app se monta com o foco escolhido (dá para mudar em Ajustes).
============================================================ */
(function () {
  const S = P.store, esc = P.esc;
  const st = { step: 1, name: '', focus: [], mode: 'signup', busy: false };

  // ícones de linha (mesmo traço dos ícones do app)
  const I = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    faculdade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5"/><path d="M22 9v6"/></svg>',
    financeiro: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3 0 1.2-1.3 2.1-3 2.1-1.4 0-2.6-.6-3.1-1.6M12 6.5v11"/></svg>',
    projetos: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    leituras: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5c3-1 6-1 10 1v14c-4-2-7-2-10-1z"/><path d="M22 5c-3-1-6-1-10 1v14c4-2 7-2 10-1z"/></svg>',
    pessoal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.4-9.3-8.6C.9 9.1 2.9 5 6.6 5c2.1 0 3.4 1.2 4.1 2.4h2.6C14 6.2 15.3 5 17.4 5c3.7 0 5.7 4.1 3.9 7.4C19 16.6 12 21 12 21z"/></svg>'
  };
  let showPw = false;

  // topo: logo do Prisma + "1/3" com a barrinha de progresso
  const head = () => `<header class="ob-head">
      <span class="ob-brand"><img src="icon-192.png" alt="" width="34" height="34"><b>Prisma</b></span>
      <span class="ob-progress" aria-label="Passo ${st.step} de 3"><small>${st.step} / 3</small><i><u style="width:${Math.round(st.step / 3 * 100)}%"></u></i></span>
    </header>`;
  // prisma decorativo: triângulo em tons da cor do app + o feixe de luz virando espectro
  const prism = `<svg class="ob-prism" viewBox="0 0 400 260" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <defs><linearGradient id="obspec" x1="0" x2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset=".25" stop-color="#ff4fa3"/><stop offset=".5" stop-color="#ff8a3d"/><stop offset=".7" stop-color="#ffd447"/><stop offset=".85" stop-color="#3ddc97"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>
      <path d="M0 150 L190 60 L190 260 L0 260z" class="p1"/><path d="M190 30 L300 260 L80 260z" class="p2"/><path d="M190 30 L300 260 L190 260z" class="p3"/>
      <path d="M0 140 L176 118" class="beam"/><path d="M226 150 L400 120 L400 190 L232 168z" fill="url(#obspec)" opacity=".55"/>
    </svg>`;
  const fab = (attrs, label) => `<button class="ob-fab" ${attrs} aria-label="${label}">${I.arrow}</button>`;

  P.views.boasvindas = () => {
    const canSync = !!P.sync?.state().configured;
    let body;
    if (st.step === 1) body = `
      <form class="ob-step" data-ob="name">
        <h1>Como podemos te chamar?</h1>
        <p class="ob-sub">Digite seu nome para começar a usar o Prisma.</p>
        <label class="ob-field">${I.user}<input id="ob-name" name="name" autocomplete="given-name" maxlength="40" placeholder="Seu nome" value="${esc(st.name)}" required></label>
        <button class="ob-link" type="button" data-ob-login>Já tenho conta → Entrar</button>
        ${prism}
        ${fab('type="submit"', 'Continuar')}
      </form>`;
    else if (st.step === 2) body = `
      <div class="ob-step">
        <button class="ob-back" type="button" data-ob-back>${I.back} Voltar</button>
        <h1>Qual seu foco no Prisma?</h1>
        <p class="ob-sub">Escolha uma ou mais opções para personalizar sua experiência${st.name ? ', ' + esc(st.name) : ''}.</p>
        <div class="ob-list" role="group" aria-label="Foco">${Object.entries(P.FOCUS).map(([k, f]) => `<button type="button" class="ob-row ${st.focus.includes(k) ? 'on' : ''}" data-focus="${k}" aria-pressed="${st.focus.includes(k)}">
            <span class="ob-row-ico">${I[k]}</span><span class="ob-row-txt"><b>${f.label}</b><small>${f.desc}</small></span><span class="ob-box" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></button>`).join('')}</div>
        ${fab(`type="button" data-ob-next ${st.focus.length ? '' : 'disabled'}`, 'Continuar')}
      </div>`;
    else body = `
      <div class="ob-step">
        ${st.mode === 'login' && !st.name ? '' : `<button class="ob-back" type="button" data-ob-back>${I.back} Voltar</button>`}
        <h1>${st.mode === 'login' ? 'Entrar na sua conta' : 'Crie sua conta'}</h1>
        <p class="ob-sub">${st.mode === 'login' ? 'Use o seu e-mail e senha. Seus dados aparecem em qualquer aparelho.' : 'Assim, seus dados ficam salvos na sua conta e você pode acessar de qualquer lugar.'}</p>
        ${canSync ? `<form class="ob-account" data-ob="account">
          <label class="ob-field">${I.mail}<input name="email" type="email" autocomplete="email" placeholder="E-mail" required></label>
          <label class="ob-field">${I.lock}<input name="pw" type="${showPw ? 'text' : 'password'}" autocomplete="${st.mode === 'login' ? 'current-password' : 'new-password'}" placeholder="Senha${st.mode === 'login' ? '' : ' (8 ou mais caracteres)'}" minlength="8" required>
            <button class="ob-eye" type="button" data-ob-eye aria-label="${showPw ? 'Esconder senha' : 'Mostrar senha'}">${showPw ? I.eye : I.eyeOff}</button></label>
          <button class="ob-main" type="submit" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Um instante…' : st.mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
          ${st.mode === 'login' ? '' : '<p class="ob-legal">Ao criar a conta, você concorda com os <a href="#termos">Termos de uso</a> e a <a href="#privacidade">Política de Privacidade</a>.</p>'}
        </form>
        ${st.mode === 'login' ? '<button class="ob-link small" type="button" data-forgot>Esqueci a senha</button>' : ''}
        <div class="ob-or"><span>ou</span></div>
        <button class="ob-link" type="button" data-ob-mode>${st.mode === 'login' ? 'Ainda não tenho conta → Criar' : 'Já tenho conta → Entrar'}</button>`
        : `<div class="notice">A conta ainda não está ligada neste endereço. Você pode começar agora e ligar depois em Ajustes.</div>
        <button class="ob-main" type="button" data-ob-skip>Começar</button>`}
      </div>`;
    return `<div class="ob2">${head()}${body}<p class="ob-credits">Prisma · Desenvolvido por Lidiane Ester Pereira Florêncio</p></div>`;
  };

  const finish = () => {
    S.setSettings({ name: st.name.trim(), focus: st.focus.length ? st.focus : Object.keys(P.FOCUS), onboarded: true, tourPending: !S.settings().tourDone });
    P.applyFocus();
    P.go(P.home());
    P.tour?.maybe();
  };

  P.mounts = P.mounts || {};
  P.mounts.boasvindas = root => {
    const rerender = () => P.render();
    root.querySelector('#ob-name')?.focus();
    root.querySelector('#ob-name')?.addEventListener('input', e => { st.name = e.target.value; });
    root.querySelector('[data-ob-eye]')?.addEventListener('click', () => { const pw = root.querySelector('[name="pw"]'), em = root.querySelector('[name="email"]'); const keep = [em?.value, pw?.value]; showPw = !showPw; rerender(); const r2 = P.$('#view'); if (keep[0]) r2.querySelector('[name="email"]').value = keep[0]; if (keep[1]) r2.querySelector('[name="pw"]').value = keep[1]; });
    const f1 = root.querySelector('[data-ob="name"]');
    if (f1) f1.onsubmit = e => { e.preventDefault(); st.name = f1.name.value.trim(); if (!st.name) return; st.step = 2; rerender(); };
    root.querySelector('[data-ob-login]')?.addEventListener('click', () => { st.mode = 'login'; st.step = 3; rerender(); });
    P.$$('[data-focus]', root).forEach(b => b.onclick = () => { const k = b.dataset.focus; st.focus = st.focus.includes(k) ? st.focus.filter(x => x !== k) : [...st.focus, k]; rerender(); });
    root.querySelector('[data-ob-next]')?.addEventListener('click', () => { if (P.sync?.user()) return finish(); st.step = 3; st.mode = 'signup'; rerender(); });
    root.querySelector('[data-ob-back]')?.addEventListener('click', () => { st.step = st.mode === 'login' && !st.name ? 1 : st.step - 1; if (st.step === 1) st.mode = 'signup'; rerender(); });
    root.querySelector('[data-forgot]')?.addEventListener('click', () => P.forgotPassword(root.querySelector('[name=email]')?.value || ''));
    root.querySelector('[data-ob-mode]')?.addEventListener('click', () => { st.mode = st.mode === 'login' ? 'signup' : 'login'; rerender(); });
    root.querySelector('[data-ob-skip]')?.addEventListener('click', () => { if (!st.name) { st.step = 1; st.mode = 'signup'; return rerender(); } finish(); });
    const f3 = root.querySelector('[data-ob="account"]');
    if (f3) f3.onsubmit = async e => {
      e.preventDefault(); if (st.busy) return;
      st.busy = true; const email = f3.email.value.trim(), pw = f3.pw.value; f3.querySelector('.ob-main').disabled = true; f3.querySelector('.ob-main').textContent = 'Um instante…';
      const ok = await P.sync.auth(st.mode, email, pw);
      st.busy = false;
      if (!ok) return rerender();
      if (S.settings().onboarded) { P.toast(`Que bom te ver de novo${S.settings().name ? ', ' + S.settings().name : ''}!`); P.go(P.home()); return; }
      if (!st.name) { st.step = 1; st.mode = 'signup'; P.toast('Conta conectada. Agora conta como podemos te chamar.'); return rerender(); }
      finish();
    };
  };
})();

/* ---------- tela "Entrar" (sessão expirou ou saiu da conta) ---------- */
(function () {
  const S = P.store;
  let busy = false;
  P.views.entrar = () => `<div class="ob2">
      <header class="ob-head"><span class="ob-brand"><img src="icon-192.png" alt="" width="34" height="34"><b>Prisma</b></span></header>
      <div class="ob-step">
        <h1>Que bom te ver de novo</h1>
        <p class="ob-sub">Entre com o e-mail e a senha da sua conta.</p>
        <form class="ob-account" data-login>
          <label class="ob-field"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg><input name="email" type="email" autocomplete="email" placeholder="E-mail" required></label>
          <label class="ob-field"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><input name="pw" type="password" autocomplete="current-password" placeholder="Senha" minlength="8" required></label>
          <button class="ob-main" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <button class="ob-link small" type="button" data-forgot>Esqueci a senha</button>
        <div class="ob-or"><span>ou</span></div>
        <button class="ob-link" type="button" data-new-account>Criar uma conta nova</button>
      </div>
      <p class="ob-credits">Prisma · Desenvolvido por Lidiane Ester Pereira Florêncio</p></div>`;
  P.mounts.entrar = root => {
    const f = root.querySelector('[data-login]');
    f.onsubmit = async e => {
      e.preventDefault(); if (busy) return; busy = true; P.render();
      const ok = await P.sync.auth('login', f.email.value.trim(), f.pw.value);
      busy = false;
      if (ok) P.go(P.home()); else P.render();
    };
    root.querySelector('[data-forgot]').onclick = () => P.forgotPassword(f.email.value);
    root.querySelector('[data-new-account]').onclick = async () => {
      if (!(await P.ask('Criar uma conta nova neste aparelho? Os dados que estão aqui saem do aparelho (continuam guardados na conta de quem usou antes).', 'Criar conta nova', false))) return;
      S.resetDevice(); try { localStorage.removeItem('prisma2:owner'); } catch (e) {}
      P.go('boasvindas');
    };
  };
})();

/* ---------- esqueci a senha (link pelo e-mail) ---------- */
(function () {
  P.forgotPassword = (email = '') => P.sheet({
    title: 'Esqueci a senha', kicker: 'Vou mandar um link para o seu e-mail',
    render: () => `<form class="form"><label class="field"><span class="field-label">E-mail da conta</span><input name="email" type="email" autocomplete="email" value="${P.esc(email)}" required></label>
      <p class="hint">Abra o link no mesmo aparelho em que o Prisma está instalado e crie uma senha nova. Seus estudos e projetos voltam na hora; o financeiro destranca sozinho quando você abrir o Prisma num aparelho em que ainda está logada (ou com o código de recuperação).</p>
      <p class="form-error" hidden></p><div class="form-actions"><button class="btn primary" type="submit">Mandar o link</button></div></form>`,
    mount: api => {
      api.body.querySelector('form').onsubmit = async e => {
        e.preventDefault(); const b = e.target.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Mandando…';
        try { await P.sync.recover(e.target.email.value.trim()); api.close(); P.toast('Pronto! Se esse e-mail tiver conta, o link chega em alguns minutos. Olhe também o spam.'); }
        catch (err) { b.disabled = false; b.textContent = 'Mandar o link'; const p = api.body.querySelector('.form-error'); p.textContent = /rate|limit/i.test(err.message) ? 'Muitas tentativas. Espere alguns minutos.' : 'Não consegui mandar agora. Confira a internet e tente de novo.'; p.hidden = false; }
      };
    }
  });
  // chegou pelo link do e-mail: ?nova-senha=1&userId=...&secret=...
  P.newPasswordFromLink = () => {
    const q = new URLSearchParams(location.search);
    const userId = q.get('userId'), secret = q.get('secret');
    if (!userId || !secret) return false;
    history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(() => P.sheet({
      title: 'Criar senha nova', kicker: 'Prisma', keep: true,
      render: () => `<form class="form"><label class="field"><span class="field-label">Senha nova (8 ou mais caracteres)</span><input name="pw" type="password" autocomplete="new-password" minlength="8" required></label>
        <label class="field"><span class="field-label">Digite de novo</span><input name="pw2" type="password" autocomplete="new-password" minlength="8" required></label>
        <p class="form-error" hidden></p><div class="form-actions"><button class="btn primary" type="submit">Salvar senha nova</button></div></form>`,
      mount: api => {
        const f = api.body.querySelector('form');
        f.onsubmit = async e => {
          e.preventDefault(); const p = api.body.querySelector('.form-error');
          if (f.pw.value !== f.pw2.value) { p.textContent = 'As duas senhas não estão iguais.'; p.hidden = false; return; }
          const b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Salvando…';
          try { await P.sync.completeRecovery(userId, secret, f.pw.value); api.close(); P.toast('Senha trocada ✓ Agora entre com a senha nova.'); if (P.sync.user()) setTimeout(() => P.vaultUI?.changed(), 500); }
          catch (err) { b.disabled = false; b.textContent = 'Salvar senha nova'; p.textContent = /expired|invalid/i.test(err.message) ? 'Esse link expirou. Peça outro em “Esqueci a senha”.' : 'Não consegui salvar: ' + err.message; p.hidden = false; }
        };
      }
    }), 700);
    return true;
  };
})();
