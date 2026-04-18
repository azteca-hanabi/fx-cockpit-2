const CACHE_NAME = 'fx-cockpit-v1';

// Network-first で扱うリソース（常に最新を優先）
function isNetworkFirst(url) {
  const p = url.pathname;
  return (
    p.endsWith('/') ||
    p.endsWith('/index.html') ||
    p.includes('news.json') ||
    p.includes('ohlc.json')
  );
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['./', './index.html']))
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (isNetworkFirst(url)) {
    // Network-first: オンラインなら必ずネットワークから取得してキャッシュ更新
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first: キャッシュがあれば即返す、なければネットワーク取得してキャッシュ
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
  }
});
