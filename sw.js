/* ============================================================
   PRISMA 2 — service worker
   - Guarda os arquivos do app para abrir sem internet.
   - HTML: tenta a rede primeiro (pega atualização na hora);
     se não tiver internet, usa o que está guardado.
   - CSS/JS: também tenta a rede primeiro (assim a versão nova chega
     na hora); sem internet, usa o guardado. Ícones: usa o guardado.
   - Ao publicar uma versão nova, mude o número em VERSION.
============================================================ */
const VERSION = 'prisma-v27';
const SHELL = [
  './', './index.html', './manifest.json', './app.css',
  './config.js', './util.js', './store.js', './views.js', './forms.js',
  './settings.js', './fin-core.js', './fin.js', './fin-forms.js', './fin-views.js', './fin-plan.js', './fin-report.js', './fin-ai.js', './onboarding.js', './sync.js', './notify.js', './app.js',
  './icon-192.png', './icon-512.png', './favicon-64.png',
  './apple-touch-icon.png', './notification-icon.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' → baixa do servidor de verdade, nunca uma cópia velha do navegador.
  // Um arquivo que falhar não impede a atualização dos outros.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => (r.ok ? c.put(u, r) : null)).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Appwrite, fontes etc. vão direto pra rede

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  if (/\.(js|css|json)$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(cached => {
    const fresh = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => cached);
    return cached || fresh;
  }));
});

/* ---------- push (Etapa 3: o robô envia, aqui só mostra) ---------- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Prisma', {
    body: d.body || 'O Prisma tem uma coisa para te avisar.',
    icon: './icon-192.png',
    badge: './notification-icon.png',
    tag: d.tag || 'prisma',
    data: { url: d.url || './#hoje' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './#hoje';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate && c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});

// o app pode pedir para trocar de versão na hora (botão "Atualizar o app" nos Ajustes)
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
