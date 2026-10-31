// Экран «Настройки» (#/nastroyki, шестерёнка в шапке): звук, уведомления, админ, «Что нового».
// Уведомления пока без сервера рассылки: приходят, пока доска открыта или недавно свёрнута.
// Объявление, которое поменялось, пока доска была закрыта, доска показывает при следующем открытии
import { icon } from './icons.js';
import { esc } from './util.js';
import { toast } from './ui.js';
import { prefs, setPref } from './prefs.js';
import * as sound from './sound.js';
import * as store from './store.js';
import { VERSIONS } from './versions.js';
import { adminLine } from './post.js';

const day = d => { const t = new Date(d + 'T12:00'); return `${t.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} ${t.getFullYear()}`; };
const pair = (name, on, yes, no) => `<div class="set-pick">
    <button class="chip" type="button" data-pref="${name}" data-on="1" aria-pressed="${on}">${yes}</button>
    <button class="chip" type="button" data-pref="${name}" data-on="0" aria-pressed="${!on}">${no}</button></div>`;
const ver = x => `<div><p><b>Версия ${x.v}</b> · ${day(x.date)}</p><ul>${x.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;

function adminBox(n) {
  if (n === null) {
    return `<p>Проверять объявления и выкладывать их на доску.</p><a class="btn btn-line" href="admin/">Вход для админа</a>`;
  }
  return `<p>${n ? `На проверке: ${n}` : 'Новых объявлений нет.'}</p>
    <a class="btn btn-ink" href="admin/">Панель админа${n ? ` <b class="n">${n}</b>` : ''}</a>`;
}

export function settingsScreen() {
  const p = prefs(), n = store.waiting();
  return `<div class="scr sets">
    <div class="set-head"><a class="back" href="#/" data-act="back" aria-label="Назад">${icon('arrow')}</a><h1>Настройки</h1></div>
    <section class="set"><h2>${icon('sound')}Звук</h2>
      <p>Щелчок при нажатии, сигнал при отправке и уведомлении.</p>${pair('sound', p.sound, 'Включён', 'Выключен')}</section>
    <section class="set"><h2>${icon('bell')}Уведомления</h2>
      <p>Ваше объявление выложено, не прошло проверку или снято с доски.${n === null ? '' : ' Админу: новое объявление на проверке.'}</p>
      ${pair('notify', p.notify, 'Включены', 'Выключены')}
      <p class="set-note">Пока приходят, когда доска открыта или недавно свёрнута.</p></section>
    <section class="set" id="set-admin"><h2>${icon('ok')}Админ</h2>${adminBox(n)}</section>
    <section class="set vers"><h2>${icon('clock')}Что нового</h2>
      ${VERSIONS.slice(0, 3).map(ver).join('')}
      <details><summary>Прошлые версии</summary>${VERSIONS.slice(3).map(ver).join('')}</details></section>
    <p class="set-foot">Валарг, версия ${VERSIONS[0].v}</p>
    ${adminLine('Вопрос по доске? Написать админу')}
  </div>`;
}

// Число на проверке поменялось, пока открыты настройки
export function adminChanged(n) {
  const box = document.getElementById('set-admin');
  if (box) box.innerHTML = `<h2>${icon('ok')}Админ</h2>${adminBox(n)}`;
}

// Переключатель: «Включены» у уведомлений сначала спрашивает разрешение телефона
export async function toggle(btn) {
  const name = btn.dataset.pref, on = btn.dataset.on === '1';
  if (name === 'notify' && on) {
    if (!('Notification' in window)) return toast('На этом телефоне уведомления работают, когда доска поставлена на экран.');
    if (await Notification.requestPermission() !== 'granted') return toast('Уведомления запрещены. Разрешите их для valarg.ru в настройках браузера.');
  }
  setPref(name, on);
  btn.parentNode.querySelectorAll('[data-pref]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.on === '1') === on)));
  if (name === 'sound' && on) sound.notify();
  if (name === 'notify') toast(on ? 'Уведомления включены.' : 'Уведомления выключены.');
}

// Сказать человеку: звук и подсказка на экране, а при свёрнутой доске уведомление телефона
export function tell(title, body, url = '/#/moi') {
  if (!prefs().notify) return;
  sound.notify();
  if (!document.hidden) return toast(`${title}: ${body}`);
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then(r => r.showNotification(title, { body, icon: '/img/icon-192.png', tag: url, data: { url } }));
}

// Свои объявления: статус поменялся (и пока доска была закрыта). Прошлые статусы в памяти телефона
const SEEN = 'uv-seen';
const SAY = { ok: 'Объявление выложено', no: 'Объявление не прошло проверку', off: 'Объявление снято с доски' };
export function checkMine() {
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '{}'); } catch { return; }
  for (const x of store.mine()) {
    const was = seen[x.id];
    if (was && was !== x.status && SAY[x.status] && (was === 'wait' || x.status === 'off')) tell(SAY[x.status], x.title || x.text);
    seen[x.id] = x.status;
  }
  const ids = Object.keys(seen);
  ids.slice(0, Math.max(0, ids.length - 60)).forEach(id => delete seen[id]);
  try { localStorage.setItem(SEEN, JSON.stringify(seen)); } catch { /* не страшно */ }
}
