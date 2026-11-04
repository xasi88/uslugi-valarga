// Доска: одна лента по дням (решение автора 2026-11-01, образец docs/obrazcy/lenta.html). Услуги, работа и товары
// вместе, новое сверху, группы «Сегодня», «Вчера», «30 октября». Без вкладок и рядов категорий: категории только в форме.
// Все объявления одной плиткой (решение автора 2026-11-04): работа больше не широкая карточка, у неё своя страница.
// Ещё здесь страница объявления и поиск
import { icon, waIcon, phoneIcon, kindOf, plainName } from './icons.js';
import { esc, ago, wa, money, unitShort, plural, dayName } from './util.js';
import { $, photo, SIZES, watch } from './ui.js';
import * as store from './store.js';
import { prepare } from './share.js';

export const state = { q: '' };
const TYPES = ['masters', 'requests', 'goods'];
const delay = i => `--d:${Math.min(i, 8) * 40}ms`;
const lc = s => String(s || '').toLowerCase();
// Страница плитки: услуга #/m/, товар #/t/, работа #/r/
const PAGE = { masters: '#/m/', goods: '#/t/', requests: '#/r/' };
// Метка на фото: что это за объявление. «Куплю» лимонная, чтобы не спутать с продажей, «Работа» мятная
const tag = x => (x.type === 'masters' ? '<span class="tag">Услуга</span>'
  : x.type === 'requests' ? '<span class="tag work">Работа</span>'
    : x.deal === 'buy' ? '<span class="tag buy">Куплю</span>' : '<span class="tag">Продаю</span>');

// Что и сколько у любого объявления: у работы текст и оплата, у услуги и товара название и цена
const what = x => (x.type === 'requests' ? x.text : x.title);
const sum = x => (x.type === 'requests' ? x.budget : x.price);
const base = x => (sum(x) ? (x.from ? 'от ' : '') + money(sum(x)) : 'договорная');

function tile(x, i) {
  const k = kindOf(x.type, x.kind);
  const n = x.photos?.length || 0;
  // Ценник: цена шрифтом Unbounded, единица коротко и мельче, чтобы ценник влез в узкую плитку
  const unit = sum(x) ? unitShort(x.unit) : '';
  return `<a class="tile fade-in" style="${delay(i)}" href="${PAGE[x.type]}${x.id}">
    ${photo(x.photos?.[0], k, what(x), SIZES.tile)}${tag(x)}<span class="price num">${esc(base(x))}${unit ? `<small>${esc(unit)}</small>` : ''}</span>${n > 1 ? `<span class="count">${n} фото</span>` : ''}</div>
    <p class="tile-title">${esc(what(x))}</p>
    <p class="tile-who">${icon('ok')}${esc(x.name)} · ${lc(k.name)}</p>
  </a>`;
}

// Связь: WhatsApp и звонок двумя равными кнопками. На номере нет WhatsApp: одна кнопка звонка.
// У старых объявлений поля wa нет: их номера вводили как номера WhatsApp
function reach(x, hello) {
  const call = cls => `<a class="btn ${cls}" href="tel:+${x.phone}">${phoneIcon}Позвонить</a>`;
  if (x.wa === false) return call('btn-ink');
  return `<a class="btn btn-ink" href="${wa(x.phone, hello)}" target="_blank" rel="noopener">${waIcon}WhatsApp</a>${call('btn-line')}`;
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
    <div class="grid">${d.list.map(tile).join('')}</div>
  </section>`).join('') : `<div class="empty">${empty}</div>`;
  watch($('#feed'));
}

// Первая фраза в WhatsApp: человек сразу понимает, о каком объявлении речь
function hello(type, x) {
  if (type === 'requests') return `Здравствуйте! Видел вашу работу на доске «Валарг»: ${x.text}.`;
  if (type === 'masters') return `Здравствуйте! Пишу с доски «Валарг». Нужна ваша услуга: ${x.title}.`;
  return x.deal === 'buy' ? `Здравствуйте! Видел на доске «Валарг», что вы покупаете: ${x.title}.`
    : `Здравствуйте! Пишу с доски «Валарг». Интересует ваш товар: ${x.title}.`;
}

// Страница объявления: услуга, работа или товар. Галерея, цена, подробности, «Поделиться», связь
export function itemPage(type, id) {
  const found = store.find(type, id);
  // Объявления ещё не пришли: страница ждёт их (data-wait), app.js нарисует её заново
  if (!found && !store.loaded()) return '<div class="scr empty" data-wait><p>Загружаем объявление.</p></div>';
  if (!found || found.status !== 'ok') return '<div class="scr empty"><p>Объявление снято с доски.</p><a class="btn btn-ink" href="#/">На доску</a></div>';
  const x = { ...found, type };
  prepare(x);
  const k = kindOf(type, x.kind);
  const shots = x.photos?.length ? x.photos : [null];
  const meta = type === 'requests' && (x.when || x.place)
    ? `<p class="req-meta">${x.when ? `<span>${icon('clock')}${esc(x.when)}</span>` : ''}${x.place ? `<span>${icon('pin')}${esc(x.place)}</span>` : ''}</p>` : '';
  return `<article class="master">
    <div class="gal">
      <div class="gal-track" id="gal">${shots.map(p => photo(p, k, what(x), SIZES.gal) + '</div>').join('')}</div>
      <a class="round" href="#/" data-act="back" aria-label="Назад">${icon('arrow')}</a>
      ${shots.length > 1 ? `<span class="count" id="gal-n">1 / ${shots.length}</span>` : ''}
    </div>
    <div class="m-body">
      <p class="ver">${icon('ok')}Проверено админом группы «Валарг»</p>
      <h1>${type === 'requests' ? 'Работа: ' : x.deal === 'buy' ? 'Куплю: ' : ''}${esc(what(x))}</h1>
      <p class="m-who">${esc(x.name)} · ${k.name}</p>
      <p class="m-price num">${esc(base(x))}${sum(x) && x.unit ? `<small>${esc(x.unit)}</small>` : ''}</p>
      ${meta}
      ${x.note ? `<p class="m-note">${esc(x.note)}</p>` : ''}
      <p class="m-date">Размещено ${ago(x.at)}</p>
      <button class="btn btn-line share" type="button" data-act="share" data-type="${type}" data-id="${x.id}">${icon('share')}Поделиться</button>
    </div>
    <div class="m-bar">${reach(x, hello(type, x))}</div>
  </article>`;
}

// Номер фото в галерее при листании
export function galleryCounter() {
  const g = $('#gal'), n = $('#gal-n');
  if (!g || !n) return;
  g.addEventListener('scroll', () => { n.textContent = `${Math.round(g.scrollLeft / g.clientWidth) + 1} / ${g.children.length}`; }, { passive: true });
}
