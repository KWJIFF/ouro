'use client';
import { useState, useEffect, useCallback } from 'react';

interface QueuedSignal {
  id: number;
  text: string;
  timestamp: string;
  status: 'queued' | 'syncing' | 'synced' | 'failed';
}

/**
 * Hook for managing the offline signal queue.
 * Integrates with the Service Worker's IndexedDB store.
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedSignal[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => { setIsOnline(true); syncQueue(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Listen for SW sync events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'signal-synced') {
          setQueue(prev => prev.map(q =>
            q.id === event.data.signalId ? { ...q, status: 'synced' as const } : q
          ));
        }
        if (event.data.type === 'queue-update') {
          loadQueue();
        }
      });
    }

    loadQueue();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('signals', 'readonly');
      const store = tx.objectStore('signals');
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result || []).map((item: any) => ({
          id: item.id,
          text: item.body ? JSON.parse(item.body).text || '[signal]' : '[signal]',
          timestamp: item.timestamp,
          status: item.status,
        }));
        setQueue(items);
      };
    } catch {
      // IndexedDB not available
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('flush-queue');
      }
      setTimeout(() => {
        loadQueue();
        setIsSyncing(false);
      }, 3000);
    } catch {
      setIsSyncing(false);
    }
  }, [isSyncing, loadQueue]);

  const clearSynced = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('signals', 'readwrite');
      const store = tx.objectStore('signals');
      const request = store.getAll();
      request.onsuccess = () => {
        for (const item of request.result || []) {
          if (item.status === 'synced') store.delete(item.id);
        }
        loadQueue();
      };
    } catch {}
  }, [loadQueue]);

  return {
    queue,
    isOnline,
    isSyncing,
    pendingCount: queue.filter(q => q.status === 'queued').length,
    syncedCount: queue.filter(q => q.status === 'synced').length,
    syncQueue,
    clearSynced,
    loadQueue,
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ouro-offline', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('signals')) {
        req.result.createObjectStore('signals', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
