// Жизнь доски (решение автора 2026-11-06, «Жизнь доски» в карте): люди видят, что доска живая.
// Тихая мятная строка под заголовком: сколько объявлений, когда пришло новое, сколько людей заходило за неделю.
// Не ряд цифр под заголовком: его запрещает брендбук («Чего не делаем»).
// Людей считает почтальон (worker/src/visits.js): телефон говорит ему «я зашёл» (POST /hit) не чаще раза
// в 7 дней, так один человек за неделю считается один раз. Не считаются: робот, компьютер (localhost),
// телефон, где админ вошёл в панель. Имя и номер не уходят: только «я зашёл»
import { $ } from './ui.js';
import { pulseText, hitDue, mskDay } from './util.js';
import { PUSH } from './config.js';
import * as store from './store.js';

// all: объявления на доске, новые сверху (board.js)
export function draw(all) {
  const p = $('#pulse');
  if (!p) return;
  const text = store.robot || !store.loaded() ? '' : pulseText(all.length, all[0]?.at, store.seen());
  if (p.textContent !== text) p.textContent = text;
  p.hidden = !text;
}

const KEY = 'uv-hit';
const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export function hit() {
  if (store.robot || local || store.adminHere()) return;
  let last;
  try { last = localStorage.getItem(KEY); } catch { return; }
  if (!hitDue(last)) return;
  fetch(`${PUSH.url}/hit`, { method: 'POST', body: '{}', keepalive: true }).then(r => {
    if (r.ok) try { localStorage.setItem(KEY, String(mskDay())); } catch { /* не страшно */ }
  }, () => {});
}
