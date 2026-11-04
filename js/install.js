// Установка как приложения (PWA): значок на экране телефона и Surface.
// Chrome, Edge и Android сами дают окно установки, кнопка его открывает.
// iPhone так не умеет: там подсказка «Поделиться», потом «На экран Домой». На iPhone уведомления
// приходят, только если доска стоит на экране: подсказка говорит и об этом (вопрос ask.js там не нужен).
// Карточка наверху ленты (решение автора 2026-11-04, раньше внизу, над подвалом): «Не сейчас» прячет её
// на 3 дня, всего не больше 3 раз (askDue). Вопрос об уведомлениях ждёт, пока на неё не ответят
import { $, showCard, hideCard } from './ui.js';
import { askDue } from './util.js';
import { send } from './stats.js';

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* без службы сайт работает как обычно */ });

const KEY = 'uv-install';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* не страшно */ } };

const box = $('#install');
const btn = $('#install-btn');
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
let ask = null;

function later() {
  const s = read();
  save({ n: (s.n || 0) + 1, at: Date.now() });
  hideCard(box);
}

if (box && !installed && askDue(read())) {
  if (iphone) {
    $('#install-text').textContent = 'Нажмите «Поделиться», потом «На экран Домой». Так придут и уведомления о новом.';
    btn.hidden = true;
    $('#install-no').textContent = 'Понятно';
    showCard(box);
  }
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    ask = e;
    showCard(box);
  });
  btn.addEventListener('click', async () => {
    if (!ask) return;
    ask.prompt();
    const { outcome } = await ask.userChoice;
    send({ 'Установка': { 'Карточка на доске': outcome === 'accepted' ? 'Поставили' : 'Отказались' } });
    if (outcome === 'accepted') hideCard(box); else later();
    ask = null;
  });
  $('#install-no').addEventListener('click', () => {
    later();
    send({ 'Установка': { 'Карточка на доске': 'Не сейчас' } });
  });
  addEventListener('appinstalled', () => hideCard(box));
}
