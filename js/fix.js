// «Исправить» в панели (решение автора 2026-11-04): раздел, вид работ или категория, текст, имя, цена.
// Тот же раздел: правка на месте. Другой раздел: перенос одной записью, владелец, номер, фото, дата и статус
// прежние (moveFields в util.js), житель видит объявление в «Моих». Объявление на доске сразу правится
// в тетради доски (почтальон, /board). Права проверяют правила базы (fixed, moved)
import { kindsOf } from './icons.js';
import { esc, clean, price, moveFields } from './util.js';
import { toast } from './ui.js';
import * as store from './store.js';
import * as push from './push.js';

// Куда можно перенести. Объявление села остаётся объявлением села
const TO = [['masters', 'Услуга'], ['requests', 'Работа'], ['goods:sell', 'Продаю'], ['goods:buy', 'Куплю']];
// Сколько знаков в тексте: как в правилах базы
const MIN = { masters: 5, requests: 5, goods: 3, news: 10 };
const MAX = { masters: 200, requests: 200, goods: 200, news: 300 };
const TEXT = { masters: 'title', goods: 'title', requests: 'text', news: 'text' };
const SUM = { masters: 'price', goods: 'price', requests: 'budget' };

const where = x => (x.type === 'goods' ? `goods:${x.deal === 'buy' ? 'buy' : 'sell'}` : x.type);
let open = null;
// Форма открыта: панель не перерисовывает список, иначе форма пропала бы посреди правки
export const editing = () => !!open;

export const button = x => (x.status === 'wait' || x.status === 'ok' ? '<button class="btn btn-line" data-a="fix">Исправить</button>' : '');

// Плитки видов своего раздела. Вида нет в новом разделе (работа стала товаром): «Другое»
function kinds(type, kind) {
  const list = kindsOf(type);
  const on = list.some(k => k.id === kind) ? kind : list[list.length - 1].id;
  return list.map(k => `<button type="button" class="chip" data-k="${k.id}" aria-pressed="${k.id === on}">${k.name}</button>`).join('');
}

export function start(card, x, done) {
  close();
  open = { card, x, done };
  const form = document.createElement('form');
  form.className = 'a-form a-fix form';
  form.noValidate = true;
  const sum = SUM[x.type] ? x[SUM[x.type]] : 0;
  form.innerHTML = `${x.type === 'news' ? '' : `<div class="field"><span class="lbl">Раздел</span><div class="a-kinds" data-to-list>
      ${TO.map(([v, t]) => `<button type="button" class="chip" data-to="${v}" aria-pressed="${v === where(x)}">${t}</button>`).join('')}</div></div>`}
    <div class="field"><span class="lbl">${x.type === 'goods' ? 'Категория' : 'Вид'}</span><div class="a-kinds" data-kinds>${kinds(x.type, x.kind)}</div></div>
    <label class="field"><span class="lbl">Текст объявления</span><textarea name="what" maxlength="${MAX[x.type]}" rows="3">${esc(x[TEXT[x.type]])}</textarea></label>
    <label class="field"><span class="lbl">Имя</span><input name="name" maxlength="30" value="${esc(x.name)}"></label>
    ${SUM[x.type] ? `<label class="field"><span class="lbl">Цена, ₽</span><input name="price" inputmode="numeric" maxlength="9" value="${sum || ''}" placeholder="Пусто: договорная"></label>` : ''}
    <p class="a-note">Житель увидит исправленное объявление в «Моих». Другой раздел: у объявления новая ссылка, старая перестанет открываться.</p>
    <div class="a-acts"><button class="btn a-ok">Сохранить</button><button type="button" class="btn btn-line" data-fix="cancel">Отмена</button></div>`;
  card.querySelector('.a-acts').hidden = true;
  card.append(form);
  form.querySelector('textarea').focus();
}

function close(redraw = true) {
  if (!open) return;
  const { card, done } = open;
  open = null;
  card.querySelector('.a-fix')?.remove();
  const acts = card.querySelector('.a-acts');
  if (acts) acts.hidden = false;
  if (redraw) done();
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-fix="cancel"]')) return close();
  const t = e.target.closest('[data-to]');
  if (!t || !open) return;
  t.parentElement.querySelectorAll('[data-to]').forEach(b => b.setAttribute('aria-pressed', b === t));
  // Новый раздел: его виды работ или категории товаров, нажатый вид остаётся, если он там есть
  const box = t.closest('form').querySelector('[data-kinds]');
  box.innerHTML = kinds(t.dataset.to.split(':')[0], box.querySelector('[aria-pressed="true"]')?.dataset.k);
});

document.addEventListener('submit', async e => {
  if (!e.target.matches('.a-fix') || !open) return;
  e.preventDefault();
  const form = e.target;
  const { x } = open;
  const [to, deal] = (form.querySelector('[data-to][aria-pressed="true"]')?.dataset.to || where(x)).split(':');
  const text = clean(form.elements.what.value, MAX[to]);
  const name = clean(form.elements.name.value, 30);
  if (text.length < MIN[to]) return toast(`Текст объявления: хотя бы ${MIN[to]} букв.`);
  if (name.length < 2) return toast('Имя: хотя бы 2 буквы.');
  const fix = { kind: form.querySelector('[data-kinds] [aria-pressed="true"]')?.dataset.k || 'drugoe', name, [TEXT[to]]: text };
  if (SUM[to]) fix[SUM[to]] = price(form.elements.price?.value);
  const btn = form.querySelector('.a-ok');
  btn.disabled = true;
  try {
    if (to === x.type) {
      if (to === 'goods') fix.deal = deal;
      // Только то, что правда поменялось: правила базы пускают админа только к этим полям
      const changes = Object.fromEntries(Object.entries(fix).filter(([k, v]) => x[k] !== v));
      if (Object.keys(changes).length) await store.fixAd(x.type, x.id, changes);
      if (x.status === 'ok') push.ping('board', x.type, x.id);
      toast(Object.keys(changes).length ? 'Исправлено.' : 'Ничего не поменялось.');
    } else {
      const id = await store.moveAd(x.type, x.id, to, { ...moveFields(x, to, deal), ...fix });
      if (x.status === 'ok') { push.ping('board', x.type, x.id); push.ping('board', to, id); }
      toast(`Перенесено: ${TO.find(([v]) => v === (to === 'goods' ? `goods:${deal}` : to))[1]}.`);
    }
    close();
  } catch {
    btn.disabled = false;
    toast('Не получилось сохранить. Проверьте связь и попробуйте ещё раз.');
  }
});
