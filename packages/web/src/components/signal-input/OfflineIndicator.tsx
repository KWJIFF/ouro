'use client';
import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('flush-queue');
        setSyncing(true);
        setTimeout(() => setSyncing(false), 3000);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'signal-synced') {
          setQueuedCount(prev => Math.max(0, prev - 1));
        }
        if (event.data.type === 'queue-count') {
          setQueuedCount(event.data.count);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything when online and no queue
  if (isOnline && queuedCount === 0 && !syncing) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-1.5 text-xs font-medium transition-all ${
      !isOnline ? 'bg-ouro-danger/90 text-white' :
      syncing ? 'bg-ouro-accent/90 text-white' :
      queuedCount > 0 ? 'bg-ouro-warning/90 text-white' : ''
    }`}>
      {!isOnline && (
        <span className="flex items-center gap-1.5">
          <WifiOff size={12} />
          Offline — signals are being queued locally
        </span>
      )}
      {isOnline && syncing && (
        <span className="flex items-center gap-1.5">
          <RefreshCw size={12} className="animate-spin" />
          Syncing queued signals...
        </span>
      )}
      {isOnline && !syncing && queuedCount > 0 && (
        <span className="flex items-center gap-1.5">
          <CloudOff size={12} />
          {queuedCount} signal(s) queued — will sync shortly
        </span>
      )}
    </div>
  );
}
