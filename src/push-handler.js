// src/push-handler.js
// VAPID_PUBLIC_KEY akan diakses dari client-side saat subscription,
// tidak langsung dibutuhkan di service worker untuk menampilkan notifikasi standar,
// tapi bisa berguna jika Anda ingin logika validasi lebih lanjut di SW.

self.addEventListener('push', (event) => {
  console.log('Service Worker (push-handler.js): Push Diterima.');
  let notificationData;
  try {
    notificationData = event.data.json();
    console.log('Service Worker: Data push (JSON):', notificationData);
  } catch (e) {
    notificationData = { title: 'Notifikasi Baru', body: event.data.text() };
    console.log('Service Worker: Data push (text):', notificationData.body);
  }

  const title = notificationData.title || 'Aplikasi CeritaKita';
  const options = {
    body: notificationData.body || 'Anda memiliki pesan baru.',
    icon: notificationData.icon || 'assets/images/icon-192x192.png', // Pastikan ikon ini ada di dist/assets/images
    badge: notificationData.badge || 'assets/images/badge-72x72.png', // Pastikan badge ini ada (opsional)
    image: notificationData.image,
    data: {
      url: notificationData.url || '/', // URL default jika tidak ada di payload
    },
    actions: notificationData.actions || []
    // Contoh actions:
    // actions: [
    //   { action: 'explore', title: 'Lihat Sekarang', icon: 'assets/images/action-icon.png' },
    //   { action: 'close', title: 'Tutup', icon: 'assets/images/action-icon-close.png' },
    // ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('Service Worker: Notifikasi ditampilkan.'))
      .catch(err => console.error('Service Worker: Gagal menampilkan notifikasi:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker (push-handler.js): Notifikasi diklik.');
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';
  console.log('Service Worker: Mencoba membuka URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Coba fokus ke tab yang sudah ada dengan URL yang sama
        // Atau jika URL adalah root dan tab root sudah ada
        if ((client.url === urlToOpen || (urlToOpen === '/' && client.url.endsWith('/index.html'))) && 'focus' in client) {
          console.log('Service Worker: Menemukan client yang cocok, fokus.');
          return client.focus();
        }
      }
      // Jika tidak ada tab yang cocok atau tidak bisa difokus, buka window baru
      if (clients.openWindow) {
        console.log('Service Worker: Membuka window baru.');
        return clients.openWindow(urlToOpen);
      }
      console.log('Service Worker: Tidak bisa membuka window.');
    })
  );
});

// Helper function (jika Anda perlu konversi VAPID key di SW, biasanya tidak)
// function urlBase64ToUint8Array(base64String) {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding)
//     .replace(/-/g, '+')
//     .replace(/_/g, '/');
//   const rawData = self.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);
//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }
