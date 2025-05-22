// src/api/story-api-config.js
export const STORY_API_BASE_URL = 'https://story-api.dicoding.dev/v1';

// Kunci VAPID untuk Push Notification (simpan di sini untuk referensi)
export const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

// Fungsi untuk mendapatkan token dari localStorage
export function getAuthToken() {
  return localStorage.getItem('authToken'); // Ambil token dari localStorage
}

// Fungsi untuk menyimpan token ke localStorage
export function saveAuthToken(token) {
  localStorage.setItem('authToken', token);
}

// Fungsi untuk menghapus token dari localStorage (logout)
export function removeAuthToken() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUserName'); // Hapus juga nama pengguna jika disimpan
  localStorage.removeItem('authUserId');   // Hapus juga user ID jika disimpan
}

// Opsional: Menyimpan data pengguna lain setelah login
export function saveAuthUser(userData) { // userData bisa berupa objek { userId, name }
  if (userData.name) localStorage.setItem('authUserName', userData.name);
  if (userData.userId) localStorage.setItem('authUserId', userData.userId);
}

export function getAuthUserName() {
  return localStorage.getItem('authUserName');
}
