/* =========================================================================
   Desafío de las Presas · App de ruta
   Motorclub Sierra Las Villas
   -------------------------------------------------------------------------
   Normalmente NO hace falta tocar este archivo. Todo lo configurable está
   en js/config.js
   ========================================================================= */
(function () {
  'use strict';

  var C = window.CONFIG;
  var VERSION_APP = '1.0.0';
  var CLAVE = 'desafio_presas_estado_v1';
  var TOTAL = C.puntos.length;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------------
     ESTADO (se guarda en el móvil)
     ------------------------------------------------------------------ */
  function estadoNuevo() {
    return { participante: null, sellos: {}, cola: [], verCompleta: false, mapaOffline: null, felicitado: false };
  }
  function cargarEstado() {
    try {
      var e = JSON.parse(localStorage.getItem(CLAVE));
      if (e && typeof e === 'object') {
        var base = estadoNuevo();
        for (var k in base) if (!(k in e)) e[k] = base[k];
        return e;
      }
    } catch (err) { /* sin almacenamiento */ }
    return estadoNuevo();
  }
  var estado = cargarEstado();
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (err) { console.warn('No se pudo guardar', err); }
  }

  /* ------------------------------------------------------------------
     FOTOS (IndexedDB: aguanta imágenes grandes)
     ------------------------------------------------------------------ */
  var fotos = (function () {
    var promesa = null;
    function abrir() {
      if (!promesa) {
        promesa = new Promise(function (ok, mal) {
          var r = indexedDB.open('desafio_presas', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('fotos'); };
          r.onsuccess = function () { ok(r.result); };
          r.onerror = function () { mal(r.error); };
        });
      }
      return promesa;
    }
    function op(modo, fn) {
      return abrir().then(function (db) {
        return new Promise(function (ok, mal) {
          var t = db.transaction('fotos', modo);
          var res = fn(t.objectStore('fotos'));
          t.oncomplete = function () { ok(res && res.result); };
          t.onerror = function () { mal(t.error); };
        });
      });
    }
    return {
      guardar: function (id, dato) { return op('readwrite', function (s) { s.put(dato, id); }); },
      leer: function (id) { return op('readonly', function (s) { return s.get(id); }); },
      borrarTodo: function () { return op('readwrite', function (s) { s.clear(); }); }
    };
  })();

  /* ------------------------------------------------------------------
     UTILIDADES
     ------------------------------------------------------------------ */
  function distancia(a, b) { // metros
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function textoDistancia(m) {
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km';
  }
  function hora(iso) {
    var d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  function toast(texto, ms) {
    var t = $('#toast');
    t.textContent = texto; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, ms || 3000);
  }
  function modal(html, botones) {
    $('#modal-contenido').innerHTML = html;
    var cont = $('#modal-botones');
    cont.innerHTML = '';
    (botones || [{ texto: 'Vale', principal: true }]).forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'boton' + (b.principal ? ' boton-principal' : '');
      el.textContent = b.texto;
      el.onclick = function () {
        if (b.accion && b.accion() === false) return;
        $('#modal').hidden = true;
      };
      cont.appendChild(el);
    });
    $('#modal').hidden = false;
  }

  /* ------------------------------------------------------------------
     PROGRESO DE LA RUTA
     ------------------------------------------------------------------ */
  function numSellos() { return C.puntos.filter(function (p) { return estado.sellos[p.id]; }).length; }
  function indiceActual() { // posición del siguiente punto a sellar (TOTAL = ya todos, rumbo a meta)
    var i = 0;
    while (i < TOTAL && estado.sellos[C.puntos[i].id]) i++;
    return i;
  }
  function completado() { return indiceActual() >= TOTAL; }
  function destinoActual() {
    var i = indiceActual();
    return i < TOTAL ? C.puntos[i] : C.llegada;
  }
  function rutaDesbloqueada() {
    return C.modoPrueba || Date.now() >= new Date(C.desbloqueoRuta).getTime();
  }
  function paradas() { return [C.salida].concat(C.puntos, [C.llegada]); }
  function tramosVisibles() { // índices de tramo (0 = salida -> punto 1)
    var total = TOTAL + 1;
    var hasta = (C.modoRuta === 'completa' || estado.verCompleta) ? total - 1 : indiceActual();
    var r = [];
    for (var i = 0; i <= hasta && i < total; i++) r.push(i);
    return r;
  }

  /* ------------------------------------------------------------------
     TRAZADO DE LA RUTA (ruta-trazado.json, opcional)
     ------------------------------------------------------------------ */
  var trazado = null;
  function cargarTrazado() {
    return fetch('ruta-trazado.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('sin trazado'); return r.json(); })
      .then(function (j) { if (j && Array.isArray(j.tramos) && j.tramos.length === TOTAL + 1) trazado = j.tramos; })
      .catch(function () { trazado = null; });
  }
  function lineaTramo(i) {
    if (trazado && trazado[i] && trazado[i].length > 1) return trazado[i];
    var p = paradas();
    return [[p[i].lat, p[i].lng], [p[i + 1].lat, p[i + 1].lng]];
  }

  /* ------------------------------------------------------------------
     GPS
     ------------------------------------------------------------------ */
  var posicion = null, errorGps = null, vigilancia = null;
  function iniciarGps() {
    if (vigilancia !== null || !('geolocation' in navigator)) return;
    vigilancia = navigator.geolocation.watchPosition(function (p) {
      posicion = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, t: Date.now() };
      errorGps = null;
      pintarPosicion();
    }, function (e) {
      errorGps = e.code === 1 ? 'Permiso de ubicación denegado' : 'Buscando señal GPS…';
      pintarPosicion();
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }
  function posicionReciente() {
    return posicion && (Date.now() - posicion.t) < 120000 ? posicion : null;
  }

  /* ------------------------------------------------------------------
     MAPA
     ------------------------------------------------------------------ */
  var mapa = null, capaRuta = null, marcaYo = null, circuloYo = null, encuadrado = false;
  function hayLeaflet() { return typeof window.L !== 'undefined'; }

  function asegurarMapa() {
    if (mapa) return true;
    if (!hayLeaflet()) {
      $('#mapa').hidden = true;
      $('#mapa-no-disponible').hidden = false;
      return false;
    }
    mapa = L.map('mapa', { zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);
    L.tileLayer(C.mapa.teselas, { maxZoom: C.mapa.zoomMax, attribution: C.mapa.atribucion }).addTo(mapa);
    capaRuta = L.layerGroup().addTo(mapa);
    mapa.setView([C.salida.lat, C.salida.lng], 10);
    return true;
  }

  function icono(clase, texto) {
    return L.divIcon({ className: '', html: '<div class="marcador ' + clase + '">' + esc(texto) + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
  }

  function pintarMapa() {
    if (!asegurarMapa()) return;
    capaRuta.clearLayers();
    var actual = indiceActual();
    var visibles = tramosVisibles();
    var p = paradas();

    visibles.forEach(function (i) {
      var hecho = i < actual;
      var enCurso = i === actual;
      if (!hecho) {
        L.polyline(lineaTramo(i), { color: '#000', weight: enCurso ? 9 : 7, opacity: 0.35 }).addTo(capaRuta);
      }
      L.polyline(lineaTramo(i), {
        color: hecho ? '#2fb56a' : (enCurso ? '#d7261e' : '#ffc400'),
        weight: enCurso ? 6 : 4,
        opacity: hecho ? 0.7 : 1,
        dashArray: (!trazado && !hecho) ? '8 8' : null
      }).addTo(capaRuta);
    });

    // Marcadores: salida + puntos visibles + llegada si se ve el último tramo
    L.marker([C.salida.lat, C.salida.lng], { icon: icono('marcador-salida', 'S') })
      .bindPopup(esc(C.salida.nombre)).addTo(capaRuta);
    visibles.forEach(function (i) {
      var destino = p[i + 1];
      var esMeta = i === TOTAL;
      var clase = esMeta ? 'marcador-salida' : (i < actual ? 'marcador-hecho' : (i === actual ? 'marcador-siguiente' : 'marcador-pendiente'));
      L.marker([destino.lat, destino.lng], { icon: icono(clase, esMeta ? '🏁' : String(i + 1)), zIndexOffset: i === actual ? 1000 : 0 })
        .bindPopup('<b>' + esc(destino.nombre) + '</b>' + (destino.lugar ? '<br>' + esc(destino.lugar) : ''))
        .addTo(capaRuta);
    });

    if (!encuadrado) { encuadrarTramo(); encuadrado = true; }
    pintarPosicion();
  }

  function encuadrarTramo() {
    if (!mapa) return;
    var linea = lineaTramo(Math.min(indiceActual(), TOTAL));
    var b = L.latLngBounds(linea);
    var pos = posicionReciente();
    if (pos) b.extend([pos.lat, pos.lng]);
    mapa.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
  }

  function pintarPosicion() {
    pintarPanel();
    if (!mapa) return;
    var pos = posicionReciente();
    if (!pos) return;
    var ll = [pos.lat, pos.lng];
    if (!marcaYo) {
      marcaYo = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000 }).addTo(mapa);
      circuloYo = L.circle(ll, { radius: pos.precision, color: '#1e88ff', weight: 1, fillOpacity: 0.08 }).addTo(mapa);
    } else {
      marcaYo.setLatLng(ll);
      circuloYo.setLatLng(ll).setRadius(pos.precision);
    }
  }

  /* ------------------------------------------------------------------
     PANEL DEL DESTINO (pantalla Ruta)
     ------------------------------------------------------------------ */
  var datosSelloPendiente = null;

  function puedeSellar() {
    if (completado()) return { si: false };
    if (C.modoPrueba) return { si: true };
    var pos = posicionReciente();
    if (!pos) return { si: false, motivo: errorGps || 'Buscando señal GPS…' };
    var d = distancia(pos, destinoActual());
    if (d <= C.radioSelladoMetros + Math.min(pos.precision, 100)) return { si: true, distancia: d };
    return { si: false, distancia: d };
  }

  function pintarPanel() {
    if ($('#pantalla-ruta').hidden || $('#ruta-activa').hidden) return;
    var i = indiceActual();
    var dest = destinoActual();
    var fin = completado();

    $('#destino-etiqueta').textContent = fin ? '¡Desafío completado! Rumbo a meta' : 'Punto ' + (i + 1) + ' de ' + TOTAL;
    $('#destino-nombre').textContent = dest.nombre;
    $('#destino-lugar').textContent = dest.lugar || '';
    $('#destino-pista').textContent = fin ? 'Te esperamos para entregarte tu diploma.' : (dest.pista || '');
    $('#boton-navegar').href = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + dest.lat + ',' + dest.lng;

    var pos = posicionReciente();
    var elDist = $('#destino-distancia');
    var estadoSello = puedeSellar();
    if (pos) {
      var d = distancia(pos, dest);
      elDist.textContent = 'A ' + textoDistancia(d) + ' en línea recta';
      var enPunto = !fin && d <= C.radioSelladoMetros + Math.min(pos.precision, 100);
      elDist.classList.toggle('cerca', enPunto);
      if (enPunto) elDist.textContent = '¡Estás en el punto! Ya puedes sellar';
    } else {
      elDist.textContent = errorGps || 'Buscando señal GPS…';
      elDist.classList.remove('cerca');
    }

    var bSellar = $('#boton-sellar');
    bSellar.hidden = fin;
    bSellar.disabled = !estadoSello.si;
    $('#boton-sin-gps').hidden = fin;
    $('#boton-simular').hidden = !C.modoPrueba || fin;
  }

  function pulsarSellar() {
    var e = puedeSellar();
    if (!e.si) {
      toast(e.distancia ? 'Aún estás a ' + textoDistancia(e.distancia) + ' del punto' : (e.motivo || 'Sin GPS'));
      return;
    }
    var pos = posicionReciente();
    datosSelloPendiente = {
      punto: destinoActual(),
      lat: pos ? pos.lat : null, lng: pos ? pos.lng : null,
      precision: pos ? Math.round(pos.precision) : null,
      distancia: pos ? Math.round(distancia(pos, destinoActual())) : null,
      sinGps: !pos,
      simulado: false
    };
    abrirCamara();
  }

  function abrirCamara() {
    var entrada = $('#entrada-foto');
    entrada.value = '';
    entrada.click();
  }

  function pulsarSinGps() {
    modal('<h2>¿Problemas con el GPS?</h2><p>Si estás en el punto y el móvil no lo detecta, puedes sellar igualmente. ' +
      'La organización revisará que la foto se haya hecho en el sitio.</p>', [
      { texto: 'Sellar igualmente', principal: true, accion: function () {
        var pos = posicionReciente();
        datosSelloPendiente = {
          punto: destinoActual(),
          lat: pos ? pos.lat : null, lng: pos ? pos.lng : null,
          precision: pos ? Math.round(pos.precision) : null,
          distancia: pos ? Math.round(distancia(pos, destinoActual())) : null,
          sinGps: true, simulado: false
        };
        abrirCamara();
      } },
      { texto: 'Cancelar' }
    ]);
  }

  function pulsarSimular() {
    var dest = destinoActual();
    posicion = { lat: dest.lat + 0.0005, lng: dest.lng + 0.0005, precision: 15, t: Date.now() };
    pintarPosicion();
    datosSelloPendiente = { punto: dest, lat: posicion.lat, lng: posicion.lng, precision: 15, distancia: Math.round(distancia(posicion, dest)), sinGps: false, simulado: true };
    abrirCamara();
  }

  /* Reduce la foto para que se envíe rápido con poca cobertura */
  function comprimirFoto(archivo, lado, calidad) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo);
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, lado / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la foto')); };
      img.src = url;
    });
  }

  function fotoElegida(ev) {
    var archivo = ev.target.files && ev.target.files[0];
    var datos = datosSelloPendiente;
    datosSelloPendiente = null;
    if (!archivo || !datos) return;
    toast('Guardando sello…', 8000);

    comprimirFoto(archivo, 1280, 0.75).then(function (dataUrl) {
      var p = datos.punto;
      return fotos.guardar(p.id, dataUrl).then(function () {
        estado.sellos[p.id] = {
          hora: new Date().toISOString(),
          lat: datos.lat, lng: datos.lng, precision: datos.precision, distancia: datos.distancia,
          sinGps: datos.sinGps, simulado: datos.simulado, subido: false
        };
        estado.cola.push({ tipo: 'sello', id: p.id });
        guardar();
        encuadrado = false;
        despuesDeSellar(p, dataUrl);
        procesarCola();
      });
    }).catch(function (err) {
      console.error(err);
      modal('<h2>Error</h2><p>No se pudo guardar la foto. Inténtalo otra vez.</p><p class="suave">' + esc(err.message) + '</p>');
    });
  }

  function despuesDeSellar(punto, dataUrl) {
    $('#toast').hidden = true;
    pintarTodo();
    var n = numSellos();
    if (completado()) {
      estado.felicitado = true; guardar();
      modal(htmlEnhorabuena(), [{ texto: 'Ver ruta a meta', principal: true, accion: function () { ir('ruta'); } }, { texto: 'Ver mi carnet', accion: function () { ir('carnet'); } }]);
    } else {
      var sig = destinoActual();
      modal('<h2>¡Sello ' + n + ' de ' + TOTAL + '!</h2>' +
        '<img class="modal-foto" src="' + dataUrl + '" alt="">' +
        '<p>' + esc(punto.nombre) + ' conseguido.</p>' +
        '<p>Nuevo tramo desbloqueado:<br><b style="font-size:19px">' + esc(sig.nombre) + '</b></p>',
      [{ texto: 'Ver el siguiente tramo', principal: true }]);
    }
  }

  function htmlEnhorabuena() {
    var nombre = estado.participante ? estado.participante.nombre.split(' ')[0] : '';
    return '<h2>¡Enhorabuena' + (nombre ? ', ' + esc(nombre) : '') + '!</h2>' +
      '<p style="font-size:18px">Has completado el <b>' + esc(C.evento.nombre) + '</b>.</p>' +
      '<p>' + TOTAL + ' de ' + TOTAL + ' sellos conseguidos. Pon rumbo a <b>' + esc(C.evento.lugarFinal) +
      '</b>: te esperamos para entregarte tu diploma.</p><p class="suave">Enseña tu carnet de sellado al llegar.</p>';
  }

  /* ------------------------------------------------------------------
     ENVÍO AL SERVIDOR (cola que se reintenta cuando hay cobertura)
     ------------------------------------------------------------------ */
  var enviando = false;
  function datosParticipante() {
    var p = estado.participante || {};
    return { nombre: p.nombre, dorsal: p.dorsal, telefono: p.telefono || '', email: p.email || '' };
  }
  function construirEnvio(item) {
    var base = datosParticipante();
    base.accion = item.tipo;
    base.evento = C.evento.nombre;
    base.total = TOTAL;
    if (item.tipo === 'registro') return Promise.resolve(base);
    var idx = -1;
    C.puntos.forEach(function (pt, k) { if (pt.id === item.id) idx = k; });
    var s = estado.sellos[item.id];
    if (!s || idx < 0) return Promise.resolve(null);
    return fotos.leer(item.id).then(function (dataUrl) {
      base.puntoId = item.id;
      base.puntoNombre = C.puntos[idx].nombre;
      base.orden = idx + 1;
      base.hora = s.hora;
      base.lat = s.lat; base.lng = s.lng;
      base.precision = s.precision; base.distancia = s.distancia;
      base.sinGps = !!s.sinGps; base.simulado = !!s.simulado;
      base.foto = dataUrl ? dataUrl.split(',')[1] : '';
      return base;
    });
  }

  function procesarCola() {
    pintarCola();
    if (enviando || !C.urlServidor || !navigator.onLine || !estado.cola.length) return Promise.resolve();
    enviando = true;
    function siguiente() {
      if (!estado.cola.length) return Promise.resolve();
      var item = estado.cola[0];
      return construirEnvio(item).then(function (datos) {
        if (!datos) { estado.cola.shift(); guardar(); return siguiente(); }
        return fetch(C.urlServidor, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita la comprobación CORS previa
          body: JSON.stringify(datos)
        }).then(function (r) { return r.json(); }).then(function (res) {
          if (!res || !res.ok) throw new Error((res && res.error) || 'Respuesta no válida');
          if (item.tipo === 'sello' && estado.sellos[item.id]) estado.sellos[item.id].subido = true;
          if (item.tipo === 'registro' && estado.participante) estado.participante.registrado = true;
          estado.cola.shift();
          guardar();
          pintarCola();
          return siguiente();
        });
      });
    }
    return siguiente().catch(function (err) {
      console.warn('Envío pendiente:', err.message);
    }).then(function () {
      enviando = false;
      pintarTodo();
    });
  }

  function pintarCola() {
    var pendientes = estado.cola.filter(function (i) { return i.tipo === 'sello'; }).length;
    $('#bloque-cola').hidden = pendientes === 0;
    $('#texto-cola').textContent = !C.urlServidor
      ? 'Servidor no configurado todavía (ver GUIA, paso 2). Las fotos están guardadas en el móvil.'
      : pendientes + ' foto(s) guardada(s) en el móvil. Se enviarán solas cuando haya cobertura.';
    $('#estado-conexion').classList.toggle('sin-red', !navigator.onLine);
  }

  /* ------------------------------------------------------------------
     MAPA SIN CONEXIÓN (descarga las teselas a lo largo de la ruta)
     ------------------------------------------------------------------ */
  function teselasRuta() {
    var claves = {};
    function x(lng, z) { return Math.floor((lng + 180) / 360 * Math.pow(2, z)); }
    function y(lat, z) { var r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z)); }
    for (var t = 0; t <= TOTAL; t++) {
      var linea = lineaTramo(t);
      // Densificar: un punto cada ~400 m
      var puntos = [];
      for (var k = 0; k < linea.length - 1; k++) {
        var a = { lat: linea[k][0], lng: linea[k][1] }, b = { lat: linea[k + 1][0], lng: linea[k + 1][1] };
        var pasos = Math.max(1, Math.ceil(distancia(a, b) / 400));
        for (var s = 0; s < pasos; s++) puntos.push([a.lat + (b.lat - a.lat) * s / pasos, a.lng + (b.lng - a.lng) * s / pasos]);
      }
      puntos.push(linea[linea.length - 1]);
      C.mapa.zoomsSinConexion.forEach(function (z) {
        var margen = z <= 11 ? 1 : 0;
        puntos.forEach(function (pt) {
          var tx = x(pt[1], z), ty = y(pt[0], z);
          for (var dx = -margen; dx <= margen; dx++) for (var dy = -margen; dy <= margen; dy++) claves[z + '/' + (tx + dx) + '/' + (ty + dy)] = 1;
        });
      });
    }
    return Object.keys(claves).map(function (c) {
      var p = c.split('/');
      return C.mapa.teselas.replace('{s}', 'a').replace('{r}', '').replace('{z}', p[0]).replace('{x}', p[1]).replace('{y}', p[2]);
    });
  }

  function descargarMapa() {
    if (!navigator.onLine) { toast('Necesitas conexión (mejor wifi) para descargar el mapa'); return; }
    var boton = $('#boton-offline');
    boton.disabled = true;
    $('#barra-offline').hidden = false;
    var urls = [
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      'ruta-trazado.json'
    ].concat(teselasRuta());
    var hechas = 0, fallos = 0, i = 0, total = urls.length;
    function progreso() {
      $('#barra-offline-valor').style.width = Math.round(hechas / total * 100) + '%';
      $('#texto-offline').textContent = 'Descargando mapa… ' + hechas + ' de ' + total;
    }
    function trabajador() {
      if (i >= urls.length) return Promise.resolve();
      var u = urls[i++];
      return fetch(u, { mode: u.indexOf('http') === 0 ? 'cors' : 'same-origin' })
        .catch(function () { fallos++; })
        .then(function () { hechas++; progreso(); return trabajador(); });
    }
    progreso();
    Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]).then(function () {
      estado.mapaOffline = { fecha: new Date().toISOString(), teselas: total - fallos };
      guardar();
      boton.disabled = false;
      $('#barra-offline').hidden = true;
      pintarOffline();
      toast(fallos > total / 5 ? 'Descarga incompleta. Vuelve a intentarlo con wifi.' : 'Mapa descargado. ¡Listo para la sierra!');
    });
  }

  function pintarOffline() {
    var m = estado.mapaOffline;
    if (!('serviceWorker' in navigator)) {
      $('#texto-offline').textContent = 'Este navegador no permite guardar el mapa. Instala la app o usa Google Maps sin conexión.';
      return;
    }
    if (m) {
      $('#texto-offline').textContent = 'Mapa descargado el ' + new Date(m.fecha).toLocaleDateString('es-ES') + ' a las ' + hora(m.fecha) + '. Puedes volver a descargarlo si cambia la ruta.';
      $('#boton-offline').textContent = 'Volver a descargar';
    }
  }

  /* ------------------------------------------------------------------
     PANTALLAS
     ------------------------------------------------------------------ */
  var pantallaActual = 'inicio';
  function ir(nombre) {
    if (['inicio', 'ruta', 'carnet', 'info'].indexOf(nombre) < 0) nombre = 'inicio';
    pantallaActual = nombre;
    $$('.pantalla').forEach(function (s) { s.hidden = s.id !== 'pantalla-' + nombre; });
    $$('.menu button').forEach(function (b) { b.classList.toggle('activo', b.getAttribute('data-ir') === nombre); });
    if (location.hash !== '#' + nombre) history.replaceState(null, '', '#' + nombre);
    document.querySelector('main').scrollTop = 0;
    pintarTodo();
    if (nombre === 'ruta' && mapa) setTimeout(function () { mapa.invalidateSize(); }, 50);
  }

  function pintarInicio() {
    var p = estado.participante;
    $('#bloque-registro').hidden = !!p;
    $('#bloque-bienvenida').hidden = !p;
    if (!p) return;
    var n = numSellos();
    $('#hola').textContent = '¡Hola, ' + p.nombre.split(' ')[0] + '! · Dorsal ' + p.dorsal;
    $('#progreso-num').textContent = n + '/' + TOTAL;
    var circ = 2 * Math.PI * 52;
    var anillo = $('#anillo-valor');
    anillo.style.strokeDasharray = circ;
    anillo.style.strokeDashoffset = circ * (1 - n / TOTAL);
    var desbloq = rutaDesbloqueada();
    $('#bloque-cuenta-atras').hidden = desbloq;
    $('#estado-inicio').textContent = !desbloq ? 'La ruta todavía es sorpresa'
      : completado() ? '¡Desafío completado! Rumbo a ' + C.evento.lugarFinal
      : 'Siguiente: ' + destinoActual().nombre;
    $('#boton-ir-ruta').textContent = completado() ? 'Ver ruta a meta' : 'Ver la ruta';
    pintarOffline();
    pintarCola();
  }

  function pintarRuta() {
    var p = estado.participante;
    var desbloq = rutaDesbloqueada();
    $('#ruta-sin-registro').hidden = !!p;
    $('#ruta-bloqueada').hidden = !p || desbloq;
    $('#ruta-activa').hidden = !p || !desbloq;
    if (p && desbloq) {
      iniciarGps();
      pintarMapa();
      pintarPanel();
    }
  }

  var urlsFotos = [];
  function pintarCarnet() {
    var p = estado.participante;
    $('#carnet-nombre').textContent = p ? p.nombre + ' · Dorsal ' + p.dorsal : 'Sin registrar';
    $('#enhorabuena').hidden = !completado();
    if (completado()) $('#enhorabuena').innerHTML = htmlEnhorabuena();

    urlsFotos.forEach(function (u) { URL.revokeObjectURL(u); });
    urlsFotos = [];
    var rejilla = $('#rejilla-sellos');
    rejilla.innerHTML = '';
    C.puntos.forEach(function (pt, i) {
      var s = estado.sellos[pt.id];
      var visible = s || rutaDesbloqueada() && (C.modoRuta === 'completa' || estado.verCompleta || i <= indiceActual());
      var div = document.createElement('div');
      div.className = 'sello' + (s ? '' : ' sello-pendiente');
      div.innerHTML = '<div class="sello-foto"></div><div class="sello-info">' +
        '<div class="sello-num">SELLO ' + (i + 1) + '</div>' +
        '<div class="sello-nombre">' + (visible ? esc(pt.nombre) : '¿? Sorpresa') + '</div>' +
        (s ? '<div class="sello-hora">' + hora(s.hora) + (s.sinGps ? ' · sin GPS' : '') + '</div>' +
          '<div class="sello-estado ' + (s.subido ? 'ok">✓ Enviado' : 'pte">⏳ Pendiente de envío') + '</div>'
          : '<div class="sello-hora">Pendiente</div>') +
        '</div>';
      rejilla.appendChild(div);
      if (s) {
        fotos.leer(pt.id).then(function (dataUrl) {
          if (dataUrl) {
            var f = div.querySelector('.sello-foto');
            f.style.backgroundImage = 'url("' + dataUrl + '")';
          }
        });
      }
    });
  }

  function pintarInfo() {
    $('#info-final').textContent = C.evento.lugarFinal;
    $('#info-telefonos').innerHTML = C.evento.telefonos.map(function (t) {
      return '<a href="tel:+34' + esc(t) + '">📞 ' + esc(t.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')) + '</a>';
    }).join('');
    var p = estado.participante;
    $('#info-participante').textContent = p ? p.nombre + ' · Dorsal ' + p.dorsal + (p.telefono ? ' · ' + p.telefono : '') : 'Sin registrar';
    $('#boton-emergencia').hidden = C.modoRuta === 'completa';
    $('#boton-emergencia').textContent = estado.verCompleta ? 'Ocultar ruta completa' : 'Ver ruta completa (organización)';
    $('#pie-version').textContent = C.evento.club + ' · App v' + VERSION_APP;
  }

  function pintarTodo() {
    $('#aviso-prueba').hidden = !C.modoPrueba;
    pintarCola();
    if (pantallaActual === 'inicio') pintarInicio();
    if (pantallaActual === 'ruta') pintarRuta();
    if (pantallaActual === 'carnet') pintarCarnet();
    if (pantallaActual === 'info') pintarInfo();
  }

  /* ------------------------------------------------------------------
     CUENTA ATRÁS
     ------------------------------------------------------------------ */
  var estabaBloqueada = !rutaDesbloqueada();
  function tickCuentaAtras() {
    var falta = new Date(C.desbloqueoRuta).getTime() - Date.now();
    if (falta <= 0 || C.modoPrueba) {
      if (estabaBloqueada) { estabaBloqueada = false; pintarTodo(); toast('¡La ruta ya está disponible!'); }
      return;
    }
    var d = Math.floor(falta / 86400000), h = Math.floor(falta % 86400000 / 3600000),
      m = Math.floor(falta % 3600000 / 60000), s = Math.floor(falta % 60000 / 1000);
    var t = (d ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    $('#cuenta-atras').textContent = t;
    $('#cuenta-atras-ruta').textContent = t;
  }

  /* ------------------------------------------------------------------
     ACCIONES CON CÓDIGO DE ORGANIZACIÓN
     ------------------------------------------------------------------ */
  function pedirCodigo(titulo, alAcertar) {
    modal('<h2>' + esc(titulo) + '</h2><p>Introduce el código de la organización.</p><input id="campo-codigo" autocomplete="off" autocapitalize="characters">', [
      { texto: 'Aceptar', principal: true, accion: function () {
        var v = ($('#campo-codigo').value || '').trim().toUpperCase();
        if (v !== String(C.codigoOrganizacion).toUpperCase()) { toast('Código incorrecto'); return false; }
        setTimeout(alAcertar, 50);
      } },
      { texto: 'Cancelar' }
    ]);
    setTimeout(function () { var c = $('#campo-codigo'); if (c) c.focus(); }, 100);
  }

  /* ------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------ */
  function registrar(ev) {
    ev.preventDefault();
    var f = ev.target;
    estado.participante = {
      nombre: f.nombre.value.trim().replace(/\s+/g, ' '),
      dorsal: f.dorsal.value.trim().toUpperCase(),
      telefono: f.telefono.value.trim(),
      email: f.email.value.trim(),
      alta: new Date().toISOString(),
      registrado: false
    };
    estado.cola.unshift({ tipo: 'registro' });
    guardar();
    procesarCola();
    pintarTodo();
    toast('¡Bienvenido al desafío!');
  }

  var eventoInstalar = null;

  function iniciar() {
    document.title = C.evento.nombre;
    $('#titulo-evento').textContent = C.evento.nombre;
    $('#subtitulo-evento').textContent = C.evento.subtitulo;
    TOTAL = C.puntos.length;

    $$('[data-ir]').forEach(function (b) { b.addEventListener('click', function () { ir(b.getAttribute('data-ir')); }); });
    $('#form-registro').addEventListener('submit', registrar);
    $('#boton-sellar').addEventListener('click', pulsarSellar);
    $('#boton-sin-gps').addEventListener('click', pulsarSinGps);
    $('#boton-simular').addEventListener('click', pulsarSimular);
    $('#entrada-foto').addEventListener('change', fotoElegida);
    $('#boton-offline').addEventListener('click', descargarMapa);
    $('#boton-reintentar').addEventListener('click', function () {
      if (!navigator.onLine) toast('Sin conexión ahora mismo'); else procesarCola().then(function () { toast(estado.cola.length ? 'Sigue pendiente, se reintentará' : 'Todo enviado ✓'); });
    });
    $('#boton-centrar').addEventListener('click', function () {
      var pos = posicionReciente();
      if (pos && mapa) mapa.setView([pos.lat, pos.lng], Math.max(mapa.getZoom(), 14)); else toast(errorGps || 'Buscando señal GPS…');
    });
    $('#boton-tramo').addEventListener('click', encuadrarTramo);
    $('#boton-emergencia').addEventListener('click', function () {
      if (estado.verCompleta) { estado.verCompleta = false; guardar(); encuadrado = false; pintarTodo(); return; }
      pedirCodigo('Ruta completa', function () {
        estado.verCompleta = true; guardar(); encuadrado = false;
        ir('ruta');
        if (mapa) { var b = L.latLngBounds([]); for (var t = 0; t <= TOTAL; t++) b.extend(L.latLngBounds(lineaTramo(t))); mapa.fitBounds(b, { padding: [30, 30] }); }
      });
    });
    $('#boton-borrar').addEventListener('click', function () {
      pedirCodigo('Borrar datos', function () {
        fotos.borrarTodo().then(function () {
          estado = estadoNuevo(); guardar(); location.hash = '#inicio'; location.reload();
        });
      });
    });
    $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') $('#modal').hidden = true; });

    window.addEventListener('hashchange', function () {
      var h = (location.hash || '#inicio').slice(1);
      if (h !== pantallaActual) ir(h);
    });
    window.addEventListener('online', function () { procesarCola(); });
    window.addEventListener('offline', pintarCola);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { procesarCola(); pintarTodo(); } });
    setInterval(function () { if (estado.cola.length) procesarCola(); }, 60000);
    setInterval(tickCuentaAtras, 1000);
    tickCuentaAtras();

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); eventoInstalar = e; $('#boton-instalar').hidden = false;
    });
    $('#boton-instalar').addEventListener('click', function () {
      if (!eventoInstalar) return;
      eventoInstalar.prompt();
      eventoInstalar = null; $('#boton-instalar').hidden = true;
    });
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('#bloque-instalar').hidden = true;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Service worker', e); });
    }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

    cargarTrazado().then(function () {
      ir((location.hash || '#inicio').slice(1));
      procesarCola();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
