// src/sw.js
const CACHE_NAME = 'ceritakita-cache-v1'; // Ubah versi jika ada pembaruan aset penting
const urlsToCache = [
  '/', // Alias untuk index.html
  '/index.html',
  '/app.bundle.js', // Nama bundle utama Anda, mungkin berbeda jika pakai contenthash
  // '/vendors~app.bundle.js', // Jika ada vendor chunk
  // '/runtime~app.bundle.js', // Jika ada runtime chunk
  '/manifest.json',
  '/styles/main.css', // Jika CSS Anda diekstrak atau inline, sesuaikan
  // Aset Statis (ikon, gambar utama, font)
  '/assets/images/icon-192x192.png',
  '/assets/images/icon-512x512.png',
  '/assets/favicon.ico',
  // Tambahkan path ke aset lain yang penting untuk Application Shell
  // '/assets/fonts/namafont.woff2',
  // Jika menggunakan Leaflet dari CDN di HTML, Anda mungkin tidak bisa cache di sini
  // Jika Leaflet di-bundle via npm, Webpack akan mengurusnya di app.bundle.js
];

// Variabel untuk VAPID public key Anda (dari story-api-config.js)
const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Penting: Hati-hati jika nama bundle Anda mengandung [contenthash]
        // Jika ya, Anda perlu strategi precaching dinamis (misalnya dengan Workbox)
        // atau pastikan nama bundle statis di sini.
        // Untuk sementara, kita asumsikan nama bundle bisa diprediksi.
        // Jika build menghasilkan nama file yang berubah, Anda harus menghapus hash
        // dari output.filename di webpack.config.js untuk development caching,
        // atau gunakan Workbox untuk produksi.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('Service Worker: Install complete, App Shell cached.');
        self.skipWaiting(); // Aktifkan SW baru segera
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell during install:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete, old caches deleted.');
      return self.clients.claim(); // Ambil kontrol halaman yang terbuka
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategi: Cache First untuk aset statis, Network First (atau Stale-While-Revalidate) untuk data API
  // Untuk API calls (misalnya ke story-api.dicoding.dev), Anda mungkin ingin Network First atau SWR
  if (event.request.url.startsWith(self.location.origin) || event.request.url.includes('tile.openstreetmap.org') || event.request.url.includes('server.arcgisonline.com')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // console.log('Service Worker: Serving from cache:', event.request.url);
            return response;
          }
          // console.log('Service Worker: Fetching from network:', event.request.url);
          return fetch(event.request).then(
            (networkResponse) => {
              // Jika response valid, clone dan simpan ke cache
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return networkResponse;
            }
          ).catch(error => {
            console.error('Service Worker: Fetch failed; returning offline page or error for:', event.request.url, error);
            // Opsional: Anda bisa menampilkan halaman offline kustom di sini
            // return caches.match('/offline.html'); // Jika Anda punya halaman offline.html
            // Atau biarkan error browser default jika tidak ada fallback spesifik
          });
        })
    );
  } else {
    // Untuk request ke domain lain (misalnya API), biarkan network request seperti biasa
    // atau implementasikan strategi caching API (Network first / Stale-while-revalidate)
    // console.log('Service Worker: Skipping cache for cross-origin request:', event.request.url);
    event.respondWith(fetch(event.request));
  }
});

// --- PUSH NOTIFICATION HANDLERS ---
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received.');
  console.log(`Service Worker: Push had this data: "${event.data.text()}"`);

  let notificationData;
  try {
    notificationData = event.data.json(); // API Anda mungkin mengirim JSON
  } catch (e) {
    notificationData = { title: 'Notifikasi Baru', body: event.data.text() }; // Fallback jika bukan JSON
  }

  const title = notificationData.title || 'Aplikasi CeritaKita';
  const options = {
    body: notificationData.body || 'Anda memiliki pesan baru.',
    icon: notificationData.icon || 'assets/images/icon-192x192.png', // Ikon notifikasi
    badge: notificationData.badge || 'assets/images/badge-72x72.png', // Ikon kecil di status bar (Android)
    image: notificationData.image, // Gambar besar di notifikasi
    data: { // Data tambahan yang bisa diakses saat notifikasi diklik
      url: notificationData.url || '/', // URL untuk dibuka saat notifikasi diklik
    },
    actions: notificationData.actions || [] // Contoh: [{ action: 'explore', title: 'Lihat Sekarang' }]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click Received.');
  event.notification.close(); // Tutup notifikasi

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Jika ada window yang sudah terbuka dengan URL yang sama, fokus ke sana
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada, atau tidak bisa fokus, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Helper function untuk konversi VAPID key (jika diperlukan di SW, biasanya di client)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = self.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
