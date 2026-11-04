// Доска «Валарг»: переходы между экранами, меню, поиск, касания.
// Экраны: доска одной лентой (board.js), «Разместить» (post.js), «Мои» (mine.js).
// Услуги, работа и товары с 2026-11-01 на одной ленте по дням, вкладок разделов нет.
// Внутри кода «Работа» зовётся requests, «Товары» goods: так называются собрания в базе.
import { icon, waIcon } from './icons.js';
import { $, toast, viewPhoto } from './ui.js';
import * as board from './board.js';
import * as post from './post.js';
import { addShots, removeShot } from './photos.js';
import { mineScreen } from './mine.js';
import * as store from './store.js';
import * as stats from './stats.js';
import * as settings from './settings.js';
import * as sound from './sound.js';
import * as push from './push.js';
import './install.js';
import './ask.js';

// Адрес → экран и пункт меню
const ROUTES = {
  '#/': ['board', 0],
  '#/razmestit': ['post', 1, post.choiceScreen],
  '#/razmestit/usluga': ['post', 1, post.masterForm],
  '#/razmestit/rabota': ['post', 1, post.requestForm],
  '#/razmestit/prodayu': ['post', 1, () => post.goodsForm('sell')],
  '#/razmestit/kuplyu': ['post', 1, () => post.goodsForm('buy')],
  '#/gotovo': ['post', 1, post.doneScreen],
  '#/moi': ['mine', 2, mineScreen],
  '#/nastroyki': ['settings', -1, settings.settingsScreen],
};
// Страница плитки: мастер (#/m/<номер>) или товар (#/t/<номер>) и собрание в базе
const PAGES = { m: ['master', 'masters'], t: ['good', 'goods'] };
// Старые адреса: ссылки из WhatsApp ведут на доску и в ту же форму
ROUTES['#/rabota'] = ROUTES['#/tovary'] = ROUTES['#/zayavki'] = ROUTES['#/'];
ROUTES['#/razmestit/zayavka'] = ROUTES['#/razmestit/rabota'];
ROUTES['#/razmestit/tovar'] = ROUTES['#/razmestit/prodayu'];

let boardY = 0;
let canBack = false;
let booted = false;
// Экран, который сейчас открыт не на витрине: страница объявления рисуется заново, когда придут объявления
let current = null;
function route() {
  const h = location.hash || '#/';
  const m = h.match(/^#\/([mt])\/([\w-]+)$/);
  const page = m && PAGES[m[1]];
  const [view, tabI, screen] = page ? [page[0], 0, () => board.itemPage(page[1], m[2])] : ROUTES[h] || ROUTES['#/'];
  const prev = document.body.dataset.view;
  const onBoard = view === 'board';
  if (page && prev === 'board') boardY = scrollY;
  // «Назад» возвращает на доску, только если человек пришёл с неё. Иначе ссылка из WhatsApp вела бы прочь с сайта
  if (page) canBack = booted && prev === 'board';
  if (view === 'settings') canBack = booted;
  booted = true;
  // Firebase нужен для отправки, «Моих» и настроек: он грузится при входе на эти экраны, витрине не нужен
  if (['post', 'mine', 'settings'].includes(view)) store.wake().catch(() => {});
  document.body.dataset.view = view;
  stats.screen(view);
  document.querySelectorAll('.tab a').forEach((a, i) => a.classList.toggle('on', i === tabI));
  $('#board').hidden = !onBoard;
  $('#screen').hidden = onBoard;
  if (onBoard) {
    board.renderList();
    // Со страницы плитки назад на доску: на то же место, где человек был
    const back = Object.values(PAGES).some(([pv]) => prev === pv);
    scrollTo({ top: back ? boardY : 0, behavior: 'auto' });
  } else {
    current = screen;
    post.showScreen(screen());
    if (page) board.galleryCounter();
    scrollTo({ top: 0, behavior: 'auto' });
  }
}

// Данные поменялись (новое объявление, админ выложил): перерисовать открытый экран
store.onChange(() => {
  const view = document.body.dataset.view;
  if (view === 'board') board.renderList();
  if (view === 'mine') post.showScreen(mineScreen());
  // Ссылка на объявление (из WhatsApp) открылась раньше, чем пришли объявления: страница ждала их
  if ($('#screen [data-wait]')) { post.showScreen(current()); board.galleryCounter(); }
  settings.checkMine();
});

// Число на шестерёнке: только на телефоне, где админ вошёл в панель, сколько ждут проверки.
// Стало больше: новое объявление, админу уведомление
let lastWait = null;
store.adminWait(n => {
  const b = $('#gear b');
  b.textContent = n || '';
  b.hidden = !n;
  $('#gear').setAttribute('aria-label', n ? `Настройки, на проверке: ${n}` : 'Настройки');
  if (lastWait !== null && n > lastWait) settings.tell('Новое объявление на проверке', `На проверке: ${n}`, '/admin/');
  lastWait = n;
  settings.adminChanged(n);
});

function renderTab() {
  const TAB = [['all', 'Доска'], ['add', 'Разместить'], ['mine', 'Мои']];
  document.querySelectorAll('.tab a').forEach((a, i) => { a.innerHTML = '<i>' + icon(TAB[i][0]) + '</i>' + TAB[i][1]; });
}

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('a, button, label, summary, .opt, [data-photo]')) sound.tap();
  const pref = t.closest('[data-pref]');
  if (pref) { settings.toggle(pref); return; }
  const opt = t.closest('.opt');
  if (opt) { post.pick(opt); return; }
  const shot = t.closest('[data-shot]');
  if (shot) { removeShot(shot.closest('form'), +shot.dataset.shot); return; }
  const big = t.closest('.req-shots [data-photo], .gal-track [data-photo]');
  if (big) { viewPhoto(big.dataset.photo); return; }
  const act = t.closest('[data-act]');
  if (!act) return;
  const { act: a, id, type } = act.dataset;
  if (a === 'back' && canBack) { e.preventDefault(); history.back(); }
  if (a === 'found') {
    store.setStatus(type, id, 'done');
    toast(type === 'goods' ? 'Объявление снято с доски.' : 'Объявление снято с доски. Хорошей работы!');
  }
  if (a === 'notify-mine') settings.askMine(act);
  if (a === 'del' && confirm('Удалить объявление? Вернуть его не получится.')) store.remove(type, id);
  if (a === 'search') {
    const s = $('#search');
    s.hidden = !s.hidden;
    if (!s.hidden) s.querySelector('input').focus();
  }
});

document.addEventListener('change', async e => {
  if (!e.target.matches('[data-photos]')) return;
  const form = e.target.closest('form');
  const extra = await addShots(form, e.target.files);
  if (extra) toast('Лишние фото не добавлены: больше нельзя.');
});

document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  board.state.q = e.target.value.trim();
  board.renderList();
});

document.addEventListener('submit', e => {
  e.preventDefault();
  post.submit(e.target);
});

addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 8), { passive: true });
addEventListener('hashchange', route);

// Подвал: «Написать админу» с готовой первой фразой
const toAdmin = $('#to-admin');
toAdmin.href = post.toAdmin();
toAdmin.insertAdjacentHTML('afterbegin', waIcon);

// Служба приложения (sw.js): касание уведомления открывает экран (go), новое объявление при открытой доске (fresh)
navigator.serviceWorker?.addEventListener('message', e => {
  const { go, fresh } = e.data || {};
  if (go?.startsWith('#/')) location.hash = go;
  if (fresh) { store.pull(); settings.news(fresh); }
});

renderTab();
route();
// Уведомления включены: обновить подписку и адрес телефона, когда доска уже на экране
push.start();
