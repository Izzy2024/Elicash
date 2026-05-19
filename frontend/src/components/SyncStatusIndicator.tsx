import { useState, useEffect } from 'react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const { pendingCount, requestSync } = useOfflineQueue();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      requestSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [requestSync]);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-50 animate-in fade-in slide-in-from-top-2 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className={`rounded-xl p-3 shadow-lg border ${!isOnline ? 'bg-slate-800 text-white border-slate-700' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${!isOnline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight">
              {!isOnline ? 'Modo Offline' : 'Sincronizando...'}
            </p>
            {pendingCount > 0 && (
              <p className="mt-0.5 text-[11px] opacity-80">
                {pendingCount} {pendingCount === 1 ? 'operación pendiente' : 'operaciones pendientes'}
              </p>
            )}
          </div>
          {isOnline && pendingCount > 0 && (
            <button 
              onClick={requestSync}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
            >
              Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
