// Подключение к Firebase: база Firestore и вход. Ключи проекта в config.js.
// Доступ к данным закрывают правила базы (firestore.rules), а не этот файл.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { FIREBASE } from './config.js';

// Панель админа держит свой вход (Google) отдельно от входа жителя (без аккаунта):
// на телефоне автора его объявления жителя не смешиваются с правами админа.
export const isPanel = location.pathname.includes('/admin/');
const app = initializeApp(FIREBASE, isPanel ? 'admin' : undefined);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where,
};
