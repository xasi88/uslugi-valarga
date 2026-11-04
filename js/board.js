// Доска: одна лента по дням (решение автора 2026-11-01, образец docs/obrazcy/lenta.html). Услуги, работа и товары
// вместе, новое сверху, группы «Сегодня», «Вчера», «30 октября». Без вкладок и рядов категорий: раздел и категорию
// выбирают одной кнопкой над лентой (filter.js, решение автора 2026-11-04).
// Все объявления одной плиткой (решение автора 2026-11-04): работа больше не широкая карточка, у неё своя страница.
// Объявления села (решение автора 2026-11-04): тоже плитка, без цены. Без фото на плитке начало текста.
// Объявление админа синее, с меткой «От админа». Ещё здесь страница объявления и поиск
import { icon, waIcon, phoneIcon, kindOf, plainName } from './icons.js';
import { esc, ago, wa, money, unitShort, plural, dayName, LIFE, fits } from './util.js';
import { $, photo, SIZES, watch } from './ui.js';
import * as store from './store.js';
import { prepare } from './share.js';
import * as filter from './filter.js';

export const state = { q: '' };
const TYPES = ['masters', 'requests', 'goods', 'news'];
const delay = i => `--d:${Math.min(i, 8) * 40}ms`;
const lc = s => String(s || '').toLowerCase();
// Страница плитки: услуга #/m/, товар #/t/, работа #/r/, объявление села #/n/
const PAGE = { masters: '#/m/', goods: '#/t/', requests: '#/r/', news: '#/n/' };
// Метка на фото: что это за объявление. «Куплю» лимонная, чтобы не спутать с продажей, «Работа» мятная,
// «Село» чёрная, «От админа» на синей плитке
const tag = x => (x.type === 'masters' ? '<span class="tag">Услуга</span>'
  : x.type === 'requests' ? '<span class="tag work">Работа</span>'
    : x.type === 'news' ? (x.admin ? '<span class="tag admin">От админа</span>' : '<span class="tag news">Село</span>')
      : x.deal === 'buy' ? '<span class="tag buy">Куплю</span>' : '<span class="tag">Продаю</span>');
const ADMIN_NAME = 'Админ группы «Валарг»';
const who = x => (x.admin ? ADMIN_NAME : x.name);

// Что и сколько у любого объявления: у работы и объявления села текст, у услуги и товара название. Цена, оплата
const what = x => (x.type === 'requests' || x.type === 'news' ? x.text : x.title);
const sum = x => (x.type === 'requests' ? x.budget : x.price);
const base = x => (sum(x) ? (x.from ? 'от ' : '') + money(sum(x)) : 'договорная');

function tile(x, i) {
  const k = kindOf(x.type, x.kind);
  const n = x.photos?.length || 0;
  const isNews = x.type === 'news';
  // Ценник: цена шрифтом Unbounded, единица коротко и мельче, чтобы ценник влез в узкую плитку
  const unit = sum(x) ? unitShort(x.unit) : '';
  const cost = isNews ? '' : `<span class="price num">${esc(base(x))}${unit ? `<small>${esc(unit)}</small>` : ''}</span>`;
  // Объявление села без фото: начало текста на тоне вида, под плиткой вид. С фото: как у всех
  const note = isNews && !n;
  const pic = note ? `<div class="ph ph-note" style="--tone:var(--tone-${k.tint})"><p>${esc(x.text)}</p>` : photo(x.photos?.[0], k, what(x), SIZES.tile);
  return `<a class="tile fade-in${x.admin ? ' admin' : ''}" style="${delay(i)}" href="${PAGE[x.type]}${x.id}">
    ${pic}${tag(x)}${cost}${n > 1 ? `<span class="count">${n} фото</span>` : ''}</div>
    <p class="tile-title">${esc(note ? plainName(k) : what(x))}</p>
    <p class="tile-who">${icon('ok')}${esc(who(x))}${note ? '' : ' · ' + lc(plainName(k))}</p>
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
const SAY = { masters: 'услуга', requests: 'работа', goods: 'товар продаю', news: 'объявление село новость' };
function match(x) {
  // Фильтр над лентой (filter.js): раздел и категория. Поиск ищет внутри них
  if (!fits(x, filter.pick)) return false;
  if (!state.q) return true;
  const text = lc([x.title, x.text, who(x), x.note, x.deal === 'buy' ? 'куплю' : SAY[x.type], plainName(kindOf(x.type, x.kind))].join(' '));
  return lc(state.q).split(/\s+/).every(w => text.includes(w));
}
// Объявление села живёт 24 часа: доска прячет его сама, почтальон снимает его раз в час
const alive = x => x.type !== 'news' || Date.now() - x.at < LIFE.news * 864e5;
const items = () => TYPES.flatMap(t => store.board(t).map(x => ({ ...x, type: t }))).filter(alive).sort((a, b) => b.at - a.at);

// Лента частями (решение автора 2026-11-04): сначала PART плиток, следующие при прокрутке к концу ленты.
// Поиск ищет по всем объявлениям: частями только рисуются плитки. Тормозят плитки и фото, а не данные
const PART = 24;
let feed = { list: [], shown: 0, days: {}, q: null };
const end = document.createElement('div');
const more = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) addPart(PART); }, { rootMargin: '800px 0px' }) : null;

// Дорисовать n плиток в конец ленты. Плитка того же дня встаёт в его сетку, новый день начинает свою
function addPart(n) {
  const root = $('#feed');
  const part = feed.list.slice(feed.shown, feed.shown + n);
  feed.shown += part.length;
  let sec = root.lastElementChild;
  part.forEach((x, i) => {
    const name = dayName(x.at);
    if (sec?.dataset.day !== name) {
      const k = feed.days[name];
      root.insertAdjacentHTML('beforeend', `<section data-day="${name}"><div class="day"><h2>${name}</h2>`
        + `<span>${k} ${plural(k, 'объявление', 'объявления', 'объявлений')}</span></div><div class="grid"></div></section>`);
      sec = root.lastElementChild;
    }
    sec.lastElementChild.insertAdjacentHTML('beforeend', tile(x, i));
  });
  watch(root);
  // Конец ленты всё ещё близко (большой экран, быстрая прокрутка): заново спросить, видно ли его
  end.hidden = feed.shown >= feed.list.length;
  if (more) { more.unobserve(end); if (!end.hidden) more.observe(end); }
}

export function renderList() {
  const root = $('#feed');
  // Роботу ни объявлений, ни «Пока пусто»: в поиск идут заголовок, описание и подвал
  if (store.robot) { root.hidden = true; return; }
  if (!end.isConnected) root.after(end);
  const all = items();
  filter.draw(all);
  const list = all.filter(match);
  const days = {};
  list.forEach(x => { const d = dayName(x.at); days[d] = (days[d] || 0) + 1; });
  // Новые объявления пришли, пока человек листает: лента сохраняет, сколько он уже видел. Новый поиск: сначала
  const key = `${state.q}|${filter.pick.sec}|${filter.pick.kind}`;
  const n = more ? (key === feed.q ? Math.max(PART, feed.shown) : PART) : list.length;
  feed = { list, shown: 0, days, q: key };
  root.innerHTML = '';
  if (list.length) return addPart(n);
  end.hidden = true;
  // Объявления ещё не пришли: «Загружаем», а не «Пока пусто». Иначе на слабой связи доска кажется пустой
  const empty = !store.loaded() ? '<p>Загружаем объявления.</p>'
    : state.q ? '<p>Ничего не нашлось.</p>'
      : filter.pick.sec ? '<p>Здесь пока пусто.</p><button class="btn btn-ink" type="button" data-filt="all">Показать все объявления</button>'
        : '<p>Пока пусто.</p><a class="btn btn-ink" href="#/razmestit">Разместить</a>';
  root.innerHTML = `<div class="empty">${empty}</div>`;
}

// Первая фраза в WhatsApp: человек сразу понимает, о каком объявлении речь
function hello(type, x) {
  if (type === 'requests') return `Здравствуйте! Видел вашу работу на доске «Валарг»: ${x.text}.`;
  if (type === 'masters') return `Здравствуйте! Пишу с доски «Валарг». Нужна ваша услуга: ${x.title}.`;
  if (type === 'news') return `Здравствуйте! Пишу по объявлению на доске «Валарг»: ${x.text.slice(0, 80)}.`;
  return x.deal === 'buy' ? `Здравствуйте! Видел на доске «Валарг», что вы покупаете: ${x.title}.`
    : `Здравствуйте! Пишу с доски «Валарг». Интересует ваш товар: ${x.title}.`;
}

// Страница объявления: услуга, работа, товар или объявление села. Галерея, цена, подробности, «Поделиться», связь
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
  const isNews = type === 'news';
  const title = isNews ? plainName(k) : (type === 'requests' ? 'Работа: ' : x.deal === 'buy' ? 'Куплю: ' : '') + what(x);
  const ver = x.admin ? `<p class="ver admin">${icon('ok')}От админа группы «Валарг»</p>` : `<p class="ver">${icon('ok')}Проверено админом группы «Валарг»</p>`;
  // Объявление села без фото: вместо большого места под фото низкая полоса со значком вида
  return `<article class="master${isNews && !x.photos?.length ? ' m-short' : ''}">
    <div class="gal">
      <div class="gal-track" id="gal">${shots.map(p => photo(p, k, what(x), SIZES.gal) + '</div>').join('')}</div>
      <a class="round" href="#/" data-act="back" aria-label="Назад">${icon('arrow')}</a>
      ${shots.length > 1 ? `<span class="count" id="gal-n">1 / ${shots.length}</span>` : ''}
    </div>
    <div class="m-body">
      ${ver}
      <h1>${esc(title)}</h1>
      <p class="m-who">${esc(who(x))}${isNews ? '' : ' · ' + k.name}</p>
      ${isNews ? `<p class="m-text">${esc(x.text)}</p>` : `<p class="m-price num">${esc(base(x))}${sum(x) && x.unit ? `<small>${esc(x.unit)}</small>` : ''}</p>`}
      ${meta}
      ${x.note ? `<p class="m-note">${esc(x.note)}</p>` : ''}
      <p class="m-date">Размещено ${ago(x.at)}</p>
      <button class="btn btn-line share" type="button" data-act="share" data-type="${type}" data-id="${x.id}">${icon('share')}Поделиться</button>
      <button class="rep-link" type="button" data-act="report" data-type="${type}" data-id="${x.id}">Пожаловаться</button>
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

// Выбрали раздел или категорию над лентой: лента заново, с первой части
filter.onChange(renderList);
