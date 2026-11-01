// Статистика доски: что делают люди. Уходит в Яндекс Метрику (счётчик 113926697) параметрами визита.
// Цифры показывает «Статистика проектов», раздел «Валарг». Имя группы меняешь здесь: меняешь и там.
// В Метрику уходят только экраны, нажатия и виды работ. Имена, номера и тексты объявлений не уходят.
// Роботу и компьютеру (localhost) счётчик не нужен: он молчит.
import { robot } from './store.js';

const YM = 113926697;
const on = location.protocol === 'https:' && !robot;

// Код счётчика от Яндекса. Вебвизора и карты кликов нет: на экране имена жителей
if (on) {
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  // Код Метрики (73 КБ) грузится, когда доска уже на экране: он не отнимает связь у объявлений и фото (2026-11-01).
  // До него посылки ждут в очереди window.ym.a
  const tag = () => setTimeout(() => {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);
  }, 1500);
  if (document.readyState === 'complete') tag(); else addEventListener('load', tag, { once: true });
  window.ym(YM, 'init', { clickmap: false, trackLinks: true, accurateTrackBounce: true, webvisor: false });
}

// Одна посылка в Метрику. Ошибка статистики не мешает доске
export function send(params) {
  if (!on) return;
  try { window.ym(YM, 'params', params); } catch { /* молча */ }
}

// Экраны доски: отдельные просмотры. Самый первый Метрика считает сама
const TITLES = { board: 'Доска', masters: 'Услуги', requests: 'Работа', goods: 'Товары', master: 'Мастер', good: 'Товар', post: 'Разместить', mine: 'Мои', settings: 'Настройки' };
const where = () => TITLES[document.body.dataset.view] || 'Доска';
let first = true;
export function screen(view) {
  if (first) { first = false; return; }
  if (on) window.ym(YM, 'hit', location.href, { title: `${TITLES[view] || view} · Валарг` });
}

// Связь: нажатия на всей доске. Группа «Связь»: что нажали и на каком экране.
// Ряды видов работ и категорий убраны с доски 2026-11-01: группы «Вид работ» и «Категория товаров» больше не пополняются
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const h = a.getAttribute('href');
  if (a.matches('.to-admin, #to-admin')) send({ 'Связь': { 'Написать админу': where() } });
  else if (h.startsWith('https://wa.me/')) send({ 'Связь': { 'WhatsApp': where() } });
  else if (h.startsWith('tel:')) send({ 'Связь': { 'Позвонить': where() } });
}, true);
