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
    if (s.week) parts.push(`${F.blk().one}: ${F.money(s.week.limit - s.week.spent)} restantes`);
    return parts.join(' · ');
  };

  /* ---------- campo de dinheiro: mostra como o valor foi entendido ---------- */
  if (!F._moneyPreview) {
    F._moneyPreview = true;
    const preview = inp => {
      let out = inp.parentElement.querySelector('.money-preview');
      const v = inp.value.trim();
      if (!v) { out?.remove(); inp.removeAttribute('aria-describedby'); return; }
      if (!out) { out = document.createElement('span'); out.className = 'money-preview'; out.id = 'mp-' + Math.random().toString(36).slice(2, 8); out.setAttribute('aria-live', 'polite'); inp.after(out); inp.setAttribute('aria-describedby', out.id); }
      const c = C.parseMoney(v);
      out.classList.toggle('bad', c === null);
      out.textContent = c === null ? 'Não entendi o valor. Use, por exemplo, 50,48.' : `Vai ficar ${C.formatMoney(c)}`;
    };
    document.addEventListener('input', e => { if (e.target.matches?.('.money-input')) preview(e.target); });
    document.addEventListener('change', e => {
      const inp = e.target; if (!inp.matches?.('.money-input')) return;
      const c = C.parseMoney(inp.value); if (c !== null && c >= 0) inp.value = inMoney(c);
    });
  }

  /* ============================================================
     LANÇAR (frase + formulário)
  ============================================================ */
  F.lancar = (preset = {}, existing = null) => {
    const today = P.today();
    let tx = existing ? { ...existing } : { kind: 'despesa', date: today, status: 'realizado', certainty: 'confirmado', method: 'debito', accountId: F.accounts()[0]?.id || '', n: 1, firstPaid: true, ...preset };
    let parsed = null;
    // rascunho: se a janela fechou sem querer, o que você digitou volta (vale por 12 horas, só para lançamento novo)
    const DRAFT = 'prisma2:lancDraft';
    const useDraft = !existing && !Object.keys(preset).length;
    const draft = useDraft ? P.ls.get(DRAFT) : null;
    let restored = false;
    if (draft && Date.now() - draft.at < 12 * 3600e3 && (draft.tx.amount || draft.tx.desc)) { tx = { ...tx, ...draft.tx }; restored = true; }
    else if (draft) P.ls.del(DRAFT);
    const saveDraft = () => { if (useDraft && (tx.amount || tx.desc)) P.ls.set(DRAFT, { at: Date.now(), tx: { kind: tx.kind, amount: tx.amount, date: tx.date, desc: tx.desc, categoryId: tx.categoryId, toAccountId: tx.toAccountId, accountId: tx.accountId, status: tx.status, method: tx.method, notes: tx.notes, certainty: tx.certainty, n: tx.n, cardId: tx.cardId, firstPaid: tx.firstPaid } }); };
    const dropDraft = () => P.ls.del(DRAFT);
    const sheet = P.sheet({
      title: existing ? 'Editar lançamento' : 'Lançar', kicker: 'Financeiro+',
      render: () => {
        const buy = tx.kind === 'despesa', credit = buy && tx.method === 'credito' && !existing, n = buy && !existing ? (tx.n || 1) : 1;
        const cards = F.cards();
        if (credit) { if (!tx.cardId || !F.acc(tx.cardId)) tx.cardId = cards[0]?.id || ''; if (!tx.monthTouched) tx.firstMonth = firstInvoice(tx.date || today, F.acc(tx.cardId)); }
        const payDay = Number((tx.date || today).slice(8, 10));
        const firstYm = tx.firstPaid ? (tx.date || today).slice(0, 7) : C.addMonths((tx.date || today).slice(0, 7), 1);
        const dueOf = ym => { const [y, m] = ym.split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${ym}-${String(Math.min(payDay, last)).padStart(2, '0')}`; };
        const sched = buy && (credit || n > 1) && Number.isInteger(tx.amount) && tx.amount > 0 ? C.installments({ id: 'x', type: credit ? 'cartao' : 'carne', total: tx.amount, n, firstMonth: credit ? tx.firstMonth : firstYm }) : [];
        return `
        ${restored ? '<div class="notice draft-note">Recuperei o que você estava lançando. <button type="button" class="link" data-discard>Começar do zero</button></div>' : ''}
        ${existing ? '' : `<label class="field fin-phrase"><span class="field-label">Escreva do seu jeito</span>
          <input id="fin-frase" autocomplete="off" placeholder="ex.: gastei 50,48 com hambúrguer no débito" autofocus>
          <span class="hint" id="fin-frase-out">Ou preencha os campos abaixo.</span></label>`}
        <form class="form" data-f="tx">
          <div class="seg small">${['despesa', 'receita', 'transferencia'].map(k => `<button type="button" class="seg-btn ${tx.kind === k ? 'on' : ''}" data-kind="${k}">${F.KINDS[k]}</button>`).join('')}</div>
          <div class="row-fields">
            ${field(n > 1 ? 'Valor total' : 'Valor', `<input name="amount" inputmode="decimal" required value="${inMoney(tx.amount)}" placeholder="0,00" class="money-input">`)}
            ${field(tx.kind === 'despesa' && !existing && (tx.method === 'credito' || (tx.n || 1) > 1) ? 'Data da compra' : tx.kind === 'transferencia' ? 'Data' : tx.status === 'previsto' ? 'Vencimento' : 'Data', `<input type="date" name="date" required value="${tx.date || today}">`)}
          </div>
          ${field('Descrição', `<input name="desc" required value="${esc(tx.desc || '')}" placeholder="${tx.kind === 'receita' ? 'ex.: Freela banner' : 'ex.: Mercado'}">`)}
          ${tx.kind === 'transferencia' ? `<div class="row-fields">
              ${field('De', `<select name="accountId">${accOptions(tx.accountId)}</select>`)}
              ${field('Para', `<select name="toAccountId"><option value="">Escolha…</option>${accOptions(tx.toAccountId)}</select>`)}
            </div>` : field('Categoria', `<select name="categoryId">${catOptions(tx.kind, tx.categoryId)}</select>`)}
          ${buy ? `<div class="field"><span class="field-label" id="lbl-como">Como pagou</span><div class="chips compact pay-chips" role="group" aria-labelledby="lbl-como">${(existing ? ['debito', 'pix', 'dinheiro', 'boleto'] : ['credito', 'debito', 'pix', 'dinheiro', 'boleto']).map(m => `<button type="button" class="chip ${tx.method === m ? 'on' : ''}" aria-pressed="${tx.method === m}" data-m="${m}">${F.METHODS[m]}</button>`).join('')}</div></div>
          ${existing ? '' : `<div class="field"><span class="field-label" id="lbl-parc">Parcelou?</span><div class="parc-line"><div class="seg small" role="group" aria-labelledby="lbl-parc"><button type="button" class="seg-btn ${n === 1 ? 'on' : ''}" aria-pressed="${n === 1}" data-parc="1">À vista</button><button type="button" class="seg-btn ${n > 1 ? 'on' : ''}" aria-pressed="${n > 1}" data-parc="2">Parcelado</button></div>
            ${n > 1 ? `<select name="n" aria-label="Número de parcelas">${Array.from({ length: 23 }, (_, i) => i + 2).map(k => `<option value="${k}" ${n === k ? 'selected' : ''}>${k}×</option>`).join('')}</select>` : ''}</div></div>`}
          ${credit ? `${field('Cartão', cards.length ? `<select name="cardId">${cards.map(c => `<option value="${c.id}" ${c.id === tx.cardId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ Outro cartão…</option></select>` : `<input name="newCard" placeholder="ex.: Nubank crédito" value="${esc(tx.newCard || '')}">`, cards.length ? '' : 'Só o nome do cartão, nada de número ou senha.')}` : ''}
          ${sched.length ? `<div class="parc-preview" aria-live="polite"><b>${n > 1 ? `${n}× de ${F.money(sched[0].amount)}` : F.money(sched[0].amount)}</b><span>${credit ? (n > 1 ? `1ª na fatura de ${ymTxt(sched[0].month)}, última em ${ymTxt(sched[sched.length - 1].month)}` : `na fatura de ${ymTxt(sched[0].month)}`) : `${tx.firstPaid ? `1ª paga em ${F.date(tx.date)}` : `1ª em ${F.date(dueOf(sched[0].month))}`}, depois todo dia ${payDay} até ${ymTxt(sched[sched.length - 1].month)}`}</span>
            <small>${credit ? 'Não sai do saldo agora: entra quando você pagar a fatura.' : 'Cada parcela vira uma conta a pagar no ciclo do mês dela.'}</small></div>` : ''}
          ${!credit && n > 1 ? `<div class="field"><span class="field-label" id="lbl-1a">Primeira parcela</span><div class="chips compact" role="group" aria-labelledby="lbl-1a"><button type="button" class="chip ${tx.firstPaid ? 'on' : ''}" aria-pressed="${!!tx.firstPaid}" data-first="1">Já paguei hoje</button><button type="button" class="chip ${!tx.firstPaid ? 'on' : ''}" aria-pressed="${!tx.firstPaid}" data-first="0">Começa no mês que vem</button></div></div>` : ''}` : ''}
          ${buy && (credit || n > 1) ? '' : `<div class="field"><span class="field-label">Situação</span><div class="chips compact" data-status>
            <button type="button" class="chip ${tx.status === 'realizado' ? 'on' : ''}" data-s="realizado">${tx.kind === 'receita' ? 'Já recebi' : tx.kind === 'transferencia' ? 'Já fiz' : 'Já paguei'}</button>
            <button type="button" class="chip ${tx.status === 'previsto' ? 'on' : ''}" data-s="previsto">${tx.kind === 'receita' ? 'Vou receber' : 'Vou pagar'}</button>
          </div></div>`}
          <details class="more-opts" ${tx.notes || tx.certainty === 'estimado' ? 'open' : ''}>
            <summary>Mais opções <span class="faint">· ${credit ? 'fatura, observações' : tx.kind === 'transferencia' ? 'observações' : `${esc(F.acc(tx.accountId)?.name || 'conta')}, observações`}</span></summary>
            ${tx.kind === 'transferencia' || credit ? '' : field(tx.kind === 'receita' ? 'Entrou na conta' : 'Conta', `<select name="accountId">${accOptions(tx.accountId)}</select>`)}
            ${credit ? field('Primeira parcela na fatura de', `<input type="month" name="firstMonth" value="${tx.firstMonth}">`, F.acc(tx.cardId)?.closingDay ? `Calculado pelo fechamento (dia ${F.acc(tx.cardId).closingDay}) do cartão.` : 'Cadastre o fechamento do cartão em Ajustes → Finanças → Cartões para o app acertar sozinho.') : ''}
            ${credit || n > 1 ? '' : `<label class="check-line"><input type="checkbox" name="estimado" ${tx.certainty === 'estimado' ? 'checked' : ''}> Valor estimado (ainda não sei o valor exato)</label>`}
            ${field('Observações', `<input name="notes" value="${esc(tx.notes || '')}" placeholder="opcional">`)}
          </details>
          <p class="form-error" hidden></p>
          <div class="form-actions"><button class="btn primary" type="submit">${existing ? 'Salvar' : credit ? 'Lançar no cartão' : n > 1 ? `Lançar em ${n}×` : 'Lançar'}</button></div>
        </form>`; },
      mount: api => {
        const b = api.body, f = b.querySelector('form');
        const keep = () => { const fd = new FormData(f); tx = { ...tx, amount: C.parseMoney(fd.get('amount')) ?? tx.amount, date: fd.get('date'), desc: fd.get('desc'), accountId: fd.get('accountId') || tx.accountId, toAccountId: fd.get('toAccountId') ?? tx.toAccountId, categoryId: fd.get('categoryId') ?? tx.categoryId, notes: fd.get('notes'), certainty: fd.get('estimado') ? 'estimado' : 'confirmado', n: fd.has('n') ? +fd.get('n') : tx.n, newCard: fd.get('newCard') ?? tx.newCard, firstMonth: fd.get('firstMonth') || tx.firstMonth }; if (fd.has('cardId') && fd.get('cardId') !== '__new') tx.cardId = fd.get('cardId'); };
        const redraw = () => { const v = b.querySelector('#fin-frase')?.value; api.refresh(); const fr = b.querySelector('#fin-frase'); if (fr && v) { fr.value = v; showParsed(); } };
        P.$$('[data-kind]', b).forEach(x => x.onclick = () => { keep(); tx.kind = x.dataset.kind; tx.categoryId = ''; redraw(); });
        P.$$('[data-m]', b).forEach(x => x.onclick = () => { keep(); tx.method = x.dataset.m; redraw(); });
        P.$$('[data-parc]', b).forEach(x => x.onclick = () => { keep(); tx.n = x.dataset.parc === '1' ? 1 : Math.max(2, tx.n || 2); redraw(); });
        P.$$('[data-first]', b).forEach(x => x.onclick = () => { keep(); tx.firstPaid = x.dataset.first === '1'; redraw(); });
        const on = (name, fn) => { const el = f.querySelector(`[name="${name}"]`); if (el) el.addEventListener('change', fn); };
        on('n', () => { keep(); redraw(); });
        // valor mudou numa compra parcelada/no cartão: atualiza a prévia sem tirar você do campo em que está
        on('amount', () => { if (!(tx.method === 'credito' || (tx.n || 1) > 1)) return; setTimeout(() => {
          const a = document.activeElement, nm = a && b.contains(a) ? a.getAttribute('name') || a.id : null, pos = a && 'selectionStart' in a ? a.selectionStart : null;
          keep(); redraw();
          const el = nm && (b.querySelector(`[name="${nm}"]`) || b.querySelector('#' + nm)); if (el) { el.focus(); try { if (pos !== null) el.setSelectionRange(pos, pos); } catch (e) {} }
        }, 0); });
        on('firstMonth', () => { tx.monthTouched = true; keep(); redraw(); });
        on('cardId', () => {
          const sel = f.querySelector('[name="cardId"]');
          if (sel.value !== '__new') { keep(); tx.monthTouched = false; redraw(); return; }
          const name = prompt('Nome do cartão (ex.: Nubank crédito):');
          keep();
          if (name && name.trim()) { const c = F.save('fin_conta', { name: name.trim(), type: 'cartao', inAvailable: false, opening: 0, openingSet: true, openingDate: today, order: 9 }, `Criou o cartão “${name.trim()}”`); tx.cardId = c.id; tx.monthTouched = false; }
          redraw();
        });
        P.$$('[data-s]', b).forEach(x => x.onclick = () => { keep(); tx.status = x.dataset.s; redraw(); });
        f.date.onchange = () => { keep(); if (!tx.monthTouched && tx.method === 'credito') redraw(); if (!existing && tx.date > today && tx.status === 'realizado' && tx.method !== 'credito' && (tx.n || 1) === 1) { tx.status = 'previsto'; redraw(); } };
        const ds = b.querySelector('[data-discard]');
        if (ds) ds.onclick = () => { dropDraft(); restored = false; tx = { kind: 'despesa', date: today, status: 'realizado', certainty: 'confirmado', method: 'debito', accountId: F.accounts()[0]?.id || '', n: 1, firstPaid: true }; parsed = null; api.refresh(); };
        if (useDraft) { const sd = P.debounce(() => { if (!b.isConnected) return; keep(); saveDraft(); }, 400); b.addEventListener('input', sd); b.addEventListener('click', sd); }

        const out = b.querySelector('#fin-frase-out');
        const showParsed = () => {
          if (!parsed || !out) return;
          const bits = [F.KINDS[parsed.kind], parsed.amount ? C.formatMoney(parsed.amount) : null, parsed.desc || null,
            parsed.categoryKey ? F.cat('cat-' + parsed.categoryKey)?.name : null, parsed.method ? F.METHODS[parsed.method] : null, parsed.installments > 1 ? `${parsed.installments}×` : null,
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
          tx.status = parsed.date > today && parsed.method !== 'credito' ? 'previsto' : 'realizado';
          tx.categoryId = parsed.categoryKey ? 'cat-' + parsed.categoryKey : '';
          if (parsed.method) tx.method = parsed.method;
          if (parsed.installments) tx.n = parsed.installments;
          if (parsed.person) tx.notes = tx.notes || `Para ${parsed.person}`;
          redraw();
          const fr2 = b.querySelector('#fin-frase'); fr2.focus(); fr2.setSelectionRange(fr2.value.length, fr2.value.length);
        }, 350);

        f.onsubmit = async e => {
          e.preventDefault(); keep();
          const err = msg => { const p = b.querySelector('.form-error'); p.textContent = msg; p.hidden = false; };
          if (!Number.isInteger(tx.amount) || tx.amount <= 0) return err('Informe um valor maior que zero, por exemplo 50,48.');
          if (!tx.desc?.trim()) return err('Escreva uma descrição curta.');
          if (!tx.date) return err('Escolha a data.');
          const n = tx.n || 1;
          if (!existing && tx.kind === 'despesa' && (tx.method === 'credito' || n > 1)) {
            if (!tx.categoryId) return err('Escolha a categoria.');
            const base = { desc: tx.desc.trim(), total: tx.amount, n, purchaseDate: tx.date, categoryId: tx.categoryId || null, notes: tx.notes || '', paidBefore: 0 };
            let parc, extra = null;
            if (tx.method === 'credito') {
              let cardId = tx.cardId;
              if (!F.cards().length) { const name = (tx.newCard || '').trim(); if (!name) return err('Escreva o nome do cartão.'); cardId = F.save('fin_conta', { name, type: 'cartao', inAvailable: false, opening: 0, openingSet: true, openingDate: today, order: 9 }, `Criou o cartão “${name}”`).id; }
              if (!cardId || !F.acc(cardId)) return err('Escolha o cartão.');
              if (!/^\d{4}-\d{2}$/.test(tx.firstMonth || '')) return err('Escolha o mês da primeira fatura.');
              parc = F.save('fin_parc', { ...base, type: 'cartao', accountId: cardId, firstMonth: tx.firstMonth }, `Compra no cartão “${base.desc}” (${C.formatMoney(base.total)}${n > 1 ? ` em ${n}×` : ''})`);
            } else {
              if (!tx.accountId) return err('Escolha a conta.');
              const day = Number(tx.date.slice(8, 10));
              const firstMonth = tx.firstPaid ? tx.date.slice(0, 7) : C.addMonths(tx.date.slice(0, 7), 1);
              parc = F.save('fin_parc', { ...base, type: 'carne', accountId: tx.accountId, method: tx.method, day, firstMonth }, `Compra parcelada no ${F.METHODS[tx.method].toLowerCase()} “${base.desc}” (${C.formatMoney(base.total)} em ${n}×)`);
              if (tx.firstPaid) {
                const first = C.installments(parc)[0];
                extra = F.save('fin_lanc', { id: `parc-${parc.id}-1`, kind: 'despesa', desc: `${base.desc} — parcela 1/${n}`, amount: first.amount, date: tx.date, paidDate: tx.date, status: 'realizado', certainty: 'confirmado', method: tx.method, accountId: tx.accountId, categoryId: tx.categoryId, parcId: parc.id, parcNum: 1, origin: 'parcelamento' }, `Pagou “${base.desc}” — parcela 1/${n}`);
              }
              F.ensureParcOccurrences(tx.date, C.addMonths(tx.date.slice(0, 7), n + 1) + '-28');
            }
            dropDraft(); api.close();
            const sch = C.installments(parc);
            const msg = tx.method === 'credito'
              ? (n > 1 ? `${n}× ${C.formatMoney(sch[0].amount)} no cartão, a 1ª na fatura de ${ymTxt(parc.firstMonth)}.` : `No cartão, na fatura de ${ymTxt(parc.firstMonth)}.`)
              : `${n}× ${C.formatMoney(sch[0].amount)} no ${F.METHODS[tx.method].toLowerCase()}${tx.firstPaid ? ', 1ª já paga' : ''}. As outras viram contas a pagar.`;
            P.toast(msg, { undo: () => { F.txs().filter(t => t.parcId === parc.id).forEach(t => S.remove('fin_lanc', t.id)); if (extra) S.remove('fin_lanc', extra.id); F.save('fin_parc', { ...parc, canceled: true }, `Desfez a compra “${parc.desc}”`); S.remove('fin_parc', parc.id); } });
            return;
          }
          if (!tx.accountId) return err('Escolha a conta.');
          if (tx.kind === 'transferencia') {
            if (!tx.toAccountId) return err('Escolha a conta de destino.');
            if (tx.toAccountId === tx.accountId) return err('A conta de destino precisa ser diferente da de origem.');
          } else if (!tx.categoryId) return err('Escolha a categoria.');
          const rec = { ...tx, desc: tx.desc.trim(), origin: existing ? tx.origin : (parsed ? 'frase' : 'manual') };
          ['n', 'cardId', 'firstPaid', 'firstMonth', 'monthTouched', 'newCard'].forEach(k => delete rec[k]);
          if (rec.kind === 'transferencia') { delete rec.categoryId; rec.method = 'transferencia'; } else delete rec.toAccountId;
          if (rec.kind === 'receita') rec.method = 'transferencia';
          if (rec.status === 'realizado' && !rec.paidDate) rec.paidDate = rec.date;
          if (existing?.autoInvoice && rec.amount !== existing.amount) rec.manualAmount = true;
          if (!existing && rec.kind === 'receita' && rec.categoryId === 'cat-salario' && rec.status === 'realizado') {
            const planned = F.txs().find(t => t.kind === 'receita' && t.categoryId === 'cat-salario' && t.status === 'previsto' && Math.abs(C.diffDays(t.date, rec.date)) <= 12);
            if (planned) { rec.id = planned.id; rec.createdAt = planned.createdAt; }
          }
          if (!existing && !rec.id) {
            const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const same = t => t.kind === rec.kind && t.amount === rec.amount && t.status !== 'cancelado' && (norm(t.desc) === norm(rec.desc) || (rec.categoryId && t.categoryId === rec.categoryId));
            // já existe uma conta pendente igual? em vez de lançar outra, marca ela como paga
            const pend = rec.kind === 'despesa' && rec.status === 'realizado' && F.txs().find(t => same(t) && t.status === 'previsto' && !t.envelope && Math.abs(C.diffDays(t.date, rec.date)) <= 31);
            if (pend) {
              const ch = await P.choose(`Você tem “${pend.desc}” de ${C.formatMoney(pend.amount)} pendente${pend.noDue ? '' : ` para ${F.date(pend.date)}`}. É esse pagamento?`, [
                { label: 'Sim, marcar como paga', value: 'pay', primary: true }, { label: 'Não, é outro gasto', value: 'new' }]);
              if (!ch) return;
              if (ch === 'pay') {
                const before = { ...pend };
                F.save('fin_lanc', { ...pend, amount: rec.amount, paidDate: rec.date, status: 'realizado', certainty: 'confirmado', accountId: rec.accountId, method: rec.method }, `Pagou “${pend.desc}” (${C.formatMoney(rec.amount)})`);
                dropDraft(); api.close();
                P.toast(F.parcToast(pend) || `“${pend.desc}” marcada como paga.`, { undo: () => F.save('fin_lanc', before, `Desfez o pagamento de “${pend.desc}”`) });
                return;
              }
            }
            // mesmo valor, mesmo gasto, em até 1 dia: pode ser repetido
            const dup = F.txs().find(t => same(t) && t.status === rec.status && Math.abs(C.diffDays(t.date, rec.date)) <= 1);
            if (dup && !(await P.ask(`Já tem “${dup.desc}” de ${C.formatMoney(dup.amount)} em ${F.date(dup.date)}. Lançar outro igual?`, 'Lançar mesmo assim', false))) return;
          }
          const before = rec.id ? { ...(S.raw().fin_lanc[rec.id] || {}) } : null;
          const saved = F.save('fin_lanc', rec, existing ? `Editou “${rec.desc}”` : `Lançou “${rec.desc}” (${C.formatMoney(rec.amount)})`);
          dropDraft(); api.close();
          const undo = before && before.id
            ? () => F.save('fin_lanc', before, `Desfez a alteração em “${before.desc}”`)
            : () => { F.save('fin_lanc', { ...saved, status: 'cancelado' }, `Desfez o lançamento “${saved.desc}”`); S.remove('fin_lanc', saved.id); };
          P.toast(existing ? 'Lançamento salvo.' : impactToast(), { undo });
          // salário caiu e o ciclo ainda é só projetado → oferece montar o plano
          const snap = F.snap();
          if (!existing && saved.kind === 'receita' && saved.categoryId === 'cat-salario' && saved.status === 'realizado') {
            const early = C.earlyCycle(saved.date, F.cycles(), F.profile());
            const has = F.cycles().some(c => c.start <= saved.date && saved.date <= c.end && c.plannedAt);
            if (early) setTimeout(() => F.earlyCycle({ txId: saved.id }), 350);
            else if (!has) setTimeout(() => F.plan(saved.date, saved.id), 350);
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
          ${t.autoInvoice && t.status === 'previsto' ? `<p class="hint">${t.manualAmount ? 'Você ajustou o valor desta fatura, então o app não muda mais sozinho.' : 'O valor é a soma das parcelas que estão no app. Quando a fatura chegar, toque em Editar e coloque o valor real (compras fora do app entram aí).'}</p>` : ''}
          ${t.envelope && t.status === 'previsto' ? '<p class="hint">Não precisa pagar este item. Cada compra que você lançar na categoria dele, dentro do ciclo, desconta daqui. Se passar do teto, o excesso aparece no total do ciclo.</p>' : ''}
          <dl class="info">
            <div><dt>${t.status === 'previsto' ? 'Vencimento' : 'Data'}</dt><dd>${t.noDue && t.status === 'previsto' ? 'sem data definida (até ' + F.date(t.date) + ')' : F.date(t.date)}</dd></div>
            ${t.envelope ? `<div><dt>Teto do ciclo</dt><dd>usado ${F.money(C.envUsed(t, F.txs()))} de ${F.money(t.amount)}</dd></div>` : ''}
            ${parcInfo(t)}
            ${t.autoInvoice ? (() => { const parts = C.invoiceParts(t.cardId, t.invoiceMonth, F.parcs(), F.txs()); return `<div><dt>Parcelas nesta fatura</dt><dd>${parts.length ? parts.map(x => `${esc(x.desc)} ${x.n}/${x.of} (${F.money(x.amount)})`).join(' · ') : 'nenhuma'}</dd></div>`; })() : ''}
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
        on('[data-cancel]', () => {
          const before = { ...t };
          F.save('fin_lanc', { ...t, status: 'cancelado' }, `Cancelou “${t.desc}”`); api.close();
          P.toast('Lançamento cancelado.', { undo: () => F.save('fin_lanc', before, `Desfez o cancelamento de “${t.desc}”`) });
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
          const before = { ...t };
          api.close(); P.toast(F.parcToast({ ...t }) || impactToast(), { undo: () => F.save('fin_lanc', before, `Desfez o pagamento de “${t.desc}”`) });
        };
      }
    });
  };

  /* ============================================================
     PLANO DO CICLO
  ============================================================ */
  F.plan = (start, salaryTxId = null, nextPayOverride = null) => {
    let reserve = F.profile().reserve || 0, blockDays = F.blockDaysPref();
    const prev = F.cycles().find(c => c.start === start);
    if (prev) reserve = prev.reserve || 0;
    P.sheet({
      title: 'Plano do ciclo', kicker: 'nada muda até você confirmar', wide: true,
      render: () => {
        const nextPay = nextPayOverride || C.nextPayday(start, F.profile());
        F.ensureOccurrences(start, C.addDays(nextPay, -1));
        const p = C.cyclePlan({ ...F.state(), profile: { ...F.profile(), blockDays } }, start, reserve, nextPay);
        const B = F.BLOCKS[blockDays];
        return `<p class="lede small">Ciclo de <b>${F.date(p.start)}</b> a <b>${F.date(p.end)}</b>. Próximo salário previsto: ${F.date(p.nextPay)}.</p>
          <div class="calc-table">
            <div><span>Saldo hoje nas contas do disponível</span><b>${F.money(p.available)}</b></div>
            <div><span>− Contas e compromissos até ${F.date(p.end)} (${p.commitments.length})</span><b>${F.money(-p.committed)}</b></div>
            <div class="calc-input"><span>− Reserva de segurança do ciclo</span><input id="plan-reserve" inputmode="decimal" value="${inMoney(p.reserve)}" class="money-input"></div>
            <div class="calc-total ${p.base < 0 ? 'bad' : ''}"><span>= Livre para o dia a dia</span><b>${F.money(p.base)}</b></div>
          </div>
          ${p.commitments.length ? `<details class="done-today"><summary>${p.commitments.length === 1 ? 'Ver o compromisso' : `Ver os ${p.commitments.length} compromissos`}</summary><div class="list">${p.commitments.map(t => `<div class="row fin-row"><span class="row-main as-text"><span class="row-title">${esc(t.desc)}</span><span class="row-meta">${F.date(t.date)}${t.certainty === 'estimado' ? ' · estimado' : ''}</span></span><span class="fin-amt">${F.money(t.remaining ?? t.amount)}</span></div>`).join('')}</div></details>` : '<p class="faint small">Nenhuma conta prevista no período. Cadastre suas contas fixas em Ajustes → Finanças → Contas fixas.</p>'}
          <div class="block-head sub"><h3>Como dividir o dinheiro do dia a dia</h3></div>
          <div class="chips compact">${[7, 14, 0].map(k => `<button type="button" class="chip ${blockDays === k ? 'on' : ''}" data-block="${k}">${k === 7 ? 'Por semana' : k === 14 ? 'Por quinzena' : 'Ciclo inteiro'}</button>`).join('')}</div>
          <p class="hint">${B.desc}. ${blockDays ? 'Proporcional aos dias.' : 'Um limite só para gastar até o próximo salário.'}</p>
          <div class="weeks-preview">${p.weeks.map(w => `<div><span>${w.label}</span><small>${F.date(w.start)}–${F.date(w.end)} · ${w.days} dia${w.days > 1 ? 's' : ''}</small><b>${F.money(w.limit)}</b></div>`).join('')}</div>
          ${blockDays ? `<p class="hint">Depois você pode mudar e travar o limite de cada ${B.one} em Orçamento → Editar ${B.many}.</p>` : ''}
          ${p.base < 0 ? `<div class="notice">O dinheiro de agora não cobre as contas até o próximo salário. Faltam ${F.money(-p.base)}. Dá para começar mesmo assim e acompanhar pelo painel.</div>` : ''}
          <div class="form-actions"><button class="btn ghost" type="button" data-cancel>Agora não</button><button class="btn primary" type="button" data-go>${prev?.plannedAt ? 'Refazer o plano' : 'Começar o ciclo'}</button></div>`;
      },
      mount: api => {
        const b = api.body;
        const r = b.querySelector('#plan-reserve');
        r.onchange = () => { const v = C.parseMoney(r.value); if (v !== null && v >= 0) { reserve = v; api.refresh(); } };
        P.$$('[data-block]', b).forEach(x => x.onclick = () => { const v = C.parseMoney(r.value); if (v !== null && v >= 0) reserve = v; blockDays = +x.dataset.block; api.refresh(); });
        b.querySelector('[data-cancel]').onclick = () => api.close();
        b.querySelector('[data-go]').onclick = () => {
          const v = C.parseMoney(r.value); if (v !== null && v >= 0) reserve = v;
          if (blockDays !== F.blockDaysPref()) F.setProfile({ blockDays });
          const p = C.cyclePlan({ ...F.state(), profile: { ...F.profile(), blockDays } }, start, reserve, nextPayOverride || undefined);
          F.save('fin_ciclo', { ...(prev || {}), id: 'ciclo-' + start, start: p.start, end: p.end, salaryTxId, available: p.available, committed: p.committed, reserve: p.reserve, base: p.base, weeks: p.weeks.map(w => ({ start: w.start, end: w.end, days: w.days, label: w.label, limit: w.limit, locked: false })), plannedAt: P.today() },
            `${prev?.plannedAt ? 'Refez o plano do' : 'Começou o'} ciclo ${F.date(p.start)}–${F.date(p.end)}`);
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
      <div class="list">${F.cats(k).map(c => `<div class="row"><span class="row-main as-text"><span class="row-title">${esc(c.name)}</span>${k === 'despesa' ? `<span class="row-meta">${c.weekly !== false ? 'entra no limite do dia a dia' : 'fora do limite do dia a dia'}</span>` : ''}</span>
        ${k === 'despesa' ? `<button class="btn ghost small" type="button" data-weekly="${c.id}">${c.weekly !== false ? 'Tirar do dia a dia' : 'Pôr no dia a dia'}</button>` : ''}
        ${c.custom ? `<button class="icon-btn small" type="button" data-arch="${c.id}" aria-label="Arquivar ${esc(c.name)}">✕</button>` : ''}</div>`).join('')}</div>`).join('') + `
      <form class="quick-add slim" data-newcat><input name="n" placeholder="Nova categoria" aria-label="Nova categoria"><select name="k" aria-label="Tipo"><option value="despesa">Despesa</option><option value="receita">Receita</option></select><button class="btn primary small" type="submit">Criar</button></form>
      <p class="hint">“Dia a dia” = gastos que contam no limite da semana, da quinzena ou do ciclo, conforme a sua escolha. Contas fixas (aluguel, academia, assinaturas) ficam fora, porque já entram no plano do ciclo.</p>`,
    mount: api => {
      const b = api.body;
      P.$$('[data-weekly]', b).forEach(x => x.onclick = () => { const c = F.cat(x.dataset.weekly); F.save('fin_cat', { ...c, weekly: c.weekly === false }, `${c.weekly === false ? 'Pôs' : 'Tirou'} ${c.name} ${c.weekly === false ? 'no' : 'do'} limite do dia a dia`); });
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
        ${field('Dia do salário', `<input name="payday" type="number" min="1" max="31" value="${p.payday}">`, 'Número do dia, ou qual dia útil (ex.: 5 = 5º dia útil).')}</div>
        ${field('Como o dia é contado', `<select name="paydayRule"><option value="util" ${p.paydayRule === 'util' ? 'selected' : ''}>É o Nº dia útil do mês (ex.: 5º dia útil)</option><option value="adia" ${p.paydayRule === 'adia' ? 'selected' : ''}>Dia fixo; adia se cair em fim de semana ou feriado</option><option value="antecipa" ${p.paydayRule === 'antecipa' ? 'selected' : ''}>Dia fixo; antecipa se cair em fim de semana ou feriado</option><option value="mantem" ${p.paydayRule === 'mantem' ? 'selected' : ''}>Dia fixo, sempre na mesma data</option></select>`, 'Feriados nacionais, Carnaval e Corpus Christi contam como dias sem banco.')}
        ${field('Como dividir o dinheiro do dia a dia', `<select name="blockDays">${[7, 14, 0].map(k => `<option value="${k}" ${F.blockDaysPref() === k ? 'selected' : ''}>${F.BLOCKS[k].desc}</option>`).join('')}</select>`, 'Vale a partir do próximo plano. Para mudar o ciclo atual, use Orçamento → Refazer plano.')}
        ${field('Reserva de segurança por ciclo', `<input name="reserve" inputmode="decimal" value="${inMoney(p.reserve)}" class="money-input">`, 'Valor que fica guardado e não entra no “posso gastar”. Pode ser 0.')}
        <div class="form-actions"><button class="btn primary" type="submit">Salvar</button></div></form>`,
      mount: api => {
        api.body.querySelector('form').onsubmit = e => {
          e.preventDefault(); const f = e.target;
          const income = C.parseMoney(f.income.value), reserve = C.parseMoney(f.reserve.value || '0'), payday = parseInt(f.payday.value, 10);
          if (income === null || reserve === null || !(payday >= 1 && payday <= (f.paydayRule.value === 'util' ? 22 : 31))) { P.toast('Confira os valores.'); return; }
          F.setProfile({ income, reserve, payday, paydayRule: f.paydayRule.value, blockDays: +f.blockDays.value });
          api.close(); P.toast('Perfil salvo.');
        };
      }
    });
  };

  F.securitySheet = () => P.sheet({
    title: 'Segurança', live: true,
    render: () => `<div class="sync-box"><div><span class="status-dot ok"></span><strong>PIN ativo neste aparelho</strong><small>O Financeiro+ pede o PIN uma vez quando você abre o app. Fechou o app ou tocou em Bloquear, pede de novo.</small></div></div>
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
  /* ============================================================
     COMPRA NO CARTÃO (parcelada ou à vista)
     Não é despesa do ciclo e não sai do saldo: as parcelas entram
     na fatura de cada mês. O que conta como despesa é só o
     pagamento da fatura. Assim nada é contado duas vezes.
  ============================================================ */
  const ymAdd = (ym, n) => C.addMonths(ym, n);
  const ymTxt = ym => { const [y, m] = ym.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]}/${y.slice(2)}`; };
  const firstInvoice = (date, card) => C.invoiceMonth(date, card);   // usa o fechamento/vencimento do cartão

  F.cardForm = (preset = {}, existing = null) => {
    const today = P.today();
    let cards = F.cards();
    let st = existing ? { ...existing } : { desc: preset.desc || '', total: preset.total ?? null, n: preset.n || 1, date: preset.date || today, accountId: cards[0]?.id || '', categoryId: preset.categoryId || '', firstMonth: null, notes: '' };
    if (!st.firstMonth) st.firstMonth = firstInvoice(st.date, F.acc(st.accountId));
    let monthTouched = !!existing;
    P.sheet({
      title: existing ? 'Editar compra no cartão' : 'Compra no cartão', kicker: 'Financeiro+', live: false,
      render: () => {
        const sched = Number.isInteger(st.total) && st.total > 0 && st.n >= 1 ? C.installments({ id: 'x', type: 'cartao', total: st.total, n: st.n, firstMonth: st.firstMonth }) : [];
        return `<form class="form" data-card>
          <div class="row-fields">${field('O que comprou', `<input name="desc" required value="${esc(st.desc || '')}" placeholder="ex.: Compra Tayná">`)}
          ${field('Valor total', `<input name="total" inputmode="decimal" class="money-input" required value="${inMoney(st.total)}" placeholder="0,00">`)}</div>
          <div class="row-fields">${field('Parcelas', `<select name="n">${Array.from({ length: 24 }, (_, i) => i + 1).map(k => `<option value="${k}" ${st.n === k ? 'selected' : ''}>${k === 1 ? 'À vista (1×)' : k + '×'}</option>`).join('')}</select>`)}
          ${field('Data da compra', `<input type="date" name="date" value="${st.date}">`)}</div>
          <div class="row-fields">${field('Cartão', cards.length ? `<select name="accountId">${cards.map(c => `<option value="${c.id}" ${c.id === st.accountId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ Outro cartão…</option></select>` : `<input name="newCard" placeholder="ex.: Caixa crédito" value="Caixa crédito">`, cards.length ? '' : 'Vou criar esse cartão. Só o nome, nada de número ou senha.')}
          ${field('Primeira parcela na fatura de', `<input type="month" name="firstMonth" value="${st.firstMonth}">`, (F.acc(st.accountId)?.closingDay ? `Calculado pelo fechamento (dia ${F.acc(st.accountId).closingDay}) e vencimento (dia ${F.acc(st.accountId).dueDay || '?'}) do cartão.` : 'Cadastre o fechamento e o vencimento em Ajustes → Finanças → Cartões para o app acertar sozinho.'))}</div>
          ${field('Categoria', `<select name="categoryId">${catOptions('despesa', st.categoryId)}</select>`)}
          ${field('Observação', `<input name="notes" value="${esc(st.notes || '')}" placeholder="opcional, ex.: sem juros">`)}
          ${sched.length ? `<div class="weeks-preview">${sched.map(i => `<div><span>Parcela ${i.n}/${st.n}</span><small>fatura de ${ymTxt(i.month)}</small><b>${F.money(i.amount)}</b></div>`).join('')}</div>
            <p class="hint">Não conta como gasto deste ciclo e não sai do saldo. Cada parcela aparece em Orçamento → Cartão · parcelas futuras. A despesa entra quando você pagar a fatura.</p>` : ''}
          <p class="form-error" hidden></p>
          <div class="form-actions split">${existing ? '<button class="btn ghost danger-t" type="button" data-del>Cancelar compra</button>' : ''}<span class="grow"></span><button class="btn primary" type="submit">${existing ? 'Salvar' : 'Cadastrar compra'}</button></div>
        </form>`;
      },
      mount: api => {
        const b = api.body, f = b.querySelector('form');
        const keep = () => {
          const fd = new FormData(f);
          st = { ...st, desc: fd.get('desc'), total: C.parseMoney(fd.get('total')), n: +fd.get('n'), date: fd.get('date'), categoryId: fd.get('categoryId'), notes: fd.get('notes'), firstMonth: fd.get('firstMonth') || st.firstMonth };
          if (fd.has('accountId') && fd.get('accountId') !== st.accountId) { st.accountId = fd.get('accountId'); if (!monthTouched) st.firstMonth = firstInvoice(st.date, F.acc(st.accountId)); }
          if (fd.has('newCard')) st.newCard = fd.get('newCard');
        };
        const redraw = () => setTimeout(() => api.refresh(), 0);
        f.n.onchange = () => { keep(); redraw(); };
        f.total.onchange = () => { keep(); redraw(); };
        f.firstMonth.onchange = () => { monthTouched = true; keep(); redraw(); };
        f.date.onchange = () => { keep(); if (!monthTouched) st.firstMonth = firstInvoice(st.date, F.acc(st.accountId)); redraw(); };
        if (f.accountId) f.accountId.onchange = async () => {
          if (f.accountId.value !== '__new') { keep(); redraw(); return; }
          const name = prompt('Nome do cartão (ex.: Nubank crédito):');
          if (name && name.trim()) {
            const c = F.save('fin_conta', { name: name.trim(), type: 'cartao', inAvailable: false, opening: 0, openingSet: true, openingDate: today, order: 9 }, `Criou o cartão “${name.trim()}”`);
            cards = F.cards(); keep(); st.accountId = c.id;
          } else keep();
          redraw();
        };
        const del = b.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!(await P.ask(`Cancelar a compra “${existing.desc}”? As parcelas saem das faturas futuras, mas ficam no histórico.`, 'Cancelar compra'))) return;
          F.save('fin_parc', { ...existing, canceled: true }, `Cancelou a compra no cartão “${existing.desc}”`); api.close(); P.toast('Compra cancelada.');
        };
        f.onsubmit = e => {
          e.preventDefault(); keep();
          const err = m => { const p = b.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
          if (!st.desc?.trim()) return err('Escreva o que comprou.');
          if (!Number.isInteger(st.total) || st.total <= 0) return err('Informe o valor total, por exemplo 284,70.');
          if (!/^\d{4}-\d{2}$/.test(st.firstMonth || '')) return err('Escolha o mês da primeira fatura.');
          let accountId = st.accountId;
          if (!cards.length) {
            const name = (st.newCard || '').trim(); if (!name) return err('Dê um nome ao cartão.');
            accountId = F.save('fin_conta', { name, type: 'cartao', inAvailable: false, opening: 0, openingSet: true, openingDate: today, order: 9 }, `Criou o cartão “${name}”`).id;
          }
          if (!accountId || accountId === '__new') return err('Escolha o cartão.');
          const rec = { ...(existing || {}), type: 'cartao', desc: st.desc.trim(), total: st.total, n: st.n, firstMonth: st.firstMonth, purchaseDate: st.date, accountId, categoryId: st.categoryId || null, notes: st.notes || '', paidBefore: 0 };
          const sched = C.installments({ ...rec, id: 'x' });
          F.save('fin_parc', rec, existing ? `Editou a compra no cartão “${rec.desc}”` : `Compra no cartão “${rec.desc}” (${C.formatMoney(rec.total)} em ${rec.n}×)`);
          api.close();
          P.toast(rec.n > 1 ? `${rec.n}× ${C.formatMoney(sched[0].amount)}, a 1ª na fatura de ${ymTxt(rec.firstMonth)}. Não conta como gasto deste ciclo.` : `Na fatura de ${ymTxt(rec.firstMonth)}. Não conta como gasto deste ciclo.`);
        };
      }
    });
  };

  F.cardList = () => P.sheet({
    title: 'Compras no cartão', kicker: 'parceladas e à vista', live: true,
    render: () => {
      const list = F.parcs().filter(p => p.type === 'cartao' && !p.deleted).sort((a, b) => (b.purchaseDate || b.firstMonth).localeCompare(a.purchaseDate || a.firstMonth));
      const now = P.today().slice(0, 7);
      return `${list.length ? `<div class="list">${list.map(p => {
        const sch = C.installments(p), left = sch.filter(i => i.month >= now), card = F.acc(p.accountId);
        return `<button type="button" class="row as-btn fin-row ${p.canceled ? 'st-row-cancelado' : ''}" data-p="${p.id}"><span class="row-main as-text"><span class="row-title">${esc(p.desc)}</span>
          <span class="row-meta">${card ? esc(card.name) + ' · ' : ''}${p.n}× ${F.money(sch[0]?.amount)} · ${ymTxt(sch[0].month)} a ${ymTxt(sch[sch.length - 1].month)}${p.canceled ? ' · <b class="st-cancelado">cancelada</b>' : left.length ? ` · faltam ${left.length} (${F.money(left.reduce((a, i) => a + i.amount, 0))})` : ' · quitada'}</span></span>
          <span class="fin-amt ${p.canceled ? 'cancel' : ''}">${F.money(p.total)}</span></button>`; }).join('')}</div>`
        : '<div class="empty"><strong>Nenhuma compra no cartão ainda.</strong><span>Cadastre aqui as compras parceladas para ver quanto já está comprometido nas próximas faturas.</span></div>'}
        <div class="form-actions"><button class="btn primary" type="button" data-new>+ Compra no cartão</button></div>`;
    },
    mount: api => {
      api.body.querySelector('[data-new]').onclick = () => { api.close(); setTimeout(() => F.cardForm(), 220); };
      P.$$('[data-p]', api.body).forEach(x => x.onclick = () => { api.close(); setTimeout(() => F.cardForm({}, F.parc(x.dataset.p)), 220); });
    }
  });
  /* ============================================================
     CARTÕES (fechamento e vencimento)
  ============================================================ */
  F.cardsSheet = () => P.sheet({
    title: 'Cartões', kicker: 'fechamento e vencimento', live: true,
    render: () => `${F.cards().length ? `<div class="list">${F.cards().map(c => `<button type="button" class="row as-btn" data-c="${c.id}"><span class="row-main as-text"><span class="row-title">${esc(c.name)}</span>
        <span class="row-meta">${c.closingDay ? `fecha dia ${c.closingDay} · vence dia ${c.dueDay || '?'}` : '<b class="st-pendente">falta o fechamento e o vencimento</b>'}</span></span></button>`).join('')}</div>`
      : '<div class="empty"><strong>Nenhum cartão ainda.</strong><span>Cadastre só o nome e os dias. Nada de número do cartão ou senha.</span></div>'}
      <p class="hint">Com o vencimento, cada fatura vira uma conta a pagar no ciclo certo, com a soma das parcelas que estão no app. O limite do cartão nunca conta como dinheiro.</p>
      <div class="form-actions"><button class="btn primary" type="button" data-new>+ Cartão</button></div>`,
    mount: api => {
      api.body.querySelector('[data-new]').onclick = () => F.cardCfgForm();
      P.$$('[data-c]', api.body).forEach(x => x.onclick = () => F.cardCfgForm(F.acc(x.dataset.c)));
    }
  });
  F.cardCfgForm = (card = null) => P.sheet({
    title: card ? card.name : 'Novo cartão', kicker: 'cartão de crédito',
    render: () => `<form class="form">
      ${field('Nome', `<input name="name" required value="${esc(card?.name || '')}" placeholder="ex.: Caixa crédito">`)}
      <div class="row-fields">${field('Dia do fechamento', `<input name="closingDay" type="number" min="1" max="31" value="${card?.closingDay || ''}" placeholder="ex.: 3">`, 'Compras a partir desse dia vão para a fatura seguinte.')}
      ${field('Dia do vencimento', `<input name="dueDay" type="number" min="1" max="31" value="${card?.dueDay || ''}" placeholder="ex.: 10">`, 'Dia em que você paga a fatura.')}</div>
      <div class="row-fields">${field('Limite total', `<input name="limit" inputmode="decimal" class="money-input" value="${card?.limit ? inMoney(card.limit) : ''}" placeholder="opcional, ex.: 2.000,00">`, 'Para mostrar quanto ainda está disponível.')}
      ${field('Meta de fatura por mês', `<input name="target" inputmode="decimal" class="money-input" value="${card?.target ? inMoney(card.target) : ''}" placeholder="opcional, ex.: 800,00">`, 'Quanto você quer gastar no máximo por fatura.')}</div>
      <p class="form-error" hidden></p>
      <div class="form-actions"><button class="btn primary" type="submit">Salvar</button></div></form>`,
    mount: api => {
      api.body.querySelector('form').onsubmit = e => {
        e.preventDefault(); const f = e.target;
        const err = m => { const p = api.body.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
        const name = f.name.value.trim(), cd = parseInt(f.closingDay.value, 10), dd = parseInt(f.dueDay.value, 10);
        if (!name) return err('Dê um nome ao cartão.');
        if (f.closingDay.value && !(cd >= 1 && cd <= 31)) return err('O fechamento é um dia entre 1 e 31.');
        if (f.dueDay.value && !(dd >= 1 && dd <= 31)) return err('O vencimento é um dia entre 1 e 31.');
        if ((cd && !dd) || (!cd && dd)) return err('Preencha os dois dias, fechamento e vencimento.');
        F.save('fin_conta', { ...(card || { type: 'cartao', inAvailable: false, opening: 0, openingSet: true, openingDate: P.today(), order: 9 }), name, closingDay: cd || null, dueDay: dd || null, limit: C.parseMoney(f.limit.value) || null, target: C.parseMoney(f.target.value) || null }, card ? `Alterou o cartão “${name}”` : `Criou o cartão “${name}”`);
        api.close(); P.toast(cd ? `${name}: fecha dia ${cd}, vence dia ${dd}.` : 'Cartão salvo.');
      };
    }
  });

  /* ============================================================
     SEMANAS: editar limites e decidir o que fazer quando passar
  ============================================================ */
  const curCycleRec = () => { const c = F.snap().cycle; return c.id ? S.get('fin_ciclo', c.id) : null; };
  F.weeksSheet = () => {
    const cyc = curCycleRec(); if (!cyc) return P.toast('Os limites aparecem depois que você confirma o plano do ciclo.');
    const B = F.blk(cyc.weeks);
    const today = P.today(), spent = F.snap().weeks.map(w => w.spent);
    let draft = cyc.weeks.map(w => ({ ...w })), changes = {}, msg = '';
    P.sheet({
      title: `Editar ${B.many}`, kicker: `livre para o dia a dia: ${F.money(cyc.base)}`, wide: true,
      render: () => {
        const sum = draft.reduce((a, w) => a + w.limit, 0);
        return `<p class="lede">Mude o limite de um${B.a === 'a' ? 'a' : ''} ${B.one} e ${B.a === 'a' ? 'as' : 'os'} ${B.many} sem cadeado se ajustam sozinh${B.a === 'a' ? 'as' : 'os'} para a soma continuar ${F.money(cyc.base)}. Nada é salvo até você confirmar.</p>
        <div class="wk-edit">${draft.map((w, i) => { const past = w.end < today; return `<div class="wk-edit-row ${past ? 'past' : ''}">
          <div><b>${w.label}</b><small>${F.date(w.start)}–${F.date(w.end)} · gasto ${F.money(spent[i] || 0)}</small></div>
          <input class="money-input" data-w="${i}" inputmode="decimal" value="${inMoney(w.limit)}" ${past ? 'disabled' : ''} aria-label="Limite da ${w.label}">
          <label class="check-line small"><input type="checkbox" data-lock="${i}" ${w.locked ? 'checked' : ''} ${past ? 'disabled' : ''}> travar</label></div>`; }).join('')}</div>
        <div class="calc-table" style="margin-top:12px"><div class="calc-total ${sum !== cyc.base ? 'bad' : ''}"><span>Soma ${B.a === 'a' ? 'das' : 'dos'} ${B.many}</span><b>${F.money(sum)} de ${F.money(cyc.base)}</b></div></div>
        ${msg ? `<p class="form-error">${esc(msg)}</p>` : ''}
        <div class="form-actions"><button class="btn ghost" type="button" data-reset>Dividir igual de novo</button><span class="grow"></span><button class="btn primary" type="button" data-save ${sum !== cyc.base ? 'disabled' : ''}>Salvar</button></div>`;
      },
      mount: api => {
        const b = api.body, again = () => setTimeout(() => api.refresh(), 0);
        P.$$('[data-w]', b).forEach(inp => inp.onchange = () => {
          const v = C.parseMoney(inp.value); const i = +inp.dataset.w;
          if (v === null || v < 0) { msg = 'Valor inválido.'; return again(); }
          changes[i] = v;
          const r = C.rebalanceWeeks(cyc.weeks.map((w, k) => ({ ...w, locked: draft[k].locked })), cyc.base, changes, today);
          msg = r.ok ? '' : r.reason === 'nao-cabe' ? `Não cabe: ${B.a === 'a' ? 'as outras' : 'os outros'} ${B.many} ficariam negativ${B.a === 'a' ? 'as' : 'os'} (faltam ${F.money(-r.rest)}).` : `Não sobrou ${B.one} sem cadeado para ajustar. Destrave alguma.`;
          if (r.ok) draft = r.weeks; else delete changes[i];
          again();
        });
        P.$$('[data-lock]', b).forEach(x => x.onchange = () => { draft[+x.dataset.lock].locked = x.checked; });
        b.querySelector('[data-reset]').onclick = () => {
          const fresh = C.splitWeeks(cyc.start, cyc.end, cyc.base, F.blockSize(cyc.weeks)); changes = {}; msg = '';
          // semanas que já passaram ficam como estavam; o resto se divide de novo
          const r = C.rebalanceWeeks(cyc.weeks.map((w, k) => ({ ...w, limit: w.end < today ? w.limit : fresh[k].limit, locked: false })), cyc.base, null, today);
          draft = r.weeks.map(w => ({ ...w, locked: false })); again();
        };
        b.querySelector('[data-save]').onclick = async () => {
          const lines = draft.map((w, i) => (w.limit !== cyc.weeks[i].limit ? `${w.label}: ${F.money(cyc.weeks[i].limit)} → ${F.money(w.limit)}` : null)).filter(Boolean);
          if (!lines.length && draft.every((w, i) => w.locked === cyc.weeks[i].locked)) { api.close(); return; }
          if (!(await P.ask(`Vou mudar o plano ${B.a === 'a' ? 'das' : 'dos'} ${B.many}:\n${lines.join('\n') || 'só os cadeados'}\nConfirma?`, 'Salvar', false))) return;
          F.save('fin_ciclo', { ...cyc, weeks: draft.map(({ spent: _s, ...w }) => w) }, `Reorganizou ${B.a === 'a' ? 'as' : 'os'} ${B.many}: ${lines.join('; ') || 'cadeados'}`);
          api.close(); P.toast('Limites atualizados.');
        };
      }
    });
  };

  F.overSheet = idx => {
    const cyc = curCycleRec(); if (!cyc) return;
    const w = F.snap().weeks[idx], spent = w.spent, over = spent - w.limit, B = F.blk();
    const opts = (cyc.weeks.length > 1 ? ['proximas', 'reserva', 'manter'] : ['reserva', 'manter']).map(o => ({ o, r: C.coverOverspend(cyc, idx, spent, o) }));
    const TXT = {
      proximas: [`Tirar ${B.a === 'a' ? 'das próximas' : 'dos próximos'} ${B.many}`, r => r.ok ? `${B.a === 'a' ? 'As seguintes' : 'Os seguintes'} ficam com: ${r.cycle.weeks.slice(idx + 1).map(x => `${x.label} ${F.money(x.limit)}`).join(' · ')}.` : (!r.room ? `Não há ${B.many === 'ciclo' ? 'outro bloco' : B.many + ' seguintes'} para dividir o excesso.` : `Não dá: ${B.a === 'a' ? 'as próximas' : 'os próximos'} sem cadeado só têm ${F.money(r.room)}.`)],
      reserva: ['Usar a reserva do ciclo', r => r.ok ? `A reserva fica com ${F.money(r.cycle.reserve)} (era ${F.money(cyc.reserve)}).` : `A reserva tem ${F.money(cyc.reserve || 0)} e não cobre ${F.money(over)}.`],
      manter: ['Deixar como está', () => 'Os números não mudam. O aviso some e o excesso fica registrado.']
    };
    P.sheet({
      title: `${w.label} passou ${F.money(over)}`, kicker: `gasto ${F.money(spent)} de ${F.money(w.limit)}`,
      render: () => `<p class="lede">Acontece. Escolha o que fazer com esse excesso. Nada muda sem você escolher.</p>
        <div class="data-actions">${opts.map(({ o, r }) => `<button type="button" class="data-btn" data-o="${o}" ${r.ok ? '' : 'disabled'}><strong>${TXT[o][0]}</strong><small>${esc(TXT[o][1](r))}</small></button>`).join('')}</div>`,
      mount: api => P.$$('[data-o]', api.body).forEach(x => x.onclick = () => {
        const { r } = opts.find(y => y.o === x.dataset.o); if (!r.ok) return;
        F.save('fin_ciclo', { ...r.cycle, weeks: r.cycle.weeks.map(({ spent: _s, ...k }) => k) }, `${w.label} passou ${C.formatMoney(over)}: ${TXT[x.dataset.o][0].toLowerCase()}`);
        api.close(); P.toast('Plano do ciclo atualizado.');
      })
    });
  };
  /* ============================================================
     SALÁRIO ADIANTADO → iniciar o ciclo novo antes da data
  ============================================================ */
  F.earlyCycle = (opts = {}) => {
    const prof = F.profile(), today = P.today();
    const planned = F.txs().find(t => t.kind === 'receita' && t.categoryId === 'cat-salario' && t.status === 'previsto' && Math.abs(C.diffDays(t.date, today)) <= 15);
    const given = opts.txId ? S.get('fin_lanc', opts.txId) : null;
    let st = { date: given?.paidDate || given?.date || today, amount: given?.amount ?? planned?.amount ?? prof.income, accountId: given?.accountId || F.accounts()[0]?.id || '' };
    P.sheet({
      title: 'Recebi o salário antes', kicker: 'iniciar novo ciclo', live: false,
      render: () => {
        const e = C.earlyCycle(st.date, F.cycles(), prof);
        return `<form class="form" data-early>
          ${given ? `<p class="lede">Salário de ${F.money(given.amount)} lançado em ${F.date(st.date)}.</p>` : `<div class="row-fields">
            ${field('Dia em que caiu', `<input type="date" name="date" value="${st.date}" max="${today}">`)}
            ${field('Valor que entrou', `<input name="amount" inputmode="decimal" class="money-input" value="${inMoney(st.amount)}">`, planned ? `O salário previsto (${F.money(planned.amount)} em ${F.date(planned.date)}) vira este, sem duplicar.` : '')}</div>
            ${field('Conta', `<select name="accountId">${accOptions(st.accountId)}</select>`)}`}
          ${e ? `<div class="calc-table">
              <div><span>Ciclo atual (${F.date(e.current.start)} a ${F.date(e.current.end)})</span><b>fecha em ${F.date(e.closeOn)}</b></div>
              <div class="calc-total"><span>Ciclo novo</span><b>${F.date(e.start)} a ${F.date(e.end)}</b></div>
            </div>
            <p class="hint">O salário era esperado em ${F.date(e.scheduled)} e chegou ${e.daysEarly} dia${e.daysEarly === 1 ? '' : 's'} antes. O fim do ciclo novo continua sendo a véspera do próximo salário (${F.date(e.nextPay)}). As contas que vencem de ${F.date(e.start)} em diante passam a contar no ciclo novo. Depois você confirma o plano do ciclo.</p>`
          : `<div class="notice">Essa data não é um adiantamento: ${F.date(st.date)} ${C.cycleFor(st.date, F.cycles(), prof).start === st.date ? 'já é o início de um ciclo' : 'está longe do próximo salário previsto'}. Use Lançar normalmente.</div>`}
          <p class="form-error" hidden></p>
          <div class="form-actions"><button class="btn ghost" type="button" data-no>Agora não</button><button class="btn primary" type="submit" ${e ? '' : 'disabled'}>Iniciar novo ciclo</button></div>
        </form>`;
      },
      mount: api => {
        const f = api.body.querySelector('form');
        const keep = () => { if (f.date) st = { date: f.date.value || st.date, amount: C.parseMoney(f.amount.value) ?? st.amount, accountId: f.accountId.value }; };
        if (f.date) f.date.onchange = () => { keep(); setTimeout(() => api.refresh(), 0); };
        api.body.querySelector('[data-no]').onclick = () => api.close();
        f.onsubmit = e => {
          e.preventDefault(); keep();
          const err = m => { const p = api.body.querySelector('.form-error'); p.textContent = m; p.hidden = false; };
          const ec = C.earlyCycle(st.date, F.cycles(), prof); if (!ec) return err('Essa data não é um adiantamento.');
          if (!given && (!Number.isInteger(st.amount) || st.amount <= 0)) return err('Informe o valor que entrou.');
          // 1) salário: confirma o previsto (sem duplicar) ou lança um novo
          let txId = given?.id;
          if (!given) {
            const base = planned || { kind: 'receita', desc: 'Salário', categoryId: 'cat-salario', method: 'transferencia', origin: 'manual' };
            txId = F.save('fin_lanc', { ...base, amount: st.amount, date: st.date, paidDate: st.date, status: 'realizado', certainty: 'confirmado', accountId: st.accountId }, `Salário adiantado: recebeu ${C.formatMoney(st.amount)} em ${F.date(st.date)}`).id;
          }
          // 2) fecha o ciclo atual na véspera
          const cur = ec.current;
          const oldRec = cur.id ? S.get('fin_ciclo', cur.id) : null;
          F.save('fin_ciclo', { ...(oldRec || { id: 'ciclo-' + cur.start, start: cur.start, weeks: [], reserve: 0 }), end: ec.closeOn, weeks: (oldRec?.weeks || []).filter(w => w.start <= ec.closeOn).map(w => (w.end > ec.closeOn ? { ...w, end: ec.closeOn, days: C.diffDays(w.start, ec.closeOn) + 1 } : w)), closedEarly: true },
            `Fechou o ciclo ${F.date(cur.start)}–${F.date(ec.closeOn)} (salário chegou antes)`);
          // 3) abre o ciclo novo já com as datas certas; o plano das semanas vem em seguida
          const p0 = C.cyclePlan(F.state(), ec.start, prof.reserve || 0, ec.nextPay);
          F.save('fin_ciclo', { id: 'ciclo-' + ec.start, start: ec.start, end: ec.end, salaryTxId: txId, available: p0.available, committed: p0.committed, reserve: p0.reserve, base: p0.base, weeks: [], startedEarly: true },
            `Iniciou o ciclo ${F.date(ec.start)}–${F.date(ec.end)} (salário ${ec.daysEarly} dia${ec.daysEarly === 1 ? '' : 's'} antes)`);
          api.close();
          P.ui.finCycleOfs = 0;
          setTimeout(() => F.plan(ec.start, txId, ec.nextPay), 250);
        };
      }
    });
  };
})();