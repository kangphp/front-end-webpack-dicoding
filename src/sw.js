// src/sw.js
const CACHE_NAME = 'ceritakita-manual-cache-v1'; // Beri nama cache baru
// PERHATIAN: Jika output.filename di webpack.config.js menggunakan [contenthash],
// maka 'app.bundle.js' dan nama file lain yang di-bundle akan berubah
// dan tidak bisa di-precache secara statis seperti ini.
// Untuk development atau jika tidak pakai contenthash, ini bisa jalan.
const urlsToCache = [ //
  '/', //
  '/index.html', //
  // Jika Anda menggunakan contenthash, Anda TIDAK BISA hardcode nama bundle di sini.
  // '/app.bundle.js', // Contoh: jika nama bundle statis
  // '/vendors~app.bundle.js', // Contoh
  // '/runtime~app.bundle.js', // Contoh
  '/manifest.json', //
  '/styles/main.css', // Jika ini file statis yang disalin, bukan hasil bundle CSS webpack
  '/assets/images/icon-192x192.png', //
  '/assets/images/icon-512x512.png', //
  '/assets/favicon.ico', //
  // Pastikan semua path ini benar dan file-nya ada di folder 'dist'
];

self.addEventListener('install', (event) => { //
  console.log('Service Worker (Manual): Installing...'); //
  event.waitUntil(
    caches.open(CACHE_NAME) //
      .then((cache) => {
        console.log('Service Worker (Manual): Caching app shell'); //
        // Coba cache semua URL. Jika salah satu gagal (misal karena contenthash), install akan gagal.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))) //
          .catch(error => {
            console.error('Service Worker (Manual): Gagal precache salah satu URL:', error);
            // Penting untuk menangani error ini, mungkin dengan tidak memasukkan file dinamis ke urlsToCache
            // Atau memastikan semua file di urlsToCache memang ada dan bisa diakses.
          });
      })
      .then(() => {
        console.log('Service Worker (Manual): Install complete.'); //
        self.skipWaiting(); // Aktifkan SW baru segera
      })
      .catch(error => {
        console.error('Service Worker (Manual): Failed to cache app shell during install:', error); //
      })
  );
});

self.addEventListener('activate', (event) => { //
  console.log('Service Worker (Manual): Activating...'); //
  event.waitUntil(
    caches.keys().then((cacheNames) => { //
      return Promise.all(
        cacheNames.map((cacheName) => { //
          if (cacheName !== CACHE_NAME) { //
            console.log('Service Worker (Manual): Deleting old cache:', cacheName); //
            return caches.delete(cacheName); //
          }
        })
      );
    }).then(() => {
      console.log('Service Worker (Manual): Activation complete.'); //
      return self.clients.claim(); // Ambil kontrol halaman
    })
  );
});

self.addEventListener('fetch', (event) => { //
  if (event.request.method !== 'GET') return; //

  // Contoh: Strategi Cache First untuk aset lokal & peta
  if (event.request.url.startsWith(self.location.origin) ||
    event.request.url.includes('tile.openstreetmap.org') ||
    event.request.url.includes('server.arcgisonline.com')) {
    event.respondWith(
      caches.match(event.request) //
        .then((response) => {
          if (response) { return response; } //
          return fetch(event.request).then( //
            (networkResponse) => {
              if (networkResponse && networkResponse.status === 200) { //
                const responseToCache = networkResponse.clone(); //
                caches.open(CACHE_NAME) //
                  .then(cache => { cache.put(event.request, responseToCache); }); //
              }
              return networkResponse; //
            }
          ).catch(error => { //
            console.error('SW Fetch Error:', event.request.url, error);
            // Mungkin tampilkan halaman offline fallback di sini
          });
        })
    );
  } else if (event.request.url.startsWith('https://story-api.dicoding.dev')) {
    // Contoh: Strategi Network First untuk API
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME) // Anda mungkin ingin cache API yang berbeda
              .then(cache => { cache.put(event.request, responseToCache); });
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika network gagal, coba ambil dari cache
          return caches.match(event.request);
        })
    );
  } else {
    event.respondWith(fetch(event.request)); // Biarkan request lain lolos
  }
});

// --- PUSH NOTIFICATION HANDLERS (Tetap sama) ---
self.addEventListener('push', (event) => { //
  console.log('Service Worker: Push Received.'); //
  let notificationData;
  try { notificationData = event.data.json(); } catch (e) { notificationData = { title: 'Notifikasi Baru', body: event.data.text() }; } //
  const title = notificationData.title || 'Aplikasi CeritaKita'; //
  const body = notificationData.body || 'Anda memiliki pesan baru.'; //

  const options = { //
    body: body,
    icon: '/assets/images/icon-192x192.png', // <-- Hapus atau komentari baris ini
    // badge: '/assets/images/badge-72x72.png', // <-- Hapus atau komentari baris ini juga jika ada
    data: {
      url: notificationData.url || '/', //
    },
    actions: notificationData.actions || [] //
  };
  console.log('Service Worker: Attempting to show notification with options (no icon):', options);

  event.waitUntil(
    self.registration.showNotification(title, options) //
      .then(() => console.log('Service Worker: Notification (no icon) shown successfully.'))
      .catch(err => console.error('Service Worker: Error showing notification (no icon):', err))
  );
  // event.waitUntil(self.registration.showNotification(title, options)); //
});

self.addEventListener('notificationclick', (event) => { //
  console.log('Service Worker: Notification click Received.'); //
  event.notification.close(); //
  const urlToOpen = event.notification.data.url || '/'; //
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => { //
      for (const client of clientList) { if (client.url === urlToOpen && 'focus' in client) { return client.focus(); } } //
      if (clients.openWindow) { return clients.openWindow(urlToOpen); } //
    })
  );
});
