// Доска: витрина услуг мастеров, работа от жителей, товары, страница мастера и товара, фильтр и поиск.
import { icon, waIcon, phoneIcon, kindOf, kindsOf } from './icons.js';
import { esc, ago, wa, priceText, payText } from './util.js';
import { $, photo, watch } from './ui.js';
import * as store from './store.js';

export const state = { view: 'masters', kind: 'all', q: '' };
const delay = i => `--d:${Math.min(i, 8) * 40}ms`;
const lc = s => String(s || '').toLowerCase();
// Плитки с фото: услуги и товары. Страница плитки: мастер #/m/, товар #/t/
const PAGE = { masters: '#/m/', goods: '#/t/' };
// «Куплю» в товарах: наклейка на фото, чтобы не спутать с продажей
const buyTag = x => (x.deal === 'buy' ? '<span class="deal">Куплю</span>' : '');

function tile(m, i) {
  const k = kindOf(state.view, m.kind);
  const n = m.photos?.length || 0;
  // Ценник: цена шрифтом Unbounded, единица мельче, чтобы ценник влез в узкую плитку
  const base = priceText(m), unit = priceText(m, true).slice(base.length);
  return `<a class="tile fade-in" style="${delay(i)}" href="${PAGE[state.view]}${m.id}">
    ${photo(m.photos?.[0], k, m.title)}${buyTag(m)}<span class="price num">${esc(base)}${unit ? `<small>${esc(unit)}</small>` : ''}</span>${n > 1 ? `<span class="count">${n} фото</span>` : ''}</div>
    <p class="tile-title">${esc(m.title)}</p>
    <p class="tile-who">${icon('ok')}${esc(m.name)} · ${lc(k.name)}</p>
  </a>`;
}

// Связь: WhatsApp и звонок двумя равными кнопками. На номере нет WhatsApp: одна кнопка звонка.
// У старых объявлений поля wa нет: их номера вводили как номера WhatsApp
function reach(x, hello) {
  const call = cls => `<a class="btn ${cls}" href="tel:+${x.phone}">${phoneIcon}Позвонить</a>`;
  if (x.wa === false) return call('btn-ink');
  return `<a class="btn btn-ink" href="${wa(x.phone, hello)}" target="_blank" rel="noopener">${waIcon}WhatsApp</a>${call('btn-line')}`;
}

function reqRow(r, i) {
  const k = kindOf('requests', r.kind);
  const hello = `Здравствуйте! Видел вашу работу на доске «Валарг»: ${r.text}.`;
  const shots = r.photos?.length ? `<div class="req-shots">${r.photos.map(p => photo(p, k, '', 160) + '</div>').join('')}</div>` : '';
  return `<li class="req fade-in" style="${delay(i)}">
    <div class="req-top"><p class="req-kind">${icon(k.id)}${k.name} · ${ago(r.at)}</p><b class="req-budget num">${esc(payText(r))}</b></div>
    <h3>${esc(r.text)}</h3>
    ${r.when || r.place ? `<p class="req-meta">${r.when ? `<span>${icon('clock')}${esc(r.when)}</span>` : ''}${r.place ? `<span>${icon('pin')}${esc(r.place)}</span>` : ''}</p>` : ''}
    ${shots}
    <div class="req-acts">${reach(r, hello)}</div>
  </li>`;
}

// Поиск по словам: что делает или продаёт, имя, вид работ или категория, текст работы
function match(x) {
  if (state.kind !== 'all' && x.kind !== state.kind) return false;
  if (!state.q) return true;
  const text = lc([x.title, x.text, x.name, x.note, x.deal === 'buy' ? 'куплю' : '', kindOf(state.view, x.kind).name].join(' '));
  return lc(state.q).split(/\s+/).every(w => text.includes(w));
}
const items = () => store.board(state.view);

export function renderKinds() {
  const count = id => items().filter(x => id === 'all' || x.kind === id).length;
  const chip = (id, name, ic) => {
    const n = count(id);
    return `<button class="chip" data-kind="${id}" aria-pressed="${state.kind === id}">${ic ? icon(id) : ''}${name}${n ? `<span class="n">${n}</span>` : ''}</button>`;
  };
  // Только виды, где есть объявления, в постоянном порядке. Выбранный остаётся, даже если опустел.
  // Объявлений нет совсем: ряда нет
  const used = kindsOf(state.view).filter(k => count(k.id) > 0 || state.kind === k.id);
  $('#kinds').parentElement.hidden = !used.length;
  $('#kinds').setAttribute('aria-label', state.view === 'goods' ? 'Категории товаров' : 'Виды работ');
  $('#kinds').innerHTML = chip('all', 'Все', false) + used.map(k => chip(k.id, k.name, true)).join('');
}

// Пустой раздел: кнопка разместить своё
const ADD = {
  masters: ['#/razmestit/usluga', 'Предложить услугу'],
  requests: ['#/razmestit/rabota', 'Предложить работу'],
  goods: ['#/razmestit/tovar', 'Разместить товар'],
};

export function renderList() {
  const isM = state.view !== 'requests';
  // Роботу ни объявлений, ни «Пока пусто»: в поиск идут заголовок, описание и подвал
  if (store.robot) { $('#grid').hidden = $('#reqs').hidden = true; return; }
  const list = items().filter(match);
  const [href, label] = ADD[state.view];
  const empty = `<div class="empty"><p>${state.q || state.kind !== 'all' ? 'Ничего не нашлось.' : 'Пока пусто.'}</p>
    <a class="btn btn-ink" href="${href}">${label}</a></div>`;
  $('#grid').hidden = !isM;
  $('#reqs').hidden = isM;
  const box = isM ? $('#grid') : $('#reqs');
  box.innerHTML = list.length ? list.map(isM ? tile : reqRow).join('') : (isM ? empty : `<li>${empty}</li>`);
  watch(box);
}

export function pickKind(id) {
  state.kind = id;
  document.querySelectorAll('#kinds .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.kind === id));
  renderList();
}

// Страница мастера (masters) или товара (goods): галерея, цена, связь
export function itemPage(type, id) {
  const m = store.find(type, id);
  const home = type === 'goods' ? ['#/tovary', 'К товарам'] : ['#/', 'К услугам'];
  if (!m || m.status !== 'ok') return `<div class="scr empty"><p>Объявление снято с доски.</p><a class="btn btn-ink" href="${home[0]}">${home[1]}</a></div>`;
  const k = kindOf(type, m.kind);
  const shots = m.photos?.length ? m.photos : [null];
  const hello = type === 'masters' ? `Здравствуйте! Пишу с доски «Валарг». Нужна ваша услуга: ${m.title}.`
    : m.deal === 'buy' ? `Здравствуйте! Видел на доске «Валарг», что вы покупаете: ${m.title}.`
      : `Здравствуйте! Пишу с доски «Валарг». Интересует ваш товар: ${m.title}.`;
  return `<article class="master">
    <div class="gal">
      <div class="gal-track" id="gal">${shots.map(p => photo(p, k, m.title, 1000) + '</div>').join('')}</div>
      <a class="round" href="${home[0]}" data-act="back" aria-label="Назад">${icon('arrow')}</a>
      ${shots.length > 1 ? `<span class="count" id="gal-n">1 / ${shots.length}</span>` : ''}
    </div>
    <div class="m-body">
      <p class="ver">${icon('ok')}Проверено админом группы «Валарг»</p>
      <h1>${m.deal === 'buy' ? 'Куплю: ' : ''}${esc(m.title)}</h1>
      <p class="m-who">${esc(m.name)} · ${k.name}</p>
      <p class="m-price num">${priceText(m)}${m.price && m.unit ? `<small>${esc(m.unit)}</small>` : ''}</p>
      ${m.note ? `<p class="m-note">${esc(m.note)}</p>` : ''}
      <p class="m-date">Размещено ${ago(m.at)}</p>
    </div>
    <div class="m-bar">${reach(m, hello)}</div>
  </article>`;
}

// Номер фото в галерее при листании
export function galleryCounter() {
  const g = $('#gal'), n = $('#gal-n');
  if (!g || !n) return;
  g.addEventListener('scroll', () => { n.textContent = `${Math.round(g.scrollLeft / g.clientWidth) + 1} / ${g.children.length}`; }, { passive: true });
}
