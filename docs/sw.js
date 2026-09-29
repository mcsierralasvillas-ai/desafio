/* Service worker: permite usar la app y el mapa sin conexión.
   IMPORTANTE: cada vez que subas cambios, sube este número de VERSION
   para que los móviles descarguen la versión nueva. */
var VERSION = 'v1';
var CACHE_APP = 'desafio-app-' + VERSION;
var CACHE_LIBS = 'desafio-libs';
var CACHE_TESELAS = 'desafio-teselas';

var ARCHIVOS_APP = [
  './',
  'index.html',
  'css/app.css',
  'js/config.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];
var LIBRERIAS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_APP).then(function (c) { return c.addAll(ARCHIVOS_APP); })
      .then(function () {
        return caches.open(CACHE_LIBS).then(function (c) {
          return Promise.all(LIBRERIAS.map(function (u) { return c.add(new Request(u, { mode: 'cors' })).catch(function () {}); }));
        });
      })
      .then(function () {
        // El trazado es opcional: si no existe no pasa nada
        return caches.open(CACHE_APP).then(function (c) { return c.add('ruta-trazado.json').catch(function () {}); });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (k) {
        if (k.indexOf('desafio-app-') === 0 && k !== CACHE_APP) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function esTesela(url) { return /tile|tiles|\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp)/.test(url.href); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // los envíos al servidor no se tocan
  var url = new URL(req.url);

  // Teselas del mapa y librerías: primero lo guardado, si no, internet (y se guarda)
  if (url.origin !== self.location.origin) {
    var nombreCache = esTesela(url) ? CACHE_TESELAS : (url.hostname === 'unpkg.com' ? CACHE_LIBS : null);
    if (!nombreCache) return;
    e.respondWith(
      caches.open(nombreCache).then(function (c) {
        return c.match(req.url).then(function (guardada) {
          if (guardada) return guardada;
          return fetch(req).then(function (r) {
            if (r && (r.ok || r.type === 'opaque')) c.put(req.url, r.clone());
            return r;
          });
        });
      })
    );
    return;
  }

  // Archivos de la app: primero internet (para tener lo último), si no hay, lo guardado
  e.respondWith(
    fetch(req).then(function (r) {
      if (r && r.ok) {
        var copia = r.clone();
        caches.open(CACHE_APP).then(function (c) { c.put(req, copia); });
      }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (g) {
        return g || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
      });
    })
  );
});
