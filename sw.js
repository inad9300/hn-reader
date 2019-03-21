const cacheName = 'hn-reader-v1'

self.addEventListener('fetch', evt =>
    evt.respondWith(fetchFromCacheOrNetwork(evt.request)))

function fetchFromCacheOrNetwork(req) {
    return caches.match(req).then(res => {
        if (res) {
            return res
        }
        return fetch(req).then(res => {
            if (res.ok) {
                const clone = res.clone()
                caches
                    .open(cacheName)
                    .then(cache => cache.put(req, clone))
            }
            return res
        })
    })
}
