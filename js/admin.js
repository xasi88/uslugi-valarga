// Панель админа: проверка новых объявлений, снятие с доски, объявления от админа (с 2026-11-04).
// Классы панели начинаются с a-. Данные через store.js, как у доски.
import { icon, waIcon, phoneIcon, kindOf, NEWS } from './icons.js';
import { esc, ago, wa, phoneNice, photoUrl, priceText as cost, payText, clean, canRenew } from './util.js';
import { CLOUDINARY, ADMIN_PHONE } from './config.js';
import { $, toast } from './ui.js';
import * as store from './store.js';
import * as push from './push.js';
import './install.js';

let tab = 'wait';

const priceText = x => (x.type === 'news' ? '' : x.type === 'requests' ? payText(x) : cost(x) + (x.price && x.unit ? ' ' + x.unit : ''));

function items(...statuses) {
  const tagT = type => x => ({ ...x, type });
  return ['masters', 'requests', 'goods', 'news'].flatMap(t => store.all(t).map(tagT(t)))
    .filter(x => statuses.includes(x.status)).sort((a, b) => b.at - a.at);
}

// Вкладка «Снятые»: почему объявления нет на доске и как его вернуть (решение автора 2026-10-30).
// «Человек найден» и «Продано» не возвращаются: объявление снял сам автор.
// «Срок вышел» (с 2026-11-04) возвращает только владелец кнопкой «Продлить» в «Моих»
const GONE = { off: 'Снято с доски', no: 'Отклонено', done: 'Человек найден', old: 'Срок вышел' };
const gone = x => (x.status !== 'done' ? GONE[x.status] : x.type === 'goods' ? (x.deal === 'buy' ? 'Куплено' : 'Продано')
  : x.type === 'news' ? 'Снял автор' : GONE.done);
const LABEL = { masters: 'Услуга', requests: 'Работа', goods: 'Товар', news: 'Село' };
const BACK = { off: 'Вернуть на доску', no: 'Выложить' };
const DEL = '<button class="btn btn-line" data-a="del">Удалить</button>';
// Чей номер (решение автора 2026-11-04): сайт не знает, чей номер ввели. Ответит только настоящий владелец
function askOwner(x) {
  const q = `Здравствуйте! Это админ доски «Валарг». С вашего номера пришло объявление: «${x.text.slice(0, 120)}». Это вы написали? Ответьте «да», и я выложу его.`;
  return x.wa === false ? `<a class="btn btn-line" href="tel:+${x.phone}">${phoneIcon}Позвонить и спросить</a>`
    : `<a class="btn btn-line" href="${wa(x.phone, q)}" target="_blank" rel="noopener">${waIcon}Спросить в WhatsApp</a>`;
}
function acts(x) {
  if (x.status === 'wait') return `<button class="btn a-ok" data-a="ok">${icon('ok')}Выложить</button><button class="btn btn-danger" data-a="no">Отклонить</button>${x.type === 'news' ? askOwner(x) : ''}`;
  // Своё объявление админ продлевает сам, как житель в «Моих»
  if (x.admin && canRenew(x, x.type)) return `<button class="btn a-ok" data-a="renew">Продлить на сутки</button>${DEL}`;
  if (x.status === 'ok') return `<button class="btn btn-danger" data-a="off">Снять с доски</button>${DEL}`;
  return (BACK[x.status] ? `<button class="btn a-ok" data-a="ok">${icon('ok')}${BACK[x.status]}</button>` : '') + DEL;
}

function card(x) {
  const k = kindOf(x.type, x.kind);
  const isReq = x.type === 'requests' || x.type === 'news';
  const facts = [
    priceText(x),
    isReq && x.when, isReq && x.place, !isReq && x.note,
  ].filter(Boolean).map(f => `<span>${esc(f)}</span>`).join('');
  return `<li class="a-card${x.admin ? ' a-admin' : ''}" data-type="${x.type}" data-id="${x.id}">
    <p class="a-kind">${icon(k.id)}<b>${x.admin ? 'От админа' : x.deal === 'buy' ? 'Куплю' : LABEL[x.type]}</b> · ${k.name} · ${ago(x.at)}${gone(x) ? ' · ' + gone(x) : ''}</p>
    <h3>${esc(isReq ? x.text : x.title)}</h3>
    ${x.photos?.length ? `<div class="a-shots">${x.photos.map(p => `<img src="${esc(photoUrl(p, 320, CLOUDINARY.cloud))}" alt="">`).join('')}</div>` : ''}
    ${facts ? `<p class="a-facts">${facts}</p>` : ''}
    ${x.admin ? '' : `<p class="a-who">${esc(x.name)} · ${x.wa === false
      ? `<a href="tel:+${x.phone}">${phoneIcon}${phoneNice(x.phone)}</a> · без WhatsApp`
      : `<a href="${wa(x.phone, 'Здравствуйте! Пишу как админ доски «Валарг».')}" target="_blank" rel="noopener">${waIcon}${phoneNice(x.phone)}</a>`}</p>`}
    <div class="a-acts">${acts(x)}</div>
  </li>`;
}

// Защита от спама: одно объявление в сутки. Админ включает и выключает её здесь
function guardBox() {
  const on = store.guardOn();
  $('#a-guard').innerHTML = `<p><b>Защита от спама</b><span>${on
    ? 'Одно объявление в сутки с одного телефона и одного номера. Товары считаются отдельно.'
    : 'Выключена: люди отправляют объявления без ограничений.'}</span></p>
    <div><button class="chip" data-guard="1" aria-pressed="${on}">Включена</button><button class="chip" data-guard="0" aria-pressed="${!on}">Выключена</button></div>`;
}

// Объявление от админа (решение автора 2026-11-04): сразу на доске, без проверки, синяя плитка «От админа».
// Висит сутки, как у жителей, подписанные получают уведомление. Фото пока нет: вид и текст
function newsBox() {
  const box = $('#a-news');
  if (box.dataset.ready) return;
  box.dataset.ready = '1';
  box.innerHTML = `<details><summary class="btn btn-ink">Написать от админа</summary>
    <form class="a-form" novalidate>
      <div class="a-kinds">${NEWS.map((k, i) => `<button type="button" class="chip" data-k="${k.id}" aria-pressed="${i === 0}">${k.name}</button>`).join('')}</div>
      <label class="field"><span class="lbl">Текст</span><textarea name="text" maxlength="300" rows="4" placeholder="Например: в пятницу в 10:00 сход села у мечети"></textarea></label>
      <p class="a-note">Сразу на доске: синяя плитка «От админа», 24 часа. Подписанным придёт уведомление.</p>
      <button class="btn a-ok">Выложить на доску</button>
    </form></details>`;
}
async function sendNews(form) {
  const text = clean(form.elements.text.value, 300);
  if (text.length < 10) return toast('Напишите объявление: хотя бы 10 букв.');
  const kind = form.querySelector('[data-k][aria-pressed="true"]')?.dataset.k || 'drugoe';
  const btn = form.querySelector('.a-ok');
  btn.disabled = true;
  try {
    const id = await store.adminNews({ kind, text, photos: [], name: 'Админ', phone: ADMIN_PHONE, wa: true });
    push.ping('status', 'news', id);
    form.reset();
    form.closest('details').open = false;
    tab = 'ok';
    render();
    toast('Объявление на доске.');
  } catch { toast('Не получилось выложить. Проверьте связь и попробуйте ещё раз.'); }
  btn.disabled = false;
}
document.addEventListener('submit', e => {
  if (!e.target.matches('.a-form')) return;
  e.preventDefault();
  sendNews(e.target);
});

function render() {
  guardBox();
  newsBox();
  const lists = { wait: items('wait'), ok: items('ok'), off: items('off', 'no', 'done', 'old') };
  const names = { wait: 'Проверка', ok: 'На доске', off: 'Снятые' };
  $('#a-tabs').innerHTML = Object.keys(names).map(k =>
    `<button class="chip" role="tab" data-tab="${k}" aria-pressed="${tab === k}">${names[k]} <b>${lists[k].length}</b></button>`).join('');
  const list = lists[tab];
  const empty = { wait: 'Новых объявлений нет. Всё проверено.', ok: 'На доске пока пусто.', off: 'Снятых объявлений нет.' };
  $('#a-list').innerHTML = list.length ? list.map(card).join('') : `<li class="a-empty">${empty[tab]}</li>`;
}

document.addEventListener('click', e => {
  const k = e.target.closest('[data-k]');
  if (k) { k.parentElement.querySelectorAll('[data-k]').forEach(b => b.setAttribute('aria-pressed', b === k)); return; }
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
    // Решение админа записано в базу: почтальон скажет автору объявления, даже если у того доска закрыта
    const tell = () => push.ping('status', c.dataset.type, c.dataset.id);
    if (a.dataset.a === 'ok') { store.setStatus(c.dataset.type, c.dataset.id, 'ok').then(tell); toast('Объявление на доске.'); }
    if (a.dataset.a === 'no') { store.setStatus(c.dataset.type, c.dataset.id, 'no').then(tell); toast('Объявление не на доске. Автор увидит это в «Моих».'); }
    if (a.dataset.a === 'off') { store.setStatus(c.dataset.type, c.dataset.id, 'off').then(tell); toast('Объявление снято с доски. Автор увидит это в «Моих».'); }
    if (a.dataset.a === 'del') { store.remove(c.dataset.type, c.dataset.id); toast('Объявление удалено из базы.'); }
    if (a.dataset.a === 'renew') {
      store.renew(c.dataset.type, c.dataset.id).then(() => toast('Объявление снова на доске, наверху ленты.'),
        () => toast('Не получилось продлить. Проверьте связь.'));
    }
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
  $('#a-guard').hidden = $('#a-news').hidden = $('#a-tabs').hidden = $('#a-list').hidden = s !== 'in';
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
