/* ============================================================
   PRISMA — tutorial de boas-vindas (dicas sobre a tela real)
   Aparece uma vez, logo depois de criar a conta. Um "buraco" de
   luz destaca cada parte e um balão explica. Dá para pular, e
   rever em Ajustes → Aparência → Ver o tutorial.
============================================================ */
(function () {
  const S = P.store;
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const pick = sels => sels.map(s => [...document.querySelectorAll(s)]).flat().find(visible) || null;

  const steps = () => {
    const name = (S.settings().name || '').split(' ')[0];
    const fin = P.space() === 'fin';
    const list = [
      { title: `Oi${name ? ', ' + P.esc(name) : ''}!`, text: 'Vou te mostrar o básico do Prisma. Leva 30 segundos.' },
      { sel: ['.tabbar .fab', '.sidebar .new-btn'], title: fin ? 'Lançar' : 'Adicionar', text: fin ? 'Toque aqui para lançar um gasto ou uma receita. Dá para escrever do seu jeito: “gastei 23,90 de uber no pix”.' : 'Toque aqui para criar uma tarefa, prova, aula ou anotação. Pode escrever do seu jeito: “prova de semiótica sexta”.' },
      P.hasFin() && P.hasPrisma() ? { sel: ['.mobile-top .space-switch', '.sidebar .space-switch'], title: 'Estudos e Finanças', text: 'Troque entre os dois espaços aqui. Cada um tem as próprias telas.' } : null,
      { sel: ['.tabbar', '.sidebar .nav-list:not([hidden])'], title: 'Suas telas', text: fin ? 'Painel, Orçamento, Lançamentos e Relatório ficam aqui embaixo.' : 'Hoje, Agenda, Pastas e Notas ficam aqui. Hoje mostra o que importa agora.' },
      P.hasFin() ? { sel: ['#ai-fab'], title: 'Assistente', text: 'Pergunte “posso gastar 200?” ou peça para lançar algo. Ele só sugere: nada é salvo sem você confirmar.' } : null,
      { sel: ['.mobile-top [data-nav="ajustes"]', '.sidebar [data-nav="ajustes"]'], title: 'Ajustes', text: 'Ative as notificações por aqui, escolha o tema e o tamanho do texto.' },
      { title: 'Tudo pronto', text: 'Se quiser rever estas dicas, é só ir em Ajustes → Aparência → Ver o tutorial.' }
    ].filter(Boolean);
    // passos com alvo que não está na tela (ex.: assistente fora do Financeiro) saem da lista
    return list.filter(s => !s.sel || pick(s.sel));
  };

  let root = null, i = 0, list = [], onKey = null;
  function place() {
    const s = list[i], hole = root.querySelector('.tour-hole'), tip = root.querySelector('.tour-tip');
    tip.innerHTML = `<h3>${s.title}</h3><p>${s.text}</p><div class="tour-foot"><div class="tour-dots" aria-hidden="true">${list.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      ${i < list.length - 1 ? '<button class="btn ghost small" type="button" data-skip>Pular</button>' : ''}<button class="btn primary small" type="button" data-next>${i === list.length - 1 ? 'Começar' : i === 0 ? 'Vamos lá' : 'Próximo'}</button></div>`;
    tip.setAttribute('aria-label', `Dica ${i + 1} de ${list.length}`);
    tip.querySelector('[data-next]').onclick = () => (i < list.length - 1 ? (i++, place()) : end());
    tip.querySelector('[data-skip]')?.addEventListener('click', end);
    const el = s.sel ? pick(s.sel) : null;
    const vw = innerWidth, vh = innerHeight, tw = Math.min(300, vw - 32);
    if (el) {
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { top: r.top - pad + 'px', left: r.left - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', opacity: 1, borderRadius: Math.min(22, r.height / 2 + pad) + 'px' });
      const th = tip.offsetHeight || 150;
      const below = r.bottom + 16 + th < vh;
      tip.style.top = (below ? r.bottom + 16 : Math.max(16, r.top - 16 - th)) + 'px';
      tip.style.left = Math.min(vw - tw - 16, Math.max(16, r.left + r.width / 2 - tw / 2)) + 'px';
    } else {
      Object.assign(hole.style, { top: vh / 2 + 'px', left: vw / 2 + 'px', width: '0px', height: '0px', opacity: 1 });
      tip.style.top = Math.max(16, vh / 2 - (tip.offsetHeight || 150) / 2) + 'px';
      tip.style.left = (vw - tw) / 2 + 'px';
    }
    tip.querySelector('[data-next]').focus({ preventScroll: true });
  }
  function end() {
    if (!root) return;
    S.setSettings({ tourPending: false, tourDone: true });
    root.style.opacity = '0'; root.style.transition = 'opacity .25s';
    const r = root; root = null; setTimeout(() => r.remove(), 260);
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', place);
    document.querySelectorAll('body > :not(.tour):not(script)').forEach(el => { if (el.dataset.tourInert) { el.inert = false; delete el.dataset.tourInert; } });
  }
  P.tour = {
    start() {
      if (root || document.body.classList.contains('onboarding')) return;
      window.scrollTo(0, 0);
      list = steps(); i = 0;
      root = document.createElement('div'); root.className = 'tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Tutorial do Prisma');
      root.innerHTML = '<div class="tour-hole"></div><div class="tour-tip"></div>';
      document.body.appendChild(root);
      document.querySelectorAll('body > :not(.tour):not(script)').forEach(el => { if (!el.inert) { el.inert = true; el.dataset.tourInert = '1'; } });
      onKey = e => { if (e.key === 'Escape') end(); };
      document.addEventListener('keydown', onKey); window.addEventListener('resize', () => root && place());
      place();
    },
    // depois de criar a conta: espera as janelas (ex.: código de recuperação) fecharem
    maybe() {
      if (!S.settings().tourPending) return;
      const t = setInterval(() => { if (!S.settings().tourPending) return clearInterval(t); if (!P.openSheets.length && !document.body.classList.contains('onboarding')) { clearInterval(t); setTimeout(() => P.tour.start(), 400); } }, 500);
    }
  };
  Object.assign(P.actions, { tour: () => { P.go(P.home()); setTimeout(() => P.tour.start(), 450); } });
})();
