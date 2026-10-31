// Хранилище объявлений: база Firestore (Firebase). Экраны знают только функции ниже.
// Статусы: wait (на проверке), ok (на доске), no (отклонено), off (снято админом с доски), done (человек найден).
// masters: услуги, requests: работа от жителей, goods: товары (продаю и куплю, с 2026-10-31). Торга нет (решение автора 2026-10-30): старые предложения цены не читаются.
// Житель входит без аккаунта (анонимный вход, он его не видит): по этому входу «Мои»
// находит свои объявления. Автор входит в панели через Google. Права проверяют правила базы.
import {
  auth, db, adminAuth, adminDb, isPanel, GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch, serverTimestamp,
} from './fb.js';
import { toast } from './ui.js';
import { nextTime, isBot, sent } from './util.js';

// Поисковый робот видит витрину без объявлений: имена и номера жителей не попадают в поиск (решение автора 2026-10-30)
export const robot = isBot(navigator.userAgent);

const DAY = 864e5;
const TYPES = ['masters', 'requests', 'goods'];

// Каждая подписка кладёт свои документы отдельно, экраны видят их вместе
const parts = { masters: {}, requests: {}, goods: {} };
const subs = new Set();
export const onChange = fn => subs.add(fn);
const changed = () => subs.forEach(fn => fn());

function listen(type, name, q, onError) {
  return onSnapshot(q, snap => {
    parts[type][name] = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    if (panel === 'checking') panel = 'in';
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
// Админ включает и выключает её в панели. Настройки в базе ещё нет: защита включена
let guard = true;
export const guardOn = () => guard;
onSnapshot(doc(db, 'settings', 'board'), s => { guard = s.data()?.spam !== false; changed(); }, () => {});

let uid = null;
let panel = 'out';
// Значок «Админ» на доске: число объявлений на проверке или null (этот телефон не входил почтой админа)
let waitCount = null;
let onWait = () => {};
export const adminWait = fn => { onWait = fn; fn(waitCount); };
let stops = [];
function stopAll(names) {
  stops.forEach(s => s());
  stops = [];
  TYPES.forEach(t => names.forEach(n => delete parts[t][n]));
}

if (!isPanel && !robot) {
  // Доска: всем людям видны выложенные объявления
  TYPES.forEach(t => listen(t, 'board', query(collection(db, t), where('status', '==', 'ok'))));
  // Свои объявления любого статуса, если этот телефон уже входил
  onAuthStateChanged(auth, u => {
    stopAll(['mine']);
    uid = u?.uid || null;
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
    if (u) stopWait = TYPES.map(t => onSnapshot(query(collection(adminDb, t), where('status', '==', 'wait')),
      snap => { n[t] = snap.size; if (TYPES.every(k => k in n)) show(TYPES.reduce((s, k) => s + n[k], 0)); },
      () => show(null)));
  });
} else if (isPanel) {
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

export const board = type => list(type).filter(x => x.status === 'ok');
export const find = (type, id) => list(type).find(x => x.id === id);
export const all = list;

export function mine() {
  if (!uid) return [];
  const tag = type => x => ({ ...x, type });
  return TYPES.flatMap(t => list(t).map(tag(t)))
    .filter(x => x.owner === uid).sort((a, b) => b.at - a.at);
}

// Последнее объявление с этого телефона: отметка в памяти телефона или свои объявления из базы
function lastPost() {
  let t = 0;
  try { t = +localStorage.getItem('uv-last') || 0; } catch { /* памяти нет */ }
  return Math.max(t, ...mine().map(x => x.at));
}

// Одно объявление в сутки. Форма спрашивает до загрузки фото, чтобы не грузить их зря.
// Это подсказка телефону, а не замок: замок в правилах базы (limits)
export function checkLimit() {
  if (!guard) return;
  const next = lastPost() + DAY;
  if (next > Date.now()) throw new Error(`Одно объявление в сутки. Следующее можно отправить ${nextTime(next)}.`);
}

// База отказала при включённой защите: почти всегда с этого номера сегодня уже отправляли
const why = e => (e?.code !== 'permission-denied'
  ? 'Нет связи с интернетом. Попробуйте ещё раз.'
  : guard ? 'Одно объявление в сутки. С этого номера сегодня уже отправляли. Попробуйте завтра.'
    : 'База не приняла запись. Проверьте поля и попробуйте ещё раз.');
async function user() {
  await auth.authStateReady();
  return auth.currentUser || (await signInAnonymously(auth)).user;
}

// Новое объявление ждёт проверки админа. onSlow: связь слабая, форма говорит об этом и ждёт ответа базы
export async function add(type, data, onSlow = () => {}) {
  checkLimit();
  let item;
  try {
    const u = await user();
    const ref = doc(collection(db, type));
    item = { ...data, at: Date.now(), status: 'wait', owner: u.uid };
    // В той же записи отметка времени для телефона и для номера: по ним база считает сутки.
    // t и id: где лежит объявление. Без объявления на этот номер база не ставит отметку номера
    const b = writeBatch(db);
    const stamp = { at: serverTimestamp(), t: type, id: ref.id };
    b.set(doc(db, 'limits', 'u_' + u.uid), stamp);
    b.set(doc(db, 'limits', 'p_' + data.phone), stamp);
    b.set(ref, item);
    await sent(b.commit(), onSlow);
    item.id = ref.id;
  } catch (e) { throw new Error(why(e)); }
  try { localStorage.setItem('uv-last', String(item.at)); } catch { /* не страшно */ }
  return item;
}

const quiet = p => p.catch(e => toast(why(e)));
export const setStatus = (type, id, status) => quiet(updateDoc(doc(db, type, id), { status }));
export const setGuard = on => quiet(setDoc(doc(db, 'settings', 'board'), { spam: on }));
export const remove = (type, id) => quiet(deleteDoc(doc(db, type, id)));

// Вход админа в панели: out (не вошёл), checking (проверяем), in (админ), denied (чужая почта)
export const adminState = () => panel;
export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
  if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Вход не удался. Попробуйте ещё раз.');
});
export const signOutAdmin = () => signOut(auth);
