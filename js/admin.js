// Панель админа: проверка новых объявлений, снятие с доски, удаление предложений цены.
// Классы панели начинаются с a-. Данные через store.js, как у доски.
import { icon, waIcon, kindById } from './icons.js';
import { esc, money, ago, wa, phoneNice, photoUrl } from './util.js';
import { CLOUDINARY } from './config.js';
import { $, toast } from './ui.js';
import * as store from './store.js';
import './install.js';

let tab = 'wait';

const priceText = x => (x.type === 'requests'
  ? (x.budget ? `до ${money(x.budget)}` : 'договорная')
  : (x.price ? `${x.from ? 'от ' : ''}${money(x.price)}${x.unit ? ' ' + x.unit : ''}` : 'договорная'));

function items(status) {
  const tagT = type => x => ({ ...x, type });
  return [...store.all('masters').map(tagT('masters')), ...store.all('requests').map(tagT('requests'))]
    .filter(x => x.status === status).sort((a, b) => b.at - a.at);
}
const offers = () => store.all('requests').filter(r => r.status === 'ok')
  .flatMap(r => r.offers.map(o => ({ ...o, req: r }))).sort((a, b) => b.at - a.at);

function card(x) {
  const k = kindById(x.kind);
  const isReq = x.type === 'requests';
  const facts = [
    priceText(x),
    isReq && x.when, isReq && x.place, !isReq && x.note,
  ].filter(Boolean).map(f => `<span>${esc(f)}</span>`).join('');
  const acts = x.status === 'wait'
    ? `<button class="btn a-ok" data-a="ok">${icon('ok')}Выложить</button><button class="btn btn-danger" data-a="no">Отклонить</button>`
    : `<button class="btn btn-danger" data-a="off">Снять с доски</button>`;
  return `<li class="a-card" data-type="${x.type}" data-id="${x.id}">
    <p class="a-kind">${icon(k.id)}<b>${isReq ? 'Заявка' : 'Услуга'}</b> · ${k.name} · ${ago(x.at)}</p>
    <h3>${esc(isReq ? x.text : x.title)}</h3>
    ${x.photos?.length ? `<div class="a-shots">${x.photos.map(p => `<img src="${esc(photoUrl(p, 200, CLOUDINARY.cloud))}" alt="">`).join('')}</div>` : ''}
    <p class="a-facts">${facts}</p>
    <p class="a-who">${esc(x.name)} · <a href="${wa(x.phone, 'Здравствуйте! Пишу как админ доски «Услуги Валарга».')}" target="_blank" rel="noopener">${waIcon}${phoneNice(x.phone)}</a></p>
    <div class="a-acts">${acts}</div>
  </li>`;
}

function offerCard(o) {
  return `<li class="a-card" data-req="${o.req.id}" data-offer="${o.id}">
    <p class="a-kind">${icon(o.req.kind)}<b>Предложение</b> · ${ago(o.at)}</p>
    <h3>${esc(o.name)}: ${money(o.price)}</h3>
    <p class="a-facts"><span>на заявку «${esc(o.req.text)}»</span>${o.note ? `<span>${esc(o.note)}</span>` : ''}</p>
    <p class="a-who"><a href="${wa(o.phone, 'Здравствуйте! Пишу как админ доски «Услуги Валарга».')}" target="_blank" rel="noopener">${waIcon}${phoneNice(o.phone)}</a></p>
    <div class="a-acts"><button class="btn btn-danger" data-a="del-offer">Удалить предложение</button></div>
  </li>`;
}

function render() {
  const lists = { wait: items('wait'), ok: items('ok'), offers: offers() };
  const names = { wait: 'Проверка', ok: 'На доске', offers: 'Предложения' };
  $('#a-tabs').innerHTML = Object.keys(names).map(k =>
    `<button class="chip" role="tab" data-tab="${k}" aria-pressed="${tab === k}">${names[k]} <b>${lists[k].length}</b></button>`).join('');
  const list = lists[tab];
  const empty = { wait: 'Новых объявлений нет. Всё проверено.', ok: 'На доске пока пусто.', offers: 'Предложений цены пока нет.' };
  $('#a-list').innerHTML = list.length ? list.map(tab === 'offers' ? offerCard : card).join('') : `<li class="a-empty">${empty[tab]}</li>`;
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t) { tab = t.dataset.tab; render(); return; }
  const a = e.target.closest('[data-a]');
  if (!a) return;
  const c = a.closest('.a-card');
  const go = () => {
    if (a.dataset.a === 'ok') { store.setStatus(c.dataset.type, c.dataset.id, 'ok'); toast('Объявление на доске.'); }
    if (a.dataset.a === 'no') { store.setStatus(c.dataset.type, c.dataset.id, 'no'); toast('Объявление не на доске. Автор увидит это в «Моих».'); }
    if (a.dataset.a === 'off') { store.setStatus(c.dataset.type, c.dataset.id, 'off'); toast('Объявление снято с доски. Автор увидит это в «Моих».'); }
    if (a.dataset.a === 'del-offer') { store.removeOffer(c.dataset.req, c.dataset.offer); toast('Предложение удалено.'); }
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
  $('#a-tabs').hidden = $('#a-list').hidden = s !== 'in';
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
