// Доска «Валарг»: переходы между экранами, меню, поиск, касания.
// Экраны: услуги, работа и товары (board.js), «Разместить» (post.js), «Мои» (mine.js).
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
import './install.js';

// Адрес → экран и пункт меню
const ROUTES = {
  '#/': ['masters', 0],
  '#/rabota': ['requests', 1],
  '#/razmestit': ['post', 2, post.choiceScreen],
  '#/razmestit/rabota': ['post', 2, post.requestForm],
  '#/razmestit/usluga': ['post', 2, post.masterForm],
  '#/razmestit/tovar': ['post', 2, post.goodsForm],
  '#/gotovo': ['post', 2, post.doneScreen],
  '#/tovary': ['goods', 3],
  '#/moi': ['mine', 4, mineScreen],
  '#/nastroyki': ['settings', -1, settings.settingsScreen],
};
// Страница плитки: мастер (#/m/<номер>) или товар (#/t/<номер>), пункт меню своего раздела
const PAGES = { m: ['master', 0, 'masters'], t: ['good', 3, 'goods'] };
const BOARDS = ['masters', 'requests', 'goods'];
// Старые адреса до 2026-10-30: ссылки из WhatsApp ведут туда же
ROUTES['#/zayavki'] = ROUTES['#/rabota'];
ROUTES['#/razmestit/zayavka'] = ROUTES['#/razmestit/rabota'];
const HEAD = {
  masters: ['Услуги <em>мастеров</em>', 'Смотрите, как мастер уже сделал. Цена на фото.'],
  requests: ['Работа <em>в Валарге</em>', 'Жители предлагают работу. Оплата указана сразу.'],
  goods: ['Купить <em>и продать</em>', 'Жители продают и покупают. Цена на фото.'],
};

let boardY = 0;
let canBack = false;
let booted = false;
function route() {
  const h = location.hash || '#/';
  const m = h.match(/^#\/([mt])\/([\w-]+)$/);
  const page = m && PAGES[m[1]];
  const [view, tabI, screen] = page ? [page[0], page[1], () => board.itemPage(page[2], m[2])] : ROUTES[h] || ROUTES['#/'];
  const prev = document.body.dataset.view;
  const onBoard = BOARDS.includes(view);
  if (page && prev === page[2]) boardY = scrollY;
  // «Назад» возвращает на витрину, только если человек пришёл с неё. Иначе ссылка из WhatsApp вела бы прочь с сайта
  if (page) canBack = prev === page[2];
  if (view === 'settings') canBack = booted;
  booted = true;
  document.body.dataset.view = view;
  stats.screen(view);
  document.querySelectorAll('.tab a').forEach((a, i) => a.classList.toggle('on', i === tabI));
  $('#board').hidden = !onBoard;
  $('#screen').hidden = onBoard;
  if (onBoard) {
    if (view !== board.state.view) board.state.kind = 'all';
    board.state.view = view;
    [$('#board-title').innerHTML, $('#board-lead').textContent] = HEAD[view];
    board.renderKinds();
    board.renderList();
    // Со страницы плитки назад на витрину: на то же место, где человек был
    const back = Object.values(PAGES).some(([pv, , bv]) => prev === pv && view === bv);
    scrollTo({ top: back ? boardY : 0, behavior: 'auto' });
  } else {
    post.showScreen(screen());
    if (page) board.galleryCounter();
    scrollTo({ top: 0, behavior: 'auto' });
  }
}

// Данные поменялись (новое объявление, админ выложил): перерисовать открытый экран
store.onChange(() => {
  const view = document.body.dataset.view;
  if (BOARDS.includes(view)) { board.renderKinds(); board.renderList(); }
  if (view === 'mine') post.showScreen(mineScreen());
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
  const TAB = [['all', 'Услуги'], ['job', 'Работа'], ['add', 'Разместить'], ['bag', 'Товары'], ['mine', 'Мои']];
  document.querySelectorAll('.tab a').forEach((a, i) => { a.innerHTML = '<i>' + icon(TAB[i][0]) + '</i>' + TAB[i][1]; });
}

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('a, button, label, .opt, [data-photo]')) sound.tap();
  const pref = t.closest('[data-pref]');
  if (pref) { settings.toggle(pref); return; }
  const opt = t.closest('.opt');
  if (opt) { post.pick(opt); return; }
  const k = t.closest('[data-kind]');
  if (k) { board.pickKind(k.dataset.kind); return; }
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

renderTab();
route();
