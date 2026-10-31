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
  'за штуку': '/шт', 'за кг': '/кг', 'за литр': '/л', 'за десяток': '/десяток', 'за мешок': '/мешок', 'за ящик': '/ящик', 'за голову': '/голову',
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

export const wa = (d, text) => `https://wa.me/${d}?text=${encodeURIComponent(text)}`;

// Обрезать пробелы и длину: поле не может быть бесконечным
export const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Ждать ответа базы до конца. Ответа нет дольше ms: onSlow говорит человеку о слабой связи.
// «Отправлено» только после ответа: без него запись живёт в памяти страницы и пропадёт, если её закрыть
export async function sent(p, onSlow, ms = 8000) {
  const t = setTimeout(onSlow, ms);
  try { return await p; } finally { clearTimeout(t); }
}
