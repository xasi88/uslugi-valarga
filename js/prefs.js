// Настройки этого телефона: звук и уведомления. Хранятся в памяти телефона, в базу не уходят.
// Памяти нет (закрытый режим браузера): действуют настройки по умолчанию
const KEY = 'uv-prefs';
const BASE = { sound: true, notify: false };

export function prefs() {
  try { return { ...BASE, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...BASE }; }
}

export function setPref(name, value) {
  const p = { ...prefs(), [name]: value };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* не страшно */ }
  return p;
}
