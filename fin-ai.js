/* ============================================================
   FINANCEIRO+ — Assistente
   1) Perguntas comuns são respondidas AQUI, de graça, com o
      mesmo motor de cálculo do app (nada sai do aparelho).
   2) O resto vai para a IA (Gemini) pela função do Appwrite,
      junto com um resumo dos dados financeiros.
   O assistente só SUGERE: lançar ou marcar como pago sempre
   passa por um botão Confirmar. Nunca paga nem muda nada sozinho.
============================================================ */
(function () {
  const S = P.store, C = P.finCore, F = P.fin, esc = P.esc;
  const CHAT_KEY = 'prisma2:aiChat', CFG_KEY = 'prisma2:aiCfg';
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const cfg = () => ({ fn: 'prisma-assistente', descriptions: true, ...(P.ls.get(CFG_KEY) || {}) });
  const chat = () => P.ls.get(CHAT_KEY) || [];
  const setChat = list => P.ls.set(CHAT_KEY, list.slice(-40));
  const push = msg => { setChat([...chat(), { at: Date.now(), ...msg }]); };
  let busy = false;

  /* ---------------- resumo para a IA ---------------- */
  // Resumo enxuto (menos texto = IA mais rápida). Valores em reais com 2 casas.
  F.aiContext = () => {
    const withDesc = cfg().descriptions;
    let s = F.snap(); F.ensureOccurrences(s.cycle.start, s.cycle.end); s = F.snap();
    const today = P.today(), c = s.cycle, nx = F.cycleAt(1); F.ensureOccurrences(nx.start, nx.end);
    const pc = F.cycleAt(-1);
    const sum = F.summary({ start: c.start, end: c.end }), sumNext = F.summary({ start: nx.start, end: nx.end });
    const rep = C.cycleReport(F.state(), { start: c.start, end: c.end }, { start: pc.start, end: pc.end }, today);
    const R = v => Math.round(v) / 100;
    const cat = id => F.cat(id)?.name || 'Sem categoria';
    const d = t => (withDesc ? t.desc : cat(t.categoryId));
    // pendente: "id|vencimento|descrição|categoria|valor|obs"
    const pend = t => [t.id, t.noDue ? 'sem data' : t.date, d(t), cat(t.categoryId), R(t.remaining ?? t.amount), [t.envelope ? 'teto' : '', t.certainty === 'estimado' ? 'estimado' : ''].filter(Boolean).join(' ')].join('|');
    // gasto: "data|descrição|categoria|forma|valor"
    const gasto = t => [t.paidDate || t.date, d(t), cat(t.categoryId), t.method || '', R(t.amount)].join('|');
    const cur = F.txs().filter(t => !t.deleted && t.status === 'realizado' && (t.paidDate || t.date) >= c.start && (t.paidDate || t.date) <= c.end).sort((a, b) => (b.paidDate || b.date).localeCompare(a.paidDate || a.date));
    return JSON.stringify({
      hoje: today, valores: 'reais',
      ciclo: `${c.start} a ${c.end}${c.projected ? ' (projetado)' : ''}; próximo salário ${c.nextPay}; ${F.paydayTxt()}`,
      painel: { saldoReal: R(s.real), reservado: R(s.reserved), contasAteSalario: R(s.committed), possoGastar: R(s.canSpend), porDia: R(s.perDay), diasRestantes: s.daysLeft },
      semana: s.week ? `${s.week.label} ${s.week.start} a ${s.week.end}: limite ${R(s.week.limit)}, gasto ${R(s.week.spent)}` : 'sem plano semanal',
      contas: s.balances.filter(b => b.account.type !== 'cartao').map(b => `${b.account.name}: ${R(b.balance)}`),
      ciclo_resumo: { receitas: R(sum.income), comprometido: R(sum.committed), pago: R(sum.paidTotal), faltaPagar: R(sum.pendingTotal), saldoProjetado: R(sum.projected) },
      pendentes: { formato: 'id|vencimento|descrição|categoria|valor|obs', itens: sum.pending.map(pend) },
      proximo_ciclo: { periodo: `${nx.start} a ${nx.end}`, comprometido: R(sumNext.committed), saldoProjetado: R(sumNext.projected), pendentes: sumNext.pending.slice(0, 15).map(pend) },
      gastos_por_categoria: rep.cats.map(k => `${k.name}: ${R(k.total)}${k.prev !== undefined ? ` (ciclo anterior ${R(k.prev)})` : ''}`),
      gastos_do_ciclo: { formato: 'data|descrição|categoria|forma|valor', itens: cur.slice(0, 60).map(gasto), total: cur.length },
      cartao_parcelas_futuras: sum.cardFuture.slice(0, 12).map(i => `${i.month} ${withDesc ? i.desc : 'compra'} ${i.n}/${i.of}: ${R(i.amount)}`),
      carnes: F.parcs().filter(p => !p.deleted && !p.canceled && p.type === 'carne').map(p => { const pr = C.parcProgress(p, F.txs()); return `${withDesc ? p.desc : cat(p.categoryId)}: ${pr.paidCount}/${p.n} pagas, falta ${R(pr.leftAmount)}`; }),
      categorias: F.cats().map(k => k.name)
    });
  };

  /* ---------------- respostas grátis, calculadas aqui ---------------- */
  const M = c => C.formatMoney(c);
  F.aiLocal = text => {
    const t = norm(text), today = P.today();
    let s = F.snap(); F.ensureOccurrences(s.cycle.start, s.cycle.end); s = F.snap();
    const c = s.cycle, sum = F.summary({ start: c.start, end: c.end });
    const money = () => { const m = String(text).match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/); return m ? C.parseMoney(m[1]) : null; };

    // cumprimentos e agradecimentos: resposta na hora, sem gastar a IA
    if (/^(oi+|ola|ole|opa|eai|e ai|hey|bom dia|boa tarde|boa noite|tudo bem\??|oi tudo bem\??)[!.?\s]*$/.test(t)) {
      const h = new Date().getHours(), nm = S.settings().name;
      return { text: `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}${nm ? ', ' + nm : ''}! Hoje você pode gastar ${M(s.canSpend)} até ${F.date(c.end)}. Pode me perguntar coisas como “posso gastar 100?”, “quanto falta pagar?” ou pedir “gastei 25 de uber no pix”.` };
    }
    if (/^(obrigad[ao]|valeu|brigad[ao]|thanks)[!.\s]*$/.test(t)) return { text: 'De nada! Qualquer coisa, é só perguntar.' };
    // "paguei o aluguel" → marcar a conta pendente como paga
    if (/^(ja )?(paguei|quitei)\b/.test(t)) {
      const pend = sum.pending.filter(p => !p.envelope);
      const hit = pend.find(p => norm(p.desc).split(/[^a-z0-9]+/).filter(w => w.length >= 3).some(w => new RegExp(`\\b${w}\\b`).test(t)));
      if (hit) return { text: `Encontrei “${hit.desc}” (${M(hit.remaining)}) nas contas pendentes do ciclo. Quer marcar como paga? Você confere o valor antes de salvar.`, action: { tipo: 'pagar', id: hit.id, valor: (money() ?? hit.amount) / 100 } };
    }
    // "gastei 50 no mercado no pix" → lançamento pronto para confirmar
    if (/^(gastei|paguei|comprei|recebi|ganhei|lanca|lancar|anota|registra)\b/.test(t)) {
      const ph = C.parsePhrase(String(text).replace(/^(lança|lanca|lançar|lancar|anota|registra)\s+/i, ''), today);
      if (ph.amount) {
        const catId = ph.categoryKey ? 'cat-' + ph.categoryKey : '';
        return { text: ph.method === 'credito' ? 'Isso é compra no cartão. Vou abrir a tela de compra no cartão para você conferir as parcelas.' : 'Montei o lançamento. Confira e toque em Confirmar.',
          action: { tipo: 'lancamento', kind: ph.kind === 'receita' ? 'receita' : 'despesa', desc: ph.desc || '', valor: ph.amount / 100, data: ph.date, categoria: F.cat(catId)?.name || '', forma: ph.method || 'debito', parcelas: ph.installments, status: ph.date > today ? 'previsto' : 'realizado' } };
      }
      return { text: 'Qual foi o valor? Ex.: “gastei 23,90 de uber no pix”.' };
    }
    // "posso gastar 200 no sábado?"
    if (/(posso|consigo|da pra|dá pra|daria pra|cabe) (gastar|comprar|pagar|torrar)|cabe .*(no orcamento|no ciclo)/.test(t) && money()) {
      const v = money(), wk = s.week, wRest = wk ? wk.limit - wk.spent : null;
      const lines = [];
      if (v <= 0) return { text: 'Me diga um valor maior que zero.' };
      if (s.canSpend < v) lines.push(`Não cabe: hoje você pode gastar ${M(Math.max(0, s.canSpend))} até ${F.date(c.end)} (saldo real ${M(s.real)} − reservado ${M(s.reserved)} − contas até o salário ${M(s.committed)}). Faltariam ${M(v - Math.max(0, s.canSpend))}.`);
      else if (wk && wRest < v) lines.push(`Cabe no ciclo (você pode gastar ${M(s.canSpend)} até ${F.date(c.end)}), mas passa do limite da ${wk.label.toLowerCase()} em ${M(v - Math.max(0, wRest))}: restam ${M(Math.max(0, wRest))} nela. Se gastar, o app te ajuda a decidir de onde tirar.`);
      else lines.push(`Sim, cabe. Você pode gastar ${M(s.canSpend)} até ${F.date(c.end)}${wk ? ` e ainda restam ${M(wRest)} na ${wk.label.toLowerCase()}` : ''}. Depois desse gasto, ficariam ${M(s.canSpend - v)}.`);
      lines.push('Valores confirmados (saldo real) menos o que já está comprometido.');
      return { text: lines.join(' ') };
    }
    if (/quanto (eu )?(posso|consigo) gastar|quanto (eu )?tenho (livre|disponivel)|meu saldo|qual (e |o )?(meu )?saldo/.test(t)) {
      return { text: `Você pode gastar ${M(s.canSpend)} até ${F.date(c.end)}, cerca de ${M(s.perDay)} por dia (${s.daysLeft} dia${s.daysLeft === 1 ? '' : 's'}). Conta: saldo real ${M(s.real)} − reservado ${M(s.reserved)} − contas até o salário ${M(s.committed)}.` };
    }
    if (/(falta pagar|pendente|contas? (a pagar|do ciclo|que vence)|o que vence|proximas contas)/.test(t)) {
      if (!sum.pending.length) return { text: 'Não tem nenhuma conta pendente neste ciclo.' };
      return { text: `Faltam ${M(sum.pendingTotal)} em ${sum.pending.length} conta${sum.pending.length === 1 ? '' : 's'} até ${F.date(c.end)}:\n` + sum.pending.slice(0, 8).map(p => `• ${p.desc}: ${M(p.remaining)}${p.noDue ? '' : ' (vence ' + F.date(p.date) + ')'}`).join('\n') + (sum.pending.length > 8 ? `\n… e mais ${sum.pending.length - 8}.` : '') };
    }
    if (/(com o que|onde|em que) (eu )?(mais )?gast|mais gastei|gastei mais/.test(t)) {
      const r = C.cycleReport(F.state(), { start: c.start, end: c.end }, null, today);
      if (!r.count) return { text: 'Ainda não tem gasto pago neste ciclo.' };
      return { text: `Neste ciclo você gastou ${M(r.total)}. Onde mais foi:\n` + r.cats.slice(0, 4).map(k => `• ${k.name}: ${M(k.total)} (${Math.round(k.share * 100)}%)`).join('\n') + '\nO relatório completo fica em Relatório.' };
    }
    const g = t.match(/quanto (eu )?gastei(?: (?:com|de|em|no|na)\s+(.+?))?\??$/);
    if (g) {
      const term = (g[2] || '').replace(/\b(esse|este|neste|nesse) (ciclo|mes)\b/, '').trim();
      const list = F.txs().filter(x => !x.deleted && x.kind === 'despesa' && x.status === 'realizado' && x.method !== 'credito' && (x.paidDate || x.date) >= c.start && (x.paidDate || x.date) <= c.end);
      const hit = term ? list.filter(x => norm(x.desc).includes(term) || norm(F.cat(x.categoryId)?.name).includes(term)) : list;
      if (term && !hit.length) return null;   // deixa a IA tentar entender
      return { text: `${term ? `Com “${g[2]}”` : 'No total'}, neste ciclo (${F.date(c.start)} a ${F.date(c.end)}): ${M(hit.reduce((a, x) => a + x.amount, 0))} em ${hit.length} gasto${hit.length === 1 ? '' : 's'} pago${hit.length === 1 ? '' : 's'}.` };
    }
    if (/\bsemana\b/.test(t) && /(quanto|como|limite|resta|sobr)/.test(t)) {
      const wk = s.week;
      if (!wk) return { text: 'O plano das semanas aparece depois que o salário cai e você confirma o plano do ciclo.' };
      const r = wk.limit - wk.spent;
      return { text: `${wk.label} (${F.date(wk.start)} a ${F.date(wk.end)}): gastou ${M(wk.spent)} de ${M(wk.limit)}. ${r >= 0 ? `Restam ${M(r)}.` : `Passou ${M(-r)}.`}` };
    }
    return null;
  };

  /* ---------------- ações sugeridas (sempre com Confirmar) ---------------- */
  const catByName = name => { const n = norm(name); return F.cats().find(c => norm(c.name) === n) || F.cats().find(c => n && norm(c.name).includes(n)); };
  const actionCard = (a, i) => {
    if (a.done) return `<div class="ai-action done">${esc(a.done)}</div>`;
    if (a.tipo === 'pagar') {
      const t = S.get('fin_lanc', a.id) || S.raw().fin_lanc[a.id];
      if (!t || t.status !== 'previsto') return '<div class="ai-action done">Essa conta não está mais pendente.</div>';
      return `<div class="ai-action"><b>Marcar como paga</b><span>${esc(t.desc)} · ${F.money(Math.round((a.valor ?? t.amount / 100) * 100))}</span>
        <div class="form-actions split"><button class="btn primary small" type="button" data-ai-ok="${i}">Conferir e pagar</button><button class="btn ghost small" type="button" data-ai-no="${i}">Descartar</button></div></div>`;
    }
    const cat = catByName(a.categoria), amount = Math.round(Number(String(a.valor).replace(',', '.')) * 100);
    return `<div class="ai-action"><b>${a.forma === 'credito' ? 'Compra no cartão' : a.kind === 'receita' ? 'Novo recebimento' : 'Novo gasto'}</b>
      <span>${esc(a.desc || '(sem descrição)')} · ${Number.isFinite(amount) ? F.money(amount) : '?'}${a.parcelas > 1 ? ` em ${a.parcelas}×` : ''}</span>
      <span class="faint small">${cat ? esc(cat.name) : '<b class="st-pendente">sem categoria</b>'} · ${F.METHODS[a.forma] || a.forma || ''} · ${F.date(a.data || P.today())} · ${a.status === 'previsto' ? 'a pagar' : 'já foi'}</span>
      <div class="form-actions split"><button class="btn primary small" type="button" data-ai-ok="${i}">${a.forma === 'credito' || !cat || !a.desc ? 'Abrir para conferir' : 'Confirmar'}</button><button class="btn ghost small" type="button" data-ai-edit="${i}">Editar</button><button class="btn ghost small" type="button" data-ai-no="${i}">Descartar</button></div></div>`;
  };
  const markDone = (i, txt) => { const l = chat(); if (l[i]?.action) { l[i].action.done = txt; setChat(l); } P.render(); };
  const runAction = (i, mode) => {
    const a = chat()[i]?.action; if (!a) return;
    if (mode === 'no') return markDone(i, 'Descartado.');
    if (a.tipo === 'pagar') { F.pay(a.id); return; }
    const cat = catByName(a.categoria), amount = Math.round(Number(String(a.valor).replace(',', '.')) * 100);
    const preset = { kind: a.kind === 'receita' ? 'receita' : 'despesa', desc: a.desc || '', amount: Number.isInteger(amount) && amount > 0 ? amount : null, date: /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') ? a.data : P.today(), categoryId: cat?.id || '', method: ['debito', 'pix', 'dinheiro', 'boleto'].includes(a.forma) ? a.forma : 'debito', status: a.status === 'previsto' ? 'previsto' : 'realizado', certainty: 'confirmado', accountId: F.accounts()[0]?.id || '' };
    if (a.forma === 'credito') { F.cardForm({ desc: preset.desc, total: preset.amount, n: Math.max(1, Math.min(24, +a.parcelas || 1)), categoryId: preset.categoryId, date: preset.date }); return; }
    if (mode === 'edit' || !cat || !preset.desc || !preset.amount || !preset.accountId) { F.lancar(preset); return; }
    if (preset.kind === 'receita') preset.method = 'transferencia';
    if (preset.status === 'realizado') preset.paidDate = preset.date;
    F.save('fin_lanc', { ...preset, origin: 'assistente' }, `Lançou “${preset.desc}” (${C.formatMoney(preset.amount)}) pelo assistente, com a sua confirmação`);
    markDone(i, `Lançado: ${preset.desc} · ${C.formatMoney(preset.amount)}.`);
    P.toast('Lançamento salvo.');
  };

  /* ---------------- conversa ---------------- */
  const ask = async text => {
    text = String(text || '').trim().slice(0, 600); if (!text || busy) return;
    push({ role: 'user', text });
    const local = F.aiLocal(text);
    if (local) { push({ role: 'assistant', text: local.text, action: local.action || null, source: 'app' }); P.render(); scrollEnd(); return; }
    busy = true; P.render(); scrollEnd();
    const t0 = Date.now(), tick = setInterval(() => { const el = P.$('[data-secs]'); if (el) el.textContent = `pensando… ${Math.round((Date.now() - t0) / 1000)} s`; }, 1000);
    try {
      const history = chat().slice(-7, -1).map(m => ({ role: m.role, text: m.text }));
      // se a função não responder em 40 s, avisa em vez de ficar carregando para sempre
      const r = await Promise.race([
        P.sync.execute(cfg().fn, { question: text, context: F.aiContext(), history }),
        new Promise(res => setTimeout(() => res({ ok: false, erro: 'A IA não respondeu a tempo. Confira no Appwrite: prisma-assistente → Settings → Timeout = 30 e se o deploy está Ready. Depois tente de novo.' }), 40000))
      ]);
      if (r.ok) push({ role: 'assistant', text: r.resposta, action: r.acao || null, source: 'ia' });
      else push({ role: 'assistant', text: r.erro || 'A IA não respondeu.', source: 'erro', userId: r.userId || null });
    } catch (e) {
      const m = e?.code === 404 ? `Não achei a função “${cfg().fn}” no Appwrite. Confira o passo 2 do guia (o ID da função).` : e?.code === 401 ? 'Para usar a IA, entre na sua conta em Ajustes → Sincronização. As perguntas comuns funcionam sem isso.' : e?.message || 'Sem conexão com a IA agora.';
      push({ role: 'assistant', text: m, source: 'erro' });
    }
    clearInterval(tick); busy = false; P.render(); scrollEnd();
  };
  // se a tela ficou presa em "carregando" (ex.: app fechado no meio), libera ao reabrir
  window.addEventListener('pageshow', () => { busy = false; });
  const scrollEnd = () => setTimeout(() => { const l = P.$('.ai-log'); if (l) l.scrollTop = l.scrollHeight; window.scrollTo(0, document.body.scrollHeight); }, 30);

  const SUGGEST = ['Posso gastar R$ 100 hoje?', 'Quanto falta pagar?', 'Com o que eu mais gastei?', 'Quanto ainda tenho na semana?', 'Gastei 25 de uber no pix'];

  P.views['fin-assistente'] = () => {
    const list = chat(), on = !!P.sync?.user();
    return `
    <header class="page-head row-head"><div><h1>Assistente</h1><p class="lede">Pergunte sobre o seu dinheiro. Ele só sugere: nada é gravado sem você confirmar.</p></div>
      <button class="icon-btn" type="button" data-act="aiCfg" aria-label="Ajustes do assistente"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg></button></header>
    ${on ? '' : '<div class="notice">As perguntas comuns já funcionam. Para perguntas livres com IA, entre na sua conta em Ajustes → Sincronização e configure a função (guia do assistente).</div>'}
    <div class="ai-log" aria-live="polite">
      ${list.length ? list.map((m, i) => `<div class="ai-msg ${m.role} src-${m.source || 'none'}">
          <div class="ai-bubble">${esc(m.text).replace(/\n/g, '<br>')}</div>
          ${m.action ? actionCard(m.action, i) : ''}
          ${m.role === 'assistant' ? `<span class="ai-src">${m.source === 'app' ? 'calculado pelo app' : m.source === 'ia' ? 'IA · confira os números' : ''}</span>` : ''}
        </div>`).join('') : `<div class="ai-empty"><b>Oi${S.settings().name ? ', ' + esc(S.settings().name) : ''}!</b><span>Experimente uma destas:</span></div>`}
      ${busy ? '<div class="ai-msg assistant"><div class="ai-bubble ai-typing"><i></i><i></i><i></i><span class="ai-secs" data-secs>pensando…</span></div></div>' : ''}
    </div>
    <div class="chips ai-suggest">${SUGGEST.map(q => `<button type="button" class="chip" data-act="aiAsk" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="ai-form" data-form="aiAsk"><input id="ai-q" name="q" autocomplete="off" maxlength="600" placeholder="Escreva sua pergunta…" ${busy ? 'disabled' : ''} aria-label="Pergunta"><button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>Enviar</button></form>`;
  };
  F.gate('fin-assistente');
  const baseMount = P.mounts['fin-assistente'];
  P.mounts['fin-assistente'] = root => {
    baseMount?.(root);
    const f = root.querySelector('[data-form="aiAsk"]');
    if (f) f.onsubmit = e => { e.preventDefault(); const v = f.q.value; f.q.value = ''; ask(v); };
    P.$$('[data-ai-ok]', root).forEach(b => b.onclick = () => runAction(+b.dataset.aiOk, 'ok'));
    P.$$('[data-ai-edit]', root).forEach(b => b.onclick = () => runAction(+b.dataset.aiEdit, 'edit'));
    P.$$('[data-ai-no]', root).forEach(b => b.onclick = () => runAction(+b.dataset.aiNo, 'no'));
    const l = root.querySelector('.ai-log'); if (l) l.scrollTop = l.scrollHeight;
  };

  // atalho no Painel: pergunta e já abre a conversa
  const finMount = P.mounts.fin;
  P.mounts.fin = root => {
    finMount?.(root);
    const q = root.querySelector('[data-ai-quick]');
    if (q) q.onsubmit = e => { e.preventDefault(); const v = q.q.value.trim(); if (!v) return P.go('fin-assistente'); P.go('fin-assistente'); ask(v); };
  };

  F.aiCfgSheet = () => P.sheet({
    title: 'Ajustes do assistente', kicker: 'Financeiro+',
    render: () => { const c = cfg(); return `<form class="form">
      ${field('ID da função no Appwrite', `<input name="fn" value="${esc(c.fn)}">`, 'O mesmo ID que você deu ao criar a função (guia, passo 2).')}
      <label class="check-line"><input type="checkbox" name="descriptions" ${c.descriptions ? 'checked' : ''}> Mandar as descrições dos lançamentos para a IA</label>
      <p class="hint">Desligado, a IA vê só valores, datas e categorias (ex.: “Saúde” no lugar de “Psicóloga”). As perguntas comuns são respondidas no aparelho e não mandam nada.</p>
      <div class="form-actions split"><button class="btn ghost danger-t" type="button" data-clear>Apagar conversa</button><span class="grow"></span><button class="btn primary" type="submit">Salvar</button></div></form>`; },
    mount: api => {
      const f = api.body.querySelector('form');
      f.onsubmit = e => { e.preventDefault(); P.ls.set(CFG_KEY, { fn: f.fn.value.trim() || 'prisma-assistente', descriptions: f.descriptions.checked }); api.close(); P.toast('Assistente salvo.'); };
      api.body.querySelector('[data-clear]').onclick = () => { P.ls.del(CHAT_KEY); api.close(); P.render(); P.toast('Conversa apagada deste aparelho.'); };
    }
  });
  const field = (label, html, hint = '') => `<label class="field"><span class="field-label">${label}</span>${html}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;

  Object.assign(P.actions, {
    aiAsk: el => ask(el.dataset.q),
    aiCfg: () => F.aiCfgSheet(),
    finAi: () => P.go('fin-assistente')
  });
})();
