const CACHE = 'static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/offline.html',
  '/icon.svg',
  '/js/auth.js',
  '/js/firebase-config.js',
  '/js/main.js',
  '/js/router.js',
  '/js/storageService.js',
  '/js/services/firestoreService.js',
  '/js/views/dashboardView.js',
  '/js/views/agendaView.js',
  '/js/views/clientesView.js',
  '/js/views/ordersView.js',
  '/js/views/servicosView.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/js/') || ASSETS.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
  }
});
