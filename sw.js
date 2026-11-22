/* Service worker: menyimpan file agar aplikasi bisa dibuka offline */
var CACHE = 'blueprint-studio-v5';
var FILES = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/data.js', 'js/kamus.js', 'js/db.js', 'js/app.js', 'manifest.json', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) {
    var u = new URL(e.request.url);
    if ((r.ok && u.origin === location.origin) || (u.hostname === 'www.gstatic.com' && (r.ok || r.type === 'opaque'))) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); }
    return r;
  }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('index.html'); }); }));
});
