/* ============================================================
   FINANCEIRO+ — Espelho do mês e "E se eu comprar?"
   Uma foto de agora (conta, crédito, posso gastar), como o ciclo
   termina, o limite e a meta de cada cartão, e compras de mentira
   para ver o impacto antes de gastar. Nada da simulação é gravado.
============================================================ */
(function () {
  const C = P.finCore, F = P.fin, esc = P.esc;
  let sims = [];                                    // compras de mentira (só na memória)
  let form = { amount: null, desc: '', method: 'credito', n: 1, cardId: '' };
  const M = v => F.money(v);
  const ym = m => F.ymTxt(m);
  const delta = (a, b, costUp = false) => { const d = b - a; const bad = costUp ? d > 0 : d < 0; return d === 0 ? '<span class="faint">igual</span>' : `<span class="${bad ? 'bad-t' : 'ok-t'}">${d > 0 ? '+' : '−'}${M(Math.abs(d)).replace('−', '')}</span>`; };

  const verdict = (b, a, h) => {
    const over = a.cards.find(c => c.free !== null && c.free < 0);
    const goalOver = a.cards.find(c => c.goal && c.room < 0 && !(b.cards.find(x => x.id === c.id)?.room < 0));
    if (a.canSpend < 0) return ['bad', `Não cabe: faltariam ${M(-a.canSpend)} até o salário (${F.date(a.cycle.nextPay)}).`];
    if (over) return ['bad', `Estoura o limite do ${esc(over.name)} em ${M(-over.free)}.`];
    if (a.endWithPlan < 0) return ['warn', `Cabe nas contas, mas fica apertado: se você usar todo o dia a dia planejado, faltam ${M(-a.endWithPlan)} no fim do ciclo.`];
    if (goalOver) return ['warn', `Cabe, mas a fatura de ${ym(goalOver.openMonth)} passa da sua meta em ${M(-goalOver.room)}.`];
    const onlyCredit = h.every(x => x.method === 'credito');
    if (onlyCredit && a.canSpend === b.canSpend) return ['ok', `Cabe. Não mexe no dinheiro deste ciclo: entra nas próximas faturas.`];
    return ['ok', `Cabe. Depois da compra ainda sobram ${M(a.perDay)} por dia até o salário.`];
  };

  const cardBlock = (c, after) => {
    const a = after || c;
    const pct = c.limit ? Math.min(100, Math.round(a.used / c.limit * 100)) : 0;
    const monthsList = Object.entries(a.months).sort(([x], [y]) => x.localeCompare(y)).slice(0, 4);
    return `<div class="mir-card">
      <div class="mir-card-head"><b>${esc(c.name)}</b>${c.closingDay ? `<span class="faint small">fecha dia ${c.closingDay}</span>` : ''}</div>
      ${c.limit ? `<div class="mir-limit"><div><span>Limite disponível</span><b class="${a.free < 0 ? 'bad-t' : ''}">${M(a.free)}</b></div><div><span>Usado</span><b>${M(a.used)}</b></div><div><span>Limite total</span><b>${M(c.limit)}</b></div></div>
        <div class="bar ${pct >= 80 ? 'over' : ''}" role="img" aria-label="${pct}% do limite usado"><div style="width:${pct}%"></div></div>`
        : `<p class="hint">Cadastre o limite deste cartão para ver quanto ainda está disponível. <button class="link" type="button" data-act="finCardsCfg">Cadastrar limite →</button></p>`}
      <div class="mir-goal">
        <div><span>Fatura aberta (${ym(a.openMonth)}${a.openDue ? `, vence ${F.date(a.openDue)}` : ''})</span><b>${M(a.openAmount)}</b></div>
        ${c.goal ? `<div><span>${c.target ? 'Sua meta para a fatura' : 'Ideal (até 30% da renda)'}</span><b>${M(c.goal)}</b></div>
          <p class="mir-room ${a.room < 0 ? 'bad-t' : ''}">${a.room >= 0 ? `Para ficar ${c.target ? 'na meta' : 'no ideal'}, dá para gastar mais <b>${M(a.room)}</b> no cartão${c.closingDay ? ` até o fechamento (dia ${c.closingDay})` : ''}.` : `Já passou ${M(-a.room)} ${c.target ? 'da meta' : 'do ideal'}. O que entrar agora vai para essa fatura.`}</p>`
          : '<p class="hint">Informe sua renda no perfil financeiro ou uma meta de fatura no cartão para ver o ideal.</p>'}
        ${!c.target ? '<button class="link" type="button" data-act="finCardsCfg">Definir minha meta de fatura →</button>' : ''}
      </div>
      ${monthsList.length ? `<div class="mir-months">${monthsList.map(([m, v]) => `<div><span>Fatura ${ym(m)}</span><b>${M(v)}</b>${after && (c.months[m] || 0) !== v ? `<small>${delta(c.months[m] || 0, v, true)}</small>` : ''}</div>`).join('')}</div>` : ''}
    </div>`;
  };

  P.views['fin-espelho'] = () => {
    F.ensureSeeds();
    const today = P.today();
    const nowSnap = F.snap();
    F.ensureOccurrences?.(today, nowSnap.cycle.end);
    F.ensureInvoices?.(today, C.addMonths(today.slice(0, 7), 13) + '-28');
    const st = F.state();
    const r = C.mirror(st, today, sims);
    const b = r.before, a = r.after;
    const cards = F.cards();
    if (!form.cardId || !cards.some(c => c.id === form.cardId)) form.cardId = cards[0]?.id || '';
    const freeCredit = b.cards.filter(c => c.limit).reduce((s, c) => s + c.free, 0);
    const nextInv = b.cards.map(c => c.next).filter(Boolean).sort((x, y) => x.due.localeCompare(y.due))[0];
    const [tone, vtext] = sims.length ? verdict(b, a, sims) : [];
    const row = (label, x, y, hint = '', costUp = false) => `<tr><th scope="row">${label}${hint ? `<small>${hint}</small>` : ''}</th><td>${M(x)}</td><td>${M(y)}</td><td>${delta(x, y, costUp)}</td></tr>`;
    return `
    <header class="page-head big-head"><span class="head-date">ciclo ${F.date(b.cycle.start)}–${F.date(b.cycle.end)} · salário ${F.date(b.cycle.nextPay)}</span><h1>Espelho do mês</h1></header>

    <div class="smart-grid mir-grid" role="group" aria-label="Agora">
      <div class="smart k-ok"><span class="sm-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></svg></span><b>${M(b.real)}</b><small>Na conta agora</small></div>
      <div class="smart k-accent"><span class="sm-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></svg></span><b>${M(b.canSpend)}</b><small>Posso gastar até ${F.date(b.cycle.end)}</small></div>
      <div class="smart k-blue"><span class="sm-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg></span><b>${b.cards.some(c => c.limit) ? M(freeCredit) : '—'}</b><small>Limite livre no crédito</small></div>
      <div class="smart k-orange"><span class="sm-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg></span><b>${nextInv ? M(nextInv.amount) : '—'}</b><small>${nextInv ? `Próxima fatura (${F.date(nextInv.due)})` : 'Próxima fatura'}</small></div>
    </div>

    <section class="block"><div class="block-head"><h2>Como o ciclo termina (${F.date(b.cycle.end)})</h2></div>
      <div class="list mir-end">
        <div class="row"><span class="row-main as-text"><span class="row-title">Se você gastar só as contas</span><span class="row-meta">sem mais nenhum gasto do dia a dia</span></span><b class="fin-amt ${b.endNoMore < 0 ? 'bad-t' : ''}">${M(b.endNoMore)}</b></div>
        <div class="row"><span class="row-main as-text"><span class="row-title">Se usar todo o dia a dia planejado</span><span class="row-meta">ainda planejado: ${M(b.ahead)}</span></span><b class="fin-amt ${b.endWithPlan < 0 ? 'bad-t' : ''}">${M(b.endWithPlan)}</b></div>
        <div class="row"><span class="row-main as-text"><span class="row-title">Contas que ainda vão sair</span><span class="row-meta">até ${F.date(b.cycle.end)}</span></span><b class="fin-amt">${M(b.committed)}</b></div>
        ${b.toReceive ? `<div class="row"><span class="row-main as-text"><span class="row-title">Ainda a receber</span></span><b class="fin-amt in">${M(b.toReceive)}</b></div>` : ''}
      </div></section>

    ${cards.length ? `<section class="block"><div class="block-head"><h2>Cartão de crédito</h2></div>${(sims.length ? a : b).cards.map(c => cardBlock(b.cards.find(x => x.id === c.id), sims.length ? c : null)).join('')}</section>` : ''}

    <section class="block mir-sim"><div class="block-head"><h2>E se eu comprar…?</h2></div>
      <p class="hint">Finja uma compra e veja o impacto antes de gastar. Nada é gravado.</p>
      <form class="form" data-sim>
        <div class="row-fields">
          <label class="field"><span class="field-label">Valor</span><input name="amount" inputmode="decimal" class="money-input" placeholder="0,00" value="${form.amount ? (form.amount / 100).toFixed(2).replace('.', ',') : ''}" required></label>
          <label class="field"><span class="field-label">O que é</span><input name="desc" placeholder="ex.: Tênis" value="${esc(form.desc)}"></label>
        </div>
        <div class="field"><span class="field-label" id="lbl-sim-m">Como pagaria</span><div class="chips compact" role="group" aria-labelledby="lbl-sim-m">${[['credito', 'Crédito'], ['debito', 'Débito'], ['pix', 'Pix'], ['dinheiro', 'Dinheiro']].map(([k, l]) => `<button type="button" class="chip ${form.method === k ? 'on' : ''}" aria-pressed="${form.method === k}" data-simm="${k}">${l}</button>`).join('')}</div></div>
        <div class="row-fields">
          <label class="field"><span class="field-label">Parcelas</span><select name="n">${Array.from({ length: 24 }, (_, i) => i + 1).map(k => `<option value="${k}" ${form.n === k ? 'selected' : ''}>${k === 1 ? 'À vista' : k + '×'}</option>`).join('')}</select></label>
          ${form.method === 'credito' && cards.length > 1 ? `<label class="field"><span class="field-label">Cartão</span><select name="cardId">${cards.map(c => `<option value="${c.id}" ${c.id === form.cardId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
        </div>
        ${form.method === 'credito' && !cards.length ? '<p class="hint">Cadastre um cartão em Configurações de finanças → Cartões para simular no crédito.</p>' : ''}
        <p class="form-error" hidden></p>
        <div class="form-actions"><button class="btn primary" type="submit">${sims.length ? 'Somar à simulação' : 'Simular'}</button></div>
      </form>

      ${sims.length ? `
      <div class="sim-chips">${sims.map((h, i) => `<span class="sim-chip">${esc(h.desc || 'Compra')} · ${M(h.amount)}${h.n > 1 ? ` em ${h.n}×` : ''} · ${F.METHODS[h.method] || h.method}<button type="button" aria-label="Tirar ${esc(h.desc || 'compra')} da simulação" data-simdel="${i}">×</button></span>`).join('')}</div>
      <div class="notice mir-verdict tone-${tone}" role="status">${vtext}</div>
      <div class="mir-table-wrap"><table class="mir-table">
        <thead><tr><th scope="col"><span class="sr-only">Item</span></th><th scope="col">Agora</th><th scope="col">Com a compra</th><th scope="col">Diferença</th></tr></thead>
        <tbody>
          ${row('Na conta', b.real, a.real)}
          ${row('Posso gastar', b.canSpend, a.canSpend, `até ${F.date(b.cycle.end)}`)}
          ${row('Por dia', b.perDay, a.perDay)}
          ${b.week ? row(`${esc(b.week.label)}: resta`, b.week.left, a.week?.left ?? 0) : ''}
          ${row('Fim do ciclo, só contas', b.endNoMore, a.endNoMore)}
          ${row('Fim do ciclo, com dia a dia', b.endWithPlan, a.endWithPlan)}
          ${b.cards.filter(c => c.limit).map(c => row(`Limite livre · ${esc(c.name)}`, c.free, a.cards.find(x => x.id === c.id).free)).join('')}
          ${b.cards.map(c => row(`Fatura ${ym(c.openMonth)} · ${esc(c.name)}`, c.openAmount, a.cards.find(x => x.id === c.id).openAmount, "", true)).join('')}
        </tbody></table></div>
      <div class="form-actions split"><button class="btn ghost" type="button" data-simclear>Limpar simulação</button><span class="grow"></span>${sims.length === 1 ? '<button class="btn primary" type="button" data-simreal>Lançar de verdade</button>' : ''}</div>` : ''}
    </section>`;
  };

  P.mounts['fin-espelho'] = root => {
    const f = root.querySelector('[data-sim]'); if (!f) return;
    const keep = () => { form.amount = C.parseMoney(f.amount.value); form.desc = f.desc.value; form.n = +f.n.value; if (f.cardId) form.cardId = f.cardId.value; };
    P.$$('[data-simm]', root).forEach(b => b.onclick = () => { keep(); form.method = b.dataset.simm; P.render(); });
    f.onsubmit = e => {
      e.preventDefault(); keep();
      const err = m => { const p = root.querySelector('[data-sim] .form-error'); p.textContent = m; p.hidden = false; };
      if (!Number.isInteger(form.amount) || form.amount <= 0) return err('Digite o valor, por exemplo 250,00.');
      if (form.method === 'credito' && !F.cards().length) return err('Cadastre um cartão para simular no crédito.');
      sims.push({ amount: form.amount, desc: form.desc.trim(), method: form.method, n: form.n, cardId: form.cardId });
      form = { amount: null, desc: '', method: form.method, n: 1, cardId: form.cardId };
      P.render();
      setTimeout(() => root.querySelector('.mir-verdict')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    };
    P.$$('[data-simdel]', root).forEach(b => b.onclick = () => { sims.splice(+b.dataset.simdel, 1); P.render(); });
    const clr = root.querySelector('[data-simclear]'); if (clr) clr.onclick = () => { sims = []; P.render(); };
    const real = root.querySelector('[data-simreal]');
    if (real) real.onclick = () => { const h = sims[0]; sims = []; P.render(); F.lancar({ kind: 'despesa', amount: h.amount, desc: h.desc, method: h.method, n: h.n, cardId: h.cardId, status: 'realizado' }); };
  };

  // o portão do PIN troca o mount: guarda o nosso para quando estiver destrancado
  const mine = P.mounts['fin-espelho'];
  F.gate('fin-espelho');
  const lockMount = P.mounts['fin-espelho'];
  P.mounts['fin-espelho'] = root => (F.locked() ? lockMount(root) : mine(root));
  Object.assign(P.actions, { finMirror: () => P.go('fin-espelho') });
})();
