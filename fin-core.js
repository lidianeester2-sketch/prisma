/* ============================================================
   FINANCEIRO+ — motor de cálculo (fin-core)
   Regras e fórmulas num lugar só. Funções puras: recebem dados,
   devolvem números. Nenhuma tela faz conta por conta própria.

   Dinheiro: SEMPRE centavos inteiros (R$ 50,48 = 5048).
   Datas: texto 'AAAA-MM-DD', sem fuso.
   Roda no navegador (P.finCore) e no Node (testes / robô).
============================================================ */
(function (root) {
  'use strict';

  /* ---------------- dinheiro ---------------- */
  const isCents = v => Number.isInteger(v);

  // "50,48" "1.234,56" "R$ 200" "125 reais" "12.5" → centavos
  function parseMoney(input) {
    if (input === null || input === undefined) return null;
    if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
    let s = String(input).trim().toLowerCase().replace(/r\$\s*/g, '').replace(/reais?|real/g, '').replace(/\s/g, '');
    if (!s) return null;
    const neg = s.startsWith('-'); if (neg) s = s.slice(1);
    if (!/^[\d.,]+$/.test(s)) return null;
    let intPart, decPart = '';
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastComma > lastDot) {            // padrão BR: 1.234,56
      intPart = s.slice(0, lastComma).replace(/[.,]/g, ''); decPart = s.slice(lastComma + 1);
    } else if (lastDot > -1 && lastComma === -1 && s.length - lastDot - 1 <= 2 && (s.match(/\./g) || []).length === 1) {
      intPart = s.slice(0, lastDot); decPart = s.slice(lastDot + 1); // 12.5 → decimal
    } else {
      intPart = s.replace(/[.,]/g, '');                      // 1.000 → mil
    }
    if (decPart.length > 2 || !/^\d*$/.test(decPart) || !/^\d+$/.test(intPart || '0')) return null;
    const cents = Number(intPart || '0') * 100 + Number((decPart + '00').slice(0, 2));
    return neg ? -cents : cents;
  }

  function formatMoney(cents, opts = {}) {
    if (!isCents(cents)) return '—';
    const neg = cents < 0, abs = Math.abs(cents);
    const int = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const dec = String(abs % 100).padStart(2, '0');
    const sign = neg ? '−' : (opts.plus && cents > 0 ? '+' : '');
    return `${sign}R$ ${int},${dec}`;
  }

  // Divide um total em partes proporcionais aos pesos, sem perder centavo
  // (método do maior resto; empate → a parte que vem primeiro).
  function allocate(total, weights) {
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (!weights.length) return [];
    if (sumW <= 0) return weights.map((_, i) => (i === 0 ? total : 0));
    const sign = total < 0 ? -1 : 1, abs = Math.abs(total);
    const raw = weights.map(w => (abs * w) / sumW);
    const out = raw.map(Math.floor);
    let rest = abs - out.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; k < rest; k++) out[order[k % order.length][1]] += 1;
    return out.map(v => v * sign);
  }

  /* ---------------- datas ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parts = iso => iso.split('-').map(Number);
  const dayNum = iso => { const [y, m, d] = parts(iso); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromNum = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const addDays = (iso, n) => fromNum(dayNum(iso) + n);
  const diffDays = (a, b) => dayNum(b) - dayNum(a);
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weekday = iso => new Date(dayNum(iso) * 864e5).getUTCDay();

  function easter(y) { // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return toISO(y, month, day);
  }
  // Dias sem expediente bancário nacional (feriados nacionais + carnaval + Corpus Christi).
  const holidayCache = {};
  function bankHolidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const e = easter(y);
    const list = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(md => `${y}-${md}`)
      .concat([addDays(e, -48), addDays(e, -47), addDays(e, -2), addDays(e, 60)]);
    return (holidayCache[y] = new Set(list));
  }
  const isBusinessDay = iso => { const w = weekday(iso); return w !== 0 && w !== 6 && !bankHolidays(parts(iso)[0]).has(iso); };
  function shiftBusiness(iso, rule) {
    if (rule === 'mantem') return iso;
    let d = iso, guard = 0;
    while (!isBusinessDay(d) && guard++ < 10) d = addDays(d, rule === 'antecipa' ? -1 : 1);
    return d;
  }

  /* ---------------- ciclo salarial ---------------- */
  function paydayIn(y, m, profile) {
    if (profile.paydayRule === 'util') {           // "5º dia útil": conta só dias com banco aberto
      let d = toISO(y, m, 1), n = 0;
      for (let i = 0; i < 31; i++) { if (isBusinessDay(d) && ++n >= (profile.payday || 5)) return d; d = addDays(d, 1); }
      return d;
    }
    const day = Math.min(profile.payday || 6, daysInMonth(y, m));
    return shiftBusiness(toISO(y, m, day), profile.paydayRule || 'adia');
  }
  function nextPayday(afterIso, profile) {   // primeiro pagamento DEPOIS da data
    let [y, m] = parts(afterIso);
    for (let i = 0; i < 3; i++) {
      const p = paydayIn(y, m, profile);
      if (p > afterIso) return p;
      m++; if (m > 12) { m = 1; y++; }
    }
    return null;
  }
  function prevPayday(onOrBeforeIso, profile) { // último pagamento ATÉ a data
    let [y, m] = parts(onOrBeforeIso);
    for (let i = 0; i < 3; i++) {
      const p = paydayIn(y, m, profile);
      if (p <= onOrBeforeIso) return p;
      m--; if (m < 1) { m = 12; y--; }
    }
    return null;
  }

  // Ciclo vigente: o salvo que contém a data; se não houver, o projetado pelas regras do perfil.
  function cycleFor(today, cycles, profile) {
    const saved = (cycles || []).filter(c => !c.deleted && c.start <= today && today <= c.end).sort((a, b) => b.start.localeCompare(a.start))[0];
    if (saved) return { ...saved, projected: false, nextPay: addDays(saved.end, 1) };
    const start = prevPayday(today, profile), next = nextPayday(today, profile);
    return { id: null, start, end: addDays(next, -1), nextPay: next, projected: true, weeks: [] };
  }

  // Salário caiu ANTES do dia previsto: o ciclo atual fecha na véspera e o novo começa no dia
  // em que o dinheiro entrou. O fim do novo ciclo continua sendo a véspera do salário SEGUINTE.
  function earlyCycle(salaryIso, cycles, profile) {
    const cur = cycleFor(salaryIso, cycles, profile);
    if (!cur || salaryIso <= cur.start) return null;                 // caiu no dia certo (ou é o início do ciclo)
    const ahead = diffDays(salaryIso, cur.nextPay);
    if (ahead <= 0 || ahead > 15) return null;                       // muito longe do próximo salário: não é adiantamento
    const after = nextPayday(cur.nextPay, profile);
    return { current: cur, closeOn: addDays(salaryIso, -1), start: salaryIso, scheduled: cur.nextPay, nextPay: after, end: addDays(after, -1), daysEarly: ahead };
  }

  // Semanas do ciclo: blocos de 7 dias a partir do início; o resto vira "dias finais".
  function weekRanges(start, end) {
    const out = []; let s = start;
    while (s <= end) {
      const e = addDays(s, 6) <= end ? addDays(s, 6) : end;
      out.push({ start: s, end: e, days: diffDays(s, e) + 1 });
      s = addDays(e, 1);
    }
    out.forEach((w, i) => { w.label = w.days < 7 ? 'Dias finais' : `Semana ${i + 1}`; });
    return out;
  }
  function splitWeeks(start, end, base) {
    const ranges = weekRanges(start, end);
    const limits = allocate(Math.max(0, base), ranges.map(r => r.days));
    return ranges.map((r, i) => ({ start: r.start, end: r.end, days: r.days, label: r.label, limit: limits[i], locked: false }));
  }

  /* ---------------- recorrências ---------------- */
  // Uma ocorrência por mês, no dia escolhido (limitado ao fim do mês), dentro do intervalo.
  // O id é fixo (rec-<id>-<AAAA-MM>): gerar de novo nunca duplica, nem entre aparelhos.
  function occurrences(rec, from, to) {
    if (!rec || rec.active === false || rec.deleted) return [];
    const out = [];
    let [y, m] = parts(from); const [ty, tm] = parts(to);
    while (y < ty || (y === ty && m <= tm)) {
      const ym = `${y}-${pad(m)}`;
      const date = toISO(y, m, Math.min(rec.day || 1, daysInMonth(y, m)));
      const paused = rec.pausedUntil && ym < rec.pausedUntil && (!rec.pausedFrom || ym >= rec.pausedFrom);
      const inRange = !paused && date >= from && date <= to && (!rec.start || ym >= rec.start) && (!rec.end || ym <= rec.end);
      if (inRange) out.push({
        id: `rec-${rec.id}-${ym}`, kind: rec.kind || 'despesa', desc: rec.desc, amount: rec.amount, date,
        status: 'previsto', certainty: rec.certainty || 'confirmado', method: rec.method || 'boleto',
        accountId: rec.accountId || null, categoryId: rec.categoryId || null, recId: rec.id, origin: 'recorrencia'
      });
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  /* ---------------- saldos ---------------- */
  const live = t => t && !t.deleted && t.status !== 'cancelado';
  const done = t => live(t) && t.status === 'realizado';
  const planned = t => live(t) && t.status === 'previsto';

  // Efeito de um lançamento REALIZADO no saldo de uma conta (centavos, com sinal).
  function effectOn(accountId, t) {
    if (!done(t)) return 0;
    switch (t.kind) {
      case 'receita': return t.accountId === accountId ? t.amount : 0;
      case 'despesa': return t.accountId === accountId && t.method !== 'credito' ? -t.amount : 0;
      case 'transferencia': return (t.toAccountId === accountId ? t.amount : 0) - (t.accountId === accountId ? t.amount : 0);
      case 'ajuste': return t.accountId === accountId ? (t.sign === 'saida' ? -t.amount : t.amount) : 0;
      default: return 0;
    }
  }
  function balance(account, txs) {
    return (account.opening || 0) + txs.reduce((s, t) => s + effectOn(account.id, t), 0);
  }

  /* ---------------- compromisso "teto" (envelope) ---------------- */
  // Ex.: "Compras de casa R$ 250". Não se paga de uma vez: cada compra realizada na mesma
  // categoria, dentro do período do envelope, abate o que falta. Assim nada conta duas vezes.
  const envUsed = (t, txs) => txs.filter(x => done(x) && x.kind === 'despesa' && x.method !== 'credito' && x.id !== t.id && x.categoryId === t.categoryId && x.date >= t.envStart && x.date <= t.envEnd).reduce((s, x) => s + x.amount, 0);
  function pendingAmount(t, txs, today) {
    if (!t.envelope) return t.amount;
    if (today && t.envEnd && today > t.envEnd) return 0;     // período acabou: o teto não segue para o próximo ciclo
    return Math.max(0, t.amount - envUsed(t, txs));
  }

  /* ---------------- parcelamentos ---------------- */
  const addMonths = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
  // parc: { id, type: 'carne' (paga mês a mês pela conta) | 'cartao' (entra na fatura de cada mês),
  //         total, n, firstMonth 'AAAA-MM', paidBefore (parcelas já pagas antes do app) }
  function installments(parc, txs = []) {
    if (!parc || parc.deleted || parc.canceled || !parc.n) return [];
    const amounts = allocate(parc.total, Array(parc.n).fill(1));
    const linked = txs.filter(t => live(t) && t.parcId === parc.id);
    return amounts.map((amount, i) => {
      const n = i + 1, t = linked.find(x => x.parcNum === n), before = n <= (parc.paidBefore || 0);
      const paid = before || (!!t && t.status === 'realizado');
      return { n, month: addMonths(parc.firstMonth, i), amount: t ? t.amount : amount, paid, before, txId: t ? t.id : null };
    });
  }
  function parcProgress(parc, txs) {
    const list = installments(parc, txs), paid = list.filter(i => i.paid), open = list.filter(i => !i.paid);
    return { list, paidCount: paid.length, left: open.length, paidAmount: paid.reduce((s, i) => s + i.amount, 0), leftAmount: open.reduce((s, i) => s + i.amount, 0), next: open[0] || null };
  }

  /* ---------------- cartão: fechamento, vencimento e fatura ---------------- */
  // Fatura do mês M = a que VENCE em M. Compra no dia do fechamento ou depois vai para a próxima.
  // Se o vencimento é antes do fechamento no calendário (fecha 25, vence 5), a fatura vence no mês seguinte ao fechamento.
  function invoiceMonth(purchaseIso, card) {
    const ym = purchaseIso.slice(0, 7), day = Number(purchaseIso.slice(8, 10));
    if (!card || !card.closingDay) return addMonths(ym, 1);
    const closeYm = day < card.closingDay ? ym : addMonths(ym, 1);
    return card.dueDay && card.dueDay <= card.closingDay ? addMonths(closeYm, 1) : closeYm;
  }
  function invoiceDue(ym, card) { const [y, m] = ym.split('-').map(Number); return toISO(y, m, Math.min(card.dueDay || 10, daysInMonth(y, m))); }
  // O que já está dentro da fatura de um cartão num mês (parcelas cadastradas no app)
  function invoiceParts(cardId, ym, parcs, txs = []) {
    return parcs.filter(p => !p.deleted && !p.canceled && p.type === 'cartao' && p.accountId === cardId)
      .flatMap(p => installments(p, txs).filter(i => i.month === ym).map(i => ({ desc: p.desc, n: i.n, of: p.n, amount: i.amount, parcId: p.id })));
  }

  /* ---------------- semanas editáveis ---------------- */
  // Muda o limite de algumas semanas; as semanas futuras SEM cadeado dividem o que sobrar
  // (proporcional aos dias), para a soma continuar igual ao "livre para o dia a dia".
  function rebalanceWeeks(weeks, base, changes, today) {
    const out = weeks.map((w, i) => (changes && changes[i] !== undefined ? { ...w, limit: changes[i], locked: true } : { ...w }));
    const flex = out.map((w, i) => i).filter(i => !out[i].locked && out[i].end >= today && (!changes || changes[i] === undefined));
    const fixedSum = out.reduce((s, w, i) => s + (flex.includes(i) ? 0 : w.limit), 0);
    const rest = base - fixedSum;
    if (!flex.length) return { ok: rest === 0, weeks: out, rest, reason: rest === 0 ? null : 'sem-semanas-livres' };
    if (rest < 0) return { ok: false, weeks: out, rest, reason: 'nao-cabe' };
    const parts = allocate(rest, flex.map(i => out[i].days));
    flex.forEach((i, k) => { out[i].limit = parts[k]; });
    return { ok: true, weeks: out, rest };
  }
  // Semana que passou do limite: 3 caminhos. Nada muda sem você escolher.
  //  'proximas' → tira o excesso das próximas semanas sem cadeado
  //  'reserva'  → usa a reserva do ciclo (o "livre" aumenta)
  //  'manter'   → só registra que você viu; os números ficam como estão
  function coverOverspend(cycle, idx, spent, option) {
    const w = cycle.weeks[idx], over = spent - w.limit;
    if (over <= 0) return { ok: false, reason: 'nao-passou' };
    if (option === 'manter') return { ok: true, cycle: { ...cycle, weeks: cycle.weeks.map((x, i) => (i === idx ? { ...x, ackOver: spent } : x)) }, over };
    if (option === 'reserva') {
      if ((cycle.reserve || 0) < over) return { ok: false, reason: 'reserva-insuficiente', over };
      return { ok: true, over, cycle: { ...cycle, reserve: cycle.reserve - over, base: cycle.base + over, weeks: cycle.weeks.map((x, i) => (i === idx ? { ...x, limit: x.limit + over } : x)) } };
    }
    if (option === 'proximas') {
      const next = cycle.weeks.map((x, i) => i).filter(i => i > idx && !cycle.weeks[i].locked);
      const room = next.reduce((s, i) => s + cycle.weeks[i].limit, 0);
      if (!next.length || room < over) return { ok: false, reason: 'proximas-insuficientes', over, room };
      const cut = allocate(over, next.map(i => cycle.weeks[i].limit));
      const weeks = cycle.weeks.map((x, i) => (i === idx ? { ...x, limit: x.limit + over } : next.includes(i) ? { ...x, limit: x.limit - cut[next.indexOf(i)] } : x));
      return { ok: true, over, cycle: { ...cycle, weeks } };
    }
    return { ok: false, reason: 'opcao' };
  }

  /* ---------------- resumo de um ciclo (pago × pendente × futuro) ---------------- */
  // range: { start, end } de um ciclo. Não depende de saldo de banco: é a conta do planejamento.
  function cycleSummary(state, range, today) {
    const { txs = [], parcs = [] } = state;
    const inR = t => live(t) && t.date >= range.start && t.date <= range.end;
    const exp = txs.filter(t => inR(t) && t.kind === 'despesa' && t.method !== 'credito');
    const paid = exp.filter(done).sort((a, b) => a.date.localeCompare(b.date));
    const pending = exp.filter(planned).map(t => ({ ...t, remaining: pendingAmount(t, txs, today) })).sort((a, b) => a.date.localeCompare(b.date));
    const inc = txs.filter(t => inR(t) && t.kind === 'receita');
    const sum = (l, k = 'amount') => l.reduce((s, t) => s + t[k], 0);
    const paidTotal = sum(paid), pendingTotal = sum(pending, 'remaining');
    const incomeDone = sum(inc.filter(done)), incomePlanned = sum(inc.filter(planned));
    const committed = paidTotal + pendingTotal, income = incomeDone + incomePlanned;
    const ym = range.start.slice(0, 7);
    const card = parcs.filter(p => !p.deleted && p.type === 'cartao').flatMap(p => installments(p, txs).map(i => ({ ...i, parcId: p.id, desc: p.desc, total: p.total, of: p.n })));
    const cardThis = card.filter(i => i.month === ym), cardFuture = card.filter(i => i.month > ym).sort((a, b) => a.month.localeCompare(b.month) || a.desc.localeCompare(b.desc));
    return {
      range, paid, pending, overdue: pending.filter(t => t.date < today && !t.envelope),
      paidTotal, pendingTotal, committed, income, incomeDone, incomePlanned, projected: income - committed,
      cardThis, cardThisTotal: sum(cardThis), cardFuture, cardFutureTotal: sum(cardFuture),
      premissas: [
        'Saldo projetado = receitas do ciclo (recebidas + previstas) − despesas do ciclo (pagas + pendentes).',
        'Compras de casa funcionam como teto: cada compra nessa categoria abate o que falta; se passar, o excesso entra no total.',
        'Parcelas no cartão não são despesa do ciclo: elas já estão dentro da fatura do mês, e só a fatura é paga.'
      ]
    };
  }

  /* ---------------- relatório do ciclo ---------------- */
  // Só o que foi REALIZADO (pago de verdade). Data que vale: o dia em que pagou.
  // Compras no cartão aparecem à parte (por categoria), porque a despesa que sai
  // do saldo é a fatura: somar as duas seria contar duas vezes.
  function cycleReport(state, range, prevRange, today) {
    const { txs = [], categories = [], parcs = [] } = state;
    const when = t => t.paidDate || t.date;
    const spentIn = r => txs.filter(t => done(t) && t.kind === 'despesa' && t.method !== 'credito' && when(t) >= r.start && when(t) <= r.end);
    const catName = id => (categories.find(c => c.id === id) || {}).name || 'Sem categoria';
    const group = list => {
      const m = {};
      list.forEach(t => { const k = t.categoryId || '_'; (m[k] = m[k] || { id: k, name: catName(t.categoryId), total: 0, count: 0, items: [] }); m[k].total += t.amount; m[k].count++; m[k].items.push(t); });
      return Object.values(m).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    };
    const exp = spentIn(range), total = exp.reduce((s, t) => s + t.amount, 0);
    const cats = group(exp);
    cats.forEach(c => { c.share = total ? c.total / total : 0; c.items.sort((a, b) => b.amount - a.amount); });
    let prev = null;
    if (prevRange) {
      const pc = group(spentIn(prevRange)), pt = pc.reduce((s, c) => s + c.total, 0);
      prev = { range: prevRange, total: pt, cats: pc };
      cats.forEach(c => { const o = pc.find(x => x.id === c.id); c.prev = o ? o.total : 0; c.delta = c.total - c.prev; });
    }
    const income = txs.filter(t => done(t) && t.kind === 'receita' && when(t) >= range.start && when(t) <= range.end).reduce((s, t) => s + t.amount, 0);
    const end = today < range.end ? today : range.end;
    const days = Math.max(1, diffDays(range.start, end) + 1), totalDays = diffDays(range.start, range.end) + 1;
    const PLANNED = new Set(['recorrencia', 'planejamento', 'parcelamento']);
    const fixed = exp.filter(t => PLANNED.has(t.origin)).reduce((s, t) => s + t.amount, 0);
    const weeks = weekRanges(range.start, range.end).map(w => ({ ...w, total: exp.filter(t => when(t) >= w.start && when(t) <= w.end).reduce((s, t) => s + t.amount, 0) }));
    const byDay = {}; exp.forEach(t => { byDay[when(t)] = (byDay[when(t)] || 0) + t.amount; });
    const topDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] || null;
    const biggest = exp.slice().sort((a, b) => b.amount - a.amount)[0] || null;
    const cardBuys = parcs.filter(p => !p.deleted && !p.canceled && p.type === 'cartao' && p.purchaseDate && p.purchaseDate >= range.start && p.purchaseDate <= range.end);
    const envelopes = txs.filter(t => live(t) && t.envelope && t.envStart >= range.start && t.envStart <= range.end).map(t => ({ desc: t.desc, limit: t.amount, used: envUsed(t, txs) }));
    return {
      range, closed: today > range.end, daysLeft: Math.max(0, diffDays(today, range.end)), days, totalDays,
      total, income, left: income - total, count: exp.length, perDay: Math.round(total / days),
      cats, top: cats[0] || null, least: cats.length > 1 ? cats[cats.length - 1] : null, prev,
      fixed, variable: total - fixed, weeks, topDay: topDay ? { date: topDay[0], total: topDay[1] } : null, biggest,
      cardBuys: group(cardBuys.map(p => ({ categoryId: p.categoryId, amount: p.total }))), cardBuysTotal: cardBuys.reduce((s, p) => s + p.total, 0), cardBuysCount: cardBuys.length,
      envelopes
    };
  }

  /* ---------------- o painel inteiro ---------------- */
  // state: { accounts, txs, categories, cycles, profile }
  function snapshot(state, today) {
    const { accounts = [], txs = [], categories = [], cycles = [], profile = {} } = state;
    const accs = accounts.filter(a => !a.deleted && !a.archived);
    const availIds = new Set(accs.filter(a => a.inAvailable !== false).map(a => a.id));
    const balances = accs.map(a => ({ account: a, balance: balance(a, txs) }));
    const real = balances.filter(b => availIds.has(b.account.id)).reduce((s, b) => s + b.balance, 0);

    const cycle = cycleFor(today, cycles, profile);
    const reserved = cycle.projected ? (profile.reserve || 0) : (cycle.reserve || 0);

    // Comprometido: despesas previstas (inclusive atrasadas) até a véspera do próximo salário,
    // pagas por conta do disponível ou ainda sem conta definida. Cartão de crédito entra na v7.
    const committedItems = txs.filter(t => planned(t) && t.kind === 'despesa' && t.method !== 'credito' && t.date < cycle.nextPay && (!t.accountId || availIds.has(t.accountId)))
      .map(t => ({ ...t, remaining: pendingAmount(t, txs, today) })).filter(t => t.remaining > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const committed = committedItems.reduce((s, t) => s + t.remaining, 0);

    const toReceiveItems = txs.filter(t => planned(t) && t.kind === 'receita' && t.date < cycle.nextPay);
    const toReceive = toReceiveItems.reduce((s, t) => s + t.amount, 0);

    const canSpend = real - reserved - committed;
    const daysLeft = diffDays(today, cycle.nextPay); // inclui hoje
    const perDay = daysLeft > 0 && canSpend > 0 ? Math.floor(canSpend / daysLeft) : 0;

    const inCycle = t => done(t) && t.date >= cycle.start && t.date <= cycle.end;
    const incomeCycle = txs.filter(t => inCycle(t) && t.kind === 'receita').reduce((s, t) => s + t.amount, 0);
    const expenseCycle = txs.filter(t => inCycle(t) && t.kind === 'despesa').reduce((s, t) => s + t.amount, 0);

    const weeklyCats = new Set(categories.filter(c => c.weekly !== false && c.kind === 'despesa').map(c => c.id));
    const spentIn = (s, e) => txs.filter(t => done(t) && t.kind === 'despesa' && t.date >= s && t.date <= e && weeklyCats.has(t.categoryId)).reduce((a, t) => a + t.amount, 0);
    const weeks = (cycle.weeks || []).map(w => ({ ...w, spent: spentIn(w.start, w.end) }));
    const week = weeks.find(w => w.start <= today && today <= w.end) || null;

    return {
      today, cycle, balances, real, reserved, committed, committedItems, toReceive, toReceiveItems,
      canSpend, daysLeft, perDay, incomeCycle, expenseCycle, weeks, week,
      premissas: [
        'Saldo real = contas marcadas como “no disponível”, só com lançamentos realizados.',
        `Comprometido = despesas previstas ou atrasadas até ${cycle.end.split('-').reverse().slice(0, 2).join('/')}, véspera do próximo salário.`,
        'Limite de cartão de crédito nunca conta como dinheiro.',
        'Valores a receber aparecem à parte e não entram no “posso gastar”.'
      ]
    };
  }

  // Plano do ciclo ao registrar o salário (mostrado para confirmar antes de salvar).
  function cyclePlan(state, start, reserveCents, nextPayOverride) {
    const { accounts = [], txs = [], profile = {} } = state;
    const next = nextPayOverride || nextPayday(start, profile), end = addDays(next, -1);
    const availIds = new Set(accounts.filter(a => !a.deleted && !a.archived && a.inAvailable !== false).map(a => a.id));
    const available = accounts.filter(a => availIds.has(a.id)).reduce((s, a) => s + balance(a, txs), 0);
    const commitments = txs.filter(t => planned(t) && t.kind === 'despesa' && t.method !== 'credito' && t.date <= end && (!t.accountId || availIds.has(t.accountId)))
      .map(t => ({ ...t, remaining: pendingAmount(t, txs, start) })).filter(t => t.remaining > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const committed = commitments.reduce((s, t) => s + t.remaining, 0);
    const reserve = Math.max(0, reserveCents ?? profile.reserve ?? 0);
    const base = available - committed - reserve;
    return { start, end, nextPay: next, available, commitments, committed, reserve, base, weeks: splitWeeks(start, end, base) };
  }

  /* ---------------- frase em linguagem natural ---------------- */
  const CATEGORY_WORDS = {
    alimentacao: ['hamburguer', 'hambúrguer', 'lanche', 'ifood', 'mercado', 'supermercado', 'padaria', 'restaurante', 'pizza', 'almoço', 'almoco', 'jantar', 'café', 'cafe', 'açaí', 'acai', 'sorvete', 'comida', 'feira', 'bombom'],
    transporte: ['uber', '99', 'gasolina', 'combustível', 'combustivel', 'ônibus', 'onibus', 'metrô', 'metro', 'estacionamento', 'passagem', 'pedágio', 'pedagio'],
    saude: ['farmácia', 'farmacia', 'remédio', 'remedio', 'consulta', 'médico', 'medico', 'dentista', 'exame'],
    educacao: ['faculdade', 'curso', 'mensalidade', 'apostila', 'livro'],
    academia: ['academia', 'personal'],
    moradia: ['aluguel', 'condomínio', 'condominio', 'luz', 'energia', 'água', 'agua', 'internet', 'gás', 'gas'],
    assinaturas: ['netflix', 'spotify', 'prime', 'disney', 'youtube', 'assinatura', 'hbo', 'max', 'icloud'],
    lazer: ['cinema', 'show', 'bar', 'viagem', 'passeio', 'ingresso', 'festa'],
    compras: ['roupa', 'maquiagem', 'perfume', 'sapato', 'tênis', 'tenis', 'blusa', 'presente', 'protetor'],
    familia: ['mãe', 'mae', 'pai', 'irmã', 'irma', 'irmão', 'irmao', 'avó', 'avo', 'família', 'familia'],
    freelas: ['freela', 'freelance', 'job'],
    vendas: ['venda', 'vendi', 'vendas'],
    salario: ['salário', 'salario', 'pagamento do mês'],
    reembolsos: ['reembolso', 'devolução', 'devolucao', 'estorno']
  };
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function parsePhrase(text, today) {
    const raw = String(text || '').trim();
    const t = strip(raw);
    const out = { kind: 'despesa', amount: null, desc: '', categoryKey: null, method: null, date: today, installments: 1, person: null, missing: [], notes: [] };
    if (!raw) { out.missing.push('frase'); return out; }

    if (/\b(recebi|ganhei|entrou|caiu|recebimento|salario caiu|me pagou|me pagaram)\b/.test(t)) out.kind = 'receita';
    if (/\b(transferi|guardei|passei)\b.*\b(para|pra)\b.*\b(conta|poupanca|reserva)\b/.test(t)) out.kind = 'transferencia';

    // valor: primeiro número com cara de dinheiro (ignora "4 vezes"/"4x" e datas)
    const noInstall = raw.replace(/\b\d+\s*(x|vezes)\b/gi, ' ').replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ');
    const m = noInstall.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
    if (m) out.amount = parseMoney(m[1]);
    if (!out.amount || out.amount <= 0) { out.amount = null; out.missing.push('valor'); }

    if (/\b(debito)\b/.test(t)) out.method = 'debito';
    else if (/\bpix\b/.test(t)) out.method = 'pix';
    else if (/\b(dinheiro|especie)\b/.test(t)) out.method = 'dinheiro';
    else if (/\bboleto\b/.test(t)) out.method = 'boleto';
    else if (/\b(credito|cartao)\b/.test(t)) out.method = 'credito';
    const inst = t.match(/\b(\d{1,2})\s*(x|vezes)\b/);
    if (inst) { out.installments = Math.max(1, Number(inst[1])); out.method = 'credito'; }

    if (/\bontem\b/.test(t)) out.date = addDays(today, -1);
    else if (/\banteontem\b/.test(t)) out.date = addDays(today, -2);
    const dm = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (dm) {
      let y = dm[3] ? Number(dm[3].length === 2 ? '20' + dm[3] : dm[3]) : Number(today.slice(0, 4));
      const cand = toISO(y, Number(dm[2]), Number(dm[1]));
      if (!dm[3] && cand > today && diffDays(today, cand) > 60) y--;
      out.date = toISO(y, Number(dm[2]), Number(dm[1]));
    }

    const pm = raw.match(/\b(?:para|pra|pro|pro\s+a?)\s+(?:a\s+|o\s+)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+)?)/);
    if (pm && out.kind !== 'transferencia') out.person = pm[1];

    for (const [key, words] of Object.entries(CATEGORY_WORDS)) {
      if (words.some(w => new RegExp(`\\b${strip(w)}\\b`).test(t))) {
        const incomeKeys = ['freelas', 'vendas', 'salario', 'reembolsos'];
        if ((out.kind === 'receita') === incomeKeys.includes(key)) { out.categoryKey = key; break; }
        if (out.kind === 'despesa' && !incomeKeys.includes(key)) { out.categoryKey = key; break; }
      }
    }
    if (out.kind === 'receita' && !out.categoryKey) out.categoryKey = 'outras-receitas';

    // descrição: a frase sem verbos de abertura, valor e forma de pagamento
    let d = raw
      .replace(/^(gastei|paguei|comprei|recebi|ganhei|transferi|guardei)\s+/i, '')
      .replace(/(?:r\$\s*)?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/i, '')
      .replace(/\b(reais|real)\b/gi, '')
      .replace(/\b(no|na|em|com o|com a)?\s*(d[eé]bito|pix|dinheiro|boleto|cr[eé]dito|cart[aã]o)\b/gi, '')
      .replace(/\bem\s+\d{1,2}\s*(x|vezes)\b|\b\d{1,2}\s*(x|vezes)\b/gi, '')
      .replace(/\b(hoje|ontem|anteontem)\b/gi, '')
      .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, '')
      .replace(/^\s*(com|de|em|no|na|um|uma)\s+/i, '')
      .replace(/\s{2,}/g, ' ').trim().replace(/[.,;]$/, '').trim();
    if (out.person && out.kind === 'despesa' && /^(para|pra|pro)\b/i.test(d)) d = `Pagamento ${d}`;
    out.desc = d ? d.charAt(0).toUpperCase() + d.slice(1) : '';
    if (!out.desc) out.missing.push('descricao');
    if (out.kind !== 'transferencia' && !out.categoryKey) out.missing.push('categoria');
    if (!out.method && out.kind === 'despesa') out.missing.push('forma');
    if (out.method === 'credito') out.notes.push(out.installments > 1 ? `Compra no cartão em ${out.installments}×: não conta como gasto deste ciclo.` : 'Compra no cartão: não conta como gasto deste ciclo.');
    return out;
  }

  /* ---------------- histórico ---------------- */
  const TRACKED_SKIP = new Set(['updatedAt', 'createdAt', 'touchedAt']);
  function diff(before, after) {
    const changes = {};
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    keys.forEach(k => {
      if (TRACKED_SKIP.has(k)) return;
      const a = before ? before[k] : undefined, b = after ? after[k] : undefined;
      if (JSON.stringify(a) !== JSON.stringify(b)) changes[k] = [a === undefined ? null : a, b === undefined ? null : b];
    });
    return changes;
  }

  const api = {
    parseMoney, formatMoney, allocate,
    addDays, diffDays, weekday, easter, bankHolidays, isBusinessDay, shiftBusiness,
    paydayIn, nextPayday, prevPayday, cycleFor, earlyCycle, weekRanges, splitWeeks,
    occurrences, effectOn, balance, snapshot, cyclePlan, parsePhrase, diff,
    addMonths, installments, parcProgress, pendingAmount, envUsed, cycleSummary, cycleReport, invoiceMonth, invoiceDue, invoiceParts, rebalanceWeeks, coverOverspend
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.P = root.P || {}; root.P.finCore = api; }
})(typeof window !== 'undefined' ? window : null);
