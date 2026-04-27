const CACHE_NAME = 'warmstore-shell-v2';
const API_CACHE = 'warmstore-api-v2';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== API_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only intercept same-origin /api/ requests (production reverse-proxy setup)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async cache => {
        try {
          const response = await fetch(event.request);
          if (event.request.method === 'GET') cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // Navigation: serve from cache on offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// IndexedDB helpers (raw API — no idb library available in SW)
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('warmstore', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function replayOrders() {
  const db = await openIDB();
  const tx = db.transaction('orders', 'readwrite');
  const store = tx.objectStore('orders');
  const orders = await new Promise(res => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result);
  });

  for (const o of orders) {
    const base = o.apiUrl || '';
    try {
      const resp = await fetch(`${base}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': o.token ? `Bearer ${o.token}` : '',
        },
        body: JSON.stringify(o.data),
      });
      if (resp.ok || resp.status === 409) {
        // 409 = duplicate (already processed) — safe to remove
        const tx2 = db.transaction('orders', 'readwrite');
        tx2.objectStore('orders').delete(o.id);
      }
    } catch (err) {
      console.error('SW replay failed for order', o.id, err);
    }
  }
}

self.addEventListener('sync', e => {
  if (e.tag === 'sync-orders') e.waitUntil(replayOrders());
});

self.addEventListener('message', e => {
  if (e.data === 'try-sync') replayOrders();
});
