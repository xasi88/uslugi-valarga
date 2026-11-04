// «Поделиться» на странице объявления (решение автора 2026-11-04): первое фото объявления, под ним
// что, цена, описание и ссылка на объявление в приложении (shareText в util.js).
// Телефон умеет делиться файлами (Web Share): окно «Поделиться», человек выбирает WhatsApp и чат,
// фото уходит с текстом. Окно браузер открывает только сразу после касания, поэтому фото готовится
// заранее, когда страница открылась (prepare). Фото нет или телефон не умеет: то же окно с текстом и ссылкой.
// Окна нет совсем (старый браузер): WhatsApp открывается с текстом
import { shareText, wa } from './util.js';
import { CLOUDINARY } from './config.js';
import { send } from './stats.js';
import * as store from './store.js';

const LABEL = { masters: 'Услуга', requests: 'Работа', goods: 'Товар' };
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

export function share(btn) {
  const { type, id } = btn.dataset;
  const x = store.find(type, id);
  if (!x) return;
  const text = shareText(type, x);
  send({ 'Связь': { 'Поделиться': LABEL[type] } });
  const file = ready.id === id ? ready.file : null;
  const data = file ? { files: [file], text } : { text };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    navigator.share(data).catch(e => { if (e.name !== 'AbortError') open(wa('', text), '_blank', 'noopener'); });
    return;
  }
  open(wa('', text), '_blank', 'noopener');
}

// Для проверки: готово ли фото к отправке
export const hasPhoto = id => ready.id === id && !!ready.file;
