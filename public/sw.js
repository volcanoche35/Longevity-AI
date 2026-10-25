const CACHE_NAME = 'biotrack-assistant-v3';
const ASSETS = ['/dashboard', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('biotrack-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.headers.get('RSC') || request.headers.get('Next-Router-Prefetch')) return;
  if (request.mode === 'navigate') {
    // Network-first: never keep showing an obsolete profile after a deployment.
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy))); }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/dashboard')) || new Response('Bağlantı yok. Lütfen yeniden dene.', {status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));
    return;
  }
  const isStatic = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/anatomy/') || ASSETS.includes(url.pathname);
  if (!isStatic) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy))); }
    return response;
  })));
});
