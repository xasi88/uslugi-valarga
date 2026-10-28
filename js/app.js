// Доска «Услуги Валарга»: переходы между экранами, меню, поиск, касания.
// Экраны: витрина и заявки (board.js), «Разместить» и «Предложить цену» (post.js), «Мои» (mine.js).
import { icon } from './icons.js';
import { $, toast } from './ui.js';
import * as board from './board.js';
import * as post from './post.js';
import { addShots, removeShot } from './photos.js';
import { mineScreen } from './mine.js';
import * as store from './store.js';
import './install.js';

// Адрес → экран и пункт меню
const ROUTES = {
  '#/': ['masters', 0],
  '#/zayavki': ['requests', 1],
  '#/razmestit': ['post', 2, post.choiceScreen],
  '#/razmestit/zayavka': ['post', 2, post.requestForm],
  '#/razmestit/usluga': ['post', 2, post.masterForm],
  '#/gotovo': ['post', 2, post.doneScreen],
  '#/moi': ['mine', 3, mineScreen],
};
const HEAD = {
  masters: ['Работы мастеров <em>Валарга</em>', 'Смотрите, как мастер уже сделал. Цена на фото.'],
  requests: ['Заявки <em>жителей</em>', 'Людям нужен мастер. Предложите свою цену.'],
};

let boardY = 0;
let canBack = false;
function route() {
  const h = location.hash || '#/';
  const m = h.match(/^#\/m\/([\w-]+)$/);
  const [view, tabI, screen] = m ? ['master', 0, () => board.masterPage(m[1])] : ROUTES[h] || ROUTES['#/'];
  const prev = document.body.dataset.view;
  const onBoard = view === 'masters' || view === 'requests';
  if (prev === 'masters' && view === 'master') boardY = scrollY;
  // «Назад» возвращает на витрину, только если человек пришёл с неё. Иначе ссылка из WhatsApp вела бы прочь с сайта
  if (view === 'master') canBack = prev === 'masters';
  document.body.dataset.view = view;
  document.querySelectorAll('.tab a').forEach((a, i) => a.classList.toggle('on', i === tabI));
  $('#board').hidden = !onBoard;
  $('#screen').hidden = onBoard;
  if (onBoard) {
    if (view !== board.state.view) board.state.kind = 'all';
    board.state.view = view;
    [$('#board-title').innerHTML, $('#board-lead').textContent] = HEAD[view];
    board.renderKinds();
    board.renderList();
    // С мастера назад на витрину: на то же место, где человек был
    scrollTo({ top: prev === 'master' && view === 'masters' ? boardY : 0, behavior: 'auto' });
  } else {
    post.showScreen(screen());
    if (view === 'master') board.galleryCounter();
    scrollTo({ top: 0, behavior: 'auto' });
  }
}

// Данные поменялись (новое объявление, админ выложил): перерисовать открытый экран
store.onChange(() => {
  const view = document.body.dataset.view;
  if (view === 'masters' || view === 'requests') { board.renderKinds(); board.renderList(); }
  if (view === 'mine') post.showScreen(mineScreen());
});

function renderTab() {
  const TAB = [['all', 'Работы'], ['requests', 'Заявки'], ['add', 'Разместить'], ['mine', 'Мои']];
  document.querySelectorAll('.tab a').forEach((a, i) => { a.innerHTML = '<i>' + icon(TAB[i][0]) + '</i>' + TAB[i][1]; });
}

document.addEventListener('click', e => {
  const t = e.target;
  const opt = t.closest('.opt');
  if (opt) { post.pick(opt); return; }
  const k = t.closest('[data-kind]');
  if (k) { board.pickKind(k.dataset.kind); return; }
  const ob = t.closest('.offers-btn');
  if (ob) { ob.setAttribute('aria-expanded', ob.parentElement.classList.toggle('open')); return; }
  const shot = t.closest('[data-shot]');
  if (shot) { removeShot(shot.closest('form'), +shot.dataset.shot); return; }
  const act = t.closest('[data-act]');
  if (!act) return;
  const { act: a, id, type } = act.dataset;
  if (a === 'back' && canBack) { e.preventDefault(); history.back(); }
  if (a === 'offer') post.openOffer(id);
  if (a === 'close') post.closeOffer();
  if (a === 'found') { store.setStatus('requests', id, 'done'); toast('Заявка снята с доски. Хорошей работы!'); }
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
  const f = e.target;
  if (f.classList.contains('sheet')) post.submitOffer(f);
  else post.submit(f);
});

addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 8), { passive: true });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) post.closeOffer(); });
addEventListener('hashchange', route);

renderTab();
route();
