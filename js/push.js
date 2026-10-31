// Уведомления при закрытой доске (с 2026-10-31). Телефон получает адрес для уведомлений
// (Firebase Cloud Messaging), доска хранит его в базе. Почтальон в Cloudflare (папка worker) шлёт на него.
// Доска зовёт почтальона после отправки объявления, панель после решения админа
import { fbApp } from './fb.js';
import { PUSH } from './config.js';
import * as store from './store.js';

let sdk = null;
const load = async () => (sdk ||= await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js'));

// Адрес этого телефона. null: телефон не умеет (iPhone без доски на экране, старый браузер)
async function address() {
  const m = await load();
  if (!await m.isSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return m.getToken(m.getMessaging(fbApp), { vapidKey: PUSH.vapid, serviceWorkerRegistration: reg });
}

// Включить или обновить адрес в базе. false: при закрытой доске уведомления на этот телефон не придут
export async function on() {
  try {
    const t = await address();
    if (t) await store.savePush(t);
    return !!t;
  } catch (e) {
    console.warn('Уведомления:', e);
    return false;
  }
}

export async function off() {
  try {
    const m = await load();
    const t = await address();
    if (t) await store.dropPush(t);
    await m.deleteToken(m.getMessaging(fbApp));
  } catch { /* не страшно: устаревший адрес почтальон сотрёт сам */ }
}

// Позвать почтальона. Ответ не ждём: доска работает и без него
export function ping(path, type, id) {
  if (!PUSH.url || !id) return;
  fetch(`${PUSH.url}/${path}`, { method: 'POST', body: JSON.stringify({ type, id }), keepalive: true }).catch(() => {});
}
