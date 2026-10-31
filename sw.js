// Служба работы без сети «Валарг»: копия оболочки сайта (страницы, стили, код, значки),
// чтобы приложение открывалось и при слабой связи. Сначала сеть: человек всегда видит свежую
// версию, без сети берётся копия. Объявления не копируются: их держит база Firebase.
// Хранилище копий общее у всех сайтов адреса: служба удаляет только свои копии (имя с PREFIX).
const PREFIX = 'uslugi-valarga-';
const CACHE = PREFIX + 'v4';
const SHELL = [
  '/', '/admin/', '/manifest.webmanifest', '/admin/manifest.webmanifest',
  '/css/base.css', '/css/site.css', '/css/forms.css', '/css/admin.css',
  '/js/app.js', '/js/admin.js', '/js/board.js', '/js/config.js', '/js/fb.js', '/js/icons.js', '/js/install.js',
  '/js/mine.js', '/js/photos.js', '/js/post.js', '/js/stats.js', '/js/store.js', '/js/ui.js', '/js/util.js',
  '/js/prefs.js', '/js/settings.js', '/js/sound.js', '/js/versions.js',
  '/img/icon.svg', '/img/icon-192.png', '/img/admin-192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // no-cache: браузер сверяет файл с сервером, и после выкладки новые файлы не смешиваются со старыми
  // (2026-10-29: в NAFI новый скрипт встретил старый из памяти браузера, и каталог не загрузился)
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match(url.pathname.startsWith('/admin') ? '/admin/' : '/') : undefined))
    .then(hit => hit || Response.error())));
});

// Касание уведомления: открытое окно доски выходит вперёд, иначе доска открывается на нужном экране
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(list => list.find(c => c.url.startsWith(self.location.origin))?.focus() || self.clients.openWindow(url)));
});
