const PRISMA_SW_VERSION = '29E2';
const PRISMA_SW_VERSION = '29D';
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
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
