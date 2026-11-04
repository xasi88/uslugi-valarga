// Общие помощники без экрана: текст, деньги, время, телефон. Их проверяют тесты (tests/util.test.mjs).

// Текст от людей всегда через esc: в объявлении может быть что угодно
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function money(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
}

export function plural(n, one, few, many) {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}

export function ago(t, now = Date.now()) {
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} ${plural(m, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  const d = Math.round(h / 24);
  return d === 1 ? 'вчера' : `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
}

// Поисковый робот по строке браузера. Только известные имена: «bot» внутри названия телефона (Cubot) не в счёт
const BOTS = /googlebot|google-inspectiontool|storebot-google|adsbot|mediapartners-google|yandex\w*bot|yandeximages|bingbot|duckduckbot|baiduspider|slurp|applebot|petalbot|mail\.ru_bot|ahrefsbot|semrushbot|mj12bot|bytespider|gptbot|claudebot|ccbot/i;
export const isBot = ua => BOTS.test(String(ua ?? ''));

// Когда можно снова, если до этого времени меньше суток: «сегодня после 18:40», «завтра после 9:05»
export function nextTime(t, now = Date.now()) {
  const d = new Date(t);
  const day = d.toDateString() === new Date(now).toDateString() ? 'сегодня' : 'завтра';
  return `${day} после ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Телефон России в вид 7XXXXXXXXXX. «8 928...», «+7 (928)...», «928...» дают одно и то же.
// Неверный номер: пустая строка.
export function phone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 10) d = '7' + d;
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  return /^79\d{9}$/.test(d) ? d : '';
}

// Номер для глаз: +7 928 123-45-67
export function phoneNice(d) {
  return d ? `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}` : '';
}

// Цена из поля: только цифры, ноль значит «договорная»
export function price(raw) {
  const n = parseInt(String(raw ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 && n < 10000000 ? n : 0;
}

// Единица цены коротко, для цены на фото: «за метр» → «/м»
const SHORT = {
  'за метр': '/м', 'за м²': '/м²', 'за м³': '/м³', 'за час': '/час', 'за рейс': '/рейс', 'за точку': '/точку', 'за урок': '/урок',
  'за день': '/день', 'в месяц': '/мес', 'за штуку': '/шт', 'за кг': '/кг', 'за литр': '/л', 'за десяток': '/десяток', 'за мешок': '/мешок', 'за ящик': '/ящик', 'за голову': '/голову',
};
export const unitShort = unit => SHORT[unit] || '';

// Цена мастера и товара: на фото коротко, на странице полностью. У товара нет «от»
export function priceText(m, short) {
  if (!m.price) return 'договорная';
  const base = (m.from ? 'от ' : '') + money(m.price);
  return short ? base + unitShort(m.unit) : base;
}

// Оплата работы: «3 000 ₽ за день». Без суммы: «договорная»
export const payText = r => (r.budget ? money(r.budget) + (r.unit ? ' ' + r.unit : '') : 'договорная');

// Цена любого объявления словами: «от 5 000 ₽ за метр», «3 000 ₽ за день», «договорная»
export const fullPrice = (type, x) => (type === 'requests' ? payText(x) : priceText(x) + (x.price && x.unit ? ' ' + x.unit : ''));

// Текст «Поделиться» (решение автора 2026-11-04): что, цена, описание, ссылка на объявление в приложении
const SHARE_PAGE = { masters: '#/m/', goods: '#/t/', requests: '#/r/', news: '#/n/' };
export function shareText(type, x, site = 'https://valarg.ru/') {
  const link = `Смотрите на доске села «Валарг»: ${site}${SHARE_PAGE[type]}${x.id}`;
  // Объявление села: без цены, текст целиком и номер для связи (его и так видно на доске)
  if (type === 'news') return [`${x.admin ? 'От админа группы «Валарг»' : 'Объявление села'}: ${x.text}`, `Связь: ${phoneNice(x.phone)}`, link].join('\n');
  const what = type === 'requests' ? `Работа: ${x.text}` : `${type === 'masters' ? 'Услуга' : x.deal === 'buy' ? 'Куплю' : 'Продаю'}: ${x.title}`;
  const about = type === 'requests' ? [x.when && `Когда: ${x.when}`, x.place && `Где: ${x.place}`].filter(Boolean).join('. ') : x.note;
  return [`${what}, ${fullPrice(type, x)}`, about, link].filter(Boolean).join('\n');
}

// Версия a новее b («Проверить обновление», «Что нового»): «2.10» новее «2.9», «3.0» новее «2.9»
export function newer(a, b) {
  const [x, y] = [a, b].map(v => String(v).split('.').map(Number));
  return x[0] > y[0] || (x[0] === y[0] && x[1] > y[1]);
}

// Адрес фото шириной до w точек: фото целиком, без обрезки, меньше оригинала не растягивается.
// Фото из пробных данных (data:) отдаётся как есть
const own = id => !/^(data:|https?:)/.test(id);
const CDN = cloud => `https://res.cloudinary.com/${cloud}/image/upload`;
export function photoUrl(id, w, cloud) {
  return own(id) ? `${CDN(cloud)}/c_limit,w_${w},f_auto,q_auto/${id}` : id;
}

// Набор ширин для srcset: браузер сам берёт копию под место на экране и плотность экрана
export const WIDTHS = [320, 480, 640, 960, 1280, 1600];
export const photoSet = (id, cloud) => (own(id) ? WIDTHS.map(w => `${photoUrl(id, w, cloud)} ${w}w`).join(', ') : '');

// Крошечная размытая копия того же фото: заполняет пустые края плитки
export function photoBlur(id, cloud) {
  return own(id) ? `${CDN(cloud)}/c_fill,w_60,h_75/e_blur:800/f_auto,q_auto:low/${id}` : id;
}

// Заголовок дня в ленте доски: «Сегодня», «Вчера», «30 октября». Прошлый год с годом. По дате телефона
export function dayName(t, now = Date.now()) {
  const a = new Date(t), b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const n = Math.round((b - a) / 864e5);
  if (n <= 0) return 'Сегодня';
  if (n === 1) return 'Вчера';
  return a.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '');
}

export const wa = (d, text) => `https://wa.me/${d}?text=${encodeURIComponent(text)}`;

// Обрезать пробелы и длину: поле не может быть бесконечным
export const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Ждать ответа базы до конца. Ответа нет дольше ms: onSlow говорит человеку о слабой связи.
// «Отправлено» только после ответа: без него запись живёт в памяти страницы и пропадёт, если её закрыть
export async function sent(p, onSlow, ms = 8000) {
  const t = setTimeout(onSlow, ms);
  try { return await p; } finally { clearTimeout(t); }
}

// Объявление из лёгкого ответа базы (first.js): { title: { stringValue: 'Ворота' } } → { title: 'Ворота' }.
// Тот же вид, что отдаёт Firebase: числа числами, время числом миллисекунд
export function fromRest(fields = {}) {
  const val = v => {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
    if ('mapValue' in v) return fromRest(v.mapValue.fields);
    if ('timestampValue' in v) return Date.parse(v.timestampValue);
    return null;
  };
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, val(v)]));
}

// Тетрадь доски board/all (ведёт почтальон, 2026-11-04): { built, ads: { 'раздел_номер': 'JSON объявления' } }.
// Ответ: { masters: [...], requests: [...], goods: [...], news: [...] }. Тетради нет или ей больше 3 часов
// (почтальон молчит): null, доска берёт объявления по-старому, из каждого раздела
export function fromBook(data, now = Date.now()) {
  if (!data || !(now - data.built < 3 * 3600e3)) return null;
  const out = { masters: [], requests: [], goods: [], news: [] };
  for (const [key, json] of Object.entries(data.ads || {})) {
    const i = key.indexOf('_');
    const type = key.slice(0, i);
    if (!out[type]) continue;
    try { out[type].push({ ...JSON.parse(json), id: key.slice(i + 1) }); } catch { /* битая строка: без неё */ }
  }
  return out;
}

// Вопрос «Сообщать о новых объявлениях?» (ask.js). s: { n: сколько раз ответили «Не сейчас», at: когда }.
// Снова через 3 дня, всего не больше 3 раз: дальше вопрос не мешает, включить можно в настройках
export const askDue = (s = {}, now = Date.now()) => (s.n || 0) < 3 && now - (s.at || 0) >= 3 * 864e5;

// Где открыта доска: система и браузер. Экран «Как установить» показывает их шаги первыми (guide.js).
// ua: строка браузера, touch: точки касания (iPad называет себя компьютером Mac).
// Edge, Яндекс, Samsung и Opera тоже пишут Chrome: их ищем раньше. inapp: окно WhatsApp, Telegram, Instagram
export function browserOf(ua = '', touch = 0) {
  const has = re => re.test(ua);
  const ios = has(/iphone|ipad|ipod/i) || (has(/macintosh/i) && touch > 1);
  if (has(/instagram|fban|fbav|fb_iab|vkclient|telegram|whatsapp|line\//i) || (has(/android/i) && has(/; wv\)/))) return 'inapp';
  if (ios) return !has(/safari\//i) ? 'inapp' : has(/crios|fxios|edgios|yabrowser|opt\/|gsa\//i) ? 'ios-other' : 'ios-safari';
  if (has(/android/i)) {
    return has(/samsungbrowser/i) ? 'android-samsung' : has(/yabrowser|yasearchbrowser/i) ? 'android-yandex'
      : has(/edga\//i) ? 'android-edge' : has(/opr\/|opx\//i) ? 'android-opera' : has(/firefox/i) ? 'android-firefox'
        : has(/miuibrowser|huaweibrowser|heytap|vivobrowser|ucbrowser/i) ? 'android-other' : has(/chrome/i) ? 'android-chrome' : 'android-other';
  }
  if (has(/edg\//i)) return 'pc-edge';
  if (has(/yabrowser/i)) return 'pc-yandex';
  if (has(/opr\//i)) return 'pc-other';
  if (has(/firefox/i)) return 'pc-firefox';
  if (has(/chrome|chromium/i)) return 'pc-chrome';
  return has(/macintosh/i) && has(/safari\//i) ? 'mac-safari' : 'pc-other';
}

// Срок на доске (решение автора 2026-11-04): услуги 90 дней, работа и товары 30, объявления села 1 день.
// Те же числа в правилах базы и у почтальона (worker). Потом почтальон снимает объявление (статус old),
// владелец продлевает его в «Моих»: не раньше чем за RENEW дней до конца срока, объявление села только
// после конца. Продлённое поднимается наверх ленты (новое время at)
export const LIFE = { masters: 90, requests: 30, goods: 30, news: 1 };
export const RENEW = 5;
const early = type => (type === 'news' ? 0 : RENEW);
// Сколько дней осталось на доске, с неполным днём: только что выложено 30, меньше суток 1, срок вышел 0
export const daysLeft = (type, at, now = Date.now()) => Math.max(0, Math.ceil((at + LIFE[type] * 864e5 - now) / 864e5));
export const canRenew = (x, type, now = Date.now()) => x.status === 'old'
  || (x.status === 'ok' && now - x.at > (LIFE[type] - early(type)) * 864e5);
