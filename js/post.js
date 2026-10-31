// Экраны «Разместить» (услуга, работа или товар) и «Отправлено».
import { icon, waIcon, KINDS, GOODS } from './icons.js';
import { esc, phone, phoneNice, price, clean, wa } from './util.js';
import { ADMIN_PHONE } from './config.js';
import { $, reduce, toast, watch, photo } from './ui.js';
import { shotsField, upload } from './photos.js';
import * as store from './store.js';
import { send } from './stats.js';

const back = href => `<a class="back" href="${href}" aria-label="Назад">${icon('arrow')}</a>`;

// Связь с админом: WhatsApp автора с готовой первой фразой
export const toAdmin = () => wa(ADMIN_PHONE, 'Здравствуйте! Пишу с доски «Валарг».');
const adminLine = text => `<a class="to-admin" href="${toAdmin()}" target="_blank" rel="noopener">${waIcon}${text}</a>`;

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
const LABEL = { masters: 'Услуга', requests: 'Работа', goods: 'Товар' };
const field = (label, input, hint = '') => `<label class="field"><span class="lbl">${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}<em class="err"></em></label>`;
const group = (label, inner) => `<fieldset class="field"><legend class="lbl">${label}</legend>${inner}<em class="err"></em></fieldset>`;
const moneyInput = (name, ph) => `<span class="money"><input name="${name}" inputmode="numeric" maxlength="9" placeholder="${ph}" autocomplete="off"><i>₽</i></span>`;
function who() {
  const c = contact();
  return field('Ваше имя', `<input name="name" maxlength="30" autocomplete="given-name" value="${esc(c.name || '')}">`) +
    field('Номер телефона', `<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 928 123-45-67" value="${esc(phoneNice(c.phone || ''))}">`, 'Номер увидят на доске, чтобы вам позвонить или написать.') +
    group('На этом номере есть WhatsApp?', yesNo('wa', c.wa !== false));
}
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
    <p class="scr-lead">Бесплатно. Админ группы «Валарг» проверит объявление и выложит его на доску.</p>
    ${row('#/razmestit/usluga', 'camera', 2, 'Предлагаю услугу', 'Покажите фото работ и цену. Вам позвонят или напишут.')}
    ${row('#/razmestit/rabota', 'job', 3, 'Предлагаю работу', 'Опишите работу и оплату. Вам позвонят или напишут.')}
    ${row('#/razmestit/tovar', 'bag', 4, 'Продаю или куплю', 'Покажите товар и цену. Вам позвонят или напишут.')}
    ${adminLine('Вопрос по доске? Написать админу')}
  </div>`;
}

export function requestForm() {
  return `<form class="scr form" data-type="requests" novalidate>
    ${back('#/razmestit')}
    <h1>Предлагаю работу</h1>
    ${group('Вид работы', kinds())}
    ${field('Что нужно сделать?', '<textarea name="text" maxlength="200" rows="3" placeholder="Например: разгрузить машину кирпича"></textarea>')}
    ${field('Оплата', moneyInput('budget', 'Пусто: договорная'))}
    ${group('За что оплата?', opts('unit', plain(['за работу', 'за день', 'за час', 'в месяц']), false, ''))}
    ${group('Когда?', opts('when', [['Сегодня', 'Сегодня'], ['Завтра', 'Завтра'], ['На этой неделе', 'На этой неделе'], ['Не срочно', 'Не срочно']]))}
    ${field('Улица', '<input name="place" maxlength="40" placeholder="Например: ул. Школьная">', 'Можно не писать.')}
    ${group('Фото', shotsField('requests') + '<small>Можно не добавлять. С фото понятнее, что за работа.</small>')}
    ${who()}
    <button class="btn btn-ink btn-wide">Отправить на проверку</button>
  </form>`;
}

export function masterForm() {
  return `<form class="scr form" data-type="masters" novalidate>
    ${back('#/razmestit')}
    <h1>Предлагаю услугу</h1>
    ${group('Вид работ', kinds())}
    ${group('Фото работ', shotsField('masters') + '<small>До 6 фото. Первое фото встанет на витрину.</small>')}
    ${field('Что вы делаете?', '<textarea name="title" maxlength="90" rows="2" placeholder="Например: ворота, заборы, навесы"></textarea>')}
    ${group('Цена', `<div class="seg" data-name="from"><button type="button" class="chip opt" data-v="1" aria-pressed="true">От</button><button type="button" class="chip opt" data-v="0" aria-pressed="false">Точно</button></div><input type="hidden" name="from" value="1">${moneyInput('price', 'Пусто: договорная')}`)}
    ${group('За что цена?', opts('unit', plain(['за работу', 'за час', 'за метр', 'за м²', 'за рейс', 'за урок', 'за кг', 'за штуку']), false, ''))}
    ${field('Подробнее', '<input name="note" maxlength="60" placeholder="Например: выезд в тот же день">', 'Можно не писать.')}
    ${who()}
    <button class="btn btn-ink btn-wide">Отправить на проверку</button>
  </form>`;
}

// Товар: продаю или куплю, категория, фото, цена за единицу или просто цена
export function goodsForm() {
  return `<form class="scr form" data-type="goods" novalidate>
    ${back('#/razmestit')}
    <h1>Продаю или куплю</h1>
    ${group('Что вы хотите?', `<div class="seg" data-name="deal"><button type="button" class="chip opt" data-v="sell" aria-pressed="true">Продаю</button><button type="button" class="chip opt" data-v="buy" aria-pressed="false">Куплю</button></div><input type="hidden" name="deal" value="sell">`)}
    ${group('Категория', kinds(GOODS))}
    ${group('Фото', shotsField('goods') + '<small>До 6 фото. Первое фото встанет на витрину. Для «Куплю» можно без фото.</small>')}
    ${field('Что продаёте или покупаете?', '<textarea name="title" maxlength="90" rows="2" placeholder="Например: мёд липовый, 3 литра"></textarea>')}
    ${field('Цена', moneyInput('price', 'Пусто: договорная'))}
    ${group('За что цена?', opts('unit', plain(GOODS_UNITS), false, ''))}
    ${field('Подробнее', '<input name="note" maxlength="100" placeholder="Например: привезу по селу">', 'Можно не писать.')}
    ${who()}
    <button class="btn btn-ink btn-wide">Отправить на проверку</button>
  </form>`;
}

export function doneScreen() {
  return `<div class="scr done">
    <span class="done-mark">${icon('clock')}</span>
    <h1>Отправлено админу</h1>
    <p class="scr-lead">Админ группы «Валарг» проверит объявление и выложит его на доску. Что с ним, видно во вкладке «Мои».</p>
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
const must = min => s => (clean(s, 200).length >= min ? clean(s, 200) : null);
const any = max => s => clean(s, max);

export async function submit(form) {
  const type = form.dataset.type;
  const need = {
    requests: [['kind', must(1), 'Выберите вид работы.'], ['text', must(5), 'Напишите, что нужно сделать.'], ['budget', price], ['unit', any(20)], ['when', any(20)], ['place', any(40)]],
    masters: [['kind', must(1), 'Выберите вид работ.'], ['title', must(5), 'Напишите, что вы делаете.'], ['from', s => s === '1'], ['price', price], ['unit', any(20)], ['note', any(60)]],
    goods: [['deal', s => (s === 'buy' ? 'buy' : 'sell')], ['kind', must(1), 'Выберите категорию.'], ['title', must(3), 'Напишите, что продаёте или покупаете.'], ['price', price], ['unit', any(20)], ['note', any(100)]],
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
    await store.add(type, { ...data, photos }, () => {
      btn.textContent = 'Отправляем. Не закрывайте страницу';
      toast('Связь слабая. Объявление уйдёт, когда связь станет лучше.');
    });
    keepContact(data.name, data.phone, data.wa);
    send({ 'Объявления': { 'Отправили': LABEL[type] } });
    location.hash = '#/gotovo';
  } catch (e) {
    if (e.message.startsWith('Одно объявление в сутки')) send({ 'Объявления': { 'Защита остановила': LABEL[type] } });
    toast(e.message);
    btn.disabled = false;
    btn.textContent = 'Отправить на проверку';
  }
}

export function showScreen(html) {
  const s = $('#screen');
  s.innerHTML = html;
  watch(s);
}
