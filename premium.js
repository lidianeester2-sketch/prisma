/* ============================================================
   PRISMA — planos (Grátis e Premium)
   Base para a assinatura. Hoje, no beta, todo mundo tem tudo
   (config.js → betaPremium: true). Quando a Play Store entrar,
   quem é Premium vem do servidor: o rótulo "premium" na conta
   (Appwrite → Auth → usuário → Labels), gravado pela função que
   recebe o aviso de pagamento da Google. O aparelho nunca decide
   sozinho quem é Premium.
============================================================ */
(function () {
  const FEATURES = {
    ai: ['Assistente de IA sem limite', 'No grátis: 5 perguntas por mês'],
    reports: ['Relatórios de todos os ciclos', 'No grátis: só o ciclo atual'],
    alerts: ['Alertas inteligentes e metas', '“No ritmo de hoje, falta dinheiro dia 28”'],
    themes: ['Todos os temas', 'No grátis: Prisma e Escuro'],
    export: ['Exportar planilha e PDF', 'Leve seus dados para onde quiser']
  };
  const FREE_THEMES = ['prisma', 'escuro', 'auto', 'claro', 'grafite'];
  const user = () => P.sync?.user?.();
  const Pm = P.premium = {
    FEATURES, FREE_THEMES,
    plan() { const u = user(); if (u?.labels?.includes('premium')) return 'premium'; if (P.CONFIG?.betaPremium) return 'beta'; return 'free'; },
    isPremium() { return Pm.plan() !== 'free'; },
    has(feature) { return Pm.isPremium() || !FEATURES[feature]; },
    // tenta usar um recurso: se não pode, mostra o convite e devolve false
    gate(feature) { if (Pm.has(feature)) return true; Pm.offer(feature); return false; },
    offer(feature) {
      const f = FEATURES[feature];
      P.sheet({ title: 'Prisma Premium', kicker: f ? f[0] : 'Recursos extras',
        render: () => `<p class="ask-msg">${f ? `<b>${P.esc(f[0])}</b> faz parte do Premium.` : 'Este recurso faz parte do Premium.'}</p>
          <ul class="premium-list">${Object.values(FEATURES).map(([t, s]) => `<li><b>${P.esc(t)}</b><span>${P.esc(s)}</span></li>`).join('')}</ul>
          <p class="hint">A assinatura chega em breve: R$ 9,90 por mês ou R$ 79,90 por ano, com 7 dias grátis. Nada é cobrado sem você confirmar.</p>
          <div class="form-actions"><button class="btn primary" type="button" data-ok>Entendi</button></div>`,
        mount: api => { api.body.querySelector('[data-ok]').onclick = () => api.close(); } });
    },
    statusHTML() {
      const p = Pm.plan();
      const head = p === 'premium' ? ['ok', 'Premium', 'Obrigada por apoiar o Prisma!'] : p === 'beta' ? ['ok', 'Premium de teste', 'Durante o beta, todos os recursos estão liberados de graça.'] : ['idle', 'Grátis', 'O essencial para organizar estudos, projetos e dinheiro.'];
      return `<div class="sync-box"><div><span class="status-dot ${head[0]}"></span><strong>${head[1]}</strong><small>${head[2]}</small></div></div>
        <ul class="premium-list">${Object.values(FEATURES).map(([t, s]) => `<li><b>${P.esc(t)}</b><span>${p === 'free' ? P.esc(s) : 'incluído'}</span></li>`).join('')}</ul>`;
    }
  };
})();
