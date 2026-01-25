
const CACHE_NAME = 'roadmaster-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',

];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Only try to fetch from network if there's no cached response for certain types of requests
        if (cachedResponse) {
          // Update the cache in the background for existing cached resources
          if (event.request.method === 'GET' && 
              (event.request.url.startsWith('http://') || event.request.url.startsWith('https://'))) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                cache.put(event.request, networkResponse.clone());
              }
            }).catch((error) => {
              console.warn('Failed to update cache for:', event.request.url, error);
            });
          }
          return cachedResponse;
        }
        
        // Try to fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((error) => {
          console.error('Network request failed:', event.request.url, error);
          throw error;
        });
      }).catch((error) => {
        console.error('Cache match failed:', event.request.url, error);
        // Try network as fallback
        return fetch(event.request);
      });
    })
  );
});
