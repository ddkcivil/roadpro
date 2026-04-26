const CACHE_NAME = 'roadmaster-v11';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/index.css'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Helper to fetch and cache
 */
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Fetch Event - Strategy implementation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Bypass service worker for Vite HMR requests
  if (url.pathname.includes('@vite') || 
      url.pathname.includes('__vite_ping') || 
      url.protocol === 'ws:') {
    return;
  }
  
  if (request.method !== 'GET') return;

  // Strategy for Navigation (HTML): Network First, then fallback to Cache
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          return await fetchAndCache(request, CACHE_NAME);
        } catch (error) {
          return await caches.match(request) || await caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Strategy for API calls: Network ONLY (no cache for dynamic data/auth)
  if (url.pathname.startsWith('/api/')) {
    // We don't call respondWith for API calls to let them bypass SW entirely
    // Or we can respondWith a direct fetch without caching
    return; 
  }

  // Strategy for Open Meteo (Weather): Network First, then fallback to Cache
  if (url.hostname.includes('api.open-meteo.com')) {
    event.respondWith(
      (async () => {
        try {
          return await fetchAndCache(request, CACHE_NAME);
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Offline' }), { status: 503 });
        }
      })()
    );
    return;
  }

  // Default: Cache First, then Network
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        return await fetchAndCache(request, CACHE_NAME);
      } catch (error) {
        // For non-critical assets, just return the error
        return new Response('Network error', { status: 408, statusText: 'Network error' });
      }
    })()
  );
});


// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Helper to fetch and cache
 */
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Fetch Event - Strategy implementation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Bypass service worker for Vite HMR requests
  if (url.pathname.includes('@vite') || 
      url.pathname.includes('__vite_ping') || 
      url.protocol === 'ws:') {
    return;
  }
  
  if (request.method !== 'GET') return;

  // Strategy for Navigation (HTML): Network First, then fallback to Cache
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          return await fetchAndCache(request, CACHE_NAME);
        } catch (error) {
          return await caches.match(request) || await caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Strategy for API calls: Network ONLY (no cache for dynamic data/auth)
  if (url.pathname.startsWith('/api/')) {
    // We don't call respondWith for API calls to let them bypass SW entirely
    // Or we can respondWith a direct fetch without caching
    return; 
  }

  // Strategy for Open Meteo (Weather): Network First, then fallback to Cache
  if (url.hostname.includes('api.open-meteo.com')) {
    event.respondWith(
      (async () => {
        try {
          return await fetchAndCache(request, CACHE_NAME);
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Offline' }), { status: 503 });
        }
      })()
    );
    return;
  }

  // Default: Cache First, then Network
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        return await fetchAndCache(request, CACHE_NAME);
      } catch (error) {
        // For non-critical assets, just return the error
        return new Response('Network error', { status: 408, statusText: 'Network error' });
      }
    })()
  );
});
