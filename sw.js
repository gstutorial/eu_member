// Incremented version name to force browsers to replace the old cache
const CACHE_NAME = 'union-checker-cache-v2';

const urlsToCache = [
  './',
  './index.html',
  './logo.png',
  './manifest.json',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// Install: Skip waiting so this new worker instantly replaces the old, broken cache one
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate: Delete ANY old caches that aren't v2
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Immediately take control of all open pages
  );
});

// Fetch: NETWORK FIRST strategy for index.html to ensure you never see stuck updates
self.addEventListener('fetch', event => {
  
  // If the request is for an HTML page or navigation
  if (event.request.mode === 'navigate' || event.request.url.includes('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network succeeds, put the fresh file in cache and return it
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails (offline), load the fallback from cache
          return caches.match(event.request);
        })
    );
  } else {
    // For JS/CSS/Images, keep the Cache-First strategy for speed
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});
