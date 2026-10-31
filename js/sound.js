// Звуки доски без файлов: короткие тоны, их рисует сам браузер (Web Audio).
// Щелчок при нажатии, два тона «Отправлено», три тона уведомления. Выключаются в «Настройках»
import { prefs } from './prefs.js';

let ctx = null;

// notes: [частота, длительность, пауза до следующего тона], vol: громкость 0..1
function play(notes, vol) {
  if (!prefs().sound) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime + .01;
    for (const [freq, dur, gap = dur] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + .005);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + .02);
      t += gap;
    }
  } catch { /* звука нет: не страшно */ }
}

export const tap = () => play([[1500, .025]], .04);
export const sent = () => play([[660, .14, .11], [990, .26]], .16);
export const notify = () => play([[880, .16, .13], [1175, .16, .13], [1568, .34]], .18);
