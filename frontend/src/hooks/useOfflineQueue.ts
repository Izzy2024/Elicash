import { useState, useEffect } from 'react';

const DB_NAME = 'EliCashOffline';
const STORE_NAME = 'payments';

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);

  const updateCount = async () => {
    if (typeof indexedDB === 'undefined') return;
    
    return new Promise<void>((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          resolve();
          return;
        }
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const pending = getAll.result.filter((p: any) => p.status === 'pending');
          setPendingCount(pending.length);
          resolve();
        };
      };
      request.onerror = () => resolve();
    });
  };

  useEffect(() => {
    updateCount();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_SUCCESS') {
        updateCount();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Polling as fallback or for immediate updates after intercept
    const interval = setInterval(updateCount, 5000);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      clearInterval(interval);
    };
  }, []);

  const requestSync = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'REQUEST_SYNC' });
    }
  };

  return { pendingCount, requestSync, refresh: updateCount };
}
