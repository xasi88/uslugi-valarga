// Установка как приложения (PWA): значок на экране телефона и Surface.
// Chrome, Edge, Яндекс, Samsung и Opera на Android и Chrome, Edge на компьютере сами дают окно установки:
// доска ловит его (beforeinstallprompt), кнопка «Установить» открывает его одним касанием.
// Остальные браузеры (iPhone, Firefox, Safari на Mac) так не умеют: для них шаги на экране «Как установить» (guide.js).
// Спрашивает об установке окно при первом входе (ask.js, решение автора 2026-11-04) и «Настройки»
import { send } from './stats.js';
import { askDue } from './util.js';

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* без службы сайт работает как обычно */ });

let ask = null;
let done = false;
const subs = new Set();
const tell = () => subs.forEach(fn => fn());

// Окно установки браузера пришло или доска уже поставлена: экраны рисуют кнопку заново
export const onInstall = fn => subs.add(fn);
// Доска открыта со значка на экране или её только что поставили
export const installed = () => done || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// Браузер сам поставит доску одним касанием
export const canPrompt = () => !!ask;

addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  ask = e;
  tell();
});
addEventListener('appinstalled', () => {
  done = true;
  ask = null;
  tell();
});

// Панель админа: своя лимонная карточка «Панель на экране» (admin/index.html, на доске её нет).
// «Не сейчас»: снова через 3 дня, всего не больше 3 раз (askDue). iPhone: шаги вместо кнопки
const card = document.getElementById('install');
const KEY = 'uv-install';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
function later() {
  const s = read();
  try { localStorage.setItem(KEY, JSON.stringify({ n: (s.n || 0) + 1, at: Date.now() })); } catch { /* не страшно */ }
  card.hidden = true;
}
if (card && !installed() && askDue(read())) {
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    document.getElementById('install-text').textContent = 'Нажмите «Поделиться», потом «На экран «Домой»».';
    document.getElementById('install-btn').hidden = true;
    document.getElementById('install-no').textContent = 'Понятно';
    card.hidden = false;
  }
  onInstall(() => { if (!/iphone|ipad|ipod/i.test(navigator.userAgent)) card.hidden = !canPrompt(); });
  document.getElementById('install-btn').addEventListener('click', async () => { if (!await promptInstall('Карточка в панели')) later(); });
  document.getElementById('install-no').addEventListener('click', () => {
    later();
    send({ 'Установка': { 'Карточка в панели': 'Не сейчас' } });
  });
}

// Окно установки браузера. from: где нажали, для статистики. true: доску поставили
export async function promptInstall(from) {
  if (!ask) return false;
  const e = ask;
  ask = null;
  try {
    e.prompt();
    const { outcome } = await e.userChoice;
    send({ 'Установка': { [from]: outcome === 'accepted' ? 'Поставили' : 'Отказались' } });
    if (outcome === 'accepted') { done = true; tell(); }
    return outcome === 'accepted';
  } catch {
    ask = e;
    return false;
  }
}
