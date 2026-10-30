// Доска: витрина услуг мастеров, работа от жителей, страница мастера, фильтр и поиск.
import { icon, waIcon, phoneIcon, KINDS, kindById } from './icons.js';
import { esc, ago, wa, priceText, payText } from './util.js';
import { $, photo, watch } from './ui.js';
import * as store from './store.js';

export const state = { view: 'masters', kind: 'all', q: '' };
const delay = i => `--d:${Math.min(i, 8) * 40}ms`;
const lc = s => String(s || '').toLowerCase();

function tile(m, i) {
  const k = kindById(m.kind);
  const n = m.photos?.length || 0;
  // Ценник: цена шрифтом Unbounded, единица мельче, чтобы ценник влез в узкую плитку
  const base = priceText(m), unit = priceText(m, true).slice(base.length);
  return `<a class="tile fade-in" style="${delay(i)}" href="#/m/${m.id}">
    ${photo(m.photos?.[0], k, m.title)}<span class="price num">${esc(base)}${unit ? `<small>${esc(unit)}</small>` : ''}</span>${n > 1 ? `<span class="count">${n} фото</span>` : ''}</div>
    <p class="tile-title">${esc(m.title)}</p>
    <p class="tile-who">${icon('ok')}${esc(m.name)} · ${lc(k.name)}</p>
  </a>`;
}

function reqRow(r, i) {
  const k = kindById(r.kind);
  const hello = `Здравствуйте! Видел вашу работу на доске «Услуги Валарга»: ${r.text}.`;
  const shots = r.photos?.length ? `<div class="req-shots">${r.photos.map(p => photo(p, k, '', 160) + '</div>').join('')}</div>` : '';
  return `<li class="req fade-in" style="${delay(i)}">
    <div class="req-top"><p class="req-kind">${icon(k.id)}${k.name} · ${ago(r.at)}</p><b class="req-budget num">${esc(payText(r))}</b></div>
    <h3>${esc(r.text)}</h3>
    ${r.when || r.place ? `<p class="req-meta">${r.when ? `<span>${icon('clock')}${esc(r.when)}</span>` : ''}${r.place ? `<span>${icon('pin')}${esc(r.place)}</span>` : ''}</p>` : ''}
    ${shots}
    <div class="req-acts">
      <a class="btn btn-ink" href="${wa(r.phone, hello)}" target="_blank" rel="noopener">${waIcon}Написать в WhatsApp</a>
      <a class="btn btn-line sq" href="tel:+${r.phone}" aria-label="Позвонить: ${esc(r.name)}">${phoneIcon}</a>
    </div>
  </li>`;
}

// Поиск по словам: что делает, имя, вид работ, текст работы
function match(x) {
  if (state.kind !== 'all' && x.kind !== state.kind) return false;
  if (!state.q) return true;
  const text = lc([x.title, x.text, x.name, x.note, kindById(x.kind).name].join(' '));
  return lc(state.q).split(/\s+/).every(w => text.includes(w));
}
const items = () => store.board(state.view);

export function renderKinds() {
  const count = id => items().filter(x => id === 'all' || x.kind === id).length;
  const chip = (id, name, ic) => {
    const n = count(id);
    return `<button class="chip" data-kind="${id}" aria-pressed="${state.kind === id}">${ic ? icon(id) : ''}${name}${n ? `<span class="n">${n}</span>` : ''}</button>`;
  };
  // Виды, где есть объявления, первыми
  const sorted = [...KINDS].sort((a, b) => (count(b.id) > 0) - (count(a.id) > 0));
  $('#kinds').innerHTML = chip('all', 'Все', false) + sorted.map(k => chip(k.id, k.name, true)).join('');
}

export function renderList() {
  const list = items().filter(match);
  const isM = state.view === 'masters';
  const empty = `<div class="empty"><p>${state.q || state.kind !== 'all' ? 'Ничего не нашлось.' : 'Пока пусто.'}</p>
    ${isM ? '<a class="btn btn-ink" href="#/razmestit/usluga">Предложить услугу</a>' : '<a class="btn btn-ink" href="#/razmestit/rabota">Предложить работу</a>'}</div>`;
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

export function masterPage(id) {
  const m = store.find('masters', id);
  if (!m || m.status !== 'ok') return `<div class="scr empty"><p>Объявление снято с доски.</p><a class="btn btn-ink" href="#/">К услугам</a></div>`;
  const k = kindById(m.kind);
  const shots = m.photos?.length ? m.photos : [null];
  const hello = `Здравствуйте! Пишу с доски «Услуги Валарга». Нужна ваша услуга: ${m.title}.`;
  return `<article class="master">
    <div class="gal">
      <div class="gal-track" id="gal">${shots.map(p => photo(p, k, m.title, 1000) + '</div>').join('')}</div>
      <a class="round" href="#/" data-act="back" aria-label="Назад">${icon('arrow')}</a>
      ${shots.length > 1 ? `<span class="count" id="gal-n">1 / ${shots.length}</span>` : ''}
    </div>
    <div class="m-body">
      <p class="ver">${icon('ok')}Проверено админом группы «Валарг»</p>
      <h1>${esc(m.title)}</h1>
      <p class="m-who">${esc(m.name)} · ${k.name}</p>
      <p class="m-price num">${priceText(m)}${m.price && m.unit ? `<small>${esc(m.unit)}</small>` : ''}</p>
      ${m.note ? `<p class="m-note">${esc(m.note)}</p>` : ''}
      <p class="m-date">Размещено ${ago(m.at)}</p>
    </div>
    <div class="m-bar">
      <a class="btn btn-ink" href="${wa(m.phone, hello)}" target="_blank" rel="noopener">${waIcon}Написать в WhatsApp</a>
      <a class="btn btn-line sq" href="tel:+${m.phone}" aria-label="Позвонить: ${esc(m.name)}">${phoneIcon}</a>
    </div>
  </article>`;
}

// Номер фото в галерее при листании
export function galleryCounter() {
  const g = $('#gal'), n = $('#gal-n');
  if (!g || !n) return;
  g.addEventListener('scroll', () => { n.textContent = `${Math.round(g.scrollLeft / g.clientWidth) + 1} / ${g.children.length}`; }, { passive: true });
}
