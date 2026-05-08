const CACHE_NAME = 'roadmaster-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png'
];

// Install Event - Cache static assets with better error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching app shell assets');
      // Don't fail install if we can't cache - just warn
      const cachePromises = ASSETS_TO_CACHE.map(async (asset) => {
        try {
          // Use no-cors mode for cross-origin requests
          const response = await fetch(asset, { mode: 'no-cors' });
          if (response.ok || response.type === 'opaque') {
            await cache.put(asset, response);
            console.log(`[SW] Cached: ${asset}`);
          }
        } catch (error) {
          // Network unavailable during install - that's OK
          console.log(`[SW] Skipping cache for ${asset} - network unavailable`);
        }
      });
      await Promise.all(cachePromises);
    }).catch(err => {
      console.warn('[SW] Cache install failed:', err);
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
 * Helper to fetch and cache with better error handling
 */
async function fetchAndCache(request, cacheName) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network fetch failed, trying cache:', request.url);
    // Try cache as fallback
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // If this is a navigation request, return offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/index.html');
      if (offlinePage) return offlinePage;
    }
    // Re-throw if no cache available
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

  // Strategy for Map Tile Servers: Network First, then fallback to Cache
  // This handles Stadia Maps, CARTO, Esri, OpenTopoMap, and other tile providers
  const tileDomains = [
    'tiles.stadiamaps.com',
    'cartodb-basemaps-a.global.ssl.fastly.net',
    'cartodb-basemaps-b.global.ssl.fastly.net',
    'server.arcgisonline.com',
    'tile.opentopomap.org',
    'openstreetmap.org',
    'tile.openstreetmap.org'
  ];
  const isTileRequest = tileDomains.some(domain => url.hostname.includes(domain));
  
  if (isTileRequest) {
    event.respondWith(
      (async () => {
        try {
          // Network First for tiles - always try to get fresh tiles
          const response = await fetch(request);
          if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          // Fallback to cache if network fails
          console.warn('[SW] Tile fetch failed, trying cache:', request.url);
          const cached = await caches.match(request);
          if (cached) return cached;
          // Return a proper error response instead of 408
          return new Response('Tile unavailable', { 
            status: 503, 
            statusText: 'Tile unavailable - offline or server error',
            headers: { 'X-Service-Worker': 'tile-fallback' }
          });
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
