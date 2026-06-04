self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through standard HTTP GET requests only
  // Bypass POST/PUT/DELETE, Next.js internal dev assets, HMR, and browser extensions
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http') ||
    event.request.url.includes('/_next/') ||
    event.request.url.includes('webpack-hmr')
  ) {
    return;
  }

  event.respondWith(fetch(event.request));
});
