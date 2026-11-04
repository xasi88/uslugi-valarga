// Вопрос на доске «Сообщать о новых объявлениях?» (решение автора 2026-11-04: спросить всех).
// Включить уведомления силой нельзя: разрешает только сам человек в окне браузера. Это окно
// появляется только после «Да»: «Блокировать» в нём закрывает вопрос навсегда, второй раз сайт
// спросить уже не сможет. «Не сейчас»: вопрос вернётся через 3 дня, всего не больше 3 раз (askDue).
// iPhone принимает уведомления, только если доска стоит на экране: там сначала подсказка о значке
import { $, toast } from './ui.js';
import { askDue } from './util.js';
import { prefs, chosen, setPref } from './prefs.js';
import { send } from './stats.js';
import * as store from './store.js';
import * as push from './push.js';

const KEY = 'uv-ask';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* не страшно */ } };

const can = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);

// Какой вопрос нужен этому телефону: ask, iphone или никакой
function mode() {
  if (store.robot) return null;
  if (can) {
    const p = Notification.permission;
    return p === 'default' || (p === 'granted' && !prefs().fresh && !chosen('fresh')) ? 'ask' : null;
  }
  return iphone && !installed ? 'iphone' : null;
}

const box = $('#ask');
const hide = () => { box.hidden = true; };

// Человек не хочет сейчас: спросить позже
function later() {
  const s = read();
  save({ n: (s.n || 0) + 1, at: Date.now() });
  hide();
}

async function yes() {
  const r = await Notification.requestPermission();
  if (r === 'default') return later();
  hide();
  if (r !== 'granted') {
    save({ n: 3, at: Date.now() });
    send({ 'Уведомления': { 'Вопрос на доске': 'Запретили' } });
    return toast('Уведомления запрещены. Разрешить их можно в настройках браузера.', 7000);
  }
  setPref('fresh', true);
  send({ 'Уведомления': { 'Вопрос на доске': 'Да' } });
  toast(await push.sync() ? 'Готово. Доска скажет, когда появится новое объявление.'
    : 'Этот телефон примет уведомления, только когда доска открыта.', 7000);
}

const m = mode();
if (box && m && askDue(read())) {
  if (m === 'iphone') {
    $('#ask-title').textContent = 'Уведомления на iPhone';
    $('#ask-text').textContent = 'Приходят, если доска стоит на экране. Нажмите «Поделиться», потом «На экран Домой» и откройте доску со значка.';
    $('#ask-yes').hidden = true;
    $('#ask-no').textContent = 'Понятно';
  }
  $('#ask-yes').addEventListener('click', yes);
  $('#ask-no').addEventListener('click', () => {
    later();
    send({ 'Уведомления': { 'Вопрос на доске': 'Не сейчас' } });
    toast('Включить можно в настройках: шестерёнка справа вверху.', 7000);
  });
  box.hidden = false;
}
