// Окно при первом входе «Чтобы доска работала удобно» (решение автора 2026-11-04, вместо двух карточек наверху ленты).
// Три пункта, у каждого «зачем»: уведомления (новые объявления и свои), значок на экране, звук.
// «Включить всё» одним касанием: окно установки браузера (install.js), потом окно уведомлений.
// Включить уведомления силой нельзя: разрешает только сам человек, и браузер спрашивает только после нажатия.
// «Блокировать» в окне браузера закрывает вопрос навсегда: окно доски тогда о нём молчит.
// Браузер не ставит доску сам (iPhone, Firefox, Safari на Mac): кнопка «Как установить» ведёт на шаги (guide.js).
// iPhone принимает уведомления, только когда доска стоит на экране: там окно спросит о них снова, со значка.
// «Позже» или осталось что-то не включённое: окно вернётся через 3 дня, всего не больше 3 раз (askDue)
import { $, toast } from './ui.js';
import { icon } from './icons.js';
import { askDue } from './util.js';
import { prefs, chosen, setPref } from './prefs.js';
import { send } from './stats.js';
import * as store from './store.js';
import * as push from './push.js';
import { installed, canPrompt, promptInstall, onInstall } from './install.js';

const KEY = 'uv-start';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* не страшно */ } };

const can = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// Уведомления: on (включены), ask (можно спросить), blocked (запрещены в браузере),
// later (iPhone без значка на экране), none (браузер не умеет)
function bell() {
  if (!can) return iphone && !installed() ? 'later' : 'none';
  const p = Notification.permission;
  if (p === 'denied') return 'blocked';
  if (p !== 'granted') return 'ask';
  // Разрешены, а в настройках человек сам выключил оба вида: окно о них молчит
  return prefs().fresh || prefs().notify ? 'on' : chosen('fresh') ? 'none' : 'ask';
}
// Значок на экране: on (стоит), ask (браузер поставит сам), guide (нужны шаги)
const home = () => (installed() ? 'on' : canPrompt() ? 'ask' : 'guide');
const left = () => bell() === 'ask' || home() !== 'on';

const ON = `<em>${icon('ok')}Включено</em>`;
const TEXT = {
  ask: 'Телефон скажет, когда на доске появится новое объявление и когда ваше выложат.',
  on: 'Телефон скажет о новых объявлениях и о ваших.',
  blocked: 'Запрещены в настройках браузера. Разрешить можно там: «Уведомления», valarg.ru.',
  later: 'На iPhone они работают, когда доска стоит на экране. Сначала поставьте значок.',
};
const item = (ic, title, text, mark = '') => `<li><span class="start-i">${icon(ic)}</span><span><b>${title}</b><i>${text}</i>${mark}</span></li>`;

let box = null;
function render() {
  const b = bell(), h = home();
  const main = b === 'ask' || h === 'ask' ? ['all', 'Включить всё'] : h === 'guide' ? ['guide', 'Как установить'] : ['close', 'Готово'];
  box.querySelector('.start-card').innerHTML = `<h2 id="start-h">Чтобы доска работала удобно</h2>
    <p class="start-lead">Включите это один раз. Так вы не пропустите нужное объявление.</p>
    <ul class="start-list">
      ${b === 'none' ? '' : item('bell', 'Уведомления', TEXT[b], b === 'on' ? ON : '')}
      ${item('app', 'Значок на экране', h === 'guide'
    ? 'Доска откроется одним касанием, как WhatsApp. Ваш браузер ставит значок по шагам: покажем, что нажать.'
    : 'Доска откроется одним касанием, как WhatsApp. Ссылку в переписке искать не нужно.', h === 'on' ? ON : '')}
      ${item('sound', 'Звук', 'Тихий щелчок при нажатии и сигнал, когда пришло новое.', prefs().sound ? ON : '')}
    </ul>
    <p class="start-note">Выключить можно в настройках: шестерёнка справа вверху.</p>
    <div class="start-btns"><button class="btn btn-ink btn-wide" type="button" data-s="${main[0]}">${main[1]}</button>
      ${main[0] === 'close' ? '' : '<button class="btn btn-line btn-wide" type="button" data-s="later">Позже</button>'}</div>`;
}

// Закрыть окно. Осталось не включённое: окно вернётся через 3 дня
function close() {
  if (left()) { const s = read(); save({ n: (s.n || 0) + 1, at: Date.now() }); }
  box.remove();
  box = null;
  document.documentElement.classList.remove('start-open');
}

async function all(btn) {
  btn.disabled = true;
  setPref('sound', true);
  send({ 'Окно на старте': { 'Нажали': 'Включить всё' } });
  // Сначала установка: окно браузера открывается только сразу после касания
  if (home() === 'ask') await promptInstall('Окно на старте');
  if (bell() === 'ask') {
    const r = await Notification.requestPermission().catch(() => 'default');
    send({ 'Уведомления': { 'Окно на старте': r === 'granted' ? 'Да' : r === 'denied' ? 'Запретили' : 'Закрыли' } });
    if (r === 'granted') {
      setPref('fresh', true);
      setPref('notify', true);
      push.sync().then(ok => { if (!ok) toast('Этот телефон примет уведомления, только когда доска открыта.', 7000); });
    }
  }
  if (!box) return;
  if (!left()) { close(); return toast('Готово. Доска скажет, когда появится новое.', 5000); }
  render();
}

function onTap(e) {
  const b = e.target.closest('[data-s]');
  if (!b) return;
  const s = b.dataset.s;
  if (s === 'all') return all(b);
  if (s === 'guide') send({ 'Окно на старте': { 'Нажали': 'Как установить' } });
  if (s === 'later') send({ 'Окно на старте': { 'Нажали': 'Позже' } });
  close();
  if (s === 'guide') location.hash = '#/ustanovka';
  if (s === 'later') toast('Включить можно в настройках: шестерёнка справа вверху.', 5000);
}

function open() {
  if (box || !left() || location.hash === '#/ustanovka') return;
  box = document.createElement('div');
  box.className = 'start';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'start-h');
  box.dataset.nosnippet = '';
  box.innerHTML = '<div class="start-card"></div>';
  render();
  box.addEventListener('click', onTap);
  document.body.append(box);
  document.documentElement.classList.add('start-open');
  box.querySelector('.btn-ink').focus({ preventScroll: true });
}

addEventListener('keydown', e => { if (e.key === 'Escape' && box) close(); });
// Окно установки браузера пришло позже окна доски: кнопка становится «Включить всё»
onInstall(() => { if (box) render(); });

// Доска сначала показывает объявления, окно чуть позже. Роботу и панели окно не нужно
if (!store.robot && $('#board') && askDue(read())) setTimeout(open, 900);
