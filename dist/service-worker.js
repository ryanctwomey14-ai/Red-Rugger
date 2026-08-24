/* Self-destructing service worker.
 *
 * The previous WordPress site may have registered a service worker (most
 * caching plugins do). A registered worker keeps intercepting requests and
 * serving its own cached copy of the old site even after the DNS has moved
 * and the browser cache has been cleared — which is why a migration can look
 * like it "didn't happen" for returning visitors.
 *
 * Serving this at the paths those plugins commonly use replaces the old
 * worker with one that deletes every cache and unregisters itself, then
 * reloads any page it controls. It runs once per visitor and then it is gone.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
  );
});
