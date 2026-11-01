/* ============================================================
   PRISMA 2 — notificações
   Etapa atual: avisos enquanto o app está aberto (ou quando você
   abre). O "carteiro" que avisa com o app fechado (push) é a
   Etapa 3: falta cadastrar o aparelho no Appwrite e criar o
   robô que envia.
============================================================ */
(function () {
  const S = P.store;
  const VAPID_PUBLIC = 'BDoe_EQ9o0vuNVRojuU8v3SpCqPXbR0nuLOWJDaXYg3hORWnk-fbCi7aFkyK4zABgr3qWSX6fofNyZEpv--YdDk';
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
      if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) });
      await P.sync?.savePush?.(sub.toJSON());
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

    // calendário acadêmico (provas e prazos) no dia anterior
    S.all('events').filter(e => (e.cat === 'prova' || e.cat === 'prazo') && P.daysUntil(e.date) === 1).forEach(e => send('ev:' + e.id, 'Amanhã no calendário', e.title));

    P.ls.set(sentKey, [...sent]);
    // limpa registros de dias anteriores
    try { Object.keys(localStorage).filter(k => k.startsWith('prisma2:sent:') && k !== sentKey).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  P.push = {
    registration, check,
    label() {
      const c = P.sync?.user();
      return c ? 'Avisos com o app aberto. Os avisos com o app fechado chegam na Etapa 3.' : 'Avisos com o app aberto. Para receber com o app fechado, ative a sincronização (Etapa 3).';
    },
    async enable() {
      if (!('Notification' in window)) return;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { P.toast('Permissão negada. Dá pra liberar nas configurações do site.'); P.render(); return; }
      S.setSettings({ notify: { ...S.settings().notify, enabled: true } });
      await subscribePush();
      await show('Prisma', 'Notificações ativadas. Agora eu sei onde você mora.', 'prisma-on');
      P.render();
    },
    disable() { S.setSettings({ notify: { ...S.settings().notify, enabled: false } }); P.toast('Notificações desativadas neste aparelho.'); },
    test() { show('Prisma', 'Teste de notificação. Se você está lendo isso, funcionou.', 'prisma-test'); },
    resubscribe() { if ('Notification' in window && Notification.permission === 'granted' && S.settings().notify.enabled) subscribePush(); }
  };

  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
