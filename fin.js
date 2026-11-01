/* ============================================================
   FINANCEIRO+ — dados, histórico e bloqueio por PIN
   As telas leem e gravam por aqui. Toda gravação deixa um
   registro de "antes e depois" no histórico (fin_hist).
============================================================ */
(function () {
  const S = P.store, C = P.finCore;
  const F = P.fin = {};

  /* ---------------- categorias padrão ---------------- */
  F.DEFAULT_CATS = [
    ['moradia', 'Moradia', 'despesa', false], ['alimentacao', 'Alimentação', 'despesa', true], ['transporte', 'Transporte', 'despesa', true],
    ['saude', 'Saúde', 'despesa', false], ['educacao', 'Educação', 'despesa', false], ['academia', 'Academia', 'despesa', false],
    ['compras', 'Compras pessoais', 'despesa', true], ['familia', 'Família', 'despesa', false], ['lazer', 'Lazer', 'despesa', true],
    ['assinaturas', 'Assinaturas', 'despesa', false], ['dividas', 'Dívidas', 'despesa', false], ['cartao', 'Cartão de crédito', 'despesa', false],
    ['emergencias', 'Emergências', 'despesa', false], ['outros', 'Outros', 'despesa', true],
    ['salario', 'Salário', 'receita', false], ['freelas', 'Freelas', 'receita', false], ['vendas', 'Vendas', 'receita', false],
    ['servicos', 'Serviços', 'receita', false], ['reembolsos', 'Reembolsos', 'receita', false], ['outras-receitas', 'Outras receitas', 'receita', false]
  ];
  F.METHODS = { debito: 'Débito', pix: 'Pix', dinheiro: 'Dinheiro', boleto: 'Boleto', transferencia: 'Transferência', credito: 'Crédito' };
  F.KINDS = { despesa: 'Despesa', receita: 'Receita', transferencia: 'Transferência', ajuste: 'Ajuste' };
  F.ACC_TYPES = { corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Carteira (dinheiro)', investimento: 'Investimento' };

  const DEFAULT_PROFILE = { id: 'finprofile', income: 500000, incomeCertainty: 'estimado', payday: 6, paydayRule: 'adia', reserve: 0 };

  /* ---------------- leitura ---------------- */
  F.profile = () => ({ ...DEFAULT_PROFILE, ...(S.get('meta', 'finprofile') || {}) });
  F.accounts = () => S.all('fin_conta').filter(a => !a.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'pt'));
  F.cats = kind => S.all('fin_cat').filter(c => !c.archived && (!kind || c.kind === kind)).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  F.cat = id => S.get('fin_cat', id);
  F.acc = id => S.get('fin_conta', id);
  F.txs = () => S.all('fin_lanc');
  F.recs = () => S.all('fin_rec');
  F.cycles = () => S.all('fin_ciclo');
  F.state = () => ({ accounts: S.all('fin_conta'), txs: F.txs(), categories: S.all('fin_cat'), cycles: F.cycles(), profile: F.profile() });
  F.snap = () => C.snapshot(F.state(), P.today());

  /* ---------------- gravação com histórico ---------------- */
  const LABEL = { fin_conta: 'conta', fin_cat: 'categoria', fin_lanc: 'lançamento', fin_rec: 'conta fixa', fin_ciclo: 'ciclo', fin_conc: 'conciliação', meta: 'perfil financeiro' };
  F.save = (col, rec, summary) => {
    const before = rec.id ? S.raw()[col]?.[rec.id] : null;
    const saved = S.put(col, rec);
    const changes = C.diff(before && !before.deleted ? before : null, saved);
    if (Object.keys(changes).length) {
      S.put('fin_hist', { col, recId: saved.id, action: before && !before.deleted ? 'alterou' : 'criou', changes, summary: summary || `${before ? 'Alterou' : 'Criou'} ${LABEL[col] || col}`, at: Date.now(), device: navigator.userAgent.includes('Mobile') ? 'celular' : 'computador' });
    }
    return saved;
  };
  F.setProfile = changes => F.save('meta', { ...F.profile(), ...changes, id: 'finprofile' }, 'Alterou o perfil financeiro');

  /* ---------------- dados de partida ---------------- */
  // Categorias padrão e a conta Nubank ficam só neste aparelho até você mexer nelas.
  F.ensureSeeds = () => {
    F.DEFAULT_CATS.forEach(([key, name, kind, weekly]) => S.seed('fin_cat', { id: 'cat-' + key, name, kind, weekly, custom: false }));
    if (!S.all('fin_conta').length) S.seed('fin_conta', { id: 'conta-nubank', name: 'Nubank', bank: 'Nubank', type: 'corrente', opening: 0, openingDate: P.today(), openingSet: false, inAvailable: true, order: 0 });
  };
  // Contas fixas viram lançamentos "previstos" do período. Id fixo: nunca duplica.
  F.ensureOccurrences = (from, to) => {
    const raw = S.raw().fin_lanc;
    F.recs().forEach(r => C.occurrences(r, from, to).forEach(o => { if (!raw[o.id]) S.seed('fin_lanc', o); }));
  };

  /* ---------------- formatação ---------------- */
  F.hidden = () => P.ls.get('prisma2:finHide', false);
  F.money = (c, opts) => (F.hidden() ? 'R$ ••••' : C.formatMoney(c, opts));
  F.date = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}${y !== String(new Date().getFullYear()) ? '/' + y.slice(2) : ''}`; };
  F.status = t => (t.status === 'previsto' && t.date < P.today() ? 'pendente' : t.status);
  F.STATUS_LABEL = { previsto: 'previsto', pendente: 'pendente', realizado: 'realizado', cancelado: 'cancelado' };

  /* ---------------- PIN ---------------- */
  const PIN_KEY = 'prisma2:finpin';
  let unlocked = false, hiddenAt = 0;
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  F.hasPin = () => !!P.ls.get(PIN_KEY);
  F.locked = () => !unlocked;
  F.setPin = async pin => { const salt = P.uid(); P.ls.set(PIN_KEY, { salt, hash: await sha(salt + ':' + pin), attempts: 0, until: 0 }); unlocked = true; };
  F.checkPin = async pin => {
    const p = P.ls.get(PIN_KEY); if (!p) return { ok: false };
    if (p.until && Date.now() < p.until) return { ok: false, wait: Math.ceil((p.until - Date.now()) / 1000) };
    if (await sha(p.salt + ':' + pin) === p.hash) { P.ls.set(PIN_KEY, { ...p, attempts: 0, until: 0 }); unlocked = true; return { ok: true }; }
    const attempts = (p.attempts || 0) + 1;
    const until = attempts >= 5 ? Date.now() + 30000 : 0;
    P.ls.set(PIN_KEY, { ...p, attempts: until ? 0 : attempts, until });
    return { ok: false, left: until ? 0 : 5 - attempts, wait: until ? 30 : 0 };
  };
  F.lock = () => { unlocked = false; };
  // Esqueci o PIN: apaga o PIN e os dados financeiros DESTE aparelho e sai da conta.
  // Para ver os dados de novo é preciso entrar com a senha da conta (Ajustes → Sincronização).
  F.forgotPin = async () => {
    P.ls.del(PIN_KEY); unlocked = false;
    S.purgeLocal(['fin_conta', 'fin_cat', 'fin_lanc', 'fin_rec', 'fin_ciclo', 'fin_conc', 'fin_hist']);
    try { Object.keys(localStorage).filter(k => k.startsWith('prisma2:lastPull')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if (P.sync?.user()) await P.sync.signOut();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 2 * 60 * 1000) { unlocked = false; if (P.space?.() === 'fin') P.render(); }
  });
})();
