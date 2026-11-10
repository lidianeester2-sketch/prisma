/* ============================================================
   PRISMA 2 — notificações
   Dois carteiros:
   1) este arquivo avisa enquanto o app está aberto;
   2) o robô no Appwrite (pasta prisma-robo) avisa com o app
      fechado. Aqui o aparelho só se cadastra para receber.
============================================================ */
(function () {
  const S = P.store;
  const VAPID_PUBLIC = 'BC2jQjccygX050toPlNib2O1RKjDryMwBRmR-6ZXoClSXgxGX_33xZxC9lAu39xkxKUQ7y4yUjnQJLmxAz5-Ky0';
  let reg = null;

  async function registration() {
    if (P.PREVIEW || !('serviceWorker' in navigator)) return null;
    if (reg) return reg;
    try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); reg = await navigator.serviceWorker.ready; } catch (e) { console.warn('Prisma: service worker não registrou.', e); }
    return reg;
  }

  async function show(title, body, tag, url = './#hoje') {
    const opts = { body, tag, icon: './icon-192.png', badge: './notification-icon.png', data: { url } };
    const r = await registration();
    if (r) return r.showNotification(title, opts);
    if ('Notification' in window) return new Notification(title, opts);
  }

  const b64 = s => { const pad = '='.repeat((4 - s.length % 4) % 4); const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); };

  async function subscribePush() {
    const r = await registration(); if (!r || !('PushManager' in window)) return null;
    try {
      let sub = await r.pushManager.getSubscription();
      // se o aparelho estava cadastrado com a chave antiga (Prisma antigo), refaz o cadastro
      if (sub) {
        const cur = sub.options?.applicationServerKey;
        const curB64 = cur ? btoa(String.fromCharCode(...new Uint8Array(cur))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : null;
        if (curB64 && curB64 !== VAPID_PUBLIC) { await sub.unsubscribe(); sub = null; }
      }
      if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) });
      const ok = await P.sync?.savePush?.(sub.toJSON());
      if (ok) P.ls.set('prisma2:pushSaved', true);
      return sub;
    } catch (e) { console.warn('Prisma: push não cadastrado.', e); return null; }
  }

  /* ---------- verificação local ---------- */
  function check() {
    const st = S.settings(); const n = st.notify;
    if (!n.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const today = P.today();
    const sentKey = 'prisma2:sent:' + today;
    const sent = new Set(P.ls.get(sentKey, []));
    const send = (key, title, body) => { if (sent.has(key)) return; sent.add(key); show(title, body, key); };

    // aulas: 1h antes
    if (n.classReminder) P.classesOn(today).forEach(c => {
      const diff = P.minutes(c.start) - P.nowMinutes();
      if (!c.holiday && diff > 0 && diff <= 60) send('aula:' + c.item.id, `Aula às ${c.start}`, `${c.item.title} começa em ${diff} min. Sim, ela realmente existe.`);
    });

    // resumo do dia (uma vez, a partir do horário escolhido)
    if (P.nowMinutes() >= P.minutes(n.digestHour || '08:00')) {
      const open = S.all('tasks').filter(t => !t.done && t.due);
      const late = open.filter(t => t.due < today).length;
      const hoje = open.filter(t => t.due === today).length;
      const aulas = P.classesOn(today).filter(c => !c.holiday).length;
      if (late || hoje || aulas) {
        const parts = [aulas && `${aulas} aula${aulas > 1 ? 's' : ''}`, hoje && `${hoje} prazo${hoje > 1 ? 's' : ''} hoje`, late && `${late} atrasad${late > 1 ? 'os' : 'o'}`].filter(Boolean);
        send('resumo', 'Seu dia no Prisma', parts.join(' · ') + '. Vamos descobrir o que está pegando fogo.');
      }
    }

    // prazos com antecedência escolhida
    S.all('tasks').filter(t => !t.done && t.due).forEach(t => {
      const d = P.daysUntil(t.due);
      if (!n.daysBefore.includes(d)) return;
      const it = P.itemName(t.itemId);
      const body = d === 0 ? `${t.title} vence hoje. Talvez seja uma boa hora de parar de fingir que você não viu.`
        : d === 1 ? `${t.title} vence amanhã. Ainda dá tempo, mas não muito.`
        : `${t.title} vence em ${d} dias. Tempo suficiente pra fazer ou procrastinar profissionalmente.`;
      send(`prazo:${t.id}:${d}`, it ? `${P.KINDS[t.kind]?.label || 'Prazo'} · ${it}` : 'Prazo chegando', body);
    });

    // Financeiro+: contas que vencem hoje e amanhã (sem valores) e vencidas
    if (n.fin !== false && P.hasFin?.() && P.fin && P.nowMinutes() >= P.minutes(n.digestHour || '08:00')) {
      try {
        P.fin.ensureOccurrences?.(today, P.addDays(today, 1));
        const bills = P.fin.txs().filter(t => t.kind === 'despesa' && t.status === 'previsto' && !t.envelope && !t.noDue);
        const late = bills.filter(t => t.date < today);
        if (late.length) send('fin-vencidas', 'Financeiro+', late.length === 1 ? `${late[0].desc} está vencida. Marque como paga se já pagou.` : `${late.length} contas vencidas. Abra o Orçamento para ver.`);
        bills.forEach(t => { const d = P.daysUntil(t.date); if (d === 0) send(`fin:${t.id}:0`, 'Conta vence hoje', `${t.desc} vence hoje.`); else if (d === 1) send(`fin:${t.id}:1`, 'Conta vence amanhã', `${t.desc} vence amanhã.`); });
      } catch (e) { console.warn('Prisma: aviso do financeiro falhou.', e); }
    }

    // calendário acadêmico (provas e prazos) no dia anterior
    S.all('events').filter(e => (e.cat === 'prova' || e.cat === 'prazo') && P.daysUntil(e.date) === 1).forEach(e => send('ev:' + e.id, 'Amanhã no calendário', e.title));

    P.ls.set(sentKey, [...sent]);
    // limpa registros de dias anteriores
    try { Object.keys(localStorage).filter(k => k.startsWith('prisma2:sent:') && k !== sentKey).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  P.push = {
    registration, check,
    label() {
      if (!P.sync?.user()) return 'Só com o app aberto. Entre na sua conta para receber com o app fechado.';
      return P.ls.get('prisma2:pushSaved') ? 'Chegam mesmo com o app fechado.' : 'Só com o app aberto por enquanto. Toque em Desativar e Ativar de novo para cadastrar este aparelho.';
    },
    async enable() {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      const help = (title, msg) => P.sheet({ title, kicker: 'Notificações', render: () => `<p class="ask-msg">${msg}</p><div class="form-actions"><button class="btn primary" type="button" data-ok>Entendi</button></div>`, mount: api => { api.body.querySelector('[data-ok]').onclick = () => api.close(); } });
      const blockedTxt = isIOS ? 'No iPhone: Ajustes → Notificações → <b>Prisma</b> → Permitir Notificações. Depois volte aqui e toque em Ativar.'
        : standalone ? 'No Android: segure o ícone do Prisma → <b>Informações do app</b> (ⓘ) → Notificações → ativar. Se não aparecer, vá em Configurações → Apps → <b>Chrome</b> → Notificações → ativar. Depois volte aqui e toque em Ativar.'
        : 'Toque no <b>cadeado</b> ao lado do endereço → Permissões → Notificações → Permitir. Depois toque em Ativar de novo.';
      if (!('Notification' in window)) return help('Este aparelho não deixa', isIOS && !standalone ? 'No iPhone, as notificações só funcionam com o Prisma instalado. Abra no <b>Safari</b>, toque em Compartilhar → <b>Adicionar à Tela de Início</b> e abra pelo ícone novo.' : 'Este navegador não tem notificações. Abra o Prisma no <b>Chrome</b> (Android) ou instale pelo <b>Safari</b> (iPhone).');
      P.toast('Pedindo permissão…');
      let perm;
      try {
        // alguns celulares escondem a pergunta: se em 10 segundos não vier resposta, mostramos o caminho manual
        perm = await Promise.race([Notification.requestPermission(), new Promise(r => setTimeout(() => r('sem-resposta'), 10000))]);
      } catch (e) { perm = Notification.permission; }
      if (perm === 'sem-resposta') return help('O celular não mostrou a pergunta', `Alguns celulares escondem o pedido de permissão. ${blockedTxt}`);
      if (perm === 'denied') { P.render(); return help('Notificações bloqueadas', blockedTxt); }
      if (perm !== 'granted') { P.toast('Você fechou a pergunta sem escolher. Toque em Ativar de novo e escolha Permitir.'); return; }
      S.setSettings({ notify: { ...S.settings().notify, enabled: true } });
      P.render();
      try {
        const r = await Promise.race([registration(), new Promise(res => setTimeout(() => res(null), 8000))]);
        if (!r) { P.toast('Ativadas com o app aberto. Para receber com o app fechado, toque em "Atualizar o app" em Ajustes e ative de novo.'); return; }
        const sub = await subscribePush();
        await show('Prisma', 'Notificações ativadas. Agora eu sei onde você mora.', 'prisma-on');
        if (!sub) P.toast('Ativadas com o app aberto. O cadastro para o app fechado falhou: confira a internet e toque em Desativar e Ativar.');
        else if (!P.sync?.user()) P.toast('Ativadas. Entre na sua conta para receber também com o app fechado.');
      } catch (e) { P.toast('Ativadas, mas algo falhou no cadastro: ' + (e.message || e)); }
      P.render();
    },
    async disable() {
      S.setSettings({ notify: { ...S.settings().notify, enabled: false } });
      P.toast('Notificações desativadas neste aparelho.');
      try { const r = await registration(); const sub = await r?.pushManager?.getSubscription(); if (sub) { await P.sync?.removePush?.(sub.toJSON()); await sub.unsubscribe(); } P.ls.del('prisma2:pushSaved'); } catch (e) {}
    },
    test() { show('Prisma', 'Teste de notificação. Se você está lendo isso, funcionou.', 'prisma-test'); },
    // pede ao robô do Appwrite um aviso de verdade (o mesmo caminho de quando o app está fechado)
    async remoteTest() {
      await subscribePush();
      P.toast('Pedindo um aviso ao robô…');
      let r;
      try { r = await P.sync.execute(P.CONFIG?.roboFunction || 'prisma-robo', { teste: 1 }); }
      catch (e) { r = { ok: false, erro: /not.?found|could not be found/i.test(e.message) ? 'Não achei a função do robô no Appwrite. Confira o ID dela em Functions → Prisma Robô.' : /unauthori|permission|missing scope/i.test(e.message) ? 'A função não deixa o app chamar. No Appwrite: Functions → Prisma Robô → aba Security → Execute access → adicione All users.' : e.message }; }
      const ago = r.ultimaRodada ? Math.round((Date.now() - r.ultimaRodada) / 60000) : null;
      const clock = ago === null ? 'O despertador ainda não rodou nenhuma vez com a versão nova do robô. Confira o cron-job.org.'
        : ago <= 20 ? `O despertador está funcionando: rodou há ${ago} min.`
        : `O despertador está parado: a última rodada foi há ${ago < 120 ? ago + ' min' : Math.round(ago / 60) + ' horas'}. Confira o cron-job.org (o serviço pausa o agendamento quando ele falha várias vezes).`;
      P.sheet({ title: r.ok ? 'O aviso foi enviado' : 'Algo está faltando', kicker: 'Notificações com o app fechado',
        render: () => `<p class="ask-msg">${r.ok ? `Enviei para ${r.aparelhos} aparelho${r.aparelhos === 1 ? '' : 's'}. Se a notificação “Teste do robô” apareceu, o envio funciona.` : P.esc(r.erro || 'O robô não respondeu.')}</p>${r.ok || r.ultimaRodada !== undefined ? `<p class="ask-msg">${clock}</p>` : ''}<div class="form-actions"><button class="btn primary" type="button" data-close-ok>Ok</button></div>`,
        mount: api => { api.body.querySelector('[data-close-ok]').onclick = () => api.close(); } });
    },
    resubscribe() { if ('Notification' in window && Notification.permission === 'granted' && S.settings().notify.enabled) subscribePush(); }
  };

  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
