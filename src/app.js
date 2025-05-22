// src/app.js
import Router from './router/index.js';
import StoryListView from './views/story-list-view.js';
import AddStoryView from './views/add-story-view.js';
import LoginView from './views/login-view.js';
import RegisterView from './views/register-view.js';
import NotFoundView from './views/not-found-view.js'; // <-- Tambahkan ini
import { getAuthToken, getAuthUserName, removeAuthToken, VAPID_PUBLIC_KEY } from './api/story-api-config.js'; // <-- Tambahkan VAPID_PUBLIC_KEY
import { StoryModel } from './models/story-model.js'; // <-- Tambahkan StoryModel
import './styles/main.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const mainContentElement = document.getElementById('main-content');
const navAuthContainer = document.getElementById('navAuthContainer');

const routes = {
  '': StoryListView,
  '#stories': StoryListView,
  '#add-story': AddStoryView,
  '#login': LoginView,
  '#register': RegisterView,
  '*': NotFoundView, // <-- Tambahkan rute Not Found
};

function updateNavAuth() {
  const token = getAuthToken();
  const userName = getAuthUserName();

  if (token && navAuthContainer) {
    navAuthContainer.innerHTML = `
      <li class="nav-greeting">Halo, ${userName || 'Pengguna'}!</li>
      <li><a href="#" id="logoutButton">Logout</a></li>
      <li><button id="unsubscribeButton" style="display:none;">Unsubscribe Notif</button></li>
    `;
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', (event) => {
        event.preventDefault();
        // Opsional: unsubscribe notifikasi saat logout
        // if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        //   navigator.serviceWorker.ready.then(registration => {
        //     registration.pushManager.getSubscription().then(subscription => {
        //       if (subscription) {
        //         unsubscribeUserFromPush(subscription);
        //       }
        //     });
        //   });
        // }
        removeAuthToken();
        updateNavAuth();
        window.location.hash = '#login';
        // window.location.reload(); // Bisa jadi terlalu drastis
      });
    }
    // Logika untuk tombol unsubscribe (jika Anda ingin menambahkannya)
    // const unsubscribeBtn = document.getElementById('unsubscribeButton');
    // navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
    //  if (sub && unsubscribeBtn) unsubscribeBtn.style.display = 'inline-block';
    // });
    // if(unsubscribeBtn) unsubscribeBtn.addEventListener('click', () => { /* ... call unsubscribeUserFromPush ... */});

  } else if (navAuthContainer) {
    navAuthContainer.innerHTML = `
      <li><a href="#login">Login</a></li>
      <li><a href="#register">Register</a></li>
    `;
  }
}

// --- SERVICE WORKER & PUSH NOTIFICATION ---
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

async function registerServiceWorkerAndSubscribePush() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker tidak didukung browser ini.');
    return;
  }

  try {
    // Path ke sw.js Anda di folder 'dist' (Workbox akan men-generate ini)
    const registration = await navigator.serviceWorker.register('./sw.js');
    console.log('Service Worker berhasil diregistrasi:', registration);

    // Tunggu SW aktif sebelum mencoba subscribe
    await navigator.serviceWorker.ready;
    console.log('Service Worker siap.');

    if ('PushManager' in window && getAuthToken()) { // Hanya subscribe jika login
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Izin notifikasi diberikan.');
        await subscribeUserToPush(registration);
      } else {
        console.warn('Izin notifikasi tidak diberikan.');
      }
    } else if (!getAuthToken()) {
      console.log('Pengguna belum login, skip subscribe push notification.');
    } else {
      console.warn('Push Manager tidak didukung browser ini.');
    }
  } catch (error) {
    console.error('Registrasi Service Worker atau proses subscribe gagal:', error);
  }
}

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
      // Opsional: Kirim ulang jika Anda merasa perlu (misalnya, VAPID key berubah)
      // await sendSubscriptionToServer(subscription);
    }
  } catch (error) {
    if (Notification.permission === 'denied') {
      console.warn('Izin notifikasi ditolak. Tidak bisa subscribe.');
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
    await model.subscribeToNotifications(subscription.toJSON());
    console.log('Subscription berhasil dikirim ke server API.');
  } catch (error) {
    console.error('Gagal mengirim subscription ke server API:', error);
    // Jika gagal kirim ke server, lebih baik batalkan subscription lokal agar tidak ada state gantung
    // if (subscription) {
    //   subscription.unsubscribe().then(() => console.log('Unsubscribed dari push manager karena gagal kirim ke server.'));
    // }
  }
}

// Fungsi untuk unsubscribe (opsional, bisa dipanggil saat logout atau jika pengguna meminta)
// async function unsubscribeUserFromPush(currentSubscription) {
//   if (!currentSubscription) return;
//   const model = new StoryModel();
//   try {
//     await model.unsubscribeFromNotifications(currentSubscription.endpoint);
//     console.log('Unsubscription berhasil dikirim ke server API.');
//   } catch (error) {
//     console.error('Gagal mengirim unsubscription ke server API:', error);
//   } finally {
//     currentSubscription.unsubscribe()
//       .then(successful => {
//         if (successful) console.log('Berhasil unsubscribe dari Push Manager.');
//         else console.warn('Gagal unsubscribe dari Push Manager (proses lokal).');
//       })
//       .catch(e => console.error('Error saat unsubscribe dari Push Manager:', e));
//   }
// }
// --- END SERVICE WORKER & PUSH NOTIFICATION ---

function initializeApp() {
  if (!mainContentElement) {
    console.error('Elemen konten utama (#main-content) tidak ditemukan!');
    return;
  }
  Router.init(mainContentElement, routes);
  updateNavAuth();

  // Registrasi Service Worker & Push (setelah DOM siap dan auth state diketahui)
  registerServiceWorkerAndSubscribePush();
}

window.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('hashchange', () => {
  // Tidak perlu updateNavAuth di sini karena sudah dihandle 'authChanged'
});
window.addEventListener('authChanged', () => {
  updateNavAuth();
  // Setelah login/autentikasi berubah, coba subscribe lagi jika belum
  if (getAuthToken()) {
    registerServiceWorkerAndSubscribePush();
  }
});
