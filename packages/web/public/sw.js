/**
 * Ouro Service Worker — Offline-first PWA support.
 * 
 * Strategies:
 * - Cache-first for static assets (JS, CSS, images)
 * - Network-first for API calls (fall back to cache)
 * - Queue signals when offline, sync when back online
 */

const CACHE_NAME = 'ouro-v1';
const STATIC_ASSETS = [
  '/',
  '/history',
  '/evolution',
  '/analytics',
  '/settings',
];

const SIGNAL_QUEUE_KEY = 'ouro-offline-signals';

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Non-critical: pages might not all be built yet
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    // Signal submission when offline → queue
    if (url.pathname === '/api/signals' && event.request.method === 'POST') {
      event.respondWith(
        fetch(event.request.clone()).catch(async () => {
          // Offline: queue the signal
          const body = await event.request.clone().json();
          await queueSignal(body);

          return new Response(JSON.stringify({
            success: true,
            queued: true,
            message: 'Signal queued for offline sync',
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );
      return;
    }

    // Other API calls: network-first with cache fallback
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response(JSON.stringify({ success: false, error: { code: 'OFFLINE', message: 'You are offline' } }), {
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});

// Background sync: flush queued signals
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-signals') {
    event.waitUntil(flushSignalQueue());
  }
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data === 'flush-queue') {
    flushSignalQueue().then(() => {
      event.source?.postMessage({ type: 'queue-flushed' });
    });
  }
  if (event.data === 'get-queue-count') {
    getQueueCount().then((count) => {
      event.source?.postMessage({ type: 'queue-count', count });
    });
  }
});

// === Signal Queue (IndexedDB) ===
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ouro-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('signals')) {
        db.createObjectStore('signals', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueSignal(signalData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('signals', 'readwrite');
    tx.objectStore('signals').add({
      ...signalData,
      queued_at: new Date().toISOString(),
    });
    tx.oncomplete = () => {
      // Notify client
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'signal-queued' });
        });
      });
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function flushSignalQueue() {
  const db = await openDB();
  const tx = db.transaction('signals', 'readonly');
  const store = tx.objectStore('signals');

  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = async () => {
      const signals = request.result;
      let synced = 0;

      for (const signal of signals) {
        try {
          const response = await fetch('/api/signals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signal),
          });

          if (response.ok) {
            // Remove from queue
            const deleteTx = db.transaction('signals', 'readwrite');
            deleteTx.objectStore('signals').delete(signal.id);
            synced++;

            // Notify client
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({ type: 'signal-synced', signal_id: signal.id });
              });
            });
          }
        } catch {
          // Still offline, stop trying
          break;
        }
      }

      resolve(synced);
    };
  });
}

async function getQueueCount() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('signals', 'readonly');
    const request = tx.objectStore('signals').count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
}
