// src/app.js
import Router from './router/index.js';
import StoryListView from './views/story-list-view.js';
import AddStoryView from './views/add-story-view.js';
import LoginView from './views/login-view.js';
import RegisterView from './views/register-view.js';
import NotFoundView from './views/not-found-view.js';
import {
  getAuthToken, getAuthUserName, removeAuthToken, VAPID_PUBLIC_KEY,
} from './api/story-api-config.js';
import { StoryModel } from './models/story-model.js';
import './styles/main.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
// HAPUS: import { Workbox } from 'workbox-window';

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl; //
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl }); //

// --- Elemen DOM & Rute ---
const mainContentElement = document.getElementById('main-content'); //
const navAuthContainer = document.getElementById('navAuthContainer'); //
const routes = { /* ... sama seperti sebelumnya ... */ //
  '': StoryListView,
  '#stories': StoryListView,
  '#add-story': AddStoryView,
  '#login': LoginView,
  '#register': RegisterView,
  '*': NotFoundView,
};

// --- Update Navigasi (tetap sama) ---
function updateNavAuth() { /* ... sama seperti sebelumnya ... */ //
  const token = getAuthToken();
  const userName = getAuthUserName();
  if (token && navAuthContainer) {
    navAuthContainer.innerHTML = `
      <li class="nav-greeting">Halo, ${userName || 'Pengguna'}!</li>
      <li><a href="#" id="logoutButton">Logout</a></li>
    `;
    document.getElementById('logoutButton').addEventListener('click', (event) => {
      event.preventDefault();
      removeAuthToken();
      updateNavAuth();
      window.location.hash = '#login';
    });
  } else if (navAuthContainer) {
    navAuthContainer.innerHTML = `
      <li><a href="#login">Login</a></li>
      <li><a href="#register">Register</a></li>
    `;
  }
}

// --- Helper VAPID Key (tetap sama) ---
function urlBase64ToUint8Array(base64String) { /* ... sama seperti sebelumnya ... */ //
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --- Logika Push Subscription (tetap sama) ---
async function subscribeUserToPush(registration) { /* ... sama seperti sebelumnya ... */ //
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
      console.log('Sudah ada subscription.');
    }
  } catch (error) {
    console.error('Gagal subscribe ke push notifications:', error);
  }
}

async function sendSubscriptionToServer(subscription) { /* ... sama seperti sebelumnya ... */ //
  const model = new StoryModel();
  try {
    if (!getAuthToken()) {
      console.warn('Pengguna belum login, tidak bisa mengirim subscription ke server API.'); //
      return;
    }

    const subscriptionJSON = subscription.toJSON();

    const subscriptionToSend = {
      endpoint: subscription.endpoint,
      keys: subscriptionJSON.keys,
    };

    await model.subscribeToNotifications(subscriptionToSend);
    console.log('Mengirim subscription ke server:', JSON.stringify(subscriptionToSend)); // Tambahkan log ini untuk debug

    await model.subscribeToNotifications(subscriptionToSend); //
    console.log('Subscription berhasil dikirim ke server API.'); //
  } catch (error) {
    console.error('Gagal mengirim subscription ke server API:', error); //
  }
}

// --- Registrasi Service Worker & Push (KEMBALI KE VERSI MANUAL) ---
async function registerServiceWorkerAndSubscribePush() { //
  if (!('serviceWorker' in navigator)) { //
    console.warn('Service Worker tidak didukung.'); //
    return; //
  }

  try {
    // Gunakan navigator.serviceWorker.register lagi
    const registration = await navigator.serviceWorker.register('./sw.js'); //
    console.log('Service Worker berhasil diregistrasi (manual):', registration); //

    await navigator.serviceWorker.ready; // Tunggu SW siap
    console.log('Service Worker siap (manual).'); //

    // Logika push notification tetap sama
    if ('PushManager' in window && getAuthToken()) { //
      // Pindahkan ke user gesture
      // const permission = await Notification.requestPermission();
      // if (permission === 'granted') {
      //   console.log('Izin notifikasi diberikan.');
      //   await subscribeUserToPush(registration);
      // } else {
      //   console.warn('Izin notifikasi tidak diberikan.');
      // }
    } // ... dst (logika izin notifikasi dan subscribe) ...
  } catch (error) {
    console.error('Registrasi Service Worker gagal (manual):', error); //
  }
}

// --- Inisialisasi Aplikasi (tetap sama, tapi tombol notif dimodifikasi) ---
function initializeApp() { //
  if (!mainContentElement) { console.error('Elemen konten utama tidak ditemukan!'); return; } //
  Router.init(mainContentElement, routes); //
  updateNavAuth(); //
  registerServiceWorkerAndSubscribePush(); //

  // Tombol untuk meminta izin notifikasi (tetap relevan)
  const enableNotifButton = document.createElement('button'); //
  enableNotifButton.textContent = 'Aktifkan Notifikasi'; //
  enableNotifButton.id = 'enableNotifButton'; //
  enableNotifButton.style.cssText = 'position:fixed; bottom:10px; right:10px; padding:10px; background-color:var(--primary-color); color:white; border:none; border-radius:5px; cursor:pointer; z-index:1000;'; //

  navigator.serviceWorker.ready.then((registration) => { //
    if (registration && registration.pushManager) {
      registration.pushManager.getSubscription().then((subscription) => { //
        if (subscription || Notification.permission === 'granted') { //
          enableNotifButton.style.display = 'none'; //
        }
      });
    } else if (Notification.permission === 'granted') { // fallback jika SW belum ready tapi izin sudah ada
      enableNotifButton.style.display = 'none';
    }
  });

  enableNotifButton.addEventListener('click', async () => { //
    if ('PushManager' in window && getAuthToken()) { //
      const permission = await Notification.requestPermission(); //
      if (permission === 'granted') { //
        enableNotifButton.style.display = 'none'; //
        navigator.serviceWorker.ready.then((registration) => { //
          if (registration) subscribeUserToPush(registration); //
        });
      } else {
        alert('Anda tidak memberikan izin untuk notifikasi.'); //
      }
    } else if (!getAuthToken()) { //
      alert('Anda harus login untuk mengaktifkan notifikasi.'); //
    } else {
      alert('Push Notifikasi tidak didukung di browser ini.'); //
    }
  });
  document.body.appendChild(enableNotifButton); //
}

// --- Event Listener Utama (tetap sama) ---
window.addEventListener('DOMContentLoaded', initializeApp); //
window.addEventListener('hashchange', () => {}); //
window.addEventListener('authChanged', () => { //
  updateNavAuth(); //
  if (getAuthToken()) { //
    registerServiceWorkerAndSubscribePush(); //
  }
});
