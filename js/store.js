// Хранилище объявлений: база Firestore (Firebase). Экраны знают только функции ниже.
// Статусы: wait (на проверке), ok (на доске), no (отклонено), done (мастер найден).
// Житель входит без аккаунта (анонимный вход, он его не видит): по этому входу «Мои»
// находит свои объявления. Автор входит в панели через Google. Права проверяют правила базы.
import {
  auth, db, adminAuth, adminDb, isPanel, GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where,
} from './fb.js';
import { toast } from './ui.js';

const WAIT_MAX = 3;
const TYPES = ['masters', 'requests'];

// Каждая подписка кладёт свои документы отдельно, экраны видят их вместе
const parts = { masters: {}, requests: {}, offers: {} };
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
const withOffers = r => ({ ...r, offers: merged('offers').filter(o => o.reqId === r.id) });
function list(type) {
  const xs = merged(type).sort((a, b) => b.at - a.at);
  return type === 'requests' ? xs.map(withOffers) : xs;
}

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
  TYPES.concat('offers').forEach(t => names.forEach(n => delete parts[t][n]));
}

if (!isPanel) {
  // Доска: всем видны выложенные объявления и все предложения цены
  TYPES.forEach(t => listen(t, 'board', query(collection(db, t), where('status', '==', 'ok'))));
  listen('offers', 'all', collection(db, 'offers'));
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
      snap => { n[t] = snap.size; if (TYPES.every(k => k in n)) show(n.masters + n.requests); },
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
    stops = [...TYPES.map(t => listen(t, 'all', collection(db, t), fail)), listen('offers', 'all', collection(db, 'offers'), fail)];
  });
}

export const board = type => list(type).filter(x => x.status === 'ok');
export const find = (type, id) => list(type).find(x => x.id === id);
export const all = list;

export function mine() {
  if (!uid) return [];
  const tag = type => x => ({ ...x, type });
  return [...list('masters').map(tag('masters')), ...list('requests').map(tag('requests'))]
    .filter(x => x.owner === uid).sort((a, b) => b.at - a.at);
}

// Больше трёх ждущих проверки с одного телефона нельзя: защита от спама.
// Форма спрашивает до загрузки фото, чтобы не грузить их зря
export function checkLimit() {
  const waiting = mine().filter(x => x.status === 'wait').length;
  if (waiting >= WAIT_MAX) throw new Error('Три объявления уже ждут проверки. Дождитесь, пока админ их посмотрит.');
}

const why = e => (e?.code === 'permission-denied'
  ? 'База не приняла запись. Проверьте поля и попробуйте ещё раз.'
  : 'Нет связи с интернетом. Попробуйте ещё раз.');
// Связь медленная: база сама отправит запись, когда связь появится. Экран не ждёт дольше 8 секунд
const sent = p => Promise.race([p, new Promise(r => setTimeout(r, 8000))]);
async function user() {
  await auth.authStateReady();
  return auth.currentUser || (await signInAnonymously(auth)).user;
}

// Новое объявление ждёт проверки админа
export async function add(type, data) {
  checkLimit();
  let item;
  try {
    const u = await user();
    const ref = doc(collection(db, type));
    item = { ...data, at: Date.now(), status: 'wait', owner: u.uid };
    await sent(setDoc(ref, item));
    item.id = ref.id;
  } catch (e) { throw new Error(why(e)); }
  return item;
}

// Предложение цены видно сразу (решение автора). Один мастер: одно предложение на заявку
export async function addOffer(reqId, data) {
  if (!find('requests', reqId)) throw new Error('Заявка уже снята с доски.');
  try {
    const u = await user();
    await sent(setDoc(doc(db, 'offers', `${reqId}_${u.uid}`), { ...data, reqId, at: Date.now(), owner: u.uid }));
  } catch (e) { throw new Error(why(e)); }
}

const quiet = p => p.catch(e => toast(why(e)));
export const setStatus = (type, id, status) => quiet(updateDoc(doc(db, type, id), { status }));
export const remove = (type, id) => quiet(deleteDoc(doc(db, type, id)));
export const removeOffer = (reqId, offerId) => quiet(deleteDoc(doc(db, 'offers', offerId)));

// Вход админа в панели: out (не вошёл), checking (проверяем), in (админ), denied (чужая почта)
export const adminState = () => panel;
export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
  if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Вход не удался. Попробуйте ещё раз.');
});
export const signOutAdmin = () => signOut(auth);
