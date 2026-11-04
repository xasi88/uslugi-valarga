// Первые объявления без Firebase: лёгкий запрос к базе на каждый раздел (REST Firestore, 2026-11-01).
// index.html грузит этот файл с async: запрос уходит раньше остального кода доски, store.js берёт ответ.
// Права те же, что у Firebase: правила базы отдают всем только выложенные объявления (status == 'ok')
import { FIREBASE } from './config.js';
import { fromRest, isBot } from './util.js';

const URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents:runQuery?key=${FIREBASE.apiKey}`;
const TYPES = ['masters', 'requests', 'goods', 'news'];

// Тело запроса простым текстом, без заголовка JSON: так браузер не шлёт лишний предварительный запрос
async function one(type) {
  const where = { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'ok' } } };
  const r = await fetch(URL, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: type }], where } }) });
  if (!r.ok) throw new Error('База ответила ' + r.status);
  return (await r.json()).filter(x => x.document)
    .map(({ document: d }) => ({ ...fromRest(d.fields), id: d.name.split('/').pop() }));
}

// Объявления всех разделов: { masters: [...], requests: [...], goods: [...], news: [...] }.
// Один раздел не ответил (например, база ещё не знает новый раздел): остальные всё равно на доске
export async function fetchBoard() {
  const lists = await Promise.all(TYPES.map(t => one(t).catch(e => (t === 'news' ? [] : Promise.reject(e)))));
  return Object.fromEntries(TYPES.map((t, i) => [t, lists[i]]));
}

// Робот и панель админа первый запрос не делают: роботу объявления не показываются, панель берёт всё из Firebase.
// Ошибку разбирает store.js
export const firstBoard = isBot(navigator.userAgent) || location.pathname.includes('/admin/') ? null : fetchBoard();
firstBoard?.catch(() => {});
