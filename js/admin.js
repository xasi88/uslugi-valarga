// Панель админа: проверка новых объявлений и снятие с доски.
// Классы панели начинаются с a-. Данные через store.js, как у доски.
import { icon, waIcon, phoneIcon, kindById } from './icons.js';
import { esc, ago, wa, phoneNice, photoUrl, priceText as cost, payText } from './util.js';
import { CLOUDINARY } from './config.js';
import { $, toast } from './ui.js';
import * as store from './store.js';
import './install.js';

let tab = 'wait';

const priceText = x => (x.type === 'requests' ? payText(x) : cost(x) + (x.price && x.unit ? ' ' + x.unit : ''));

function items(...statuses) {
  const tagT = type => x => ({ ...x, type });
  return [...store.all('masters').map(tagT('masters')), ...store.all('requests').map(tagT('requests'))]
    .filter(x => statuses.includes(x.status)).sort((a, b) => b.at - a.at);
}

// Вкладка «Снятые»: почему объявления нет на доске и как его вернуть (решение автора 2026-10-30).
// «Человек найден» не возвращается: работу снял сам автор
const GONE = { off: 'Снято с доски', no: 'Отклонено', done: 'Человек найден' };
const BACK = { off: 'Вернуть на доску', no: 'Выложить' };
const DEL = '<button class="btn btn-line" data-a="del">Удалить</button>';
function acts(x) {
  if (x.status === 'wait') return `<button class="btn a-ok" data-a="ok">${icon('ok')}Выложить</button><button class="btn btn-danger" data-a="no">Отклонить</button>`;
  if (x.status === 'ok') return `<button class="btn btn-danger" data-a="off">Снять с доски</button>${DEL}`;
  return (BACK[x.status] ? `<button class="btn a-ok" data-a="ok">${icon('ok')}${BACK[x.status]}</button>` : '') + DEL;
}

function card(x) {
  const k = kindById(x.kind);
  const isReq = x.type === 'requests';
  const facts = [
    priceText(x),
    isReq && x.when, isReq && x.place, !isReq && x.note,
  ].filter(Boolean).map(f => `<span>${esc(f)}</span>`).join('');
  return `<li class="a-card" data-type="${x.type}" data-id="${x.id}">
    <p class="a-kind">${icon(k.id)}<b>${isReq ? 'Работа' : 'Услуга'}</b> · ${k.name} · ${ago(x.at)}${GONE[x.status] ? ' · ' + GONE[x.status] : ''}</p>
    <h3>${esc(isReq ? x.text : x.title)}</h3>
    ${x.photos?.length ? `<div class="a-shots">${x.photos.map(p => `<img src="${esc(photoUrl(p, 200, CLOUDINARY.cloud))}" alt="">`).join('')}</div>` : ''}
    <p class="a-facts">${facts}</p>
    <p class="a-who">${esc(x.name)} · ${x.wa === false
      ? `<a href="tel:+${x.phone}">${phoneIcon}${phoneNice(x.phone)}</a> · без WhatsApp`
      : `<a href="${wa(x.phone, 'Здравствуйте! Пишу как админ доски «Услуги Валарга».')}" target="_blank" rel="noopener">${waIcon}${phoneNice(x.phone)}</a>`}</p>
    <div class="a-acts">${acts(x)}</div>
  </li>`;
}

// Защита от спама: одно объявление в сутки. Админ включает и выключает её здесь
function guardBox() {
  const on = store.guardOn();
  $('#a-guard').innerHTML = `<p><b>Защита от спама</b><span>${on
    ? 'Одно объявление в сутки с одного телефона и одного номера.'
    : 'Выключена: люди отправляют объявления без ограничений.'}</span></p>
    <div><button class="chip" data-guard="1" aria-pressed="${on}">Включена</button><button class="chip" data-guard="0" aria-pressed="${!on}">Выключена</button></div>`;
}

function render() {
  guardBox();
  const lists = { wait: items('wait'), ok: items('ok'), off: items('off', 'no', 'done') };
  const names = { wait: 'Проверка', ok: 'На доске', off: 'Снятые' };
  $('#a-tabs').innerHTML = Object.keys(names).map(k =>
    `<button class="chip" role="tab" data-tab="${k}" aria-pressed="${tab === k}">${names[k]} <b>${lists[k].length}</b></button>`).join('');
  const list = lists[tab];
  const empty = { wait: 'Новых объявлений нет. Всё проверено.', ok: 'На доске пока пусто.', off: 'Снятых объявлений нет.' };
  $('#a-list').innerHTML = list.length ? list.map(card).join('') : `<li class="a-empty">${empty[tab]}</li>`;
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t) { tab = t.dataset.tab; render(); return; }
  const g = e.target.closest('[data-guard]');
  if (g) {
    const on = g.dataset.guard === '1';
    if (on !== store.guardOn()) { store.setGuard(on); toast(on ? 'Защита от спама включена.' : 'Защита от спама выключена.'); }
    return;
  }
  const a = e.target.closest('[data-a]');
  if (!a) return;
  const c = a.closest('.a-card');
  // «Удалить» стирает объявление из базы навсегда: и с доски, и из «Моих» у автора (решение автора 2026-10-30)
  if (a.dataset.a === 'del' && !confirm('Удалить объявление навсегда? Вернуть его не получится.')) return;
  const go = () => {
    if (a.dataset.a === 'ok') { store.setStatus(c.dataset.type, c.dataset.id, 'ok'); toast('Объявление на доске.'); }
    if (a.dataset.a === 'no') { store.setStatus(c.dataset.type, c.dataset.id, 'no'); toast('Объявление не на доске. Автор увидит это в «Моих».'); }
    if (a.dataset.a === 'off') { store.setStatus(c.dataset.type, c.dataset.id, 'off'); toast('Объявление снято с доски. Автор увидит это в «Моих».'); }
    if (a.dataset.a === 'del') { store.remove(c.dataset.type, c.dataset.id); toast('Объявление удалено из базы.'); }
  };
  // Карточка уезжает вбок, потом список перерисовывается
  c.classList.add('a-gone');
  setTimeout(go, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
});

// Вход: панель видна только админу. Чужая почта: выйти и войти почтой админа
const GATE = {
  out: 'Войдите через Google почтой админа, чтобы проверять объявления.',
  checking: 'Проверяем вход.',
  denied: 'Эта почта не админ доски. Войдите почтой админа.',
};
function gate() {
  const s = store.adminState();
  $('#a-login').hidden = s === 'in';
  $('#a-guard').hidden = $('#a-tabs').hidden = $('#a-list').hidden = s !== 'in';
  $('#a-login-text').textContent = GATE[s] || '';
  $('#a-login-btn').hidden = s === 'checking';
  if (s === 'in') render();
}
$('#a-login-btn').addEventListener('click', async () => {
  if (store.adminState() === 'denied') await store.signOutAdmin();
  store.signIn();
});
store.onChange(gate);
gate();
