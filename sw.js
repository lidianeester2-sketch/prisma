/* ============================================================
   PRISMA 2 — service worker
   - Guarda os arquivos do app para abrir sem internet.
   - HTML: tenta a rede primeiro (pega atualização na hora);
     se não tiver internet, usa o que está guardado.
   - CSS/JS/ícones: usa o guardado e atualiza em segundo plano.
   - Ao publicar uma versão nova, mude o número em VERSION.
============================================================ */
const VERSION = 'prisma-v14';
const SHELL = [
  './', './index.html', './manifest.json', './app.css',
  './config.js', './util.js', './store.js', './views.js', './forms.js',
  './settings.js', './fin-core.js', './fin.js', './fin-forms.js', './fin-views.js', './fin-plan.js', './fin-report.js', './fin-ai.js', './sync.js', './notify.js', './app.js',
  './icon-192.png', './icon-512.png', './favicon-64.png',
  './apple-touch-icon.png', './notification-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
