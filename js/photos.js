// Фото с телефона: уменьшить до 1000 точек по длинной стороне и сжать в JPEG,
// потом отправить в Cloudinary. Фото весит около 120 КБ вместо 5 МБ.
import { icon } from './icons.js';
import { CLOUDINARY } from './config.js';

export const MAX = { masters: 6, requests: 3 };

export async function shrink(file, max = 1000, q = .76) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Отправить фото в Cloudinary. Возвращает номер фото (public_id), его хранит объявление
export async function upload(dataUrl) {
  const fd = new FormData();
  fd.append('file', dataUrl);
  fd.append('upload_preset', CLOUDINARY.preset);
  let r;
  try {
    r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud}/image/upload`, { method: 'POST', body: fd });
  } catch { r = null; }
  if (!r || !r.ok) throw new Error('Фото не загрузилось. Проверьте интернет и отправьте снова.');
  return (await r.json()).public_id;
}

// Поле «Фото работ»: квадраты выбранных фото и квадрат «Добавить фото»
export function shotsField(type) {
  return `<div class="shots" data-max="${MAX[type]}">${addTile()}</div>`;
}
const addTile = () => `<label class="shot-add">${icon('camera')}Добавить фото<input type="file" accept="image/*" multiple hidden data-photos></label>`;

export function drawShots(box, list) {
  const max = +box.dataset.max;
  box.innerHTML = list.map((src, i) => `<div class="shot"><img src="${src}" alt=""><button type="button" data-shot="${i}" aria-label="Убрать фото">${icon('x')}</button></div>`).join('')
    + (list.length < max ? addTile() : '');
}

// Новые фото из выбора: сжать по очереди, лишние сверх предела не брать
export async function addShots(form, files) {
  const box = form.querySelector('.shots');
  const list = form._photos || (form._photos = []);
  const room = +box.dataset.max - list.length;
  box.querySelector('.shot-add')?.classList.add('busy');
  for (const f of [...files].slice(0, room)) {
    try { list.push(await shrink(f)); } catch { /* не картинка: пропускаем */ }
  }
  drawShots(box, list);
  return files.length > room;
}

export function removeShot(form, i) {
  form._photos.splice(i, 1);
  drawShots(form.querySelector('.shots'), form._photos);
}
