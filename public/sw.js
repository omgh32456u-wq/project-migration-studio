/* Mizano service worker: offline app shell, no user data is cached here (data lives in IndexedDB). */
// v3: Lovable build — routes have no trailing slash and hashed build assets live under /assets/.
const VERSION = 'tmm-v4'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const SHELL_ROUTES = ['/', '/foods', '/progress', '/settings']
const PRECACHE = [...SHELL_ROUTES, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/favicon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || /\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c)
      return client ? client.focus() : self.clients.openWindow('/')
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(url.pathname, copy))
          }
          return response
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match('/')) || Response.error()),
    )
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
