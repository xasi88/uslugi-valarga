// Значки доски: тонкая линия 1,8 на сетке 24. Виды работ и кнопки.
// Свои значки вместо эмодзи (брендбук, раздел «Значки»).

const P = {
  all: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  stroy: 'M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6',
  svarka: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z',
  elektr: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  santeh: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM9.5 14.5A2.5 2.5 0 0 0 12 17',
  gruz: 'M3 6h10v10H3zM13 9h4.5l3.5 3.5V16h-8M8.8 17.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM18.8 17.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z',
  taxi: 'M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v5H3zM3 13h18M7 18v2M17 18v2M7 15.5h.01M17 15.5h.01',
  avto: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  uborka: 'M15 3l-3.5 8.5M7 11.5h9l2 9.5H5zM9 16v5M12.5 16v5',
  torty: 'M4 21h16M5 21v-7h14v7M5 17c2 1.5 4 1.5 7 0s5-1.5 7 0M12 14V9.5M12 7c.8-.8.8-2.2 0-3.2-.8 1-.8 2.4 0 3.2z',
  uchitel: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7M8 11h5',
  shite: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9L20 20M8.1 16.1L20 4',
  sad: 'M12 21v-9M12 12C12 8 9 5 4 5c0 4 3 7 8 7zM12 14.5c0-3 2.5-6 7-6 0 3.5-2.5 6-7 6z',
  tehnika: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  krasota: 'M4 9h16v4H4zM6.5 13v6M9.5 13v6M12.5 13v6M15.5 13v6M18 13v6',
  drugoe: 'M5 12h.01M12 12h.01M19 12h.01',
  masters: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  requests: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  mine: 'M6 3h12v18l-6-4-6 4z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  pin: 'M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  x: 'M6 6l12 12M18 6L6 18',
  add: 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zM12 8v8M8 12h8',
};

export function icon(name, cls = 'i') {
  const w = name === 'drugoe' ? ' style="stroke-width:3"' : '';
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"${w}><path d="${P[name] || P.drugoe}"/></svg>`;
}

// Знаки WhatsApp и трубки залитые: люди узнают их сразу
export const waIcon = '<svg class="wa" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5 13.6c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.9-4.5-4-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-2 1-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z"/></svg>';
export const phoneIcon = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';

// Виды работ: порядок как в фильтре. tint: номер тона места под фото (--tone-N)
export const KINDS = [
  { id: 'stroy', name: 'Стройка и ремонт', tint: 1 },
  { id: 'svarka', name: 'Сварка', tint: 1 },
  { id: 'elektr', name: 'Электрика', tint: 4 },
  { id: 'santeh', name: 'Сантехника', tint: 3 },
  { id: 'gruz', name: 'Перевозки', tint: 2 },
  { id: 'taxi', name: 'Такси', tint: 4 },
  { id: 'avto', name: 'Ремонт авто', tint: 3 },
  { id: 'uborka', name: 'Уборка', tint: 2 },
  { id: 'torty', name: 'Торты и выпечка', tint: 5 },
  { id: 'uchitel', name: 'Репетитор', tint: 3 },
  { id: 'shite', name: 'Шитьё', tint: 5 },
  { id: 'krasota', name: 'Парикмахер', tint: 5 },
  { id: 'sad', name: 'Сад и огород', tint: 2 },
  { id: 'tehnika', name: 'Телефоны и техника', tint: 3 },
  { id: 'drugoe', name: 'Другое', tint: 2 },
];
export const kindById = id => KINDS.find(k => k.id === id) || KINDS[KINDS.length - 1];
