// Настройки этого телефона: звук и уведомления. Хранятся в памяти телефона, в базу не уходят.
// notify: уведомления о своих объявлениях, fresh: о новых объявлениях на доске (с 2026-11-04).
// Памяти нет (закрытый режим браузера): действуют настройки по умолчанию
const KEY = 'uv-prefs';
const BASE = { sound: true, notify: false, fresh: false };
const raw = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

export const prefs = () => ({ ...BASE, ...raw() });

// Человек уже выбирал эту настройку сам: её не трогать
export const chosen = name => name in raw();

export function setPref(name, value) {
  const p = { ...prefs(), [name]: value };
  try { localStorage.setItem(KEY, JSON.stringify({ ...raw(), [name]: value })); } catch { /* не страшно */ }
  return p;
}
