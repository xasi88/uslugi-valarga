// Настройки служб. Это не секрет: сайт показывает их любому. Защищают настройки самих служб.
// Cloudinary: облако автора, настройка загрузки «valarg» без подписи (только фото, до 1600 точек, папка valarg).
export const CLOUDINARY = { cloud: 'bxtjrkti', preset: 'valarg' };

// Связь с админом доски: WhatsApp автора. Номер на сайте по просьбе автора (2026-10-30)
export const ADMIN_PHONE = '79659696053';

// Firebase: проект uslugi-valarga, база Firestore во Франкфурте (europe-west3),
// вход Google автора и вход без аккаунта. Данные закрывают правила базы (firestore.rules).
// Взяты из консоли Firebase 2026-10-28: «Настройки проекта», «Ваши приложения», uslugi-valarga-site.
// Уведомления при закрытой доске: почтальон в Cloudflare (папка worker) и открытый ключ Web Push
// из консоли Firebase («Cloud Messaging», «Web Push certificates», 2026-10-31). Ключ не секрет
export const PUSH = {
  url: 'https://valarg-pochtalon.gmarbigm.workers.dev',
  vapid: 'BDWYpyBo_wSwLgXu1wjLN0Df6IpmTKoRUGBOXGh9h13l_khRhc3qBSs1nZ6RxlVesPHKHYbSqvadlVRfZkmC0DY',
};

export const FIREBASE = {
  apiKey: 'AIzaSyCNHGPfm4BQZNcNfKhwCrEE18P3OGKpfDk',
  authDomain: 'uslugi-valarga.firebaseapp.com',
  projectId: 'uslugi-valarga',
  messagingSenderId: '466890380064',
  appId: '1:466890380064:web:bfc1a4763084cce9ea7d45',
};
