// Установка как приложения (PWA): значок на экране телефона и Surface.
// Chrome, Edge и Android сами дают окно установки, кнопка его открывает.
// iPhone так не умеет: там подсказка «Поделиться», потом «На экран Домой».
import { $ } from './ui.js';

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* без службы сайт работает как обычно */ });

const box = $('#install');
const btn = $('#install-btn');
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
let ask = null;

if (box && !installed) {
  if (iphone) {
    $('#install-text').textContent = 'На iPhone: нажмите «Поделиться», потом «На экран Домой».';
    btn.hidden = true;
    box.hidden = false;
  }
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    ask = e;
    box.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!ask) return;
    ask.prompt();
    const { outcome } = await ask.userChoice;
    if (outcome === 'accepted') box.hidden = true;
    ask = null;
  });
  addEventListener('appinstalled', () => { box.hidden = true; });
}
