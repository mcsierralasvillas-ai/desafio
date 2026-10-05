/* Service worker: la app abre y funciona sin conexión.
   IMPORTANTE: cada vez que subas cambios, sube el número de VERSION. */
var VERSION = 'v15';
var CACHE_APP = 'mcslv-app-' + VERSION;
var CACHE_EXTERNO = 'mcslv-externo';
var CACHE_TESELAS = 'mcslv-teselas';

var ARCHIVOS_APP = [
  './', 'index.html', 'css/app.css?v=2.7.1', 'js/config.js?v=2.7.1', 'js/app.js?v=2.7.1', 'manifest.webmanifest',
  'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(function (c) { return Promise.all(ARCHIVOS_APP.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return caches.open(CACHE_APP).then(function (c) { return c.add('ruta-trazado.json').catch(function () {}); }); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (k) {
        // borra versiones antiguas de la app (incluidas las de la versión anterior "desafio-")
        if ((k.indexOf('mcslv-app-') === 0 && k !== CACHE_APP) || k.indexOf('desafio-') === 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function esTesela(url) { return /tile|tiles|\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp)/.test(url.href); }
function esExterno(url) { return /unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // los envíos al servidor no se tocan
  var url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    var nombre = esTesela(url) ? CACHE_TESELAS : (esExterno(url) ? CACHE_EXTERNO : null);
    if (!nombre) return;
    e.respondWith(caches.open(nombre).then(function (c) {
      return c.match(req.url).then(function (g) {
        if (g) return g;
        return fetch(req).then(function (r) {
          if (r && (r.ok || r.type === 'opaque')) c.put(req.url, r.clone());
          return r;
        });
      });
    }));
    return;
  }

  // Archivos propios: primero internet (lo último), si no hay, lo guardado
  // cache: 'no-cache' → siempre pregunta a GitHub si hay versión nueva (no usa la caché del navegador)
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (r) {
      if (r && r.ok) { var copia = r.clone(); caches.open(CACHE_APP).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (g) {
        return g || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
      });
    })
  );
});
