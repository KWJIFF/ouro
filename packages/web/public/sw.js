/**
 * Ouro Service Worker — Offline Signal Capture
 * 
 * Constitutional Principle #1: Zero Friction
 * Signals must be capturable even without internet.
 * They queue locally and sync when connectivity returns.
 */

const CACHE_NAME = 'ouro-v1';
const OFFLINE_QUEUE_KEY = 'ouro-offline-signals';
const API_URL = self.location.origin.replace(':3000', ':3001');

// Cache the app shell
const APP_SHELL = [
  '/',
  '/history',
  '/evolution',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API signal submission — queue if offline
  if (url.pathname === '/api/signals' && event.request.method === 'POST') {
    event.respondWith(handleSignalSubmission(event.request));
    return;
  }

  // App navigation — serve from cache, fallback to network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Everything else — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

async function handleSignalSubmission(request) {
  try {
    // Try to submit online
    const response = await fetch(request.clone());
    if (response.ok) {
      // Successfully submitted — also try to flush any queued signals
      flushOfflineQueue();
      return response;
    }
    throw new Error('Server error');
  } catch (error) {
    // Offline — queue the signal
    const body = await request.clone().text();
    await queueSignal(body);

    return new Response(JSON.stringify({
      signal_id: 'offline-' + Date.now(),
      status: 'queued',
      message: 'Signal saved offline. Will sync when connected.',
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function queueSignal(body) {
  const db = await openDB();
  const tx = db.transaction('signals', 'readwrite');
  const store = tx.objectStore('signals');
  await store.add({
    id: Date.now(),
    body,
    timestamp: new Date().toISOString(),
    status: 'queued',
    retryCount: 0,
  });
}

async function flushOfflineQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction('signals', 'readonly');
    const store = tx.objectStore('signals');
    const all = await storeGetAll(store);

    for (const signal of all) {
      if (signal.status === 'queued') {
        try {
          const response = await fetch(`${API_URL}/api/signals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: signal.body,
          });

          if (response.ok) {
            const deleteTx = db.transaction('signals', 'readwrite');
            deleteTx.objectStore('signals').delete(signal.id);

            // Notify clients
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'signal-synced',
                  signalId: signal.id,
                  timestamp: signal.timestamp,
                });
              });
            });
          }
        } catch {
          // Still offline, try again later
        }
      }
    }
  } catch (e) {
    console.error('[SW] Queue flush failed:', e);
  }
}

// IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ouro-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('signals')) {
        db.createObjectStore('signals', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Periodic sync (when browser supports it)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-signals') {
    event.waitUntil(flushOfflineQueue());
  }
});

// Manual sync trigger
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-signals') {
    event.waitUntil(flushOfflineQueue());
  }
});

// Listen for online events
self.addEventListener('message', (event) => {
  if (event.data === 'flush-queue') {
    flushOfflineQueue();
  }
});
