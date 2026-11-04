// Жалоба на объявление (решение автора 2026-11-04). На странице объявления «Пожаловаться»: окно-наклейка,
// причина и «Подробнее». Жалоба в базу (reports), админу уведомление через почтальона (об одном объявлении
// раз в сутки), в панели вкладка «Жалобы». Объявление жалоба не снимает: решает админ.
// Защита от спама в правилах базы: с одного телефона одна жалоба на объявление и не чаще одной в 10 минут.
// Память телефона (uv-reports) только подсказывает это до отправки. Панель читает жалобы в admin.js
import { icon } from './icons.js';
import { clean, sent, plural, REASONS, reasonName } from './util.js';
import { toast } from './ui.js';
import * as store from './store.js';
import * as push from './push.js';
import { send } from './stats.js';

const SENT = 'uv-reports';
const GAP = 10 * 60e3;
let box = null;
let target = null;

const sentList = () => { try { return JSON.parse(localStorage.getItem(SENT)) || {}; } catch { return {}; } };

export function open(type, id) {
  if (box) return;
  const was = sentList();
  if (was[`${type}_${id}`]) return toast('Вы уже пожаловались на это объявление. Админ его проверит.');
  const wait = Math.ceil((Math.max(0, ...Object.values(was)) + GAP - Date.now()) / 60e3);
  if (wait > 0) return toast(`Следующую жалобу можно отправить через ${wait} ${plural(wait, 'минуту', 'минуты', 'минут')}.`);
  target = { type, id };
  box = document.createElement('div');
  box.className = 'start filt-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'rep-h');
  box.innerHTML = `<div class="start-card form">
    <div class="filt-head"><h2 id="rep-h">Пожаловаться</h2>
      <button class="round" type="button" data-rep="close" aria-label="Закрыть">${icon('x')}</button></div>
    <p class="start-lead">Что не так с объявлением? Жалобу увидит только админ.</p>
    <div class="rep-why">${REASONS.map(([v, t]) => `<button class="chip" type="button" data-why="${v}" aria-pressed="false">${t}</button>`).join('')}</div>
    <label class="field"><span class="lbl">Подробнее, если нужно</span>
      <textarea maxlength="200" rows="3" placeholder="Например: товар уже продан"></textarea></label>
    <button class="btn btn-ink btn-wide" type="button" data-rep="send" disabled>Отправить жалобу</button>
  </div>`;
  // Касание мимо наклейки закрывает окно
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.body.append(box);
  document.documentElement.classList.add('start-open');
  box.querySelector('[data-rep="close"]').focus({ preventScroll: true });
}

function close() {
  if (!box) return;
  box.remove();
  box = null;
  document.documentElement.classList.remove('start-open');
}

// Жалоба и отметка r_ одной записью: без отметки база жалобу не примет
async function save({ type, id }, why, note) {
  const u = await store.user();
  const m = await store.wake();
  const b = m.writeBatch(m.db);
  b.set(m.doc(m.db, 'reports', `${type}_${id}_${u.uid}`), { t: type, id, why, note, at: m.serverTimestamp(), owner: u.uid });
  b.set(m.doc(m.db, 'limits', 'r_' + u.uid), { at: m.serverTimestamp() });
  await sent(b.commit(), () => toast('Связь слабая. Ждём ответа базы.'));
}

async function sendIt(btn) {
  const why = box.querySelector('[data-why][aria-pressed="true"]')?.dataset.why;
  if (!why) return;
  const note = clean(box.querySelector('textarea').value, 200);
  const t = target;
  btn.disabled = true;
  try {
    await save(t, why, note);
  } catch (e) {
    btn.disabled = false;
    return toast(e?.code === 'permission-denied'
      ? 'Жалоба не ушла: с этого телефона уже жаловались на это объявление или меньше 10 минут назад.'
      : 'Нет связи с интернетом. Попробуйте ещё раз.', 6000);
  }
  try { localStorage.setItem(SENT, JSON.stringify({ ...sentList(), [`${t.type}_${t.id}`]: Date.now() })); } catch { /* не страшно */ }
  close();
  push.ping('report', t.type, t.id);
  send({ 'Жалоба': reasonName(why) });
  toast('Жалоба у админа. Спасибо, что следите за порядком на доске.', 5000);
}

document.addEventListener('click', e => {
  if (!box) return;
  const w = e.target.closest('[data-why]');
  if (w) {
    box.querySelectorAll('[data-why]').forEach(b => b.setAttribute('aria-pressed', b === w));
    box.querySelector('[data-rep="send"]').disabled = false;
    return;
  }
  const r = e.target.closest('[data-rep]');
  if (r?.dataset.rep === 'close') close();
  if (r?.dataset.rep === 'send') sendIt(r);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && box) close(); });

