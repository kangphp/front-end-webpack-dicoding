// src/app.js
import Router from './router/index.js';
import StoryListView from './views/story-list-view.js';
import AddStoryView from './views/add-story-view.js';
import LoginView from './views/login-view.js';
import RegisterView from './views/register-view.js';
import SavedStoryListView from './views/saved-story-list-view.js';
import NotFoundView from './views/not-found-view.js';
import {
  getAuthToken, getAuthUserName, removeAuthToken, VAPID_PUBLIC_KEY,
} from './api/story-api-config.js';
import { StoryModel } from './models/story-model.js';
import './styles/main.css';
// eslint-disable-next-line import/order
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// eslint-disable-next-line import/order
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// eslint-disable-next-line import/order
import iconUrl from 'leaflet/dist/images/marker-icon.png';
// eslint-disable-next-line import/order
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
// 🚧 Pastikan ini sudah diimpor:
import { Workbox } from 'workbox-window';

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// --- Elemen DOM & Rute ---
const mainContentElement = document.getElementById('main-content');
const navAuthContainer = document.getElementById('navAuthContainer');
const routes = {
  '': StoryListView,
  '#stories': StoryListView,
  '#add-story': AddStoryView,
  '#saved-stories': SavedStoryListView,
  '#login': LoginView,
  '#register': RegisterView,
  '*': NotFoundView,
};

// --- Update Navigasi ---
function updateNavAuth() {
  const token = getAuthToken();
  const userName = getAuthUserName();
  if (token && navAuthContainer) {
    navAuthContainer.innerHTML = `
      <li class="nav-greeting">Halo, ${userName || 'Pengguna'}!</li>
      <li><a href="#" id="logoutButton">Logout</a></li>
    `;
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', (event) => {
        event.preventDefault();
        removeAuthToken();
        updateNavAuth();
        window.location.hash = '#login';
        // Mungkin tambahkan logika untuk unsubscribe push notif di sini jika perlu
      });
    }
  } else if (navAuthContainer) {
    navAuthContainer.innerHTML = `
      <li><a href="#login">Login</a></li>
      <li><a href="#register">Register</a></li>
    `;
  }
}

// --- Helper VAPID Key ---
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --- Logika Push Subscription ---
async function subscribeUserToPush(registration) {
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  try {
    let subscription = await registration.pushManager.getSubscription();
    if (subscription === null) {
      console.log('Belum ada subscription, membuat yang baru...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('Berhasil subscribe:', JSON.stringify(subscription));
      await sendSubscriptionToServer(subscription);
    } else {
      console.log('Sudah ada subscription:', JSON.stringify(subscription));
    }
  } catch (error) {
    if (Notification.permission === 'denied') {
      console.warn('Izin notifikasi ditolak. Tidak bisa subscribe.');
      // Mungkin tampilkan pesan ke pengguna di UI
    } else {
      console.error('Gagal subscribe ke push notifications:', error);
    }
  }
}

async function sendSubscriptionToServer(subscription) {
  const model = new StoryModel();
  try {
    if (!getAuthToken()) {
      console.warn('Pengguna belum login, tidak bisa mengirim subscription ke server API.');
      return;
    }
    // Kirim object subscription JSON ke server
    await model.subscribeToNotifications(subscription.toJSON());
    console.log('Subscription berhasil dikirim ke server API.');
  } catch (error) {
    console.error('Gagal mengirim subscription ke server API:', error);
  }
}

// --- Registrasi Service Worker & Push (Menggunakan Workbox Window) ---
async function registerServiceWorkerAndSubscribePush() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker tidak didukung browser ini.');
    return;
  }

  const wb = new Workbox('./sw.js'); // Path ke file SW output Anda (dari dist/)

  try {
    const registration = await wb.register();
    console.log('Service Worker (Workbox): Registered successfully - ', registration);

    // Menunggu SW untuk menjadi controller
    await wb.controlling;
    console.log('Service Worker (Workbox): Now controlling the page.');

    // Logika push notification (tetap sama, dipanggil setelah SW aktif)
    // Pemanggilan subscribeUserToPush akan terjadi setelah user mengklik tombol
    // tidak otomatis saat load halaman.
    if ('PushManager' in window && getAuthToken()) {
      console.log('Push Manager tersedia dan pengguna sudah login. Siap untuk subscribe via tombol.');
    } else if (!getAuthToken()) {
      console.log('Pengguna belum login, skip subscribe push notification otomatis.');
    } else {
      console.warn('Push Manager tidak didukung browser ini.');
    }

  } catch (error) {
    console.error('Service Worker (Workbox): Registration failed - ', error);
  }
}


// --- Inisialisasi Aplikasi ---
function initializeApp() {
  if (!mainContentElement) {
    console.error('Elemen konten utama (#main-content) tidak ditemukan!');
    return;
  }
  Router.init(mainContentElement, routes);
  updateNavAuth();
  registerServiceWorkerAndSubscribePush(); // Panggil fungsi yang sudah diupdate

  // Tombol untuk meminta izin notifikasi
  const enableNotifButton = document.createElement('button');
  enableNotifButton.textContent = 'Aktifkan Notifikasi Push';
  enableNotifButton.id = 'enableNotifButton';
  enableNotifButton.style.cssText = 'position:fixed; bottom:10px; right:10px; padding:10px; background-color:var(--primary-color); color:white; border:none; border-radius:5px; cursor:pointer; z-index:1000;';

  const checkSubscriptionAndPermission = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.pushManager) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription || Notification.permission === 'granted') {
            enableNotifButton.style.display = 'none';
          } else {
            enableNotifButton.style.display = 'block';
          }
        } else {
          enableNotifButton.style.display = Notification.permission === 'granted' ? 'none' : 'block';
        }
      } catch (error) {
        console.error('Error checking push subscription:', error);
        enableNotifButton.style.display = 'block'; // Tampilkan tombol jika ada error
      }
    } else if (Notification.permission === 'granted') {
      enableNotifButton.style.display = 'none';
    } else {
      // SW belum aktif, atau tidak ada. Tampilkan tombol jika izin belum granted.
      enableNotifButton.style.display = Notification.permission === 'denied' ? 'none' : 'block';
    }
  };

  checkSubscriptionAndPermission();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', checkSubscriptionAndPermission);
  }

  enableNotifButton.addEventListener('click', async () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      alert('Service Worker belum siap. Mohon tunggu beberapa saat dan coba lagi.');
      return;
    }
    if ('PushManager' in window && getAuthToken()) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          enableNotifButton.style.display = 'none';
          const registration = await navigator.serviceWorker.ready;
          if (registration) await subscribeUserToPush(registration);
        } else {
          alert('Anda tidak memberikan izin untuk notifikasi.');
        }
      } catch (err) {
        console.error('Error saat meminta izin notifikasi atau subscribe:', err);
        alert('Gagal mengaktifkan notifikasi.');
      }
    } else if (!getAuthToken()) {
      alert('Anda harus login untuk mengaktifkan notifikasi.');
    } else {
      alert('Push Notifikasi tidak didukung di browser ini.');
    }
  });
  document.body.appendChild(enableNotifButton);
}

// --- Event Listener Utama ---
window.addEventListener('DOMContentLoaded', initializeApp);
// window.addEventListener('hashchange', () => {}); // Hashchange sudah ditangani Router
window.addEventListener('authChanged', () => {
  updateNavAuth();
  // Jika login, coba (ulang) registrasi push (jika user sudah memberi izin)
  if (getAuthToken() && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      if (registration && Notification.permission === 'granted') {
        subscribeUserToPush(registration);
      }
    });
  }
});
