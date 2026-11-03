/* ============================================================
   FINANCEIRO+ — importar um planejamento (arquivo .json)
   Mostra TUDO o que vai ser criado ou alterado e só grava
   depois que você confirma. Rodar de novo não duplica nada:
   cada item tem um id fixo e o que já existe é atualizado.
============================================================ */
(function () {
  const S = P.store, C = P.finCore, F = P.fin, esc = P.esc;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const money = v => (typeof v === 'number' ? Math.round(v * 100) : C.parseMoney(v));

  F.importPick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      try { F.importPlan(JSON.parse(await file.text())); }
      catch (e) { P.toast('Não consegui ler esse arquivo. Ele precisa ser o .json do planejamento.'); }
    };
    inp.click();
  };

  // Monta o "antes de gravar": lista de ações + conferência dos totais
  function build(plan) {
    if (!plan || plan.tipo !== 'prisma-financeiro-plano') throw new Error('Esse arquivo não é um planejamento do Prisma.');
    F.ensureSeeds();
    const cur = F.profile();
    // o arquivo pode trazer a regra do salário (ex.: 5º dia útil): o ciclo já é calculado com ela
    const perfil = plan.perfil || {};
    const prof = { ...cur, ...(perfil.diaSalario ? { payday: perfil.diaSalario } : {}), ...(perfil.regraSalario ? { paydayRule: perfil.regraSalario } : {}) };
    const cycle = C.cycleFor(plan.ciclo.inicio, F.cycles(), prof);
    F.ensureOccurrences(cycle.start, cycle.end);
    const ym = cycle.start.slice(0, 7);
    const actions = [], notes = [];
    const txs = () => F.txs();
    const inCycle = t => t.date >= cycle.start && t.date <= cycle.end && t.status === 'previsto';
    const mainAcc = F.accounts()[0];

    if ((plan.ciclo.fim && plan.ciclo.fim !== cycle.end) || plan.ciclo.inicio !== cycle.start) notes.push(`O arquivo indica o ciclo de ${F.date(plan.ciclo.inicio)} a ${F.date(plan.ciclo.fim)}. Pela regra do perfil (${F.paydayTxt(prof)}), o ciclo fica de ${F.date(cycle.start)} a ${F.date(cycle.end)}. Os valores não mudam.`);

    // categorias
    const catId = (name, kind = 'despesa') => {
      const found = F.cats().find(c => norm(c.name) === norm(name) && c.kind === kind);
      if (found) return found.id;
      const id = 'cat-' + slug(name);
      if (!actions.some(a => a.col === 'fin_cat' && a.rec.id === id)) actions.push({ col: 'fin_cat', rec: { id, name, kind, weekly: false, custom: true }, what: 'nova categoria', label: name });
      return id;
    };

    // perfil
    if (prof.payday !== cur.payday || prof.paydayRule !== cur.paydayRule) actions.push({ col: 'meta', rec: { ...cur, payday: prof.payday, paydayRule: prof.paydayRule, id: 'finprofile' }, what: 'perfil', label: `Dia do salário: ${F.paydayTxt(cur)} → ${F.paydayTxt(prof)} (salário em ${F.date(cycle.start)}, próximo em ${F.date(cycle.nextPay)})` });
    if (plan.salario && money(plan.salario) !== prof.income) actions.push({ col: 'meta', rec: { ...prof, income: money(plan.salario), incomeCertainty: 'confirmado', id: 'finprofile' }, what: 'perfil', label: `Renda líquida: ${F.money(prof.income)} → ${F.money(money(plan.salario))}` });

    // cartões
    const cardId = {};
    (plan.cartoes || []).forEach(k => {
      const found = F.cards().find(c => norm(c.name) === norm(k.nome));
      cardId[norm(k.nome)] = found ? found.id : 'conta-' + slug(k.nome);
      if (!found) actions.push({ col: 'fin_conta', rec: { id: 'conta-' + slug(k.nome), name: k.nome, bank: k.banco || '', type: 'cartao', inAvailable: false, opening: 0, openingSet: true, openingDate: P.today(), order: 9 }, what: 'novo cartão', label: `${k.nome} (limite não conta como dinheiro)` });
    });

    // parcelamentos
    const parcs = {};
    (plan.parcelamentos || []).forEach(p => {
      const id = slug(p.chave), total = money(p.total);
      const rec = { id, type: p.tipo, desc: p.desc, total, n: p.parcelas, firstMonth: p.primeiroMes, paidBefore: p.pagasAntes || 0, categoryId: catId(p.categoria), method: p.forma || 'pix', accountId: p.tipo === 'cartao' ? cardId[norm(p.cartao)] || null : mainAcc?.id || null, notes: p.obs || '' };
      parcs[p.chave] = rec;
      const exists = F.parc(id);
      const sched = C.installments(rec, []);
      actions.push({ col: 'fin_parc', rec: exists ? { ...exists, ...rec } : rec, what: exists ? 'atualiza parcelamento' : 'novo parcelamento',
        label: p.tipo === 'cartao' ? `${p.desc}: ${p.parcelas}× ${F.money(sched[0].amount)} no cartão, 1ª na fatura de ${sched[0].month.split('-').reverse().join('/')}. Não conta em ${ym.split('-').reverse().join('/')}.` : `${p.desc}: ${p.parcelas}× ${F.money(sched[0].amount)} (total ${F.money(total)}), ${rec.paidBefore} já pagas antes` });
    });

    // receitas
    (plan.receitas || []).forEach(r => {
      const cid = catId(r.categoria, 'receita'), amount = money(r.valor);
      const found = txs().find(t => t.kind === 'receita' && t.categoryId === cid && inCycle(t));
      const rec = { ...(found || {}), id: found ? found.id : `plano-${ym}-${slug(r.chave)}`, kind: 'receita', desc: r.desc, amount, date: r.data || cycle.start, status: 'previsto', certainty: r.certeza || 'confirmado', method: 'transferencia', accountId: mainAcc?.id || null, categoryId: cid, origin: found?.origin || 'planejamento' };
      actions.push({ col: 'fin_lanc', rec, what: found ? 'atualiza' : 'nova receita', label: `${r.desc} · ${F.money(amount)} (previsto)`, amount, kind: 'receita' });
    });

    // despesas
    (plan.despesas || []).forEach(d => {
      const cid = catId(d.categoria), amount = money(d.valor);
      const parc = d.parcelamento && parcs[d.parcelamento];
      const ownId = parc ? `parc-${parc.id}-${d.parcela}` : `plano-${ym}-${slug(d.chave)}`;
      const keys = (d.procurar || []).map(norm);
      const found = S.raw().fin_lanc[ownId] && !S.raw().fin_lanc[ownId].deleted ? S.raw().fin_lanc[ownId]
        : txs().find(t => t.kind === 'despesa' && inCycle(t) && t.id !== ownId && keys.some(k => norm(t.desc).includes(k)));
      if (found && found.status === 'realizado') { actions.push({ skip: true, what: 'já paga', label: `${d.desc}: já está paga, não mexo`, amount: found.amount, kind: 'despesa' }); return; }
      const rec = { ...(found || {}), id: found ? found.id : ownId, kind: 'despesa', desc: d.desc, amount, date: d.vencimento || cycle.end, noDue: !d.vencimento,
        status: 'previsto', certainty: d.teto ? 'estimado' : (d.certeza || 'confirmado'), method: d.forma || 'pix', accountId: found?.accountId || mainAcc?.id || null, categoryId: cid,
        origin: found?.origin || (parc ? 'parcelamento' : 'planejamento') };
      if (parc) Object.assign(rec, { parcId: parc.id, parcNum: d.parcela });
      if (found?.autoInvoice) Object.assign(rec, { manualAmount: true, date: found.date, noDue: false });
      if (d.teto) Object.assign(rec, { envelope: true, envStart: cycle.start, envEnd: cycle.end });
      actions.push({ col: 'fin_lanc', rec, what: found ? (found.id === ownId ? 'atualiza' : `usa o que já existe (“${found.desc}”)`) : 'nova', label: `${d.desc} · ${F.money(amount)}${d.teto ? ' · teto' : ''}${parc ? ` · parcela ${d.parcela}/${parc.n}` : ''}`, amount, kind: 'despesa' });
    });

    // pausas (ex.: academia até jan/2027)
    (plan.pausas || []).forEach(z => {
      const keys = (z.procurar || []).map(norm);
      const recs = F.recs().filter(r => keys.some(k => norm(r.desc).includes(k)));
      recs.forEach(r => actions.push({ col: 'fin_rec', rec: { ...r, pausedUntil: z.ate, pausedFrom: z.desde || null }, what: 'pausa conta fixa', label: `${r.desc}: pausada, volta em ${z.ate.split('-').reverse().join('/')}` }));
      txs().filter(t => t.kind === 'despesa' && t.status === 'previsto' && t.date >= cycle.start && t.date.slice(0, 7) < z.ate && keys.some(k => norm(t.desc).includes(k)))
        .forEach(t => actions.push({ col: 'fin_lanc', rec: { ...t, status: 'cancelado' }, what: 'cancela', label: `${t.desc} de ${F.date(t.date)} (pausada)` }));
      const pauses = (F.profile().pauses || []).filter(x => x.match !== keys[0]).concat([{ match: keys[0], label: z.desc || keys[0], until: z.ate }]);
      actions.push({ col: 'meta', rec: { ...F.profile(), ...(actions.find(a => a.col === 'meta')?.rec || {}), pauses, id: 'finprofile' }, what: 'regra', label: `${z.desc || keys[0]}: não entra no orçamento até ${z.ate.split('-').reverse().join('/')}${recs.length ? '' : ' (nenhuma conta fixa com esse nome hoje; se você cadastrar, ela já nasce pausada)'}` });
    });

    const exp = actions.filter(a => a.kind === 'despesa').reduce((s, a) => s + a.amount, 0);
    const inc = actions.filter(a => a.kind === 'receita').reduce((s, a) => s + a.amount, 0);
    if (plan.totalDespesas && money(plan.totalDespesas) !== exp) notes.push(`Atenção: a soma das despesas dá ${F.money(exp)}, mas o arquivo diz ${F.money(money(plan.totalDespesas))}.`);
    return { plan, cycle, actions, notes, exp, inc };
  }

  F.importPlan = plan => {
    let b; try { b = build(plan); } catch (e) { P.toast(e.message); return; }
    const group = (title, list) => list.length ? `<div class="block-head sub"><h3>${title}</h3></div><div class="list">${list.map(a => `<div class="row"><span class="row-main as-text"><span class="row-title">${esc(a.label)}</span><span class="row-meta">${esc(a.what)}</span></span></div>`).join('')}</div>` : '';
    P.sheet({
      title: b.plan.titulo || 'Importar planejamento', kicker: 'confira antes de cadastrar', wide: true,
      render: () => `
        <p class="lede">Ciclo ${F.date(b.cycle.start)} a ${F.date(b.cycle.end)}. Tudo entra como <b>pendente</b>. Nada é marcado como pago.</p>
        ${b.notes.map(n => `<div class="notice">${esc(n)}</div>`).join('')}
        <div class="calc-table" style="margin-top:12px">
          <div><span>Receitas previstas</span><b>${F.money(b.inc)}</b></div>
          <div><span>− Despesas do ciclo</span><b>${F.money(-b.exp)}</b></div>
          <div class="calc-total ${b.inc - b.exp < 0 ? 'bad' : ''}"><span>= Saldo projetado</span><b>${F.money(b.inc - b.exp)}</b></div>
        </div>
        ${group('Despesas', b.actions.filter(a => a.kind === 'despesa'))}
        ${group('Receitas', b.actions.filter(a => a.kind === 'receita'))}
        ${group('Parcelamentos e cartão', b.actions.filter(a => a.col === 'fin_parc' || a.col === 'fin_conta'))}
        ${group('Regras e ajustes', b.actions.filter(a => (a.col === 'meta' || a.col === 'fin_rec' || a.what === 'cancela')))}
        ${group('Categorias novas', b.actions.filter(a => a.col === 'fin_cat'))}
        <div class="form-actions"><button class="btn ghost" type="button" data-no>Cancelar</button><button class="btn primary" type="button" data-yes>Cadastrar tudo</button></div>`,
      mount: api => {
        api.body.querySelector('[data-no]').onclick = () => api.close();
        api.body.querySelector('[data-yes]').onclick = () => {
          const tag = b.plan.titulo || 'Planejamento';
          // perfil: junta todas as mudanças num registro só
          const metas = b.actions.filter(a => a.col === 'meta');
          if (metas.length) F.save('meta', Object.assign({}, F.profile(), ...metas.map(a => a.rec)), `${tag}: ajustou o perfil`);
          b.actions.filter(a => !a.skip && a.col !== 'meta').forEach(a => F.save(a.col, a.rec, `${tag}: ${a.what} — ${a.label}`));
          api.close();
          P.ui.finCycleOfs = Math.max(0, Math.round(C.diffDays(F.snap().cycle.start, b.cycle.start) / 30));
          P.toast(`Planejamento cadastrado: ${b.actions.filter(a => a.kind === 'despesa' && !a.skip).length} despesas pendentes.`);
          P.go('fin-orcamento');
        };
      }
    });
  };
})();
