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

    // calendário acadêmico (provas e prazos) no dia anterior
    S.all('events').filter(e => (e.cat === 'prova' || e.cat === 'prazo') && P.daysUntil(e.date) === 1).forEach(e => send('ev:' + e.id, 'Amanhã no calendário', e.title));

    P.ls.set(sentKey, [...sent]);
    // limpa registros de dias anteriores
    try { Object.keys(localStorage).filter(k => k.startsWith('prisma2:sent:') && k !== sentKey).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  P.push = {
    registration, check,
    label() {
      if (!P.sync?.user()) return 'Só com o app aberto. Entre na sincronização para receber com o app fechado.';
      return P.ls.get('prisma2:pushSaved') ? 'Chegam mesmo com o app fechado.' : 'Só com o app aberto por enquanto. Toque em Desativar e Ativar de novo para cadastrar este aparelho.';
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
