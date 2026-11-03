/* ============================================================
   FINANCEIRO+ — janelas: lançar, pagar, plano do ciclo,
   contas, categorias, contas fixas, conciliação, perfil,
   segurança e histórico.
============================================================ */
(function () {
  const S = P.store, C = P.finCore, F = P.fin, esc = P.esc;
  const field = (label, html, hint = '') => `<label class="field"><span class="field-label">${label}</span>${html}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
  const inMoney = c => (Number.isInteger(c) ? (c / 100).toFixed(2).replace('.', ',') : '');
  const accOptions = (sel, filter = () => true) => F.accounts().filter(filter).map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  const catOptions = (kind, sel) => `<option value="">Escolha…</option>` + F.cats(kind).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const impactToast = () => {
    const s = F.snap();
    const parts = [`Posso gastar: ${F.money(s.canSpend)}`];
    if (s.week) parts.push(`semana: ${F.money(s.week.limit - s.week.spent)} restantes`);
    return parts.join(' · ');
  };

  /* ============================================================
     LANÇAR (frase + formulário)
  ============================================================ */
  F.lancar = (preset = {}, existing = null) => {
    const today = P.today();
    let tx = existing ? { ...existing } : { kind: 'despesa', date: today, status: 'realizado', certainty: 'confirmado', method: 'debito', accountId: F.accounts()[0]?.id || '', ...preset };
    let parsed = null;
    const sheet = P.sheet({
      title: existing ? 'Editar lançamento' : 'Lançar', kicker: 'Financeiro+',
      render: () => `
        ${existing ? '' : `<label class="field fin-phrase"><span class="field-label">Escreva do seu jeito</span>
          <input id="fin-frase" autocomplete="off" placeholder="ex.: gastei 50,48 com hambúrguer no débito" autofocus>
          <span class="hint" id="fin-frase-out">Ou preencha os campos abaixo.</span></label>`}
        <form class="form" data-f="tx">
          <div class="seg small">${['despesa', 'receita', 'transferencia'].map(k => `<button type="button" class="seg-btn ${tx.kind === k ? 'on' : ''}" data-kind="${k}">${F.KINDS[k]}</button>`).join('')}</div>
          <div class="row-fields">
            ${field('Valor', `<input name="amount" inputmode="decimal" required value="${inMoney(tx.amount)}" placeholder="0,00" class="money-input">`)}
            ${field(tx.kind === 'transferencia' ? 'Data' : tx.status === 'previsto' ? 'Vencimento' : 'Data', `<input type="date" name="date" required value="${tx.date || today}">`)}
          </div>
          ${field('Descrição', `<input name="desc" required value="${esc(tx.desc || '')}" placeholder="${tx.kind === 'receita' ? 'ex.: Freela banner' : 'ex.: Mercado'}">`)}
          ${tx.kind === 'transferencia' ? `<div class="row-fields">
              ${field('De', `<select name="accountId">${accOptions(tx.accountId)}</select>`)}
              ${field('Para', `<select name="toAccountId"><option value="">Escolha…</option>${accOptions(tx.toAccountId)}</select>`)}
            </div>` : `<div class="row-fields">
              ${field('Categoria', `<select name="categoryId">${catOptions(tx.kind, tx.categoryId)}</select>`)}
              ${field(tx.kind === 'receita' ? 'Entrou na conta' : 'Conta', `<select name="accountId">${accOptions(tx.accountId)}</select>`)}
            </div>`}
          ${tx.kind === 'despesa' ? field('Forma de pagamento', `<div class="chips compact" data-method>${['debito', 'pix', 'dinheiro', 'boleto', 'credito'].map(m => `<button type="button" class="chip ${tx.method === m ? 'on' : ''}" data-m="${m}" ${m === 'credito' ? 'disabled title="Chega na próxima versão"' : ''}>${F.METHODS[m]}${m === 'credito' ? ' · em breve' : ''}</button>`).join('')}</div>`) : ''}
          <div class="field"><span class="field-label">Situação</span><div class="chips compact" data-status>
            <button type="button" class="chip ${tx.status === 'realizado' ? 'on' : ''}" data-s="realizado">${tx.kind === 'receita' ? 'Já recebi' : tx.kind === 'transferencia' ? 'Já fiz' : 'Já paguei'}</button>
            <button type="button" class="chip ${tx.status === 'previsto' ? 'on' : ''}" data-s="previsto">${tx.kind === 'receita' ? 'Vou receber' : 'Vou pagar'}</button>
          </div></div>
          <label class="check-line"><input type="checkbox" name="estimado" ${tx.certainty === 'estimado' ? 'checked' : ''}> Valor estimado (ainda não sei o valor exato)</label>
          ${field('Observações', `<input name="notes" value="${esc(tx.notes || '')}" placeholder="opcional">`)}
          <p class="form-error" hidden></p>
          <div class="form-actions"><button class="btn primary" type="submit">${existing ? 'Salvar' : 'Lançar'}</button></div>
        </form>`,
      mount: api => {
        const b = api.body, f = b.querySelector('form');
        const keep = () => { const fd = new FormData(f); tx = { ...tx, amount: C.parseMoney(fd.get('amount')) ?? tx.amount, date: fd.get('date'), desc: fd.get('desc'), accountId: fd.get('accountId') || tx.accountId, toAccountId: fd.get('toAccountId') ?? tx.toAccountId, categoryId: fd.get('categoryId') ?? tx.categoryId, notes: fd.get('notes'), certainty: fd.get('estimado') ? 'estimado' : 'confirmado' }; };
        const redraw = () => { const v = b.querySelector('#fin-frase')?.value; api.refresh(); const fr = b.querySelector('#fin-frase'); if (fr && v) { fr.value = v; showParsed(); } };
        P.$$('[data-kind]', b).forEach(x => x.onclick = () => { keep(); tx.kind = x.dataset.kind; tx.categoryId = ''; redraw(); });
        P.$$('[data-m]', b).forEach(x => x.onclick = () => { if (x.disabled) return; tx.method = x.dataset.m; P.$$('[data-m]', b).forEach(y => y.classList.toggle('on', y === x)); });
        P.$$('[data-s]', b).forEach(x => x.onclick = () => { keep(); tx.status = x.dataset.s; redraw(); });
        f.date.onchange = () => { keep(); if (!existing && tx.date > today && tx.status === 'realizado') { tx.status = 'previsto'; redraw(); } };

        const out = b.querySelector('#fin-frase-out');
        const showParsed = () => {
          if (!parsed || !out) return;
          const bits = [F.KINDS[parsed.kind], parsed.amount ? C.formatMoney(parsed.amount) : null, parsed.desc || null,
            parsed.categoryKey ? F.cat('cat-' + parsed.categoryKey)?.name : null, parsed.method ? F.METHODS[parsed.method] : null,
            parsed.date !== today ? F.date(parsed.date) : 'hoje'].filter(Boolean);
          const miss = { valor: 'o valor', categoria: 'a categoria', forma: 'a forma de pagamento', descricao: 'a descrição' };
          const missing = parsed.missing.filter(m => miss[m]).map(m => miss[m]);
          out.innerHTML = `<b>Entendi:</b> ${esc(bits.join(' · '))}${missing.length ? `<br><span class="warn-t">Falta confirmar ${missing.join(', ')}.</span>` : ''}${parsed.notes.length ? `<br><span class="warn-t">${esc(parsed.notes.join(' '))}</span>` : ''}`;
        };
        const fr = b.querySelector('#fin-frase');
        if (fr) fr.oninput = P.debounce(() => {
          const v = fr.value.trim(); if (!v) return;
          parsed = C.parsePhrase(v, today);
          keep();
          tx.kind = parsed.kind === 'transferencia' ? 'transferencia' : parsed.kind;
          if (parsed.amount) tx.amount = parsed.amount;
          if (parsed.desc) tx.desc = parsed.desc;
          tx.date = parsed.date;
          tx.status = parsed.date > today ? 'previsto' : 'realizado';
          tx.categoryId = parsed.categoryKey ? 'cat-' + parsed.categoryKey : '';
          if (parsed.method && parsed.method !== 'credito') tx.method = parsed.method;
          if (parsed.person) tx.notes = tx.notes || `Para ${parsed.person}`;
          redraw();
          const fr2 = b.querySelector('#fin-frase'); fr2.focus(); fr2.setSelectionRange(fr2.value.length, fr2.value.length);
        }, 350);

        f.onsubmit = e => {
          e.preventDefault(); keep();
          const err = msg => { const p = b.querySelector('.form-error'); p.textContent = msg; p.hidden = false; };
          if (parsed?.method === 'credito' && !existing) return err('Compras no cartão de crédito chegam na próxima versão. Por enquanto, registre o pagamento da fatura quando pagar.');
          if (!Number.isInteger(tx.amount) || tx.amount <= 0) return err('Informe um valor maior que zero, por exemplo 50,48.');
          if (!tx.desc?.trim()) return err('Escreva uma descrição curta.');
          if (!tx.date) return err('Escolha a data.');
          if (!tx.accountId) return err('Escolha a conta.');
          if (tx.kind === 'transferencia') {
            if (!tx.toAccountId) return err('Escolha a conta de destino.');
            if (tx.toAccountId === tx.accountId) return err('A conta de destino precisa ser diferente da de origem.');
          } else if (!tx.categoryId) return err('Escolha a categoria.');
          const rec = { ...tx, desc: tx.desc.trim(), origin: existing ? tx.origin : (parsed ? 'frase' : 'manual') };
          if (rec.kind === 'transferencia') { delete rec.categoryId; rec.method = 'transferencia'; } else delete rec.toAccountId;
          if (rec.kind === 'receita') rec.method = 'transferencia';
          if (rec.status === 'realizado' && !rec.paidDate) rec.paidDate = rec.date;
          if (!existing && rec.kind === 'receita' && rec.categoryId === 'cat-salario' && rec.status === 'realizado') {
            const planned = F.txs().find(t => t.kind === 'receita' && t.categoryId === 'cat-salario' && t.status === 'previsto' && Math.abs(C.diffDays(t.date, rec.date)) <= 12);
            if (planned) { rec.id = planned.id; rec.createdAt = planned.createdAt; }
          }
          const saved = F.save('fin_lanc', rec, existing ? `Editou “${rec.desc}”` : `Lançou “${rec.desc}” (${C.formatMoney(rec.amount)})`);
          api.close();
          P.toast(existing ? 'Lançamento salvo.' : impactToast());
          // salário caiu e o ciclo ainda é só projetado → oferece montar o plano
          const snap = F.snap();
          if (!existing && saved.kind === 'receita' && saved.categoryId === 'cat-salario' && saved.status === 'realizado') {
            const has = F.cycles().some(c => c.start <= saved.date && saved.date <= c.end);
            if (!has) setTimeout(() => F.plan(saved.date, saved.id), 350);
          }
          return snap;
        };
        showParsed();
      }
    });
    return sheet;
  };

  /* ============================================================
     DETALHE / PAGAR / CANCELAR
  ============================================================ */
  F.openTx = id => {
    const t0 = S.get('fin_lanc', id) || S.raw().fin_lanc[id]; if (!t0) return;
    P.sheet({
      title: t0.desc, kicker: F.KINDS[t0.kind], live: true,
      render: () => {
        const t = S.get('fin_lanc', id) || S.raw().fin_lanc[id];
        const st = F.status(t);
        const hist = S.all('fin_hist').filter(h => h.recId === id).sort((a, b) => b.at - a.at);
        const acc = F.acc(t.accountId), to = F.acc(t.toAccountId), cat = F.cat(t.categoryId);
        return `<div class="fin-detail-amount ${t.kind}">${F.money(t.kind === 'despesa' ? -t.amount : t.amount)}</div>
          <div class="detail-meta"><span class="pill st-${st}">${F.STATUS_LABEL[st]}</span><span class="pill cert-${t.certainty || 'confirmado'}">${t.certainty === 'estimado' ? 'valor estimado' : 'valor confirmado'}</span>${t.origin === 'recorrencia' ? '<span class="pill">conta fixa</span>' : ''}${t.parcId ? '<span class="pill">parcelamento</span>' : ''}${t.envelope ? '<span class="pill">teto</span>' : ''}</div>
          ${t.envelope && t.status === 'previsto' ? '<p class="hint">Não precisa pagar este item. Cada compra que você lançar na categoria dele, dentro do ciclo, desconta daqui. Se passar do teto, o excesso aparece no total do ciclo.</p>' : ''}
          <dl class="info">
            <div><dt>${t.status === 'previsto' ? 'Vencimento' : 'Data'}</dt><dd>${t.noDue && t.status === 'previsto' ? 'sem data definida (até ' + F.date(t.date) + ')' : F.date(t.date)}</dd></div>
            ${t.envelope ? `<div><dt>Teto do ciclo</dt><dd>usado ${F.money(C.envUsed(t, F.txs()))} de ${F.money(t.amount)}</dd></div>` : ''}
            ${parcInfo(t)}
            ${t.paidDate && t.paidDate !== t.date ? `<div><dt>Pago em</dt><dd>${F.date(t.paidDate)}</dd></div>` : ''}
            ${cat ? `<div><dt>Categoria</dt><dd>${esc(cat.name)}</dd></div>` : ''}
            ${acc ? `<div><dt>${t.kind === 'transferencia' ? 'De' : 'Conta'}</dt><dd>${esc(acc.name)}</dd></div>` : ''}
            ${to ? `<div><dt>Para</dt><dd>${esc(to.name)}</dd></div>` : ''}
            ${t.method && t.kind === 'despesa' ? `<div><dt>Forma</dt><dd>${F.METHODS[t.method]}</dd></div>` : ''}
            ${t.notes ? `<div><dt>Observações</dt><dd>${esc(t.notes)}</dd></div>` : ''}
          </dl>
          ${hist.length ? `<div class="block-head sub"><h3>Histórico</h3></div><div class="hist-list">${hist.map(histRow).join('')}</div>` : ''}
          <div class="form-actions split">
            ${t.status !== 'cancelado' ? '<button class="btn ghost danger-t" type="button" data-cancel>Cancelar lançamento</button>' : '<button class="btn ghost" type="button" data-restore>Reativar</button>'}
            <span class="grow"></span>
            ${t.status !== 'cancelado' ? '<button class="btn ghost" type="button" data-edit>Editar</button>' : ''}
            ${t.status === 'previsto' && !t.envelope ? `<button class="btn primary" type="button" data-pay>${t.kind === 'receita' ? 'Recebi' : 'Marcar como pago'}</button>` : ''}
          </div>`;
      },
      mount: api => {
        const t = S.get('fin_lanc', id) || S.raw().fin_lanc[id], b = api.body;
        const on = (sel, fn) => { const el = b.querySelector(sel); if (el) el.onclick = fn; };
        on('[data-pay]', () => { api.close(); F.pay(id); });
        on('[data-edit]', () => { api.close(); F.lancar({}, t); });
        on('[data-cancel]', async () => {
          if (!(await P.ask(`Cancelar “${t.desc}”? Ele deixa de contar no saldo e nos compromissos, mas continua no histórico.`, 'Cancelar lançamento'))) return;
          F.save('fin_lanc', { ...t, status: 'cancelado' }, `Cancelou “${t.desc}”`); P.toast('Lançamento cancelado.');
        });
        on('[data-restore]', () => { F.save('fin_lanc', { ...t, status: t.paidDate ? 'realizado' : 'previsto' }, `Reativou “${t.desc}”`); });
      }
    });
  };
  const FIELD_NAMES = { amount: 'valor', date: 'data', status: 'situação', desc: 'descrição', accountId: 'conta', categoryId: 'categoria', method: 'forma', certainty: 'certeza', paidDate: 'pago em', notes: 'observações', opening: 'saldo inicial', reserve: 'reserva' };
  const fmtVal = (k, v) => (v === null || v === undefined || v === '' ? '—' : ['amount', 'opening', 'reserve', 'income', 'base'].includes(k) ? C.formatMoney(v) : k === 'accountId' || k === 'toAccountId' ? (F.acc(v)?.name || v) : k === 'categoryId' ? (F.cat(v)?.name || v) : typeof v === 'object' ? '…' : String(v));
  const histRow = h => `<div class="hist-row"><span class="mono faint">${new Date(h.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
    <span>${esc(h.summary)}${h.action === 'alterou' ? `<small>${Object.entries(h.changes).filter(([k]) => FIELD_NAMES[k]).map(([k, [a, b]]) => `${FIELD_NAMES[k]}: ${esc(fmtVal(k, a))} → ${esc(fmtVal(k, b))}`).join(' · ')}</small>` : ''}</span></div>`;

  // linha "parcela 3 de 12 · faltam 9 (R$ 432,00)" no detalhe de uma parcela
  const parcInfo = t => {
    const p = t.parcId && F.parc(t.parcId); if (!p) return '';
    const pr = C.parcProgress(p, F.txs());
    return `<div><dt>Parcelamento</dt><dd>parcela ${t.parcNum} de ${p.n} · pagas ${pr.paidCount} · faltam ${pr.left} (${F.money(pr.leftAmount)})</dd></div>`;
  };
  F.parcToast = t => {
    const p = t.parcId && F.parc(t.parcId); if (!p) return null;
    const pr = C.parcProgress(p, F.txs());
    return pr.left ? `${p.desc}: ${pr.paidCount} de ${p.n} pagas. Faltam ${pr.left} (${C.formatMoney(pr.leftAmount)}).` : `${p.desc}: última parcela paga. Quitado!`;
  };
  F.pay = id => {
    const t = S.get('fin_lanc', id) || S.raw().fin_lanc[id]; if (!t) return;
    P.sheet({
      title: t.kind === 'receita' ? 'Confirmar recebimento' : 'Confirmar pagamento', kicker: t.desc,
      render: () => `<form class="form">
        <div class="row-fields">${field('Valor pago', `<input name="amount" inputmode="decimal" value="${inMoney(t.amount)}" autofocus class="money-input">`, t.certainty === 'estimado' ? 'Era um valor estimado: confira o valor real.' : '')}
        ${field('Data', `<input type="date" name="date" value="${P.today()}">`)}</div>
        ${field('Conta', `<select name="accountId">${accOptions(t.accountId || F.accounts()[0]?.id)}</select>`)}
        ${t.kind === 'despesa' ? field('Forma', `<select name="method">${['debito', 'pix', 'dinheiro', 'boleto'].map(m => `<option value="${m}" ${t.method === m ? 'selected' : ''}>${F.METHODS[m]}</option>`).join('')}</select>`) : ''}
        <p class="form-error" hidden></p>
        <div class="form-actions"><button class="btn primary" type="submit">Confirmar</button></div></form>`,
      mount: api => {
        api.body.querySelector('form').onsubmit = e => {
          e.preventDefault(); const f = e.target;
          const amount = C.parseMoney(f.amount.value);
          if (!Number.isInteger(amount) || amount <= 0) { const p = api.body.querySelector('.form-error'); p.textContent = 'Informe o valor pago.'; p.hidden = false; return; }
          F.save('fin_lanc', { ...t, amount, paidDate: f.date.value, status: 'realizado', certainty: 'confirmado', accountId: f.accountId.value, method: f.method ? f.method.value : t.method },
            `${t.kind === 'receita' ? 'Recebeu' : 'Pagou'} “${t.desc}” (${C.formatMoney(amount)})`);
          api.close(); P.toast(F.parcToast({ ...t }) || impactToast());
        };
      }
    });
  };

  /* ============================================================
     PLANO DO CICLO
  ============================================================ */
  F.plan = (start, salaryTxId = null) => {
    let reserve = F.profile().reserve || 0;
    const prev = F.cycles().find(c => c.start === start);
    if (prev) reserve = prev.reserve || 0;
    P.sheet({
      title: 'Plano do ciclo', kicker: 'nada muda até você confirmar', wide: true,
      render: () => {
        const nextPay = C.nextPayday(start, F.profile());
        F.ensureOccurrences(start, C.addDays(nextPay, -1));
        const p = C.cyclePlan(F.state(), start, reserve);
        return `<p class="lede small">Ciclo de <b>${F.date(p.start)}</b> a <b>${F.date(p.end)}</b>. Próximo salário previsto: ${F.date(p.nextPay)}.</p>
          <div class="calc-table">
            <div><span>Saldo hoje nas contas do disponível</span><b>${F.money(p.available)}</b></div>
            <div><span>− Contas e compromissos até ${F.date(p.end)} (${p.commitments.length})</span><b>${F.money(-p.committed)}</b></div>
            <div class="calc-input"><span>− Reserva de segurança do ciclo</span><input id="plan-reserve" inputmode="decimal" value="${inMoney(p.reserve)}" class="money-input"></div>
            <div class="calc-total ${p.base < 0 ? 'bad' : ''}"><span>= Livre para o dia a dia</span><b>${F.money(p.base)}</b></div>
          </div>
          ${p.commitments.length ? `<details class="done-today"><summary>${p.commitments.length === 1 ? 'Ver o compromisso' : `Ver os ${p.commitments.length} compromissos`}</summary><div class="list">${p.commitments.map(t => `<div class="row fin-row"><span class="row-main as-text"><span class="row-title">${esc(t.desc)}</span><span class="row-meta">${F.date(t.date)}${t.certainty === 'estimado' ? ' · estimado' : ''}</span></span><span class="fin-amt">${F.money(t.remaining ?? t.amount)}</span></div>`).join('')}</div></details>` : '<p class="faint small">Nenhuma conta prevista no período. Cadastre suas contas fixas em Mais → Contas fixas.</p>'}
          <div class="block-head sub"><h3>Sugestão para as semanas</h3><span class="faint small">proporcional aos dias</span></div>
          <div class="weeks-preview">${p.weeks.map(w => `<div><span>${w.label}</span><small>${F.date(w.start)}–${F.date(w.end)} · ${w.days} dia${w.days > 1 ? 's' : ''}</small><b>${F.money(w.limit)}</b></div>`).join('')}</div>
          <p class="hint">Na próxima versão você poderá editar e travar o limite de cada semana.</p>
          ${p.base < 0 ? `<div class="notice">O dinheiro de agora não cobre as contas até o próximo salário. Faltam ${F.money(-p.base)}. Dá para começar mesmo assim e acompanhar pelo painel.</div>` : ''}
          <div class="form-actions"><button class="btn ghost" type="button" data-cancel>Agora não</button><button class="btn primary" type="button" data-go>${prev ? 'Refazer o plano' : 'Começar o ciclo'}</button></div>`;
      },
      mount: api => {
        const b = api.body;
        const r = b.querySelector('#plan-reserve');
        r.onchange = () => { const v = C.parseMoney(r.value); if (v !== null && v >= 0) { reserve = v; api.refresh(); } };
        b.querySelector('[data-cancel]').onclick = () => api.close();
        b.querySelector('[data-go]').onclick = () => {
          const v = C.parseMoney(r.value); if (v !== null && v >= 0) reserve = v;
          const p = C.cyclePlan(F.state(), start, reserve);
          F.save('fin_ciclo', { id: 'ciclo-' + start, start: p.start, end: p.end, salaryTxId, available: p.available, committed: p.committed, reserve: p.reserve, base: p.base, weeks: p.weeks.map(w => ({ start: w.start, end: w.end, days: w.days, label: w.label, limit: w.limit, locked: false })), plannedAt: P.today() },
            `${prev ? 'Refez' : 'Começou'} o ciclo ${F.date(p.start)}–${F.date(p.end)}`);
          api.close(); P.toast('Ciclo começou. Bom mês! ✦');
          P.go('fin-orcamento');
        };
      }
    });
  };

  /* ============================================================
     CONTAS
  ============================================================ */
  F.accountForm = (acc = null) => {
    const a = acc || { name: '', type: 'corrente', opening: null, openingDate: P.today(), inAvailable: true };
    P.sheet({
      title: acc ? acc.name : 'Nova conta', kicker: 'conta bancária ou carteira',
      render: () => `<form class="form">
        ${field('Nome', `<input name="name" required value="${esc(a.name)}" placeholder="ex.: Nubank" autofocus>`)}
        ${field('Tipo', `<select name="type">${Object.entries(F.ACC_TYPES).map(([k, l]) => `<option value="${k}" ${a.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
        <div class="row-fields">
          ${field('Saldo em', `<input type="date" name="openingDate" value="${a.openingDate || P.today()}">`, 'O dia em que você conferiu o saldo.')}
          ${field('Saldo nesse dia', `<input name="opening" inputmode="decimal" value="${a.openingSet === false ? '' : inMoney(a.opening)}" placeholder="0,00" class="money-input">`, 'Use − para saldo negativo.')}
        </div>
        <label class="check-line"><input type="checkbox" name="inAvailable" ${a.inAvailable !== false ? 'checked' : ''}> Conta no disponível (o dinheiro daqui pode ser gasto no dia a dia)</label>
        <p class="hint">Desmarque para poupança, reserva ou investimento: o dinheiro continua no seu patrimônio, mas não entra no “posso gastar”.</p>
        <p class="form-error" hidden></p>
        <div class="form-actions split">${acc && acc.id !== 'conta-nubank' ? '<button class="btn ghost danger-t" type="button" data-archive>Arquivar</button>' : ''}<span class="grow"></span><button class="btn primary" type="submit">Salvar</button></div>
      </form>`,
      mount: api => {
        const f = api.body.querySelector('form');
        const ar = api.body.querySelector('[data-archive]');
        if (ar) ar.onclick = async () => { if (await P.ask(`Arquivar ${a.name}? Os lançamentos continuam no histórico.`, 'Arquivar')) { F.save('fin_conta', { ...acc, archived: true }, `Arquivou a conta ${a.name}`); api.close(); } };
        f.onsubmit = e => {
          e.preventDefault();
          const opening = C.parseMoney(f.opening.value || '0');
          if (opening === null) { const p = api.body.querySelector('.form-error'); p.textContent = 'Saldo inválido. Use, por exemplo, 1.234,56.'; p.hidden = false; return; }
          F.save('fin_conta', { ...a, name: f.name.value.trim(), type: f.type.value, opening, openingDate: f.openingDate.value, openingSet: true, inAvailable: f.inAvailable.checked },
            acc ? `Alterou a conta ${f.name.value.trim()}` : `Criou a conta ${f.name.value.trim()}`);
          api.close(); P.toast('Conta salva.');
        };
      }
    });
  };

  /* ============================================================
     CATEGORIAS
  ============================================================ */
  F.catsSheet = () => P.sheet({
    title: 'Categorias', live: true,
    render: () => ['despesa', 'receita'].map(k => `<div class="block-head sub"><h3>${k === 'despesa' ? 'Despesas' : 'Receitas'}</h3></div>
      <div class="list">${F.cats(k).map(c => `<div class="row"><span class="row-main as-text"><span class="row-title">${esc(c.name)}</span>${k === 'despesa' ? `<span class="row-meta">${c.weekly !== false ? 'entra no limite semanal' : 'fora do limite semanal'}</span>` : ''}</span>
        ${k === 'despesa' ? `<button class="btn ghost small" type="button" data-weekly="${c.id}">${c.weekly !== false ? 'Tirar da semana' : 'Pôr na semana'}</button>` : ''}
        ${c.custom ? `<button class="icon-btn small" type="button" data-arch="${c.id}" aria-label="Arquivar ${esc(c.name)}">✕</button>` : ''}</div>`).join('')}</div>`).join('') + `
      <form class="quick-add slim" data-newcat><input name="n" placeholder="Nova categoria" aria-label="Nova categoria"><select name="k" aria-label="Tipo"><option value="despesa">Despesa</option><option value="receita">Receita</option></select><button class="btn primary small" type="submit">Criar</button></form>
      <p class="hint">“Limite semanal” = gastos do dia a dia. Contas fixas (aluguel, academia, assinaturas) ficam fora, porque já entram no plano do ciclo.</p>`,
    mount: api => {
      const b = api.body;
      P.$$('[data-weekly]', b).forEach(x => x.onclick = () => { const c = F.cat(x.dataset.weekly); F.save('fin_cat', { ...c, weekly: c.weekly === false }, `${c.weekly === false ? 'Pôs' : 'Tirou'} ${c.name} ${c.weekly === false ? 'no' : 'do'} limite semanal`); });
      P.$$('[data-arch]', b).forEach(x => x.onclick = () => { const c = F.cat(x.dataset.arch); F.save('fin_cat', { ...c, archived: true }, `Arquivou a categoria ${c.name}`); });
      b.querySelector('[data-newcat]').onsubmit = e => {
        e.preventDefault(); const n = e.target.n.value.trim(); if (!n) return;
        F.save('fin_cat', { name: n, kind: e.target.k.value, weekly: e.target.k.value === 'despesa', custom: true }, `Criou a categoria ${n}`);
      };
    }
  });

  /* ============================================================
     CONTAS FIXAS (recorrências)
  ============================================================ */
  F.recsSheet = () => P.sheet({
    title: 'Contas fixas', kicker: 'viram compromissos em cada ciclo', live: true,
    render: () => {
      const list = F.recs().sort((a, b) => (a.day || 0) - (b.day || 0));
      return `<div class="list">${list.length ? list.map(r => `<button type="button" class="row as-btn fin-row" data-rec="${r.id}"><span class="row-main as-text"><span class="row-title">${esc(r.desc)}${r.active === false ? ' · pausada' : ''}</span>
        <span class="row-meta">todo dia ${r.day} · ${esc(F.cat(r.categoryId)?.name || '')}${r.certainty === 'estimado' ? ' · valor estimado' : ''}</span></span><span class="fin-amt ${r.kind === 'receita' ? 'in' : ''}">${F.money(r.amount)}</span></button>`).join('') : '<p class="faint small">Nenhuma conta fixa ainda. Cadastre aluguel, contas de casa, academia, assinaturas e o que mais se repete todo mês.</p>'}</div>
        <div class="form-actions"><button class="btn primary" type="button" data-new>+ Conta fixa</button></div>`;
    },
    mount: api => {
      P.$$('[data-rec]', api.body).forEach(x => x.onclick = () => F.recForm(S.get('fin_rec', x.dataset.rec)));
      api.body.querySelector('[data-new]').onclick = () => F.recForm();
    }
  });

  F.recForm = (rec = null) => {
    const r = rec || { desc: '', kind: 'despesa', amount: null, day: 10, method: 'boleto', accountId: F.accounts()[0]?.id, certainty: 'confirmado', active: true, start: P.today().slice(0, 7) };
    P.sheet({
      title: rec ? rec.desc : 'Nova conta fixa',
      render: () => `<form class="form">
        <div class="seg small">${['despesa', 'receita'].map(k => `<button type="button" class="seg-btn ${r.kind === k ? 'on' : ''}" data-kind="${k}">${k === 'despesa' ? 'Conta a pagar' : 'Receita fixa'}</button>`).join('')}</div>
        ${field('Descrição', `<input name="desc" required value="${esc(r.desc)}" placeholder="ex.: Aluguel" autofocus>`)}
        <div class="row-fields">${field('Valor', `<input name="amount" inputmode="decimal" value="${inMoney(r.amount)}" class="money-input" placeholder="0,00">`)}${field('Todo dia', `<input name="day" type="number" min="1" max="31" value="${r.day}">`, 'Dia 31 vira o último dia em meses menores.')}</div>
        <label class="check-line"><input type="checkbox" name="estimado" ${r.certainty === 'estimado' ? 'checked' : ''}> O valor muda todo mês (estimado), como conta de luz</label>
        <div class="row-fields">${field('Categoria', `<select name="categoryId">${catOptions(r.kind, r.categoryId)}</select>`)}${field('Conta', `<select name="accountId">${accOptions(r.accountId)}</select>`)}</div>
        ${r.kind === 'despesa' ? field('Forma', `<select name="method">${['boleto', 'debito', 'pix', 'dinheiro'].map(m => `<option value="${m}" ${r.method === m ? 'selected' : ''}>${F.METHODS[m]}</option>`).join('')}</select>`) : ''}
        <label class="check-line"><input type="checkbox" name="active" ${r.active !== false ? 'checked' : ''}> Ativa</label>
        <p class="form-error" hidden></p>
        <div class="form-actions"><button class="btn primary" type="submit">Salvar</button></div></form>`,
      mount: api => {
        const f = api.body.querySelector('form');
        P.$$('[data-kind]', api.body).forEach(x => x.onclick = () => { r.desc = f.desc.value; r.amount = C.parseMoney(f.amount.value); r.kind = x.dataset.kind; r.categoryId = ''; api.refresh(); });
        f.onsubmit = e => {
          e.preventDefault();
          const amount = C.parseMoney(f.amount.value), day = parseInt(f.day.value, 10);
          const err = m => { const p = api.body.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
          if (!Number.isInteger(amount) || amount <= 0) return err('Informe o valor (se varia, use uma estimativa e marque “estimado”).');
          if (!(day >= 1 && day <= 31)) return err('O dia precisa estar entre 1 e 31.');
          if (!f.categoryId.value) return err('Escolha a categoria.');
          F.save('fin_rec', { ...r, desc: f.desc.value.trim(), amount, day, certainty: f.estimado.checked ? 'estimado' : 'confirmado', categoryId: f.categoryId.value, accountId: f.accountId.value, method: f.method ? f.method.value : 'transferencia', active: f.active.checked },
            rec ? `Alterou a conta fixa ${f.desc.value.trim()}` : `Criou a conta fixa ${f.desc.value.trim()}`);
          api.close(); P.toast('Conta fixa salva. Ela já aparece nos compromissos do ciclo.');
        };
      }
    });
  };

  /* ============================================================
     CONCILIAÇÃO
  ============================================================ */
  F.concile = accId => {
    const acc = F.acc(accId) || F.accounts()[0]; if (!acc) return;
    P.sheet({
      title: 'Conferir saldo', kicker: acc.name,
      render: () => {
        const computed = C.balance(acc, F.txs());
        return `<p class="lede small">Abra o app do banco e digite o saldo que aparece agora. Eu comparo com o que está registrado aqui.</p>
          <div class="calc-table"><div><span>Saldo calculado pelo Prisma</span><b>${C.formatMoney(computed)}</b></div></div>
          <form class="form">${field('Saldo que o banco mostra', `<input name="reported" inputmode="decimal" autofocus class="money-input" placeholder="0,00">`)}
          <div class="conc-result" hidden></div>
          <div class="form-actions"><button class="btn primary" type="submit">Comparar</button></div></form>`;
      },
      mount: api => {
        const f = api.body.querySelector('form'), out = api.body.querySelector('.conc-result');
        f.onsubmit = e => {
          e.preventDefault();
          const reported = C.parseMoney(f.reported.value); if (reported === null) return;
          const computed = C.balance(acc, F.txs()), diff = reported - computed;
          out.hidden = false;
          if (diff === 0) {
            out.innerHTML = `<div class="notice ok-n">Bateu certinho. ✦</div>`;
            F.save('fin_conc', { accountId: acc.id, date: P.today(), reported, computed, diff: 0, resolution: 'ok' }, `Conferiu o saldo de ${acc.name}: bateu`);
            return;
          }
          out.innerHTML = `<div class="notice">Diferença de <b>${C.formatMoney(diff, { plus: true })}</b>. ${diff < 0 ? 'Pode ser um gasto que não foi lançado.' : 'Pode ser uma entrada que não foi lançada.'}</div>
            <div class="form-actions split"><button class="btn ghost" type="button" data-look>Vou procurar</button><span class="grow"></span><button class="btn primary" type="button" data-adjust>Criar ajuste de ${C.formatMoney(diff, { plus: true })}</button></div>`;
          out.querySelector('[data-look]').onclick = () => { F.save('fin_conc', { accountId: acc.id, date: P.today(), reported, computed, diff, resolution: 'procurar' }, `Conferiu o saldo de ${acc.name}: diferença de ${C.formatMoney(diff)}`); api.close(); P.go('fin-lanc'); };
          out.querySelector('[data-adjust]').onclick = () => {
            const t = F.save('fin_lanc', { kind: 'ajuste', sign: diff < 0 ? 'saida' : 'entrada', amount: Math.abs(diff), date: P.today(), paidDate: P.today(), status: 'realizado', certainty: 'confirmado', accountId: acc.id, desc: `Ajuste de conferência · ${acc.name}`, origin: 'conciliacao' }, `Criou ajuste de ${C.formatMoney(diff)} em ${acc.name}`);
            F.save('fin_conc', { accountId: acc.id, date: P.today(), reported, computed, diff, resolution: 'ajuste', txId: t.id }, `Conferiu o saldo de ${acc.name} e ajustou ${C.formatMoney(diff)}`);
            api.close(); P.toast('Ajuste criado. Saldo igual ao do banco.');
          };
        };
      }
    });
  };

  /* ============================================================
     PERFIL, SEGURANÇA, HISTÓRICO
  ============================================================ */
  F.profileSheet = () => {
    const p = F.profile();
    P.sheet({
      title: 'Perfil financeiro',
      render: () => `<form class="form">
        <div class="row-fields">${field('Renda líquida habitual', `<input name="income" inputmode="decimal" value="${inMoney(p.income)}" class="money-input">`, 'Usada só como referência e estimativa.')}
        ${field('Dia do salário', `<input name="payday" type="number" min="1" max="31" value="${p.payday}">`)}</div>
        ${field('Se cair em fim de semana ou feriado', `<select name="paydayRule"><option value="adia" ${p.paydayRule === 'adia' ? 'selected' : ''}>Adia para o próximo dia útil</option><option value="antecipa" ${p.paydayRule === 'antecipa' ? 'selected' : ''}>Antecipa para o dia útil anterior</option><option value="mantem" ${p.paydayRule === 'mantem' ? 'selected' : ''}>Fica na mesma data</option></select>`, 'Feriados nacionais, Carnaval e Corpus Christi contam como dias sem banco.')}
        ${field('Reserva de segurança por ciclo', `<input name="reserve" inputmode="decimal" value="${inMoney(p.reserve)}" class="money-input">`, 'Valor que fica guardado e não entra no “posso gastar”. Pode ser 0.')}
        <div class="form-actions"><button class="btn primary" type="submit">Salvar</button></div></form>`,
      mount: api => {
        api.body.querySelector('form').onsubmit = e => {
          e.preventDefault(); const f = e.target;
          const income = C.parseMoney(f.income.value), reserve = C.parseMoney(f.reserve.value || '0'), payday = parseInt(f.payday.value, 10);
          if (income === null || reserve === null || !(payday >= 1 && payday <= 31)) { P.toast('Confira os valores.'); return; }
          F.setProfile({ income, reserve, payday, paydayRule: f.paydayRule.value });
          api.close(); P.toast('Perfil salvo.');
        };
      }
    });
  };

  F.securitySheet = () => P.sheet({
    title: 'Segurança', live: true,
    render: () => `<div class="sync-box"><div><span class="status-dot ok"></span><strong>PIN ativo neste aparelho</strong><small>O Financeiro+ pede o PIN ao abrir e depois de 2 minutos fora do app.</small></div></div>
      <form class="form" data-change>
        <div class="row-fields">${field('PIN atual', '<input name="cur" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required>')}${field('Novo PIN', '<input name="nw" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required>')}</div>
        <div class="form-actions"><button class="btn ghost small" type="submit">Trocar PIN</button></div></form>
      <label class="check-line"><input type="checkbox" id="fin-hide" ${F.hidden() ? 'checked' : ''}> Esconder valores na tela (mostra R$ ••••)</label>
      <p class="hint">O PIN protege contra quem pegar seu celular desbloqueado. Ele fica só neste aparelho; em outro aparelho você cria outro PIN.</p>
      <div class="form-actions"><button class="btn primary" type="button" data-lock>Bloquear agora</button></div>`,
    mount: api => {
      const b = api.body;
      b.querySelector('[data-change]').onsubmit = async e => {
        e.preventDefault(); const f = e.target;
        const r = await F.checkPin(f.cur.value);
        if (!r.ok) { P.toast(r.wait ? `Muitas tentativas. Espere ${r.wait}s.` : 'PIN atual incorreto.'); return; }
        await F.setPin(f.nw.value); P.toast('PIN trocado.'); f.reset();
      };
      b.querySelector('#fin-hide').onchange = e => { P.ls.set('prisma2:finHide', e.target.checked); P.render(); };
      b.querySelector('[data-lock]').onclick = () => { api.close(); F.lock(); P.render(); };
    }
  });

  F.historySheet = () => P.sheet({
    title: 'Histórico de alterações', wide: true,
    render: () => {
      const list = S.all('fin_hist').sort((a, b) => b.at - a.at).slice(0, 150);
      return list.length ? `<div class="hist-list">${list.map(histRow).join('')}</div>` : '<p class="faint">Nenhuma alteração ainda.</p>';
    }
  });
})();
