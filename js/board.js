// Доска: одна лента по дням (решение автора 2026-11-01, образец docs/obrazcy/lenta.html). Услуги, работа и товары
// вместе, новое сверху, группы «Сегодня», «Вчера», «30 октября». Без вкладок и рядов категорий: категории только в форме.
// Ещё здесь страница мастера и товара и поиск
import { icon, waIcon, phoneIcon, kindOf, plainName } from './icons.js';
import { esc, ago, wa, priceText, payText, plural, dayName } from './util.js';
import { $, photo, SIZES, watch } from './ui.js';
import * as store from './store.js';

export const state = { q: '' };
const TYPES = ['masters', 'requests', 'goods'];
const delay = i => `--d:${Math.min(i, 8) * 40}ms`;
const lc = s => String(s || '').toLowerCase();
// Плитки с фото: услуги и товары. Страница плитки: мастер #/m/, товар #/t/
const PAGE = { masters: '#/m/', goods: '#/t/' };
// Метка на фото: что это за объявление. «Куплю» лимонная, чтобы не спутать с продажей
const tag = x => (x.type === 'masters' ? '<span class="tag">Услуга</span>'
  : x.deal === 'buy' ? '<span class="tag buy">Куплю</span>' : '<span class="tag">Продаю</span>');

function tile(m, i) {
  const k = kindOf(m.type, m.kind);
  const n = m.photos?.length || 0;
  // Ценник: цена шрифтом Unbounded, единица мельче, чтобы ценник влез в узкую плитку
  const base = priceText(m), unit = priceText(m, true).slice(base.length);
  return `<a class="tile fade-in" style="${delay(i)}" href="${PAGE[m.type]}${m.id}">
    ${photo(m.photos?.[0], k, m.title, SIZES.tile)}${tag(m)}<span class="price num">${esc(base)}${unit ? `<small>${esc(unit)}</small>` : ''}</span>${n > 1 ? `<span class="count">${n} фото</span>` : ''}</div>
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

// Работа: карточка во всю ширину ленты
function reqRow(r, i) {
  const k = kindOf('requests', r.kind);
  const hello = `Здравствуйте! Видел вашу работу на доске «Валарг»: ${r.text}.`;
  const shots = r.photos?.length ? `<div class="req-shots">${r.photos.map(p => photo(p, k, '', SIZES.thumb) + '</div>').join('')}</div>` : '';
  return `<div class="wide"><div class="req fade-in" style="${delay(i)}">
    <div class="req-top"><p class="req-kind"><span class="pill">Работа</span>${icon(k.id)}${k.name} · ${ago(r.at)}</p><b class="req-budget num">${esc(payText(r))}</b></div>
    <h3>${esc(r.text)}</h3>
    ${r.when || r.place ? `<p class="req-meta">${r.when ? `<span>${icon('clock')}${esc(r.when)}</span>` : ''}${r.place ? `<span>${icon('pin')}${esc(r.place)}</span>` : ''}</p>` : ''}
    ${shots}
    <div class="req-acts">${reach(r, hello)}</div>
  </div></div>`;
}

// Поиск по словам: что делает или продаёт, имя, вид работ или категория, текст работы, «услуга», «работа», «куплю»
const SAY = { masters: 'услуга', requests: 'работа', goods: 'товар продаю' };
function match(x) {
  if (!state.q) return true;
  const text = lc([x.title, x.text, x.name, x.note, x.deal === 'buy' ? 'куплю' : SAY[x.type], plainName(kindOf(x.type, x.kind))].join(' '));
  return lc(state.q).split(/\s+/).every(w => text.includes(w));
}
const items = () => TYPES.flatMap(t => store.board(t).map(x => ({ ...x, type: t }))).sort((a, b) => b.at - a.at);

export function renderList() {
  // Роботу ни объявлений, ни «Пока пусто»: в поиск идут заголовок, описание и подвал
  if (store.robot) { $('#feed').hidden = true; return; }
  const days = [];
  items().filter(match).forEach(x => {
    const name = dayName(x.at);
    if (days.at(-1)?.name !== name) days.push({ name, list: [] });
    days.at(-1).list.push(x);
  });
  // Объявления ещё не пришли: «Загружаем», а не «Пока пусто». Иначе на слабой связи доска кажется пустой
  const empty = !store.loaded() ? '<p>Загружаем объявления.</p>'
    : state.q ? '<p>Ничего не нашлось.</p>' : '<p>Пока пусто.</p><a class="btn btn-ink" href="#/razmestit">Разместить</a>';
  $('#feed').innerHTML = days.length ? days.map(d => `<section>
    <div class="day"><h2>${d.name}</h2><span>${d.list.length} ${plural(d.list.length, 'объявление', 'объявления', 'объявлений')}</span></div>
    <div class="grid">${d.list.map((x, i) => (x.type === 'requests' ? reqRow : tile)(x, i)).join('')}</div>
  </section>`).join('') : `<div class="empty">${empty}</div>`;
  watch($('#feed'));
}

// Страница мастера (masters) или товара (goods): галерея, цена, связь
export function itemPage(type, id) {
  const m = store.find(type, id);
  // Объявления ещё не пришли: страница ждёт их (data-wait), app.js нарисует её заново
  if (!m && !store.loaded()) return '<div class="scr empty" data-wait><p>Загружаем объявление.</p></div>';
  if (!m || m.status !== 'ok') return '<div class="scr empty"><p>Объявление снято с доски.</p><a class="btn btn-ink" href="#/">На доску</a></div>';
  const k = kindOf(type, m.kind);
  const shots = m.photos?.length ? m.photos : [null];
  const hello = type === 'masters' ? `Здравствуйте! Пишу с доски «Валарг». Нужна ваша услуга: ${m.title}.`
    : m.deal === 'buy' ? `Здравствуйте! Видел на доске «Валарг», что вы покупаете: ${m.title}.`
      : `Здравствуйте! Пишу с доски «Валарг». Интересует ваш товар: ${m.title}.`;
  return `<article class="master">
    <div class="gal">
      <div class="gal-track" id="gal">${shots.map(p => photo(p, k, m.title, SIZES.gal) + '</div>').join('')}</div>
      <a class="round" href="#/" data-act="back" aria-label="Назад">${icon('arrow')}</a>
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
