// Общие части экрана: подсказка снизу, место под фото, появление при прокрутке.
import { esc, photoUrl, photoSet, photoBlur } from './util.js';
import { CLOUDINARY } from './config.js';
import { icon } from './icons.js';

export const $ = s => document.querySelector(s);
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer;
export function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// Сколько места фото занимает на экране (атрибут sizes): по нему браузер выбирает ширину копии
export const SIZES = {
  tile: '(min-width: 1000px) 250px, (min-width: 700px) 32vw, 48vw',
  hero: '(min-width: 1000px) 520px, (min-width: 700px) 64vw, 96vw',
  gal: '(min-width: 640px) 608px, calc(100vw - 32px)',
  thumb: '90px',
};

// Фото или тон вида работ со значком, пока фото нет. Фото всегда целиком, без обрезки:
// пустые края заполняет размытая копия того же фото. Фото проявляется, когда загрузилось
export function photo(src, kind, alt = '', sizes = SIZES.tile) {
  const tone = `style="--tone:var(--tone-${kind.tint})"`;
  if (!src) return `<div class="ph" ${tone}>${icon(kind.id)}`;
  const c = CLOUDINARY.cloud, set = photoSet(src, c), ok = `loading="lazy" decoding="async" onload="this.classList.add('ok')"`;
  return `<div class="ph" ${tone} data-photo="${esc(src)}"><img class="ph-bg" src="${esc(photoBlur(src, c))}" alt="" ${ok}>`
    + `<img src="${esc(photoUrl(src, 640, c))}"${set ? ` srcset="${esc(set)}" sizes="${sizes}"` : ''} alt="${esc(alt)}" ${ok}>`;
}

// Фото на весь экран. Касание в любом месте закрывает
export function viewPhoto(id) {
  const c = CLOUDINARY.cloud, set = photoSet(id, c), v = document.createElement('div');
  v.className = 'viewer';
  v.setAttribute('role', 'dialog');
  v.innerHTML = `<img src="${esc(photoUrl(id, 1280, c))}"${set ? ` srcset="${esc(set)}" sizes="100vw"` : ''} alt="">`
    + `<button class="round" type="button" aria-label="Закрыть">${icon('x')}</button>`;
  v.addEventListener('click', () => v.remove());
  document.body.append(v);
}

// Появление при прокрутке: только прозрачность
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { rootMargin: '0px 0px -4% 0px' }) : null;

export function watch(root) {
  root.querySelectorAll('.fade-in:not(.in)').forEach(el => (io ? io.observe(el) : el.classList.add('in')));
}
