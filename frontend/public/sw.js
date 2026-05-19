const CACHE_NAME = 'elicash-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/clientes',
  '/cobros',
  '/mora',
  '/dashboard',
  '/configuracion',
];

const DB_NAME = 'EliCashOffline';
const STORE_NAME = 'payments';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePayment(payment) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.add(payment);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getPendingPayments() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(p => p.status === 'pending'));
    request.onerror = () => reject(request.error);
  });
}

async function updatePaymentStatus(id, status) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const data = getReq.result;
      data.status = status;
      store.put(data);
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function syncPayments() {
  const pending = await getPendingPayments();
  for (const payment of pending) {
    try {
      await updatePaymentStatus(payment.id, 'syncing');
      const response = await fetch(payment.url, {
        method: 'POST',
        headers: payment.headers,
        body: JSON.stringify(payment.body)
      });
      if (response.ok) {
        await updatePaymentStatus(payment.id, 'synced');
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: 'SYNC_SUCCESS', paymentId: payment.id }));
      } else {
        await updatePaymentStatus(payment.id, 'pending');
      }
    } catch (err) {
      await updatePaymentStatus(payment.id, 'pending');
    }
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.method === 'POST' && url.pathname.endsWith('/api/cobros/payments')) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        const body = await event.request.clone().json();
        const payment = {
          id: self.crypto.randomUUID(),
          url: event.request.url,
          method: 'POST',
          headers: Object.fromEntries(event.request.headers.entries()),
          body: body,
          status: 'pending',
          timestamp: Date.now()
        };
        await savePayment(payment);
        
        return new Response(JSON.stringify({ 
          message: 'Pago guardado offline', 
          offline: true, 
          id: payment.id 
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  if (event.request.method !== 'GET') return;

  const isApiRequest = url.pathname.startsWith('/api/');
  const isStaticAsset = /\.(js|css|png|svg|ico|woff2?|ttf)(\?.*)?$/.test(url.pathname);

  if (isApiRequest) {
    // Never cache API responses
    return;
  }

  if (isStaticAsset) {
    // Stale-while-revalidate for static assets
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkPromise = fetch(event.request).then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        });
        return cached || networkPromise;
      })
    );
    return;
  }

  // Network-first with offline fallback for navigation
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REQUEST_SYNC') {
    event.waitUntil(syncPayments());
  }
});

