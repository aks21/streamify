// Define a cache name
const CACHE_NAME = 'media-cache';
// List the URLs you want to cache
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'styles.css',
  'script.js',
  'media/audio1.mp3',
  'media/audio2.mp3',
  'media/audio3.mp3',
  'media/audio4.mp3',
  'media/video1.mp4',
  'media/video2.mp4',
  'media/video3.mp4',
  'media/video4.mp4',
  // Add other assets and pages you want to cache
];

// Install event - it's the first event fired in the service worker lifecycle
self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activate event - fired when the service worker starts up
self.addEventListener('activate', (event) => {
  // Clean up old caches by checking the cache names and deleting the ones that are not current
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - fired every time a network request is made
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }

        // Not in cache - return the result from the live server
        // and cache it for future requests
        return fetch(event.request).then(
          (liveResponse) => {
            // Check if we received a valid response
            if (!liveResponse || liveResponse.status !== 200 || liveResponse.type !== 'basic') {
              return liveResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = liveResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return liveResponse;
          }
        );
      })
  );
});