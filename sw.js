const CACHE_NAME = 'toko-ads-v1';
const urlsToCache = [
    './',
    './index.html',
    './style_ads.css',
    './app.js',
    'https://unpkg.com/html5-qrcode'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // Hanya memotong request untuk file statis (HTML, CSS, JS)
    // Request ke Google Script (API) dibiarkan lewat agar ditangani oleh app.js
    if (!event.request.url.includes('script.google.com')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response; // Kembalikan dari cache jika ada
                    }
                    return fetch(event.request); // Ambil dari internet jika tidak ada di cache
                })
        );
    }
});
