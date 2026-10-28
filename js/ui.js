// Общие части экрана: подсказка снизу, место под фото, появление при прокрутке.
import { esc, photoUrl } from './util.js';
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

// Фото или тон вида работ со значком, пока фото нет. Фото проявляется, когда загрузилось.
// w: ширина в точках. Cloudinary сам делает копию нужного размера и формата
export function photo(src, kind, alt = '', w = 480) {
  const img = src ? `<img src="${esc(photoUrl(src, w, CLOUDINARY.cloud))}" alt="${esc(alt)}" loading="lazy" decoding="async" onload="this.classList.add('ok')">` : icon(kind.id);
  return `<div class="ph" style="--tone:var(--tone-${kind.tint})">${img}`;
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
