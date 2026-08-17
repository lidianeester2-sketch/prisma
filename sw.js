const PRISMA_SW_VERSION = 'OFFLINE-SHELL-1';

/* ============================================================
   CACHE DO APP SHELL — permite abrir o Prisma sem internet.
   Não mexe nas chamadas para a planilha (script.google.com):
   essas continuam indo direto pra rede, sem cache, pra não
   interferir na sincronização.
============================================================ */
const PRISMA_CACHE_NAME = 'prisma-shell-v1';

const PRISMA_SHELL_FILES = [
  './',
  './index.html',
  './css/styles.css',
  './css/responsive.css',
  './js/app.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon-64.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/notification-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRISMA_CACHE_NAME)
      .then(cache => cache.addAll(PRISMA_SHELL_FILES))
      .catch(err => console.error('Prisma SW: falha ao pré-cachear o app shell.', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(names =>
        Promise.all(names.filter(n => n !== PRISMA_CACHE_NAME).map(n => caches.delete(n)))
      )
    ])
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Só intercepta GET do mesmo domínio (arquivos do próprio app).
  // Qualquer coisa de outro domínio (ex: script.google.com) passa direto pela rede.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(PRISMA_CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);

      // Mostra o cache na hora (rápido, funciona offline) e atualiza em segundo plano.
      return cached || fresh;
    })
  );
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'Prisma', {
      body: data.body || 'O Prisma tem uma coisa para te avisar.',
      icon: './assets/icons/notification-icon.png',
      badge: './assets/icons/notification-icon.png',
      image: './assets/icons/icon-512.png',
      tag: data.tag || 'prisma-notification',
      renotify: true,
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
