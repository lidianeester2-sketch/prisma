/* ============================================================
   PRISMA — boas-vindas (primeira vez no app)
   1) Como podemos te chamar?  2) Qual seu foco?  3) Criar conta
   O app se monta com o foco escolhido (dá para mudar em Ajustes).
============================================================ */
(function () {
  const S = P.store, esc = P.esc;
  const st = { step: 1, name: '', focus: [], mode: 'signup', busy: false };

  const dots = () => `<div class="ob-dots" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}"></i>`).join('')}</div>`;

  P.views.boasvindas = () => {
    const canSync = !!P.sync?.state().configured;
    let body;
    if (st.step === 1) body = `
      <img src="icon-192.png" alt="" width="72" height="72" class="ob-logo">
      <span class="eyebrow">Bem-vindo ao Prisma</span>
      <h1>Como podemos te chamar?</h1>
      <p class="lede">Faculdade, projetos, leituras e dinheiro, tudo num lugar só.</p>
      <form class="ob-form" data-ob="name">
        <input id="ob-name" name="name" autocomplete="given-name" maxlength="40" placeholder="Seu nome ou apelido" value="${esc(st.name)}" required>
        <button class="btn primary" type="submit">Continuar</button>
      </form>
      <button class="link quiet-link" type="button" data-ob-login>Já tenho conta → Entrar</button>`;
    else if (st.step === 2) body = `
      <span class="eyebrow">Prazer, ${esc(st.name)}!</span>
      <h1>Qual seu foco no Prisma?</h1>
      <p class="lede">Escolha um ou mais. O app se monta com o que você escolher, e dá para mudar depois em Ajustes.</p>
      <div class="ob-focus" role="group" aria-label="Foco">${Object.entries(P.FOCUS).map(([k, f]) => `<button type="button" class="ob-opt ${st.focus.includes(k) ? 'on' : ''}" data-focus="${k}" aria-pressed="${st.focus.includes(k)}">
          <span class="ob-ico f-${k}">${f.icon}</span><span><b>${f.label}</b><small>${f.desc}</small></span><span class="ob-check" aria-hidden="true">✓</span></button>`).join('')}</div>
      <div class="ob-actions"><button class="btn ghost" type="button" data-ob-back>Voltar</button><button class="btn primary" type="button" data-ob-next ${st.focus.length ? '' : 'disabled'}>Continuar</button></div>`;
    else body = `
      <span class="eyebrow">Último passo</span>
      <h1>${st.mode === 'login' ? 'Entrar na sua conta' : 'Crie sua conta'}</h1>
      <p class="lede">${st.mode === 'login' ? 'Seus dados voltam para este aparelho.' : 'Para guardar tudo na nuvem e usar no celular e no computador. Só você vê os seus dados.'}</p>
      ${canSync ? `<form class="ob-form col" data-ob="account">
        <input name="email" type="email" autocomplete="email" placeholder="E-mail" required>
        <input name="pw" type="password" autocomplete="${st.mode === 'login' ? 'current-password' : 'new-password'}" placeholder="Senha (8 ou mais caracteres)" minlength="8" required>
        <button class="btn primary" type="submit" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Um instante…' : st.mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      </form>
      <button class="link" type="button" data-ob-mode>${st.mode === 'login' ? 'Ainda não tenho conta → Criar' : 'Já tenho conta → Entrar'}</button>`
      : `<div class="notice">A conta na nuvem ainda não está ligada neste endereço. Você pode começar agora e ligar depois em Ajustes → Sincronização (ou abrindo o link de convite).</div>`}
      <div class="ob-actions">${st.mode === 'login' && !st.name ? '' : '<button class="btn ghost" type="button" data-ob-back>Voltar</button>'}<button class="btn ${canSync ? 'ghost' : 'primary'}" type="button" data-ob-skip>${canSync ? 'Agora não, usar só neste aparelho' : 'Começar'}</button></div>`;
    return `<div class="ob">${dots()}<div class="ob-card">${body}</div><p class="credits">Prisma · Desenvolvido por Lidiane Tavares</p></div>`;
  };

  const finish = () => {
    S.setSettings({ name: st.name.trim(), focus: st.focus.length ? st.focus : Object.keys(P.FOCUS), onboarded: true });
    P.applyFocus();
    P.go(P.home());
    setTimeout(() => P.toast(P.hasPrisma() ? 'Tudo pronto! Toque em + para criar sua primeira coisa.' : 'Tudo pronto! Comece informando o saldo da sua conta.'), 300);
  };

  P.mounts = P.mounts || {};
  P.mounts.boasvindas = root => {
    const rerender = () => P.render();
    root.querySelector('#ob-name')?.focus();
    const f1 = root.querySelector('[data-ob="name"]');
    if (f1) f1.onsubmit = e => { e.preventDefault(); st.name = f1.name.value.trim(); if (!st.name) return; st.step = 2; rerender(); };
    root.querySelector('[data-ob-login]')?.addEventListener('click', () => { st.mode = 'login'; st.step = 3; rerender(); });
    P.$$('[data-focus]', root).forEach(b => b.onclick = () => { const k = b.dataset.focus; st.focus = st.focus.includes(k) ? st.focus.filter(x => x !== k) : [...st.focus, k]; rerender(); });
    root.querySelector('[data-ob-next]')?.addEventListener('click', () => { if (P.sync?.user()) return finish(); st.step = 3; st.mode = 'signup'; rerender(); });
    root.querySelector('[data-ob-back]')?.addEventListener('click', () => { st.step = st.mode === 'login' && !st.name ? 1 : st.step - 1; if (st.step === 1) st.mode = 'signup'; rerender(); });
    root.querySelector('[data-ob-mode]')?.addEventListener('click', () => { st.mode = st.mode === 'login' ? 'signup' : 'login'; rerender(); });
    root.querySelector('[data-ob-skip]')?.addEventListener('click', () => { if (!st.name) { st.step = 1; st.mode = 'signup'; return rerender(); } finish(); });
    const f3 = root.querySelector('[data-ob="account"]');
    if (f3) f3.onsubmit = async e => {
      e.preventDefault(); if (st.busy) return;
      st.busy = true; const email = f3.email.value.trim(), pw = f3.pw.value; rerender();
      const ok = await P.sync.auth(st.mode, email, pw);
      st.busy = false;
      if (!ok) return rerender();
      if (S.settings().onboarded) { P.toast(`Que bom te ver de novo${S.settings().name ? ', ' + S.settings().name : ''}!`); P.go(P.home()); return; }
      if (!st.name) { st.step = 1; st.mode = 'signup'; P.toast('Conta conectada. Agora conta como podemos te chamar.'); return rerender(); }
      finish();
    };
  };
})();
