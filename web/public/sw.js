const CACHE = 'pwa-shell-v2';
const RUNTIME = 'pwa-runtime';
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/', '/index.html', '/manifest.json'
    ])).then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
function idbGetAll(storeName){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pwa-store');
    req.onsuccess = function(){ 
      const db = req.result;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = ()=> resolve(getAllReq.result);
      getAllReq.onerror = ()=> reject(getAllReq.error);
    }
    req.onerror = ()=> reject(req.error);
  });
}
function idbDelete(storeName, key){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pwa-store');
    req.onsuccess = function(){ 
      const db = req.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const del = store.delete(key);
      del.onsuccess = ()=> resolve();
      del.onerror = ()=> reject(del.error);
    }
    req.onerror = ()=> reject(req.error);
  });
}
async function replayQueue(){
  const queued = await idbGetAll('queue').catch(()=>[]);
  for (const q of queued){
    if (q.type === 'checkout'){
      try {
        // For demo, use fetch to /api/orders; SW cannot access localStorage, so client should attach Authorization via fetch in page when online fallback
        const res = await fetch('/api/orders', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(q.payload) });
        if (res && (res.status === 201 || res.status === 200)){
          await idbDelete('queue', q.id);
        } else {
          // keep in queue
        }
      } catch(err){
        // network error, keep in queue
      }
    }
  }
}
self.addEventListener('sync', function(event){
  if (event.tag === 'sync-queue') {
    event.waitUntil(replayQueue());
  }
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(RUNTIME).then(async cache => {
        const cached = await cache.match(event.request);
        const network = fetch(event.request).then(resp => { if (resp && resp.ok) cache.put(event.request, resp.clone()); return resp; }).catch(()=>null);
        return cached || network || new Response(JSON.stringify({data:[]}), { headers:{'Content-Type':'application/json'}});
      })
    );
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));
    return;
  }
});
