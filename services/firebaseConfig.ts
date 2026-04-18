// =========================================================
// services/firebaseConfig.ts
// Cấu hình và khởi tạo Firebase cho toàn bộ ứng dụng.
// File này export các instance auth và db để các service khác sử dụng.
// =========================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Cấu hình Firebase - lấy từ Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAehteFarFrm992BWC19YsvMGOgKpf2ZhM",
  authDomain: "bump-97da0.firebaseapp.com",
  projectId: "bump-97da0",
  storageBucket: "bump-97da0.appspot.com",
  messagingSenderId: "17354788772",
  appId: "1:17354788772:web:8ae5d0b13fe2aab947fb31",
  measurementId: "G-C239GJMEX1",
  databaseURL: "https://bump-97da0-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Khởi tạo Firebase App (tránh khởi tạo nhiều lần khi hot-reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo Firebase Authentication
export const auth = getAuth(app);

// Khởi tạo Realtime Database
export const db = getDatabase(app);

export default app;
