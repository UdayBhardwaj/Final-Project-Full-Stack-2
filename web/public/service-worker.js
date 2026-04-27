const CACHE_NAME = 'warmstore-shell-v1';
const API_CACHE = 'warmstore-api';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async cache => {
        try {
          const response = await fetch(event.request);
          cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error:'offline' }), {
            status: 503, headers: { 'Content-Type':'application/json' }
          });
        }
      })
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

// IndexedDB helpers
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('warmstore', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('orders')) db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function replayOrders() {
  const db = await openIDB();
  const tx = db.transaction('orders', 'readwrite');
  const store = tx.objectStore('orders');
  const allReq = store.getAll();
  const orders = await new Promise(res => { allReq.onsuccess = () => res(allReq.result); });
  for (const o of orders) {
    try {
      const resp = await fetch('http://localhost:4000/api/orders', {
        method:'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': o.token ? `Bearer ${o.token}` : ''
        },
        body: JSON.stringify(o.data)
      });
      if (resp.ok) store.delete(o.id);
    } catch (err) {
      console.error('replay failed', err);
    }
  }
}

self.addEventListener('sync', e => {
  if (e.tag === 'sync-orders') e.waitUntil(replayOrders());
});

self.addEventListener('message', e => {
  if (e.data === 'try-sync') replayOrders();
});
