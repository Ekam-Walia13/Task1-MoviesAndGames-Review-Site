const CACHE_NAME = 'game-review-cache-v1';
const urlsToCache = [
    '/',
    '/html/homepage.html',
    '/html/homepage-movies.html',
    '/css/Pages.css',
    '/images/Placeholder.jpg',
    '/get-games'
];

// Install Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching files...');
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch Requests
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// Activate Service Worker and Clean Up Old Caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
