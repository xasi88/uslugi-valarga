// Хранилище объявлений: база Firestore (Firebase). Экраны знают только функции ниже.
// Статусы: wait (на проверке), ok (на доске), no (отклонено), off (снято админом с доски), done (человек найден).
// masters: услуги, requests: работа от жителей, goods: товары (продаю и куплю, с 2026-10-31),
// news: объявления села (с 2026-11-04, объявление админа выкладывается сразу). Торга нет (решение автора 2026-10-30): старые предложения цены не читаются.
// Житель входит без аккаунта (анонимный вход, он его не видит): по этому входу «Мои»
// находит свои объявления. Автор входит в панели через Google. Права проверяют правила базы.
// Скорость (2026-11-01): доска сразу показывает объявления из памяти телефона, потом берёт свежие
// лёгким запросом (first.js). Тяжёлый Firebase (fb.js) грузится, только когда он нужен: wake()
import { toast } from './ui.js';
import { nextTime, isBot, sent, fromBook } from './util.js';
import { firstBoard, fetchBoard } from './first.js';

// Поисковый робот видит витрину без объявлений: имена и номера жителей не попадают в поиск (решение автора 2026-10-30)
export const robot = isBot(navigator.userAgent);
const isPanel = location.pathname.includes('/admin/');

const DAY = 864e5;
const TYPES = ['masters', 'requests', 'goods', 'news'];

// Каждая подписка кладёт свои документы отдельно, экраны видят их вместе
const parts = { masters: {}, requests: {}, goods: {}, news: {} };
const subs = new Set();
export const onChange = fn => subs.add(fn);
const changed = () => subs.forEach(fn => fn());

// Объявления доски в памяти телефона: при следующем открытии они видны сразу, ещё до ответа базы
const SAVED = 'uv-board';
let ready = false;
// Объявления доски уже есть (из памяти или из базы). Пока нет: экраны пишут «Загружаем», а не «Пока пусто»
export const loaded = () => ready;
function put(lists) {
  TYPES.forEach(t => { parts[t].board = new Map((lists[t] || []).map(x => [x.id, x])); });
  ready = true;
}
function keep() {
  const lists = Object.fromEntries(TYPES.map(t => [t, [...(parts[t].board?.values() || [])]]));
  try { localStorage.setItem(SAVED, JSON.stringify(lists)); } catch { /* не страшно */ }
}
const mark = (key, on) => { try { on ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch { /* не страшно */ } };
const has = key => { try { return !!localStorage.getItem(key); } catch { return false; } };

let f = null;
let waking = null;
// Загрузить Firebase и подписаться на базу. Повторный вызов отдаёт тот же модуль fb.js.
// Нет связи: следующий вызов попробует снова
export const wake = () => (waking ||= import('./fb.js').then(m => { f = m; start(); return m; })
  .catch(e => { waking = null; throw e; }));

function listen(type, name, q, onError) {
  return f.onSnapshot(q, snap => {
    parts[type][name] = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    if (panel === 'checking') { panel = 'in'; mark('uv-admin', true); }
    if (name === 'board') { ready = true; keep(); }
    changed();
  }, e => {
    delete parts[type][name];
    changed();
    onError?.(e);
  });
}
function merged(type) {
  const out = new Map();
  Object.values(parts[type]).forEach(m => m.forEach((v, k) => out.set(k, v)));
  return [...out.values()];
}
const list = type => merged(type).sort((a, b) => b.at - a.at);

// Защита от спама: одно объявление в сутки с телефона и с номера (решение автора 2026-10-30).
// Товары считаются отдельно от услуг и работы (решение автора 2026-10-31): у них свои отметки gu_ и gp_.
// Объявления села тоже отдельно (2026-11-04): nu_ и np_.
// Админ включает и выключает её в панели. Настройки в базе ещё нет: защита включена
let guard = true;
const group = type => ({ goods: 'g', news: 'n' }[type] || '');
export const guardOn = () => guard;

let uid = null;
let uidKnown = false;
let panel = 'out';
// Значок «Админ» на доске: число объявлений на проверке или null (этот телефон не входил почтой админа)
let waitCount = null;
let onWait = () => {};
export const adminWait = fn => { onWait = fn; fn(waitCount); };
export const waiting = () => waitCount;
let stops = [];
function stopAll(names) {
  stops.forEach(s => s());
  stops = [];
  TYPES.forEach(t => names.forEach(n => delete parts[t][n]));
}

// Подписки Firebase: запускает wake()
function start() {
  const { db, auth, adminAuth, adminDb, collection, doc, query, where, onSnapshot, onAuthStateChanged } = f;
  onSnapshot(doc(db, 'settings', 'board'), s => { guard = s.data()?.spam !== false; changed(); }, () => {});
  if (!isPanel) {
    // Доска: с Firebase объявления приносит подписка на тетрадь board/all (одно чтение на изменение, 2026-11-04).
    // Тетради нет или она старая: подписка на каждый раздел, как раньше
    let each = null;
    const byType = () => { each ||= TYPES.map(t => listen(t, 'board', query(collection(db, t), where('status', '==', 'ok')))); };
    onSnapshot(doc(db, 'board', 'all'), s => {
      const lists = fromBook(s.data());
      if (!lists) return byType();
      each?.forEach(stop => stop());
      each = null;
      put(lists);
      keep();
      changed();
    }, byType);
    // Свои объявления любого статуса, если этот телефон уже входил
    onAuthStateChanged(auth, u => {
      stopAll(['mine']);
      uid = u?.uid || null;
      uidKnown = true;
      if (u) stops = TYPES.map(t => listen(t, 'mine', query(collection(db, t), where('owner', '==', u.uid))));
      changed();
    });
    // Вход панели на этом телефоне: доска считает объявления на проверке. Чужой почте база откажет
    let stopWait = [];
    onAuthStateChanged(adminAuth, u => {
      stopWait.forEach(s => s());
      stopWait = [];
      const n = {};
      const show = v => { waitCount = v; onWait(v); };
      show(null);
      if (!u) mark('uv-admin', false);
      if (u) stopWait = TYPES.map(t => onSnapshot(query(collection(adminDb, t), where('status', '==', 'wait')),
        snap => { n[t] = snap.size; if (TYPES.every(k => k in n)) { show(TYPES.reduce((s, k) => s + n[k], 0)); mark('uv-admin', true); } },
        () => show(null)));
    });
  } else {
    // Панель: всё видит только почта админа. Чужую почту база не пустит
    onAuthStateChanged(auth, u => {
      stopAll(['all']);
      panel = u ? 'checking' : 'out';
      changed();
      if (!u) return;
      const fail = e => {
        if (e.code !== 'permission-denied' || panel === 'denied') return;
        panel = 'denied';
        stopAll(['all']);
        changed();
      };
      stops = TYPES.map(t => listen(t, 'all', collection(db, t), fail));
    });
  }
}

// Свежие объявления лёгким запросом, пока Firebase не загружен. Доска рисуется заново,
// только если объявления правда поменялись: иначе она мигала бы при каждой проверке
let fetchedAt = 0;
let shown = '';
async function refresh(p) {
  if (f) return;
  fetchedAt = Date.now();
  let lists;
  try { lists = await p; } catch {
    // Нет связи: остаются объявления из памяти. Объявлений нет совсем: ещё попытка через 5 секунд
    if (!ready) setTimeout(() => refresh(fetchBoard()), 5000);
    return;
  }
  const text = JSON.stringify(lists);
  if (f || text === shown) return;
  shown = text;
  put(lists);
  try { localStorage.setItem(SAVED, text); } catch { /* не страшно */ }
  changed();
}

if (isPanel) wake();
else if (!robot) {
  try { const saved = localStorage.getItem(SAVED); if (saved) { put(JSON.parse(saved)); shown = saved; } } catch { /* памяти нет */ }
  refresh(firstBoard);
  // Без Firebase доска сама берёт свежие объявления: человек вернулся на доску или прошло 2 минуты
  const stale = ms => !document.hidden && Date.now() - fetchedAt > ms;
  setInterval(() => { if (stale(110e3)) refresh(fetchBoard()); }, 120e3);
  document.addEventListener('visibilitychange', () => { if (stale(60e3)) refresh(fetchBoard()); });
  // Телефону, который уже размещал или где входил админ, Firebase нужен и на доске: подсказки
  // о своих объявлениях, число на шестерёнке. Он грузится, когда доска уже на экране
  if (['uv-last', 'uv-last-goods', 'uv-last-news', 'uv-contact', 'uv-admin'].some(has)) setTimeout(() => wake().catch(() => {}), 2500);
}

// Взять свежие объявления сейчас (пришло уведомление «Новое на доске»). С Firebase их приносит подписка
export const pull = () => { if (!f && !robot && !isPanel) refresh(fetchBoard()); };

export const board = type => list(type).filter(x => x.status === 'ok');
export const find = (type, id) => list(type).find(x => x.id === id);
export const all = list;

// Свои объявления уже пришли из базы. Пока нет: «Мои» пишет «Загружаем», а не «Вы пока ничего не разместили»
export const mineLoaded = () => uidKnown && (!uid || TYPES.every(t => parts[t].mine));

export function mine() {
  if (!uid) return [];
  const tag = type => x => ({ ...x, type });
  return TYPES.flatMap(t => list(t).map(tag(t)))
    .filter(x => x.owner === uid).sort((a, b) => b.at - a.at);
}

// Последнее объявление с этого телефона в той же группе (товары, объявления села или услуги с работой):
// отметка в памяти телефона или свои объявления из базы
const LAST = { g: 'uv-last-goods', n: 'uv-last-news' };
const lastKey = type => LAST[group(type)] || 'uv-last';
function lastPost(type) {
  let t = 0;
  try { t = +localStorage.getItem(lastKey(type)) || 0; } catch { /* памяти нет */ }
  return Math.max(t, ...mine().filter(x => group(x.type) === group(type)).map(x => x.at));
}

// Одно объявление в сутки. Форма спрашивает до загрузки фото, чтобы не грузить их зря.
// Это подсказка телефону, а не замок: замок в правилах базы (limits)
export function checkLimit(type) {
  if (!guard || adminHere()) return;
  const next = lastPost(type) + DAY;
  if (next > Date.now()) throw new Error(`Одно объявление в сутки. Следующее можно отправить ${nextTime(next)}.`);
}

// База отказала при включённой защите: почти всегда с этого номера сегодня уже отправляли
const why = e => (e?.code !== 'permission-denied'
  ? 'Нет связи с интернетом. Попробуйте ещё раз.'
  : guard ? 'Одно объявление в сутки. С этого номера сегодня уже отправляли. Попробуйте завтра.'
    : 'База не приняла запись. Проверьте поля и попробуйте ещё раз.');
async function user() {
  const { auth, signInAnonymously } = await wake();
  await auth.authStateReady();
  return auth.currentUser || (await signInAnonymously(auth)).user;
}

// Этот телефон входил в панель почтой админа (отметку ставит доска, когда база отдала ему объявления на проверке)
export const adminHere = () => has('uv-admin');

// Админ размещает с доски сам (решение автора 2026-11-04): сразу на доске, синее «От админа», без проверки
// и без защиты от спама. Пишет вход панели (права админа), владелец: вход жителя на этом телефоне.
// Так объявление видно в «Моих», его можно продлить и снять, как у всех
async function asAdmin(type, data, u, onSlow) {
  const { adminDb, adminAuth, doc, collection, setDoc } = f;
  await adminAuth.authStateReady();
  if (!adminAuth.currentUser) return null;
  const ref = doc(collection(adminDb, type));
  const item = { ...data, admin: true, at: Date.now(), status: 'ok', owner: u.uid };
  await sent(setDoc(ref, item), onSlow);
  return { ...item, id: ref.id };
}

// Новое объявление ждёт проверки админа. Объявление самого админа сразу на доске (status ok).
// onSlow: связь слабая, форма говорит об этом и ждёт ответа базы
export async function add(type, data, onSlow = () => {}) {
  checkLimit(type);
  let item;
  try {
    const u = await user();
    // База не признала админа (вышел из панели на другом телефоне): объявление идёт на проверку, как у всех
    if (adminHere()) {
      const own = await asAdmin(type, data, u, onSlow).catch(e => { if (e?.code === 'permission-denied') return null; throw e; });
      if (own) return own;
    }
    const { db, doc, collection, writeBatch, serverTimestamp } = f;
    const ref = doc(collection(db, type));
    item = { ...data, at: Date.now(), status: 'wait', owner: u.uid };
    // В той же записи отметка времени для телефона и для номера: по ним база считает сутки.
    // t и id: где лежит объявление. Без объявления на этот номер база не ставит отметку номера.
    // У товаров (g) и объявлений села (n) отметки свои: они не мешают услуге или работе в тот же день
    const b = writeBatch(db);
    const stamp = { at: serverTimestamp(), t: type, id: ref.id };
    const g = group(type);
    b.set(doc(db, 'limits', g + 'u_' + u.uid), stamp);
    b.set(doc(db, 'limits', g + 'p_' + data.phone), stamp);
    b.set(ref, item);
    await sent(b.commit(), onSlow);
    item.id = ref.id;
  } catch (e) { throw new Error(why(e)); }
  try { localStorage.setItem(lastKey(type), String(item.at)); } catch { /* не страшно */ }
  return item;
}

// Адрес телефона для уведомлений (push.js). Номер записи: отпечаток адреса, сам адрес длинный.
// Житель: адрес со своим входом, почтальон найдёт его по владельцу объявления. Админ: ещё и в pushAdmin
const pushId = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))]
  .slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join('');
export async function savePush(token) {
  const id = await pushId(token), u = await user();
  const { db, adminDb, adminAuth, doc, setDoc, serverTimestamp } = f;
  await setDoc(doc(db, 'push', id), { token, uid: u.uid, at: serverTimestamp() });
  await adminAuth.authStateReady();
  if (adminAuth.currentUser) await setDoc(doc(adminDb, 'pushAdmin', id), { token, at: serverTimestamp() }).catch(() => {});
}
export async function dropPush(token) {
  const id = await pushId(token);
  const { db, adminDb, adminAuth, doc, deleteDoc } = await wake();
  await deleteDoc(doc(db, 'push', id)).catch(() => {});
  if (adminAuth.currentUser) await deleteDoc(doc(adminDb, 'pushAdmin', id)).catch(() => {});
}

const quiet = job => wake().then(job).catch(e => toast(why(e)));
export const setStatus = (type, id, status) => quiet(m => m.updateDoc(m.doc(m.db, type, id), { status }));
export const setGuard = on => quiet(m => m.setDoc(m.doc(m.db, 'settings', 'board'), { spam: on }));
export const remove = (type, id) => quiet(m => m.deleteDoc(m.doc(m.db, type, id)));
// Объявление от админа (решение автора 2026-11-04): пишет только админ в панели, сразу на доске, без отметок
// защиты от спама. Синяя плитка «От админа». Права проверяют правила базы (isAdmin)
export async function adminNews(data) {
  const m = await wake();
  const ref = m.doc(m.collection(m.db, 'news'));
  await m.setDoc(ref, { ...data, admin: true, at: Date.now(), status: 'ok', owner: m.auth.currentUser.uid });
  return ref.id;
}
// «Продлить»: снова на доске и наверху ленты. Правила базы пускают это только владельцу и только в конце срока
export async function renew(type, id) {
  const m = await wake();
  await m.updateDoc(m.doc(m.db, type, id), { status: 'ok', at: Date.now() });
}

// Вход админа в панели: out (не вошёл), checking (проверяем), in (админ), denied (чужая почта)
export const adminState = () => panel;
export const signIn = () => wake().then(m => m.signInWithPopup(m.auth, new m.GoogleAuthProvider())).catch(e => {
  if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Вход не удался. Попробуйте ещё раз.');
});
export const signOutAdmin = () => wake().then(m => m.signOut(m.auth));
