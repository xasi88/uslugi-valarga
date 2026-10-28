// Экраны «Разместить» (заявка или услуга), «Отправлено» и окно «Предложить цену».
import { icon, KINDS } from './icons.js';
import { esc, phone, phoneNice, price, clean } from './util.js';
import { $, reduce, toast, watch, photo } from './ui.js';
import { shotsField, upload } from './photos.js';
import * as store from './store.js';

const back = href => `<a class="back" href="${href}" aria-label="Назад">${icon('arrow')}</a>`;

// Имя и номер запоминаются на телефоне: второй раз вводить не нужно
function contact() {
  try { return JSON.parse(localStorage.getItem('uv-contact')) || {}; } catch { return {}; }
}
function keepContact(name, ph) {
  try { localStorage.setItem('uv-contact', JSON.stringify({ name, phone: ph })); } catch { /* не страшно */ }
}

const opts = (name, list, withIcons) => `<div class="pick" data-name="${name}">${list.map(([v, t]) =>
  `<button type="button" class="chip opt" data-v="${v}" aria-pressed="false">${withIcons ? icon(v) : ''}${t}</button>`).join('')}</div>
  <input type="hidden" name="${name}">`;
const kinds = () => opts('kind', KINDS.map(k => [k.id, k.name]), true);
const field = (label, input, hint = '') => `<label class="field"><span class="lbl">${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}<em class="err"></em></label>`;
const group = (label, inner) => `<fieldset class="field"><legend class="lbl">${label}</legend>${inner}<em class="err"></em></fieldset>`;
const moneyInput = (name, ph) => `<span class="money"><input name="${name}" inputmode="numeric" maxlength="9" placeholder="${ph}" autocomplete="off"><i>₽</i></span>`;
function who() {
  const c = contact();
  return field('Ваше имя', `<input name="name" maxlength="30" autocomplete="given-name" value="${esc(c.name || '')}">`) +
    field('Номер WhatsApp', `<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 928 123-45-67" value="${esc(phoneNice(c.phone || ''))}">`, 'Номер увидят на доске, чтобы вам написать.');
}

export function choiceScreen() {
  // Слева тон с крупным значком: заявка или камера для фото работ
  const row = (href, ic, tint, title, text) => `<a class="choice" href="${href}">
      ${photo(null, { id: ic, tint })}</div>
      <span><b>${title}</b><span>${text}</span></span>${icon('arrow')}
    </a>`;
  return `<div class="scr">
    <h1>Разместить</h1>
    <p class="scr-lead">Бесплатно. Админ группы «Валарг» проверит объявление и выложит его на доску.</p>
    ${row('#/razmestit/zayavka', 'requests', 3, 'Мне нужен мастер', 'Опишите задачу. Мастера сами предложат цену.')}
    ${row('#/razmestit/usluga', 'camera', 2, 'Я мастер', 'Покажите фото работ и цену. Вам напишут в WhatsApp.')}
  </div>`;
}

export function requestForm() {
  return `<form class="scr form" data-type="requests" novalidate>
    ${back('#/razmestit')}
    <h1>Мне нужен мастер</h1>
    ${group('Какой мастер нужен?', kinds())}
    ${field('Что нужно сделать?', '<textarea name="text" maxlength="200" rows="3" placeholder="Например: течёт кран на кухне"></textarea>')}
    ${group('Когда?', opts('when', [['Сегодня', 'Сегодня'], ['Завтра', 'Завтра'], ['На этой неделе', 'На этой неделе'], ['Не срочно', 'Не срочно']]))}
    ${field('Сколько готовы заплатить?', moneyInput('budget', 'Можно не писать'), 'Пусто: цена договорная.')}
    ${field('Улица', '<input name="place" maxlength="40" placeholder="Например: ул. Школьная">', 'Можно не писать.')}
    ${group('Фото', shotsField('requests') + '<small>Можно не добавлять. С фото мастеру понятнее задача.</small>')}
    ${who()}
    <button class="btn btn-ink btn-wide">Отправить на проверку</button>
  </form>`;
}

export function masterForm() {
  return `<form class="scr form" data-type="masters" novalidate>
    ${back('#/razmestit')}
    <h1>Я мастер</h1>
    ${group('Вид работ', kinds())}
    ${group('Фото работ', shotsField('masters') + '<small>До 6 фото. Первое фото встанет на витрину.</small>')}
    ${field('Что вы делаете?', '<textarea name="title" maxlength="90" rows="2" placeholder="Например: ворота, заборы, навесы"></textarea>')}
    ${group('Цена', `<div class="seg" data-name="from"><button type="button" class="chip opt" data-v="1" aria-pressed="true">От</button><button type="button" class="chip opt" data-v="0" aria-pressed="false">Точно</button></div><input type="hidden" name="from" value="1">${moneyInput('price', 'Пусто: договорная')}`)}
    ${group('За что цена?', opts('unit', [['за работу', 'за работу'], ['за час', 'за час'], ['за метр', 'за метр'], ['за м²', 'за м²'], ['за рейс', 'за рейс'], ['за урок', 'за урок']]))}
    ${field('Подробнее', '<input name="note" maxlength="60" placeholder="Например: выезд в тот же день">', 'Можно не писать.')}
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
    <a class="btn btn-line btn-wide" href="#/">К работам</a>
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
  const out = { name: clean(v('name'), 30), phone: phone(v('phone')) };
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
  const isReq = form.dataset.type === 'requests';
  const need = isReq
    ? [['kind', must(1), 'Выберите мастера.'], ['text', must(5), 'Напишите, что нужно сделать.'], ['when', any(20)], ['budget', price], ['place', any(40)]]
    : [['kind', must(1), 'Выберите вид работ.'], ['title', must(5), 'Напишите, что вы делаете.'], ['from', s => s === '1'], ['price', price], ['unit', any(20)], ['note', any(60)]];
  const data = read(form, need);
  if (!data) return;
  const btn = form.querySelector('.form > .btn-ink');
  const list = form._photos || [];
  btn.disabled = true;
  try {
    store.checkLimit();
    const photos = [];
    for (let i = 0; i < list.length; i++) {
      btn.textContent = `Загружаем фото ${i + 1} из ${list.length}`;
      photos.push(await upload(list[i]));
    }
    await store.add(form.dataset.type, { ...data, photos });
    keepContact(data.name, data.phone);
    location.hash = '#/gotovo';
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = 'Отправить на проверку';
  }
}

// Окно «Предложить цену» снизу экрана
export function openOffer(id) {
  const r = store.find('requests', id);
  if (!r) return;
  const box = $('#sheet');
  box.innerHTML = `<div class="sheet-back" data-act="close"></div>
    <form class="sheet form" data-id="${id}" novalidate>
      <span class="grip"></span>
      <h2>Ваша цена</h2>
      <p class="scr-lead">${esc(r.text)}</p>
      ${field('Цена за работу', moneyInput('price', 'Например: 1500'))}
      ${field('Коротко о себе', '<input name="note" maxlength="60" placeholder="Например: приеду через час">', 'Можно не писать.')}
      ${who()}
      <button class="btn btn-ink btn-wide">Предложить цену</button>
      <button type="button" class="btn btn-line btn-wide" data-act="close">Отмена</button>
    </form>`;
  box.hidden = false;
  document.body.classList.add('locked');
  setTimeout(() => box.classList.add('open'), 20);
}

export function closeOffer() {
  const box = $('#sheet');
  box.classList.remove('open');
  document.body.classList.remove('locked');
  setTimeout(() => { box.hidden = true; box.innerHTML = ''; }, reduce ? 0 : 420);
}

export async function submitOffer(form) {
  const data = read(form, [['price', s => price(s) || null, 'Напишите цену цифрами.'], ['note', any(60)]]);
  if (!data) return;
  try {
    await store.addOffer(form.dataset.id, data);
    keepContact(data.name, data.phone);
    closeOffer();
    toast('Ваша цена на доске. Человек увидит её и напишет вам.');
  } catch (e) { toast(e.message); }
}

export function showScreen(html) {
  const s = $('#screen');
  s.innerHTML = html;
  watch(s);
}
