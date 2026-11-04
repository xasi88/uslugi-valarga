// Фильтр ленты (решение автора 2026-11-04): одна кнопка над лентой. Касание: окно-наклейка, как окно первого входа.
// Сначала раздел, потом категория с числом объявлений. Пустые разделы и категории не показываются,
// чтобы человек не попал в пустой список. Выбор виден на кнопке лимонной пилюлей, крестик рядом показывает всё.
// Поиск работает вместе с фильтром (board.js, match). Выбор живёт до перезагрузки страницы
import { icon, kindsOf, plainName } from './icons.js';
import { esc, SECTIONS, tally } from './util.js';
import { $ } from './ui.js';
import { send } from './stats.js';

export const pick = { sec: '', kind: '' };
let redraw = () => {};
export const onChange = fn => { redraw = fn; };

let list = [];
let box = null;
let draft = '';

const kindsFor = sec => kindsOf(sec === 'sell' || sec === 'buy' ? 'goods' : sec);
const secName = sec => SECTIONS.find(([v]) => v === sec)?.[1] || '';
const kindName = (sec, id) => plainName(kindsFor(sec).find(k => k.id === id) || { name: '' });
const label = () => (!pick.sec ? 'Все объявления' : secName(pick.sec) + (pick.kind ? ' · ' + kindName(pick.sec, pick.kind) : ''));

// Кнопка над лентой. items: все объявления доски, без поиска и фильтра: по ним числа в окне
export function draw(items) {
  list = items;
  const root = $('#filter');
  if (!root) return;
  root.hidden = !items.length && !pick.sec;
  root.innerHTML = `<button class="btn filt-btn${pick.sec ? ' on' : ''}" type="button" data-filt="open" aria-haspopup="dialog">${icon('all')}<span>${esc(label())}</span>${icon('down')}</button>`
    + (pick.sec ? `<button class="round" type="button" data-filt="all" aria-label="Показать все объявления">${icon('x')}</button>` : '');
  if (box) render();
}

function render() {
  const n = tally(list);
  const secs = SECTIONS.filter(([v]) => n[v] || v === pick.sec);
  const kinds = draft ? kindsFor(draft).filter(k => n[`${draft}/${k.id}`]) : [];
  const chip = (v, t, c) => `<button class="chip" type="button" data-sec="${v}" aria-pressed="${draft === v}"><span>${t}</span><b class="n">${c || 0}</b></button>`;
  box.querySelector('.start-card').innerHTML = `<div class="filt-head"><h2 id="filt-h">Что показать</h2>
      <button class="round" type="button" data-filt="close" aria-label="Закрыть">${icon('x')}</button></div>
    <div class="filt-secs">${chip('', 'Все', list.length)}${secs.map(([v, t]) => chip(v, t, n[v])).join('')}</div>
    ${draft ? `<p class="start-lead">Категория: нажмите, и на доске останутся только её объявления.</p>
      <div class="pick-kinds filt-kinds">${kinds.map(k => `<button class="chip" type="button" data-kind="${k.id}" aria-pressed="${pick.sec === draft && pick.kind === k.id}">${icon(k.id)}<span>${k.name}</span><b class="n">${n[`${draft}/${k.id}`]}</b></button>`).join('')}</div>`
    : '<p class="start-lead">Выберите раздел, потом категорию.</p>'}
    <button class="btn btn-ink btn-wide" type="button" data-filt="show">${draft ? `Все в разделе «${secName(draft)}»: ${n[draft] || 0}` : `Все объявления: ${list.length}`}</button>`;
}

function open() {
  if (box) return;
  draft = pick.sec;
  box = document.createElement('div');
  box.className = 'start filt-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'filt-h');
  box.innerHTML = '<div class="start-card"></div>';
  render();
  // Касание мимо наклейки закрывает окно, выбор не меняется
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.body.append(box);
  document.documentElement.classList.add('start-open');
  box.querySelector('[data-filt="close"]').focus({ preventScroll: true });
}

function close() {
  if (!box) return;
  box.remove();
  box = null;
  document.documentElement.classList.remove('start-open');
}

function apply(sec, kind = '') {
  pick.sec = sec;
  pick.kind = kind;
  close();
  redraw();
  send({ 'Фильтр': sec ? { [secName(sec)]: kind ? kindName(sec, kind) : 'Весь раздел' } : 'Все' });
}

document.addEventListener('click', e => {
  const f = e.target.closest('[data-filt]');
  if (f) {
    const a = f.dataset.filt;
    if (a === 'open') open();
    if (a === 'close') close();
    if (a === 'all') apply('');
    if (a === 'show') apply(draft);
    return;
  }
  const s = e.target.closest('[data-sec]');
  if (s && box) { draft = s.dataset.sec; render(); return; }
  const k = e.target.closest('[data-kind]');
  if (k && box) apply(draft, k.dataset.kind);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && box) close(); });
