// src/sw.js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
        console.log('Service Worker (Workbox): Navigation preload enabled!');
      }
    })()
  );
  console.log('Service Worker (Workbox): Activated!');
  event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__WB_MANIFEST || []);

cleanupOutdatedCaches();

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'static-resources-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 hari
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.href.startsWith('https://story-api.dicoding.dev'),
  new NetworkFirst({
    cacheName: 'dicoding-api-cache-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 hari
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.href.includes('tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.href.includes('server.arcgisonline.com'),
  new CacheFirst({
    cacheName: 'esri-tiles-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Impor push-handler.js
try {
  importScripts('./push-handler.js');
  console.log('Service Worker (Workbox): push-handler.js loaded successfully.');
} catch (error) {
  console.error('Service Worker (Workbox): Failed to load push-handler.js:', error);
}

self.addEventListener('install', () => {
  console.log('Service Worker (Workbox): Installing & skipping waiting.');
  self.skipWaiting();
});
