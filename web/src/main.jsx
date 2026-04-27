import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/*' element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered:', reg.scope);
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  });

  window.addEventListener('online', async () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('try-sync');
    }
    if ('SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try { await reg.sync.register('sync-orders'); } catch (e) { console.warn(e); }
    }
  });
}
