const CACHE = 'syd-entrees-v8';
const ASSETS = [
  './',
  './index.html',
  './live.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Le suivi a distance ne passe jamais par le cache
  if (url.hostname.endsWith('firebasedatabase.app')) return;

  const isPage = req.mode === 'navigate'
              || url.pathname.endsWith('/')
              || url.pathname.endsWith('index.html')
              || url.pathname.endsWith('live.html');

  if (isPage) {
    const target = url.pathname.endsWith('live.html') ? './live.html' : './index.html';
    // Reseau d'abord : la derniere version gagne, le cache prend le relais hors ligne
    e.respondWith(
      // cache:'reload' contourne le cache HTTP du navigateur : la tablette voit
      // toujours la derniere version publiee, sans attendre l'expiration du cache
      fetch(new Request(req.url, { cache: 'reload', credentials: 'omit' })).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(target, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(target).then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Le reste (icones, manifeste, polices) : cache d'abord
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
