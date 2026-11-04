// Уведомления при закрытой доске (с 2026-10-31). Телефон получает адрес для уведомлений
// (Firebase Cloud Messaging). Два вида (prefs.js): notify, свои объявления: адрес лежит в базе,
// почтальон находит его по владельцу объявления. fresh, новые объявления (с 2026-11-04): почтальон
// подписывает адрес на тему novoe и шлёт одно письмо на всех. Почтальон в Cloudflare: папка worker.
// Доска зовёт почтальона после отправки объявления, панель после решения админа.
// Для адреса грузятся только приложение Firebase и уведомления, без базы и входа: так в разы легче.
// База (store.wake) нужна только для своих объявлений
import { PUSH, FIREBASE } from './config.js';
import * as store from './store.js';
import { prefs, chosen, setPref } from './prefs.js';

const V = 'https://www.gstatic.com/firebasejs/10.14.1/';
const DAY = 864e5;
const AT = 'uv-push-at';

// Приложение Firebase то же, что у базы (fb.js): initializeApp с теми же настройками отдаёт его же
let sdk = null;
const load = () => (sdk ||= Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-messaging.js')])
  .then(([a, m]) => ({ m, app: a.getApps().find(x => x.name === '[DEFAULT]') || a.initializeApp(FIREBASE) }))
  .catch(e => { sdk = null; throw e; }));

// Адрес этого телефона. null: телефон не умеет (iPhone без доски на экране, старый браузер)
async function address() {
  const { m, app } = await load();
  if (!await m.isSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return m.getToken(m.getMessaging(app), { vapidKey: PUSH.vapid, serviceWorkerRegistration: reg });
}

async function call(path, body) {
  const r = await fetch(`${PUSH.url}/${path}`, { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`почтальон ответил ${r.status}`);
}

const stamp = t => { try { t ? localStorage.setItem(AT, String(t)) : localStorage.removeItem(AT); } catch { /* не страшно */ } };
const last = () => { try { return +localStorage.getItem(AT) || 0; } catch { return 0; } };

// Привести телефон к настройкам: подписка на новые объявления и адрес в базе для своих.
// true: уведомления придут и при закрытой доске
export async function sync() {
  const p = prefs();
  try {
    if (!p.notify && !p.fresh) { await stop(); return true; }
    const t = await address();
    if (!t) return false;
    await call(p.fresh ? 'sub' : 'unsub', { token: t });
    if (p.notify) await store.savePush(t);
    stamp(Date.now());
    return true;
  } catch (e) {
    console.warn('Уведомления:', e);
    return false;
  }
}

// «Мои объявления» выключены, новые остаются: адрес убрать только из базы
export async function offMine() {
  try { const t = await address(); if (t) await store.dropPush(t); } catch { /* не страшно */ }
}

// Всё выключено: отписать, убрать из базы, стереть адрес
async function stop() {
  try {
    const { m, app } = await load();
    const t = await address();
    if (t) {
      await call('unsub', { token: t }).catch(() => {});
      await store.dropPush(t);
    }
    await m.deleteToken(m.getMessaging(app));
  } catch { /* не страшно: устаревший адрес почтальон сотрёт сам */ }
  stamp(0);
}

// При открытии доски. Уведомления включили до версии 2.2: новые объявления тоже приходят,
// выключить можно в «Настройках». Адрес обновляется раз в сутки, на телефоне админа при каждом входе
export function start() {
  if (window.Notification?.permission !== 'granted') return;
  if (prefs().notify && !chosen('fresh')) setPref('fresh', true);
  const p = prefs();
  let admin = false;
  try { admin = !!localStorage.getItem('uv-admin'); } catch { /* памяти нет */ }
  if ((p.notify || p.fresh) && (admin || Date.now() - last() > DAY)) setTimeout(sync, 2500);
}

// Позвать почтальона. Ответ не ждём: доска работает и без него
export function ping(path, type, id) {
  if (!PUSH.url || !id) return;
  fetch(`${PUSH.url}/${path}`, { method: 'POST', body: JSON.stringify({ type, id }), keepalive: true }).catch(() => {});
}
