/* ============================================================
   FINANCEIRO+ — Relatório do ciclo
   Onde o dinheiro foi, onde foi menos, comparação com o ciclo
   anterior e destaques. Só conta o que foi pago de verdade.
============================================================ */
(function () {
  const C = P.finCore, F = P.fin, esc = P.esc;
  const pct = x => `${Math.round(x * 100)}%`;
  const W = v => Math.max(2, Math.min(100, v));

  // ciclo padrão: nos primeiros 7 dias de um ciclo novo, abre o relatório do ciclo que acabou de fechar
  const defaultOfs = () => (C.diffDays(F.snap().cycle.start, P.today()) < 7 ? -1 : 0);

  const phrase = r => {
    if (!r.count) return 'Ainda não tem gasto pago neste ciclo. Quando você lançar, o relatório se monta sozinho.';
    const bits = [`Seu maior gasto foi com ${r.top.name.toLowerCase()} (${pct(r.top.share)} do total).`];
    if (r.prev && r.prev.total) {
      const down = r.cats.filter(c => c.delta < 0).sort((a, b) => a.delta - b.delta)[0];
      const up = r.cats.filter(c => c.prev && c.delta > 0).sort((a, b) => b.delta - a.delta)[0];
      if (down) bits.push(`Em ${down.name.toLowerCase()}, você gastou ${F.money(-down.delta)} a menos que no ciclo anterior.`);
      if (up) bits.push(`${up.name} subiu ${F.money(up.delta)}.`);
    }
    if (r.income) bits.push(r.left >= 0 ? `Do que entrou, sobraram ${F.money(r.left)}.` : `Os gastos passaram ${F.money(-r.left)} do que entrou.`);
    return bits.join(' ');
  };

  const deltaTxt = c => {
    if (c.prev === undefined) return '';
    if (!c.prev) return '<span class="rep-delta">novo neste ciclo</span>';
    if (c.delta === 0) return '<span class="rep-delta">igual ao ciclo anterior</span>';
    return `<span class="rep-delta ${c.delta > 0 ? 'up' : 'down'}">${c.delta > 0 ? '↑' : '↓'} ${F.money(Math.abs(c.delta))} ${c.delta > 0 ? 'a mais' : 'a menos'}</span>`;
  };

  P.views['fin-relatorio'] = () => {
    F.ensureSeeds();
    if (P.ui.finRepOfs === undefined) P.ui.finRepOfs = defaultOfs();
    const ofs = P.ui.finRepOfs;
    const c = F.cycleAt(ofs), pc = F.cycleAt(ofs - 1), today = P.today();
    const r = C.cycleReport(F.state(), { start: c.start, end: c.end }, { start: pc.start, end: pc.end }, today);
    const max = r.cats[0]?.total || 1;
    const wMax = Math.max(1, ...r.weeks.map(w => w.total));
    const label = ofs === 0 ? 'Ciclo atual' : ofs === -1 ? 'Ciclo anterior' : ofs > 0 ? 'Ciclo futuro' : `${-ofs} ciclos atrás`;
    const status = r.closed ? '<span class="pill ok">fechado</span>' : today < c.start ? '<span class="pill">ainda não começou</span>' : `<span class="pill">em andamento · ${r.daysLeft === 0 ? 'último dia' : `faltam ${r.daysLeft} dia${r.daysLeft === 1 ? '' : 's'}`}</span>`;

    return `
    <header class="page-head"><h1>Relatório</h1>
      <div class="cycle-nav">
        <button class="icon-btn" type="button" data-act="finRep" data-d="-1" aria-label="Ciclo anterior">‹</button>
        <div><b>${label}</b><span>${F.date(c.start)} a ${F.date(c.end)} ${status}</span></div>
        <button class="icon-btn" type="button" data-act="finRep" data-d="1" aria-label="Próximo ciclo" ${ofs >= 0 ? 'disabled' : ''}>›</button>
      </div></header>

    <section class="fin-hero rep-hero">
      <span class="eyebrow">${r.closed ? 'Você gastou neste ciclo' : 'Você gastou até agora'}</span>
      <div class="fin-big">${F.money(r.total)}</div>
      <div class="fin-sub">${r.count} gasto${r.count === 1 ? '' : 's'} pago${r.count === 1 ? '' : 's'} · média de ${F.money(r.perDay)} por dia${r.income ? ` · entrou ${F.money(r.income)}` : ''}</div>
      ${r.prev && r.prev.total ? `<div class="fin-sub">Ciclo anterior: ${F.money(r.prev.total)} (${r.total >= r.prev.total ? '↑ ' + F.money(r.total - r.prev.total) + ' a mais' : '↓ ' + F.money(r.prev.total - r.total) + ' a menos'})</div>` : ''}
    </section>

    <p class="rep-phrase">${esc(phrase(r))}</p>

    ${r.count ? `
    <div class="rep-highlights">
      <div class="rep-hl c1"><span>Onde mais gastou</span><b>${esc(r.top.name)}</b><small>${F.money(r.top.total)} · ${pct(r.top.share)} do total</small></div>
      ${r.least ? `<div class="rep-hl c3"><span>Onde menos gastou</span><b>${esc(r.least.name)}</b><small>${F.money(r.least.total)} · ${pct(r.least.share)} do total</small></div>` : ''}
      ${r.biggest ? `<div class="rep-hl c2"><span>Maior gasto único</span><b>${esc(r.biggest.desc)}</b><small>${F.money(r.biggest.amount)} em ${F.date(r.biggest.paidDate || r.biggest.date)}</small></div>` : ''}
      ${r.topDay ? `<div class="rep-hl c4"><span>Dia mais caro</span><b>${P.DOW_LONG[P.parse(r.topDay.date).getDay()]}, ${F.date(r.topDay.date)}</b><small>${F.money(r.topDay.total)} no dia</small></div>` : ''}
    </div>

    <section class="block"><div class="block-head"><h2>Para onde foi o dinheiro</h2><span class="faint small">toque para ver os gastos</span></div>
      <div class="rep-cats">${r.cats.map((cat, i) => `<details class="rep-cat ${i === 0 ? 'top' : ''}">
        <summary title="${esc(cat.name)}: ${F.money(cat.total)} (${pct(cat.share)})">
          <span class="rep-name">${esc(cat.name)}</span><span class="rep-val">${F.money(cat.total)} <small>${pct(cat.share)}</small></span>
          <span class="rep-bar"><i style="width:${W(cat.total / max * 100)}%"></i></span>
          <span class="rep-meta">${cat.count} gasto${cat.count === 1 ? '' : 's'}${deltaTxt(cat) ? ' · ' + deltaTxt(cat) : ''}</span>
        </summary>
        <div class="rep-items">${cat.items.slice(0, 6).map(t => `<button type="button" class="rep-item" data-act="finTx" data-id="${t.id}"><span>${esc(t.desc)}</span><small>${F.date(t.paidDate || t.date)}</small><b>${F.money(t.amount)}</b></button>`).join('')}${cat.items.length > 6 ? `<p class="hint">e mais ${cat.items.length - 6}.</p>` : ''}</div>
      </details>`).join('')}</div>
      ${r.prev ? `<p class="hint">Comparação com o ciclo de ${F.date(pc.start)} a ${F.date(pc.end)}${r.closed ? '' : ' (o ciclo atual ainda não acabou, então a comparação vai mudando)'}.</p>` : ''}
    </section>

    <div class="cols rep-cols">
      <section class="block"><div class="block-head"><h2>Contas × dia a dia</h2></div>
        <div class="rep-split">
          <div><span class="rep-name">Contas e compromissos</span><span class="rep-val">${F.money(r.fixed)} <small>${pct(r.total ? r.fixed / r.total : 0)}</small></span><span class="rep-bar"><i style="width:${W(r.total ? r.fixed / r.total * 100 : 0)}%"></i></span></div>
          <div><span class="rep-name">Dia a dia</span><span class="rep-val">${F.money(r.variable)} <small>${pct(r.total ? r.variable / r.total : 0)}</small></span><span class="rep-bar alt"><i style="width:${W(r.total ? r.variable / r.total * 100 : 0)}%"></i></span></div>
        </div>
        <p class="hint">Contas e compromissos: contas fixas, planejamento e parcelas de carnê. Dia a dia: o resto.</p>
      </section>

      <section class="block"><div class="block-head"><h2>Semana a semana</h2></div>
        <div class="rep-weeks" role="list">${r.weeks.map(w => { const cur = w.start <= today && today <= w.end; return `<div class="rep-week ${cur ? 'cur' : ''}" role="listitem" title="${w.label} (${F.date(w.start)}–${F.date(w.end)}): ${F.money(w.total)}">
          <b>${w.total ? F.money(w.total).replace('R$ ', '') : '—'}</b><span class="col"><i style="height:${w.total ? W(w.total / wMax * 100) : 0}%"></i></span><small>${w.label.replace('Semana ', 'Sem. ')}</small></div>`; }).join('')}</div>
      </section>
    </div>

    ${r.envelopes.length ? `<section class="block"><div class="block-head"><h2>Tetos do ciclo</h2></div><div class="rep-split">${r.envelopes.map(e => `<div><span class="rep-name">${esc(e.desc)}</span><span class="rep-val">${F.money(e.used)} <small>de ${F.money(e.limit)}</small></span><span class="rep-bar ${e.used > e.limit ? 'over' : ''}"><i style="width:${W(e.limit ? e.used / e.limit * 100 : 0)}%"></i></span>
      <span class="rep-meta">${e.used > e.limit ? `<b class="st-pendente">passou ${F.money(e.used - e.limit)}</b>` : `sobraram ${F.money(e.limit - e.used)}`}</span></div>`).join('')}</div></section>` : ''}

    ${r.cardBuysCount ? `<section class="block"><div class="block-head"><h2>Compras no cartão neste ciclo</h2><span class="faint small">${F.money(r.cardBuysTotal)}</span></div>
      <div class="rep-split">${r.cardBuys.map(cat => `<div><span class="rep-name">${esc(cat.name)}</span><span class="rep-val">${F.money(cat.total)}</span></div>`).join('')}</div>
      <p class="hint">Ficam fora do total acima: o que sai do saldo é o pagamento da fatura (categoria Cartão de crédito). Aqui é só para você ver em que o cartão foi usado.</p></section>` : ''}
    ` : `<div class="empty"><strong>Sem gastos pagos neste ciclo.</strong><span>Lance seus gastos ou marque as contas como pagas que o relatório aparece aqui.</span></div>`}`;
  };

  F.gate('fin-relatorio');

  Object.assign(P.actions, {
    finRep: el => { const d = +el.dataset.d; P.ui.finRepOfs = Math.min(0, Math.max(-24, (P.ui.finRepOfs ?? defaultOfs()) + d)); P.render(); window.scrollTo(0, 0); },
    finReport: () => { P.ui.finRepOfs = undefined; P.go('fin-relatorio'); }
  });
})();
