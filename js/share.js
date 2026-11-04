// «Поделиться» на странице объявления (решение автора 2026-11-04): первое фото объявления, под ним
// что, цена, описание и ссылка на объявление в приложении (shareText в util.js).
// Телефон умеет делиться файлами (Web Share): окно «Поделиться», человек выбирает WhatsApp и чат.
// Окно браузер открывает только сразу после касания, поэтому фото готовится заранее,
// когда страница открылась (prepare). Фото нет или устройство не умеет: то же окно с текстом и ссылкой.
// Окна нет совсем (старый браузер): WhatsApp открывается с текстом.
// Фото с подписью одним сообщением (решение автора 2026-11-04): на Android WhatsApp сам ставит текст
// подписью под фото. На Windows WhatsApp шлёт текст и фото двумя сообщениями (проверка автора на Surface),
// на iPhone теряет одно из двух (WebKit, ошибка 251500). Там уходит одно фото, а описание доска
// копирует: человек вставляет его в подпись к фото
import { shareText, wa } from './util.js';
import { CLOUDINARY } from './config.js';
import { send } from './stats.js';
import { toast } from './ui.js';
import * as store from './store.js';

const LABEL = { masters: 'Услуга', requests: 'Работа', goods: 'Товар', news: 'Объявление села' };
const together = /Android/i.test(navigator.userAgent);
let ready = { id: null, file: null };

// Фото из Cloudinary в jpg: такой файл примет любой мессенджер. Пробные фото (data:) не берём
const own = id => !!id && !/^(data:|https?:)/.test(id);
export function prepare(x) {
  if (ready.id === x.id) return;
  ready = { id: x.id, file: null };
  const id = x.photos?.[0];
  if (!own(id) || !navigator.canShare) return;
  fetch(`https://res.cloudinary.com/${CLOUDINARY.cloud}/image/upload/c_limit,w_1280,f_jpg,q_auto/${id}`)
    .then(r => (r.ok ? r.blob() : null))
    .then(b => {
      if (!b || ready.id !== x.id) return;
      const file = new File([b], 'valarg.jpg', { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) ready.file = file;
    })
    .catch(() => { /* без фото: поделимся текстом */ });
}

// Описание в буфер обмена. Не вышло: фото уйдёт вместе с текстом, как умеет устройство
async function copied(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export async function share(btn) {
  const { type, id } = btn.dataset;
  const x = store.find(type, id);
  if (!x) return;
  const text = shareText(type, x);
  send({ 'Связь': { 'Поделиться': LABEL[type] } });
  const file = ready.id === id ? ready.file : null;
  const solo = !!file && !together && await copied(text);
  const data = !file ? { text } : solo ? { files: [file] } : { files: [file], text };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    if (solo) toast('Описание скопировано. Вставьте его в подпись к фото.', 9000);
    navigator.share(data).catch(e => { if (e.name !== 'AbortError') open(wa('', text), '_blank', 'noopener'); });
    return;
  }
  open(wa('', text), '_blank', 'noopener');
}

// Для проверки: готово ли фото к отправке
export const hasPhoto = id => ready.id === id && !!ready.file;
