/* ============================================================
   FINANCEIRO+ — telas: Painel, Orçamento, Lançamentos, Mais
   e a tela de PIN.
============================================================ */
(function () {
  const S = P.store, C = P.finCore, F = P.fin, esc = P.esc;
  P.mounts = P.mounts || {};
  P.ui.finKind = P.ui.finKind || 'all';
  P.ui.finStatus = P.ui.finStatus || 'all';
  P.ui.finPeriod = P.ui.finPeriod || 'ciclo';

  // "vence 10/11", "venceu 02/11", "até 06/12" (sem data definida) ou "teto · usado X de Y"
  const envTxt = t => { const u = C.envUsed(t, F.txs()); return `teto do ciclo · usado ${F.money(u)} de ${F.money(t.amount)}${u > t.amount ? ` · <b class="st-pendente">passou ${F.money(u - t.amount)}</b>` : ''}`; };
  const dueTxt = (t, today) => t.envelope ? envTxt(t)
    : t.noDue ? `sem data · até ${F.date(t.date)}` : t.date < today ? `<b class="st-pendente">venceu</b> ${F.date(t.date)}` : `vence ${F.date(t.date)}`;
  const cert = c => `<span class="cert cert-${c}">${c}</span>`;
  const bar = (pct, tone = '') => `<div class="bar ${tone}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;

  const txRow = t => {
    const st = F.status(t), cat = F.cat(t.categoryId), acc = F.acc(t.accountId), to = F.acc(t.toAccountId);
    const sign = t.kind === 'receita' || (t.kind === 'ajuste' && t.sign !== 'saida') ? 1 : t.kind === 'transferencia' ? 0 : -1;
    const meta = t.kind === 'transferencia' ? `${acc?.name || '?'} → ${to?.name || '?'}` : [cat?.name, acc?.name, t.kind === 'despesa' ? F.METHODS[t.method] : null].filter(Boolean).join(' · ');
    return `<button type="button" class="row as-btn fin-row st-row-${st}" data-act="finTx" data-id="${t.id}">
      <span class="fin-dot k-${t.kind}" aria-hidden="true"></span>
      <span class="row-main as-text"><span class="row-title">${esc(t.desc)}</span><span class="row-meta">${esc(meta)}${st !== 'realizado' ? ` · <b class="st-${st}">${F.STATUS_LABEL[st]}</b>` : ''}${t.certainty === 'estimado' ? ' · estimado' : ''}</span></span>
      <span class="fin-amt ${sign > 0 ? 'in' : ''} ${st === 'cancelado' ? 'cancel' : ''}">${sign === 0 ? F.money(t.amount) : F.money(sign * t.amount, { plus: sign > 0 })}</span>
    </button>`;
  };

  /* ---------------- PIN ---------------- */
  const lockView = () => {
    const first = !F.hasPin();
    return `<div class="pin-screen">
      <img src="icon-192.png" alt="" width="56" height="56">
      <h1>Financeiro+</h1>
      <p class="lede">${first ? 'Crie um PIN de 4 dígitos para proteger esta parte do Prisma.' : 'Digite seu PIN.'}</p>
      <form class="pin-form" data-pin>
        <input id="fin-pin" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" placeholder="••••" aria-label="PIN" required>
        ${first ? '<input id="fin-pin2" name="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" placeholder="repita" aria-label="Repita o PIN" required>' : ''}
        <p class="form-error" hidden></p>
        <button class="btn primary" type="submit">${first ? 'Criar PIN' : 'Entrar'}</button>
      </form>
      ${first ? '<p class="hint">O PIN fica só neste aparelho.</p>' : '<button class="link" type="button" data-forgot>Esqueci o PIN</button>'}
      <button class="link quiet-link" type="button" data-act="switchSpace">← Voltar ao Prisma</button>
    </div>`;
  };
  const lockMount = root => {
    const f = root.querySelector('[data-pin]'); if (!f) return;
    const err = m => { const p = f.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
    setTimeout(() => root.querySelector('#fin-pin')?.focus(), 50);
    const pin = root.querySelector('#fin-pin');
    if (F.hasPin()) pin.oninput = () => { if (pin.value.length === 4) f.requestSubmit(); };
    f.onsubmit = async e => {
      e.preventDefault();
      const v = f.pin.value;
      if (!/^\d{4}$/.test(v)) return err('O PIN tem 4 números.');
      if (!F.hasPin()) {
        if (v !== f.pin2.value) return err('Os dois PINs não são iguais.');
        await F.setPin(v); P.render(); return;
      }
      const r = await F.checkPin(v);
      if (r.ok) { P.render(); return; }
      f.pin.value = '';
      err(r.wait ? `Muitas tentativas. Espere ${r.wait} segundos.` : `PIN incorreto. ${r.left} tentativa${r.left === 1 ? '' : 's'} antes de uma pausa.`);
    };
    const fg = root.querySelector('[data-forgot]');
    if (fg) fg.onclick = async () => {
      const logged = !!P.sync?.user();
      const msg = logged
        ? 'Para proteger seus dados, isto apaga o PIN e os dados financeiros DESTE aparelho e sai da sua conta. Eles continuam na nuvem: entre de novo em Ajustes → Sincronização (com a sua senha) e eles voltam. Depois você cria um PIN novo.'
        : 'Você não está com a sincronização ligada, então os dados financeiros existem só neste aparelho. Isto apaga o PIN E esses dados, sem volta. Continuar?';
      if (!(await P.ask(msg, logged ? 'Apagar e sair' : 'Apagar tudo'))) return;
      await F.forgotPin(); P.toast('PIN apagado.'); P.go('ajustes');
    };
  };

  /* ============================================================
     PAINEL
  ============================================================ */
  P.views.fin = () => {
    F.ensureSeeds();
    let s = F.snap(); F.ensureOccurrences(s.cycle.start, s.cycle.end); s = F.snap();
    const st = S.settings(), today = P.today();
    const h = new Date().getHours(), greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const prof = F.profile();
    const needsOpening = F.accounts().filter(a => a.openingSet === false);
    const tone = s.canSpend < 0 ? 'bad' : s.canSpend < prof.income * 0.05 ? 'warn' : 'ok';
    const endTxt = F.date(s.cycle.end);
    const overdue = s.committedItems.filter(t => t.date < today && !t.envelope);

    // alertas (no máximo 3, sem julgamento)
    const alerts = [];
    if (s.canSpend < 0) alerts.push(['bad', `O dinheiro disponível não cobre as contas até ${endTxt}. Faltam ${F.money(-s.canSpend)}. Vale olhar as contas previstas e ver o que pode esperar.`]);
    if (overdue.length) alerts.push(['warn', `${overdue.length} conta${overdue.length > 1 ? 's' : ''} já venceu e continua como prevista. Se já pagou, é só marcar como paga.`]);
    if (s.week && s.week.spent > s.week.limit && !(s.week.ackOver >= s.week.spent)) alerts.push(['warn', `A ${s.week.label.toLowerCase()} passou ${F.money(s.week.spent - s.week.limit)} do previsto. Ainda dá para reorganizar o restante do ciclo.`]);
    if (s.daysLeft > 0 && s.daysLeft <= 7) alerts.push(['info', `Faltam ${s.daysLeft} dia${s.daysLeft === 1 ? '' : 's'} para o salário (${F.date(s.cycle.nextPay)}). Se ele cair antes, dá para iniciar o ciclo novo no mesmo dia.`]);
    if (s.cycle.projected && s.cycle.start <= today && !F.txs().some(t => t.categoryId === 'cat-salario' && t.status === 'realizado' && t.date >= s.cycle.start)) alerts.push(['info', `O salário estava previsto para ${F.date(s.cycle.start)}. Quando cair, registre para montar o plano do ciclo.`]);
    const lastConc = S.all('fin_conc').sort((a, b) => b.date.localeCompare(a.date))[0];
    if (F.txs().length > 5 && (!lastConc || C.diffDays(lastConc.date, today) > 7)) alerts.push(['info', 'Faz mais de uma semana que você não confere o saldo com o banco. Leva 30 segundos.']);

    return `
    <header class="page-head fin-head">
      <div class="date-line">${P.DOW_LONG[new Date().getDay()]}, ${new Date().getDate()} de ${P.MONTHS[new Date().getMonth()]} <span class="sep">·</span> ciclo ${F.date(s.cycle.start)}–${endTxt}${s.cycle.projected ? ' (projetado)' : ''}</div>
      <div class="fin-title-row"><h1>${greet}${st.name ? ', ' + esc(st.name) : ''}.</h1>
        <div class="fin-tools"><button class="icon-btn" type="button" data-act="finHide" aria-label="${F.hidden() ? 'Mostrar valores' : 'Esconder valores'}">${F.hidden() ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'}</button><button class="icon-btn" type="button" data-act="finLock" aria-label="Bloquear"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></button></div></div>
    </header>

    ${needsOpening.length ? `<section class="block onboard"><div class="block-head"><h2>Comece por aqui</h2></div>
      <ol class="steps">
        <li><button type="button" class="link" data-act="finAccount" data-id="${needsOpening[0].id}">Informe o saldo de hoje da conta ${esc(needsOpening[0].name)}</button></li>
        <li><button type="button" class="link" data-act="finRecs">Cadastre suas contas fixas</button> (aluguel, luz, academia, assinaturas)</li>
        <li>Quando o salário cair, lance em <b>+ Lançar</b> e o app monta o plano do ciclo</li>
      </ol></section>` : ''}

    <section class="fin-hero tone-${tone}">
      <span class="eyebrow">Quanto posso gastar até ${endTxt}</span>
      <div class="fin-big">${F.money(s.canSpend)}</div>
      <div class="fin-sub">${s.canSpend > 0 ? `≈ ${F.money(s.perDay)} por dia · ` : ''}${s.daysLeft} dia${s.daysLeft === 1 ? '' : 's'} até o salário (${F.date(s.cycle.nextPay)})</div>
      <details class="calc">
        <summary>Como calculei</summary>
        <div class="calc-table">
          <div><span>Saldo real nas contas do disponível ${cert('confirmado')}</span><b>${F.money(s.real)}</b></div>
          <div><span>− Reservado (reserva de segurança do ciclo)</span><b>${F.money(-s.reserved)}</b></div>
          <div><span>− Comprometido até ${endTxt} (${s.committedItems.length} conta${s.committedItems.length === 1 ? '' : 's'}) ${s.committedItems.some(t => t.certainty === 'estimado') ? cert('estimado') : ''}</span><b>${F.money(-s.committed)}</b></div>
          <div class="calc-total"><span>= Posso gastar</span><b>${F.money(s.canSpend)}</b></div>
        </div>
        ${s.toReceive ? `<p class="hint">A receber até lá, não incluído: ${F.money(s.toReceive)}.</p>` : ''}
        <ul class="premissas">${s.premissas.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      </details>
    </section>

    <div class="tiles three">
      ${P.tile('c4 money', F.money(s.real), 'Saldo real', 'data-act="finConcile"')}
      ${P.tile('c2 money', F.money(s.committed), 'Contas até o salário', 'data-act="go" data-to="fin-orcamento"')}
      ${P.tile('c3 money', F.money(s.expenseCycle), 'Gastos do ciclo', 'data-act="go" data-to="fin-lanc"')}
    </div>

    <div class="cols">
      <section class="block main-col">
        <div class="block-head"><h2>Semana</h2>${s.week ? `<span class="faint small">${F.date(s.week.start)}–${F.date(s.week.end)}</span>` : ''}<button class="link" type="button" data-act="go" data-to="fin-orcamento">Orçamento →</button></div>
        ${s.week ? `<div class="week-card ${s.week.spent > s.week.limit ? 'over' : ''}">
            <div class="week-nums"><div><span>Gasto</span><b>${F.money(s.week.spent)}</b></div><div><span>Limite</span><b>${F.money(s.week.limit)}</b></div><div><span>${s.week.spent > s.week.limit ? 'Passou' : 'Restam'}</span><b>${F.money(Math.abs(s.week.limit - s.week.spent))}</b></div></div>
            ${bar(s.week.limit ? s.week.spent / s.week.limit * 100 : 100, s.week.spent > s.week.limit ? 'over' : '')}
            <p class="hint">${s.week.label} · só gastos do dia a dia</p></div>`
          : `<div class="empty"><strong>Sem plano semanal ainda.</strong><span>Quando o salário cair, lance em + Lançar e o app divide o dinheiro livre pelas semanas.</span></div>`}

        <div class="block-head sub"><h3>Próximas contas</h3><span class="count">${s.committedItems.length}</span>${s.committedItems.length > 4 ? '<button class="link" type="button" data-act="go" data-to="fin-orcamento">Ver todas →</button>' : ''}</div>
        <div class="list">${s.committedItems.length ? s.committedItems.slice(0, 4).map(t => `<div class="row fin-row ${t.date < today ? 'late' : ''}">
            <button type="button" class="row-main" data-act="finTx" data-id="${t.id}"><span class="row-title">${esc(t.desc)}</span><span class="row-meta">${dueTxt(t, today)}${t.certainty === 'estimado' ? ' · estimado' : ''}</span></button>
            <span class="fin-amt">${F.money(t.remaining ?? t.amount)}</span>${t.envelope ? '' : `<button class="btn ghost small" type="button" data-act="finPay" data-id="${t.id}">Pagar</button>`}</div>`).join('')
          : '<div class="empty"><strong>Nenhuma conta prevista até o salário.</strong><span>Cadastre as contas fixas em Mais → Contas fixas.</span></div>'}</div>
      </section>

      <aside class="side-col">
        ${(() => { const fresh = C.diffDays(s.cycle.start, today) < 7, c = fresh ? F.cycleAt(-1) : s.cycle;
          const r = C.cycleReport(F.state(), { start: c.start, end: c.end }, null, today);
          return `<section class="block"><button type="button" class="rep-link" data-act="finReport">
            <span class="eyebrow">${fresh && r.count ? 'O relatório do ciclo que fechou está pronto' : 'Relatório do ciclo'}</span>
            <b>${r.count ? `Você gastou ${F.money(r.total)}` : 'Ainda sem gastos pagos'}</b>
            <small>${r.top ? `Onde mais foi: ${esc(r.top.name)} (${F.money(r.top.total)})` : 'Veja onde o dinheiro vai'} →</small></button></section>`; })()}
        <section class="block"><form class="ai-quick" data-ai-quick><input name="q" autocomplete="off" placeholder="Pergunte ao assistente… ex.: posso gastar 100?" aria-label="Pergunte ao assistente"><button class="btn primary small" type="submit">Perguntar</button></form></section>
        ${alerts.length ? `<section class="block"><div class="block-head"><h2>Avisos</h2></div><div class="alerts">${alerts.slice(0, 2).map(([k, m]) => `<div class="alert a-${k}">${esc(m)}${k === 'warn' && /passou/.test(m) && s.week ? ` <button class="link" type="button" data-act="finOver" data-i="${s.weeks.indexOf(s.week)}">Decidir agora →</button>` : ''}${/cair antes/.test(m) ? ' <button class="link" type="button" data-act="finEarly">Recebi o salário antes →</button>' : ''}</div>`).join('')}</div></section>` : ''}
        <section class="block"><div class="block-head"><h2>Contas</h2><button class="link" type="button" data-act="finConcile">Conferir saldo</button></div>
          <div class="list">${s.balances.filter(b => b.account.type !== 'cartao').map(b => `<button type="button" class="row as-btn fin-row" data-act="finAccount" data-id="${b.account.id}"><span class="row-main as-text"><span class="row-title">${esc(b.account.name)}</span><span class="row-meta">${F.ACC_TYPES[b.account.type] || ''}${b.account.inAvailable === false ? ' · fora do disponível' : ''}${b.account.openingSet === false ? ' · <b class="st-pendente">falta o saldo inicial</b>' : ''}</span></span><span class="fin-amt ${b.balance < 0 ? 'neg' : ''}">${F.money(b.balance)}</span></button>`).join('')}</div>
        </section>
      </aside>
    </div>`;
  };

  /* ============================================================
     ORÇAMENTO (ciclo)
  ============================================================ */
  const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const ymTxt = ym => { const [y, m] = ym.split('-'); return `${MONTHS_SHORT[+m - 1]}/${y.slice(2)}`; };
  P.ui.finCycleOfs = P.ui.finCycleOfs || 0;

  P.views['fin-orcamento'] = () => {
    F.ensureSeeds();
    const ofs = P.ui.finCycleOfs || 0;
    let s = F.snap(); F.ensureOccurrences(s.cycle.start, s.cycle.end);
    const c0 = F.cycleAt(ofs); if (ofs) F.ensureOccurrences(c0.start, c0.end);
    s = F.snap();
    const c = ofs ? c0 : s.cycle, today = P.today();
    const sum = F.summary({ start: c.start, end: c.end });
    const label = ofs === 0 ? 'Ciclo atual' : ofs === 1 ? 'Próximo ciclo' : ofs === -1 ? 'Ciclo anterior' : ofs > 0 ? `Daqui a ${ofs} ciclos` : `${-ofs} ciclos atrás`;
    const carnes = F.parcs().filter(p => !p.deleted && p.type === 'carne');
    const cardParcs = F.parcs().filter(p => !p.deleted && !p.canceled && p.type === 'cartao' && C.installments(p).some(i => i.month >= c.start.slice(0, 7)));
    const futureByMonth = {}; sum.cardFuture.forEach(i => (futureByMonth[i.month] = futureByMonth[i.month] || []).push(i));

    const pendRow = t => `<div class="row fin-row ${t.date < today && !t.envelope && !t.noDue ? 'late' : ''}">
        <button type="button" class="row-main" data-act="finTx" data-id="${t.id}"><span class="row-title">${esc(t.desc)}</span><span class="row-meta">${esc(F.cat(t.categoryId)?.name || '')} · ${dueTxt(t, today)}${t.certainty === 'estimado' ? ' · estimado' : ''}</span></button>
        <span class="fin-amt">${F.money(t.remaining)}</span>${t.envelope ? '' : `<button class="btn ghost small" type="button" data-act="finPay" data-id="${t.id}">Pagar</button>`}</div>`;

    return `
    <header class="page-head"><h1>Orçamento</h1>
      <div class="cycle-nav">
        <button class="icon-btn" type="button" data-act="finCycle" data-d="-1" aria-label="Ciclo anterior">‹</button>
        <div><b>${label}</b><span>${F.date(c.start)} a ${F.date(c.end)} · salário ${F.date(c.start)} ${c.projected ? cert('projetado') : cert('confirmado')}</span></div>
        <button class="icon-btn" type="button" data-act="finCycle" data-d="1" aria-label="Próximo ciclo">›</button>
      </div>
      <div class="head-links">${ofs === 0 && C.diffDays(today, c.nextPay) <= 15 && C.diffDays(today, c.nextPay) > 0 ? '<button class="link" type="button" data-act="finEarly">Recebi o salário antes → iniciar novo ciclo</button>' : ''}${ofs ? '<button class="link" type="button" data-act="finCycle" data-d="0">← Voltar para o ciclo atual</button>' : ''}<button class="link" type="button" data-act="finReport">Ver relatório do ciclo →</button></div></header>

    <section class="block">
      <div class="block-head"><h2>Resumo do ciclo</h2></div>
      <div class="sum-card">
        <div><span>Receitas ${sum.incomeDone ? cert('confirmado') : cert('projetado')}</span><b class="in">${F.money(sum.income)}</b><small>${sum.incomeDone ? `recebido ${F.money(sum.incomeDone)}` : 'ainda não recebido'}${sum.incomePlanned && sum.incomeDone ? ` · falta ${F.money(sum.incomePlanned)}` : ''}</small></div>
        <div><span>Total comprometido</span><b>${F.money(sum.committed)}</b><small>pago ${F.money(sum.paidTotal)} · falta pagar ${F.money(sum.pendingTotal)}</small></div>
        <div class="${sum.projected < 0 ? 'neg' : ''}"><span>Saldo projetado ${cert('projetado')}</span><b>${F.money(sum.projected)}</b><small>receitas − comprometido</small></div>
      </div>
      <details class="calc"><summary>Como calculei</summary><ul class="premissas">${sum.premissas.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>
    </section>

    <div class="cols">
      <section class="block main-col">
        <div class="block-head"><h2>Pendentes</h2><span class="count">${sum.pending.length}</span><span class="faint small">${F.money(sum.pendingTotal)}</span></div>
        <div class="list">${sum.pending.length ? sum.pending.map(pendRow).join('') : '<div class="empty"><strong>Nada pendente neste ciclo.</strong></div>'}</div>

        <details class="more" ${sum.paid.length ? 'open' : ''}><summary>Pagas <span class="count">${sum.paid.length}</span> <span class="faint small">${F.money(sum.paidTotal)}</span></summary>
          <div class="list">${sum.paid.length ? sum.paid.map(txRow).join('') : '<div class="empty"><span>Nenhuma despesa paga ainda neste ciclo.</span></div>'}</div></details>
      </section>

      <aside class="side-col">
        <section class="block"><div class="block-head"><h2>Parcelamentos</h2></div>
          <div class="list">${carnes.length || cardParcs.length ? carnes.map(p => { const pr = C.parcProgress(p, F.txs()); return `<div class="row parc-row"><span class="row-main as-text">
              <span class="row-title">${esc(p.desc)}</span>
              <span class="row-meta">${pr.paidCount} de ${p.n} pagas · faltam ${pr.left} · ${F.money(pr.leftAmount)}</span>
              ${bar(pr.paidCount / p.n * 100)}</span></div>`; }).join('')
            + cardParcs.map(p => { const list = C.installments(p, F.txs()); const card = F.acc(p.accountId); return `<div class="row parc-row"><span class="row-main as-text">
              <span class="row-title">${esc(p.desc)}</span>
              <span class="row-meta">${card ? esc(card.name) + ' · ' : ''}${p.n}× ${F.money(list[0]?.amount)} · total ${F.money(p.total)} · de ${ymTxt(list[0].month)} a ${ymTxt(list[list.length - 1].month)}</span></span></div>`; }).join('')
            : '<div class="empty"><span>Nenhum parcelamento cadastrado.</span></div>'}</div></section>

        <section class="block"><div class="block-head"><h2>Cartão · parcelas futuras</h2><span class="faint small">${F.money(sum.cardFutureTotal)}</span></div>
          ${sum.cardThis.length ? `<p class="hint">Nesta fatura (${ymTxt(c.start.slice(0, 7))}) já estão ${F.money(sum.cardThisTotal)} em parcelas: ${sum.cardThis.map(i => `${esc(i.desc)} ${i.n}/${i.of}`).join(', ')}. Elas não somam de novo: só a fatura é paga.</p>` : ''}
          <div class="list">${Object.keys(futureByMonth).length ? Object.entries(futureByMonth).map(([m, items]) => `<div class="row"><span class="row-main as-text"><span class="row-title">Fatura de ${ymTxt(m)}</span>
              <span class="row-meta">${items.map(i => `${esc(i.desc)} ${i.n}/${i.of}`).join(' · ')}</span></span><span class="fin-amt">${F.money(items.reduce((a, i) => a + i.amount, 0))}</span></div>`).join('')
            : '<div class="empty"><span>Nenhuma parcela de cartão para os próximos meses.</span></div>'}</div>
          <p class="hint">Não entram como despesa deste ciclo. Entram quando você pagar a fatura do mês.</p></section>
      </aside>
    </div>

    ${ofs === 0 ? (c.projected || !c.plannedAt ? `<section class="block"><div class="notice">${c.projected ? `Este ciclo ainda é uma projeção pelas regras do seu perfil (${F.paydayTxt()}). Quando o salário cair, lance e confirme o plano.` : `O ciclo ${F.date(c.start)}–${F.date(c.end)} já começou, mas o plano das semanas ainda não foi montado.`}</div>
      <div class="form-actions split">${c.projected ? '<button class="btn primary" type="button" data-act="finSalary">Lançar o salário</button>' : ''}<button class="btn ${c.projected ? 'ghost' : 'primary'}" type="button" data-act="finPlanNow">Montar plano${c.projected ? ' com o saldo de hoje' : ''}</button><span class="grow"></span></div></section>`
    : `<section class="block"><div class="block-head"><h2>Plano confirmado em ${F.date(c.plannedAt || c.start)}</h2><button class="link" type="button" data-act="finReplan">Refazer plano</button></div>
      <div class="calc-table">
        <div><span>Saldo no início do plano</span><b>${F.money(c.available)}</b></div>
        <div><span>− Contas e compromissos do ciclo</span><b>${F.money(-c.committed)}</b></div>
        <div><span>− Reserva de segurança</span><b>${F.money(-c.reserve)}</b></div>
        <div class="calc-total"><span>= Livre para o dia a dia</span><b>${F.money(c.base)}</b></div>
      </div></section>`) : ''}

    ${ofs === 0 && s.weeks.length ? `<section class="block"><div class="block-head"><h2>Semanas</h2><button class="link" type="button" data-act="finWeeks">Editar semanas</button></div>
      <div class="weeks">${s.weeks.map(w => { const cur = w.start <= today && today <= w.end, past = w.end < today, over = w.spent > w.limit; return `<div class="wk ${cur ? 'cur' : ''} ${past ? 'past' : ''} ${over ? 'over' : ''}">
        <div class="wk-head"><b>${w.label}</b><span class="faint small">${F.date(w.start)}–${F.date(w.end)}</span></div>
        <div class="wk-nums"><span>${F.money(w.spent)} de ${F.money(w.limit)}</span><span class="${over ? 'bad-t' : ''}">${over ? 'passou ' + F.money(w.spent - w.limit) : (past ? 'sobrou ' : 'restam ') + F.money(w.limit - w.spent)}</span></div>
        ${bar(w.limit ? w.spent / w.limit * 100 : (w.spent ? 100 : 0), over ? 'over' : '')}
        ${w.locked ? '<span class="faint small">travada</span>' : ''}
        ${over && !(w.ackOver >= w.spent) && w.start <= today ? `<button class="btn ghost small" type="button" data-act="finOver" data-i="${s.weeks.indexOf(w)}">O que fazer com o excesso?</button>` : over && w.ackOver >= w.spent ? '<span class="faint small">excesso mantido</span>' : ''}</div>`; }).join('')}</div></section>` : ''}`;
  };

  /* ============================================================
     LANÇAMENTOS
  ============================================================ */
  P.views['fin-lanc'] = () => {
    F.ensureSeeds();
    const u = P.ui, s = F.snap(), q = (u.finQ || '').trim().toLowerCase();
    let list = F.txs();
    if (u.finPeriod === 'ciclo') list = list.filter(t => t.date >= s.cycle.start && t.date <= s.cycle.end);
    if (u.finPeriod === 'mes') { const m = P.today().slice(0, 7); list = list.filter(t => t.date.startsWith(m)); }
    if (u.finKind !== 'all') list = list.filter(t => t.kind === u.finKind);
    if (u.finStatus !== 'all') list = list.filter(t => F.status(t) === u.finStatus);
    if (q) list = list.filter(t => `${t.desc} ${t.notes || ''} ${F.cat(t.categoryId)?.name || ''}`.toLowerCase().includes(q));
    list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
    const groups = {}; list.forEach(t => (groups[t.date] = groups[t.date] || []).push(t));
    const chips = (key, opts) => opts.map(([k, l]) => `<button type="button" class="chip ${u[key] === k ? 'on' : ''}" data-act="finFilter" data-k="${key}" data-v="${k}">${l}</button>`).join('');
    return `
    <header class="page-head row-head"><div><h1>Lançamentos</h1><p class="lede">${list.length} lançamento${list.length === 1 ? '' : 's'} ${u.finPeriod === 'ciclo' ? 'neste ciclo' : u.finPeriod === 'mes' ? 'neste mês' : 'no total'}</p></div>
      <button class="btn primary" type="button" data-act="finLancar">+ Lançar</button></header>
    <div class="notes-tools">
      <label class="search"><span aria-hidden="true">⌕</span><input id="fin-q" type="search" placeholder="Buscar" value="${esc(u.finQ || '')}" data-input="finQ" aria-label="Buscar lançamentos"></label>
      <div class="chips">${chips('finPeriod', [['ciclo', 'Ciclo atual'], ['mes', 'Este mês'], ['tudo', 'Tudo']])}</div>
      <div class="chips">${chips('finKind', [['all', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas'], ['transferencia', 'Transferências'], ['ajuste', 'Ajustes']])}</div>
      <div class="chips">${chips('finStatus', [['all', 'Qualquer situação'], ['realizado', 'Realizados'], ['previsto', 'Pendentes'], ['pendente', 'Vencidas'], ['cancelado', 'Cancelados']])}</div>
    </div>
    ${list.length ? Object.entries(groups).map(([d, items]) => `<div class="day-group"><div class="day-label">${P.relDay(d) === 'hoje' ? 'Hoje' : P.relDay(d) === 'ontem' ? 'Ontem' : F.date(d)}</div><div class="list">${items.map(txRow).join('')}</div></div>`).join('')
      : '<div class="empty"><strong>Nada por aqui.</strong><span>Toque em + Lançar e escreva do seu jeito, por exemplo “gastei 23,90 de uber no pix”.</span></div>'}`;
  };

  /* ============================================================
     MAIS
  ============================================================ */
  P.views['fin-mais'] = () => {
    const item = (act, title, sub, extra = '') => `<button type="button" class="data-btn" data-act="${act}" ${extra}><strong>${title}</strong><small>${sub}</small></button>`;
    const soon = (title, v) => `<div class="data-btn soon-item"><strong>${title}</strong><small>${v === "próxima" ? "chega na próxima versão" : "em breve"}</small></div>`;
    return `
    <header class="page-head"><h1>Mais</h1><p class="lede">Configurações e o que vem por aí.</p></header>
    <div class="settings">
      <section class="block set"><h2>Seu dinheiro</h2><div class="data-actions">
        ${item('finAccounts', 'Contas', 'Nubank e outras contas, com saldo inicial')}
        ${item('finRecs', 'Contas fixas', 'Aluguel, luz, academia, assinaturas: viram compromissos em cada ciclo')}
        ${item('finCats', 'Categorias', 'Padrão + as suas; quais entram no limite semanal')}
        ${item('finEarly', 'Recebi o salário antes', 'Fecha o ciclo atual e inicia o novo a partir do dia em que o dinheiro entrou')}
        ${item('finConcile', 'Conferir saldo', 'Compare com o saldo do banco e ajuste a diferença')}
        ${item('finCardNew', 'Gasto no cartão (parcelado)', 'Compra no crédito em 1× ou parcelada: as parcelas vão para as faturas, sem contar como gasto do ciclo')}
        ${item('finCards', 'Compras no cartão', 'Ver, editar ou cancelar as compras parceladas')}
        ${item('finCardsCfg', 'Cartões', 'Fechamento e vencimento: a fatura vira conta a pagar no ciclo certo')}
        ${item('finImport', 'Importar planejamento', 'Cadastra de uma vez as contas de um mês a partir de um arquivo .json')}
      </div></section>
      <section class="block set"><h2>Relatórios e assistente</h2><div class="data-actions">
        ${item('finReport', 'Relatório do ciclo', 'Onde você mais gastou, onde gastou menos e a comparação com o ciclo anterior')}
        ${item('finAi', 'Assistente', 'Pergunte “posso gastar 200?” ou peça para lançar um gasto. Ele sugere, você confirma')}
      </div></section>
      <section class="block set"><h2>Preferências</h2><div class="data-actions">
        ${item('finProfile', 'Perfil financeiro', 'Renda, dia do salário, regra de feriado, reserva')}
        ${item('finSecurity', 'Segurança', 'PIN, esconder valores, bloquear agora')}
        ${item('finHistory', 'Histórico de alterações', 'Tudo que foi criado ou mudado, com antes e depois')}
      </div></section>
      <section class="block set"><h2>Chegando</h2><div class="data-actions">
        ${soon('Dívidas e metas', 'em breve')}${soon('Renda extra e metas de economia', 'em breve')}
      </div></section>
    </div>`;
  };

  /* ---------------- portão do PIN ---------------- */
  F.gate = r => {
    const view = P.views[r];
    P.views[r] = () => (F.locked() ? lockView() : view());
    P.mounts[r] = root => { if (F.locked()) lockMount(root); };
  };
  ['fin', 'fin-orcamento', 'fin-lanc', 'fin-mais'].forEach(F.gate);

  /* ---------------- ações ---------------- */
  Object.assign(P.actions, {
    finTx: el => F.openTx(el.dataset.id),
    finPay: el => F.pay(el.dataset.id),
    finLancar: () => F.lancar(),
    finSalary: () => F.lancar({ kind: 'receita', categoryId: 'cat-salario', desc: 'Salário', amount: F.profile().income, certainty: 'confirmado' }),
    finPlanNow: () => { const c = F.snap().cycle; F.plan(c.start, null, c.projected ? null : c.nextPay); },
    finReplan: () => { const c = F.snap().cycle; F.plan(c.start, null, c.nextPay); },
    finEarly: () => F.earlyCycle(),
    finAccount: el => F.accountForm(F.acc(el.dataset.id)),
    finAccounts: () => P.sheet({
      title: 'Contas', live: true,
      render: () => `<div class="list">${F.snap().balances.filter(b => b.account.type !== 'cartao').map(b => `<button type="button" class="row as-btn fin-row" data-a="${b.account.id}"><span class="row-main as-text"><span class="row-title">${esc(b.account.name)}</span><span class="row-meta">${F.ACC_TYPES[b.account.type] || ''}${b.account.inAvailable === false ? ' · fora do disponível' : ''}</span></span><span class="fin-amt">${F.money(b.balance)}</span></button>`).join('')}</div>
        <div class="form-actions"><button class="btn primary" type="button" data-new>+ Conta</button></div>`,
      mount: api => { P.$$('[data-a]', api.body).forEach(x => x.onclick = () => F.accountForm(F.acc(x.dataset.a))); api.body.querySelector('[data-new]').onclick = () => F.accountForm(); }
    }),
    finRecs: () => F.recsSheet(),
    finCats: () => F.catsSheet(),
    finConcile: () => F.concile(F.accounts()[0]?.id),
    finProfile: () => F.profileSheet(),
    finSecurity: () => F.securitySheet(),
    finHistory: () => F.historySheet(),
    finHide: () => { P.ls.set('prisma2:finHide', !F.hidden()); P.render(); },
    finLock: () => { F.lock(); P.render(); },
    finCycle: el => { const d = +el.dataset.d; P.ui.finCycleOfs = d === 0 ? 0 : Math.max(-12, Math.min(12, (P.ui.finCycleOfs || 0) + d)); P.render(); window.scrollTo(0, 0); },
    finImport: () => F.importPick(),
    finCardNew: () => F.cardForm(),
    finCardsCfg: () => F.cardsSheet(),
    finWeeks: () => F.weeksSheet(),
    finOver: el => F.overSheet(+el.dataset.i),
    finCards: () => F.cardList(),
    finFilter: el => { P.ui[el.dataset.k] = el.dataset.v; P.saveUI(); P.render(); }
  });
})();
