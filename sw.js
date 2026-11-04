// Служба работы без сети «Валарг»: копия оболочки сайта (страницы, стили, код, значки),
// чтобы приложение открывалось и при слабой связи. Сначала сеть: человек всегда видит свежую
// версию, без сети берётся копия. Объявления не копируются: их держит база Firebase.
// Хранилище копий общее у всех сайтов адреса: служба удаляет только свои копии (имя с PREFIX).
const PREFIX = 'uslugi-valarga-';
const CACHE = PREFIX + 'v10';
const SHELL = [
  '/', '/admin/', '/manifest.webmanifest', '/admin/manifest.webmanifest',
  '/css/base.css', '/css/site.css', '/css/forms.css', '/css/admin.css',
  '/js/app.js', '/js/admin.js', '/js/board.js', '/js/config.js', '/js/fb.js', '/js/icons.js', '/js/install.js',
  '/js/mine.js', '/js/photos.js', '/js/post.js', '/js/stats.js', '/js/store.js', '/js/ui.js', '/js/util.js',
  '/js/prefs.js', '/js/push.js', '/js/settings.js', '/js/sound.js', '/js/versions.js', '/js/first.js', '/js/ask.js', '/js/share.js',
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

// Слабая связь (решение автора 2026-11-04): сеть отвечает дольше 3 секунд, и человек получает копию из памяти.
// Свежий файл докачивается в фоне и ляжет в копию к следующему открытию. Копии нет: ждём сеть до конца
const WAIT = 3000;
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // no-cache: браузер сверяет файл с сервером, и после выкладки новые файлы не смешиваются со старыми
  // (2026-10-29: в NAFI новый скрипт встретил старый из памяти браузера, и каталог не загрузился)
  const net = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) {
      const copy = res.clone();
      return caches.open(CACHE).then(c => c.put(req, copy)).then(() => res, () => res);
    }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  // Сначала точная копия (с тем же ?v=): старая страница берёт свои старые файлы, версии не смешиваются
  const copy = () => caches.match(req)
    .then(hit => hit || caches.match(req, { ignoreSearch: true }))
    .then(hit => hit || (req.mode === 'navigate' ? caches.match(url.pathname.startsWith('/admin') ? '/admin/' : '/') : undefined));
  e.respondWith((async () => {
    const slow = new Promise(r => setTimeout(r, WAIT, 'slow'));
    const first = await Promise.race([net.catch(() => 'fail'), slow]);
    if (first !== 'slow' && first !== 'fail') return first;
    const hit = await copy();
    if (hit) return hit;
    return net.catch(() => Response.error());
  })());
});

// Уведомление от почтальона (worker, через FCM). Молчит, только если человек сейчас в окне доски:
// доска скажет сама. «Видимое» окно не годится: окно за другими окнами Chrome тоже считает видимым,
// и пробой 2026-10-31 оба уведомления пропали. В панели админа подсказок нет: там уведомление есть всегда.
// «Новое на доске» (tag novoe, с 2026-11-04): новое уведомление заменяет прошлое и звучит снова.
// Человек в окне доски: доска сама берёт свежие объявления и говорит подсказкой (app.js, сообщение fresh)
self.addEventListener('push', e => {
  let d;
  try { d = e.data.json().data || {}; } catch { return; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const here = list.find(c => c.focused && !new URL(c.url).pathname.startsWith('/admin'));
    if (here) { if (d.tag) here.postMessage({ fresh: d }); return; }
    return self.registration.showNotification(d.title || 'Валарг', {
      body: d.body || '', icon: '/img/icon-192.png', tag: d.tag || d.url || '/', renotify: !!d.tag, data: { url: d.url || '/' },
    });
  }));
});

// Касание уведомления: открытое окно той же страницы выходит вперёд и открывает нужный экран
// (сообщение go), иначе доска открывается заново
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin);
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => new URL(x.url).pathname === url.pathname);
    if (!c) return self.clients.openWindow(url.href);
    c.postMessage({ go: url.hash });
    return c.focus();
  }));
});
