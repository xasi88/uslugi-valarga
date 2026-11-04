// Экраны «Разместить» (услуга, работа, товар или объявление села) и «Отправлено».
import { icon, waIcon, phoneIcon, KINDS, GOODS, NEWS } from './icons.js';
import { esc, phone, phoneNice, price, clean, wa } from './util.js';
import { ADMIN_PHONE } from './config.js';
import { $, reduce, toast, watch, photo } from './ui.js';
import { shotsField, upload } from './photos.js';
import * as store from './store.js';
import { send } from './stats.js';
import * as sound from './sound.js';
import * as push from './push.js';
import { prefs, chosen, setPref } from './prefs.js';

const back = href => `<a class="back" href="${href}" aria-label="Назад">${icon('arrow')}</a>`;
// Админ на этом телефоне: его объявление сразу на доске, без проверки (решение автора 2026-11-04)
const sendLabel = () => (store.adminHere() ? 'Выложить на доску' : 'Отправить на проверку');
let lastOwn = false;

// Связь с админом: WhatsApp автора с готовой первой фразой
export const toAdmin = () => wa(ADMIN_PHONE, 'Здравствуйте! Пишу с доски «Валарг».');
export const adminLine = text => `<a class="to-admin" href="${toAdmin()}" target="_blank" rel="noopener">${waIcon}${text}</a>`;

// Имя и номер запоминаются на телефоне: второй раз вводить не нужно
function contact() {
  try { return JSON.parse(localStorage.getItem('uv-contact')) || {}; } catch { return {}; }
}
function keepContact(name, ph, hasWa) {
  try { localStorage.setItem('uv-contact', JSON.stringify({ name, phone: ph, wa: hasWa })); } catch { /* не страшно */ }
}

// Виды работ и категории товаров: ровная сетка одинаковых плиток, значок над названием. Остальной выбор: пилюли в строку.
// value: что нажато сразу
const opts = (name, list, withIcons, value) => `<div class="pick${withIcons ? ' pick-kinds' : ''}" data-name="${name}">${list.map(([v, t]) =>
  `<button type="button" class="chip opt" data-v="${v}" aria-pressed="${v === value}">${withIcons ? icon(v) : ''}<span>${t}</span></button>`).join('')}</div>
  <input type="hidden" name="${name}" value="${esc(value ?? '')}">`;
const kinds = (list = KINDS) => opts('kind', list.map(k => [k.id, k.name]), true);
// «Просто цена»: за всё сразу, без единицы. Есть во всех разделах и нажата сразу (решение автора 2026-10-31)
const plain = list => [['', 'Просто цена'], ...list.map(u => [u, u])];
const GOODS_UNITS = ['за штуку', 'за кг', 'за литр', 'за десяток', 'за мешок', 'за ящик', 'за метр', 'за м²', 'за м³', 'за голову'];
const LABEL = { masters: 'Услуга', requests: 'Работа', goods: 'Товар', news: 'Объявление села' };
const field = (label, input, hint = '') => `<label class="field"><span class="lbl">${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}<em class="err"></em></label>`;
const group = (label, inner) => `<fieldset class="field"><legend class="lbl">${label}</legend>${inner}<em class="err"></em></fieldset>`;
const moneyInput = (name, ph) => `<span class="money"><input name="${name}" inputmode="numeric" maxlength="9" placeholder="${ph}" autocomplete="off"><i>₽</i></span>`;
function who() {
  const c = contact();
  const fields = field('Ваше имя', `<input name="name" maxlength="30" autocomplete="given-name" value="${esc(c.name || '')}">`) +
    field('Номер телефона', `<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 928 123-45-67" value="${esc(phoneNice(c.phone || ''))}">`, 'Номер увидят на доске, чтобы вам позвонить или написать.') +
    group('На этом номере есть WhatsApp?', yesNo('wa', c.wa !== false));
  if (!c.name || !c.phone) return fields;
  // Имя и номер уже есть на телефоне: одна строка, поля за «Изменить» (решение автора 2026-11-01)
  return `<details class="who"><summary><span><b>${esc(c.name)}</b><i>${esc(phoneNice(c.phone))}</i>${c.wa === false ? 'Без WhatsApp' : 'Есть WhatsApp'}</span><em>Изменить</em></summary>
    <div class="more-in">${fields}</div></details>`;
}
// Необязательные поля за кнопкой «Добавить подробности» (решение автора 2026-11-01)
const more = inner => `<details class="more"><summary class="btn btn-line btn-wide">Добавить подробности</summary><div class="more-in">${inner}</div></details>`;
const maybe = '<small>Можно не выбирать.</small>';
// Да или нет в рамке, как «От» и «Точно» у цены
const yesNo = (name, yes) => `<div class="seg" data-name="${name}"><button type="button" class="chip opt" data-v="1" aria-pressed="${yes}">Да</button><button type="button" class="chip opt" data-v="0" aria-pressed="${!yes}">Нет</button></div><input type="hidden" name="${name}" value="${yes ? 1 : 0}">`;

export function choiceScreen() {
  // Слева тон с крупным значком: камера для фото работ или портфель для работы
  const row = (href, ic, tint, title, text) => `<a class="choice" href="${href}">
      ${photo(null, { id: ic, tint })}</div>
      <span><b>${title}</b><span>${text}</span></span>${icon('arrow')}
    </a>`;
  return `<div class="scr">
    <h1>Разместить</h1>
    <p class="scr-lead">${store.adminHere() ? 'Вы вошли как админ: объявление сразу на доске, без проверки. Плитка синяя, с подписью «От админа».'
    : 'Бесплатно. Админ группы «Валарг» проверит объявление и выложит его на доску. Вам позвонят или напишут.'}</p>
    ${row('#/razmestit/usluga', 'camera', 2, 'Предлагаю услугу', 'Покажите фото работ и цену.')}
    ${row('#/razmestit/rabota', 'job', 3, 'Предлагаю работу', 'Опишите работу и оплату.')}
    ${row('#/razmestit/prodayu', 'bag', 4, 'Продаю', 'Покажите товар и цену.')}
    ${row('#/razmestit/kuplyu', 'bag', 5, 'Куплю', 'Напишите, что ищете и за сколько.')}
    ${row('#/razmestit/obyavlenie', 'novost', 1, 'Объявление села', 'Новость, отключение, потеря или находка.')}
    ${adminLine('Вопрос по доске? Написать админу')}
  </div>`;
}

export function requestForm() {
  return `<form class="scr form" data-type="requests" novalidate>
    ${back('#/razmestit')}
    <h1>Предлагаю работу</h1>
    ${field('Что нужно сделать?', '<textarea name="text" maxlength="200" rows="3" placeholder="Например: разгрузить машину кирпича"></textarea>')}
    ${field('Оплата', moneyInput('budget', 'Пусто: договорная'))}
    ${group('Фото', shotsField('requests') + '<small>Можно не добавлять. С фото понятнее, что за работа.</small>')}
    ${group('Вид работы', kinds() + maybe)}
    ${more(group('За что оплата?', opts('unit', plain(['за работу', 'за день', 'за час', 'в месяц']), false, ''))
      + group('Когда?', opts('when', [['Сегодня', 'Сегодня'], ['Завтра', 'Завтра'], ['На этой неделе', 'На этой неделе'], ['Не срочно', 'Не срочно']]))
      + field('Улица', '<input name="place" maxlength="40" placeholder="Например: ул. Школьная">', 'Можно не писать.'))}
    ${who()}
    <button class="btn btn-ink btn-wide">${sendLabel()}</button>
  </form>`;
}

export function masterForm() {
  return `<form class="scr form" data-type="masters" novalidate>
    ${back('#/razmestit')}
    <h1>Предлагаю услугу</h1>
    ${group('Фото работ', shotsField('masters') + '<small>До 6 фото. Первое фото встанет на доску.</small>')}
    ${field('Что вы делаете?', '<textarea name="title" maxlength="90" rows="2" placeholder="Например: ворота, заборы, навесы"></textarea>')}
    ${group('Цена', `<div class="seg" data-name="from"><button type="button" class="chip opt" data-v="1" aria-pressed="true">От</button><button type="button" class="chip opt" data-v="0" aria-pressed="false">Точно</button></div><input type="hidden" name="from" value="1">${moneyInput('price', 'Пусто: договорная')}`)}
    ${group('Вид работ', kinds() + maybe)}
    ${more(group('За что цена?', opts('unit', plain(['за работу', 'за час', 'за метр', 'за м²', 'за рейс', 'за урок', 'за кг', 'за штуку']), false, ''))
      + field('Подробнее', '<input name="note" maxlength="60" placeholder="Например: выезд в тот же день">', 'Можно не писать.'))}
    ${who()}
    <button class="btn btn-ink btn-wide">${sendLabel()}</button>
  </form>`;
}

// Товар: «Продаю» (sell) или «Куплю» (buy) отдельной кнопкой на экране «Разместить» (решение автора 2026-11-01).
// Фото, что, цена за единицу или просто цена, категория
export function goodsForm(deal) {
  const buy = deal === 'buy';
  return `<form class="scr form" data-type="goods" novalidate>
    ${back('#/razmestit')}
    <h1>${buy ? 'Куплю' : 'Продаю'}</h1>
    <input type="hidden" name="deal" value="${buy ? 'buy' : 'sell'}">
    ${group('Фото', shotsField('goods') + `<small>${buy ? 'Можно без фото. С фото понятнее, что вы ищете.' : 'До 6 фото. Первое фото встанет на доску.'}</small>`)}
    ${field(buy ? 'Что покупаете?' : 'Что продаёте?', `<textarea name="title" maxlength="90" rows="2" placeholder="${buy ? 'Например: сено, 20 тюков' : 'Например: мёд липовый, 3 литра'}"></textarea>`)}
    ${field('Цена', moneyInput('price', 'Пусто: договорная'))}
    ${group('Категория', kinds(GOODS) + maybe)}
    ${more(group('За что цена?', opts('unit', plain(GOODS_UNITS), false, ''))
      + field('Подробнее', '<input name="note" maxlength="100" placeholder="Например: привезу по селу">', 'Можно не писать.'))}
    ${who()}
    <button class="btn btn-ink btn-wide">${sendLabel()}</button>
  </form>`;
}

// Объявление села (решение автора 2026-11-04): номер обязателен и виден всем, форма говорит об этом прямо.
// По номеру админ проверяет, кто написал: объявление с чужого номера не пройдёт проверку
export function newsForm() {
  return `<form class="scr form" data-type="news" novalidate>
    ${back('#/razmestit')}
    <h1>Объявление села</h1>
    ${group('О чём объявление?', kinds(NEWS) + maybe)}
    ${field('Текст объявления', '<textarea name="text" maxlength="300" rows="4" placeholder="Например: завтра с 10:00 до 14:00 на улице Школьной не будет света"></textarea>', 'Висит на доске 24 часа.')}
    ${group('Фото', shotsField('news') + '<small>Можно не добавлять. До 3 фото.</small>')}
    ${who()}
    <p class="warn">${phoneIcon}<span><b>Ваш номер и имя увидят все.</b> Админ может написать вам, чтобы проверить, что объявление ваше.</span></p>
    <button class="btn btn-ink btn-wide">${sendLabel()}</button>
  </form>`;
}

export function doneScreen() {
  if (lastOwn) {
    return `<div class="scr done">
    <span class="done-mark">${icon('ok')}</span>
    <h1>Объявление на доске</h1>
    <p class="scr-lead">Вы вошли как админ: объявление выложено сразу, без проверки. Плитка синяя, с подписью «От админа». Продлить и снять его можно во вкладке «Мои».</p>
    <a class="btn btn-ink btn-wide" href="#/">На доску</a>
    <a class="btn btn-line btn-wide" href="#/moi">Мои объявления</a>
  </div>`;
  }
  return `<div class="scr done">
    <span class="done-mark">${icon('clock')}</span>
    <h1>Отправлено админу</h1>
    <p class="scr-lead">Админ группы «Валарг» проверит объявление и выложит его на доску. Обычно в тот же день. Что с ним, видно во вкладке «Мои».</p>
    ${'Notification' in window && 'PushManager' in window && Notification.permission === 'default' && !prefs().notify
    ? '<button class="btn btn-ink btn-wide" data-act="notify-mine">Сообщить, когда проверят</button>' : ''}
    <a class="btn btn-ink btn-wide" href="#/moi">Мои объявления</a>
    <a class="btn btn-line btn-wide" href="#/">На доску</a>
    ${adminLine('Вопрос? Написать админу')}
  </div>`;
}

// Выбор в ряду кнопок: одна нажата, значение в скрытом поле
export function pick(btn) {
  const box = btn.parentElement;
  box.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-pressed', b === btn));
  const input = box.parentElement.querySelector(`input[name="${box.dataset.name}"]`);
  input.value = btn.dataset.v;
  btn.closest('.field').classList.remove('bad');
}

function bad(form, name, text) {
  const f = form.querySelector(`[name="${name}"]`).closest('.field');
  // Поле с ошибкой за кнопкой «Изменить» или «Добавить подробности»: раскрыть, чтобы ошибку было видно
  f.closest('details')?.setAttribute('open', '');
  f.classList.add('bad');
  f.querySelector('.err').textContent = text;
  return f;
}

// Проверка и сбор полей. Возвращает данные или null и показывает ошибки
function read(form, need) {
  form.querySelectorAll('.bad').forEach(f => f.classList.remove('bad'));
  const v = n => form.elements[n]?.value ?? '';
  const out = { name: clean(v('name'), 30), phone: phone(v('phone')), wa: v('wa') !== '0' };
  const errs = [];
  for (const [n, test, text] of need) {
    out[n] = test(v(n));
    if (out[n] === null) errs.push(bad(form, n, text));
  }
  if (out.name.length < 2) errs.push(bad(form, 'name', 'Напишите имя.'));
  if (!out.phone) errs.push(bad(form, 'phone', 'Нужен номер России: +7 и 10 цифр.'));
  if (errs.length) { errs[0].scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); return null; }
  return out;
}
const must = (min, max = 200) => s => (clean(s, max).length >= min ? clean(s, max) : null);
// Вид работ и категория не обязательны (решение автора 2026-11-01): без выбора «Другое»
const kindOr = s => clean(s, 20) || 'drugoe';
const any = max => s => clean(s, max);

export async function submit(form) {
  const type = form.dataset.type;
  const need = {
    requests: [['kind', kindOr], ['text', must(5), 'Напишите, что нужно сделать.'], ['budget', price], ['unit', any(20)], ['when', any(20)], ['place', any(40)]],
    masters: [['kind', kindOr], ['title', must(5), 'Напишите, что вы делаете.'], ['from', s => s === '1'], ['price', price], ['unit', any(20)], ['note', any(60)]],
    goods: [['deal', s => (s === 'buy' ? 'buy' : 'sell')], ['kind', kindOr], ['title', must(3), 'Напишите, что продаёте или покупаете.'], ['price', price], ['unit', any(20)], ['note', any(100)]],
    news: [['kind', kindOr], ['text', must(10, 300), 'Напишите объявление: хотя бы 10 букв.']],
  }[type];
  const data = read(form, need);
  if (!data) return;
  const btn = form.querySelector('.form > .btn-ink');
  const list = form._photos || [];
  btn.disabled = true;
  try {
    store.checkLimit(type);
    const photos = [];
    for (let i = 0; i < list.length; i++) {
      btn.textContent = `Загружаем фото ${i + 1} из ${list.length}`;
      photos.push(await upload(list[i]));
    }
    btn.textContent = 'Отправляем';
    const item = await store.add(type, { ...data, photos }, () => {
      btn.textContent = 'Отправляем. Не закрывайте страницу';
      toast('Связь слабая. Объявление уйдёт, когда связь станет лучше.');
    });
    // Объявление админа уже на доске: почтальон скажет всем о новом, как после проверки
    lastOwn = item.status === 'ok';
    push.ping(lastOwn ? 'status' : 'new', type, item.id);
    // Уведомления уже разрешены, а свои человек не выключал: доска скажет, когда объявление проверят
    if (window.Notification?.permission === 'granted' && !chosen('notify')) { setPref('notify', true); push.sync(); }
    keepContact(data.name, data.phone, data.wa);
    send({ 'Объявления': { 'Отправили': LABEL[type] } });
    sound.sent();
    location.hash = '#/gotovo';
  } catch (e) {
    if (e.message.startsWith('Одно объявление в сутки')) send({ 'Объявления': { 'Защита остановила': LABEL[type] } });
    toast(e.message);
    btn.disabled = false;
    btn.textContent = sendLabel();
  }
}

export function showScreen(html) {
  const s = $('#screen');
  s.innerHTML = html;
  watch(s);
}
