/* =========================================================================
   App del Motorclub Sierra Las Villas
   Menú: Raid 2027 (Inscripción · Ruta · Información) · Club · Contacto
   Normalmente no hace falta tocar este archivo: los datos están en config.js
   ========================================================================= */
(function () {
  'use strict';

  var C = window.CONFIG;
  var R = C.ruta;
  var VERSION_APP = '2.3.0';
  var CLAVE = 'mcslv_estado_v2';
  var TOTAL = R.puntos.length;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function euros(n) { return n + ' €'; }
  /* DNI / NIE: normaliza y comprueba la letra de control */
  function normalizarDni(t) { return String(t || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
  function dniValido(t) {
    var d = normalizarDni(t);
    if (!/^[XYZ]?\d{7,8}[A-Z]$/.test(d)) return false;
    var num = d.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2').slice(0, -1);
    return 'TRWAGMYFPDXBNJZSQVHLCKE'.charAt(parseInt(num, 10) % 23) === d.slice(-1);
  }
  function telBonito(t) { return String(t).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'); }

  /* ------------------------------------------------------------------
     ESTADO GUARDADO EN EL MÓVIL
     ------------------------------------------------------------------ */
  function estadoNuevo() {
    return { inscripciones: [], participante: null, sellos: {}, cola: [], verCompleta: false, mapaOffline: null };
  }
  function cargarEstado() {
    try {
      var e = JSON.parse(localStorage.getItem(CLAVE));
      if (e && typeof e === 'object') {
        var b = estadoNuevo();
        for (var k in b) if (!(k in e)) e[k] = b[k];
        return e;
      }
    } catch (err) { /* sin almacenamiento */ }
    return estadoNuevo();
  }
  var estado = cargarEstado();
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (err) { console.warn('No se pudo guardar', err); }
  }

  /* Fotos en IndexedDB */
  var fotos = (function () {
    var p = null;
    function abrir() {
      if (!p) p = new Promise(function (ok, mal) {
        var r = indexedDB.open('mcslv_fotos', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('fotos'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { mal(r.error); };
      });
      return p;
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
      guardar: function (id, d) { return op('readwrite', function (s) { s.put(d, id); }); },
      leer: function (id) { return op('readonly', function (s) { return s.get(id); }); },
      borrarTodo: function () { return op('readwrite', function (s) { s.clear(); }); }
    };
  })();

  /* ------------------------------------------------------------------
     UTILIDADES DE INTERFAZ
     ------------------------------------------------------------------ */
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
  function pedirCodigo(titulo, alAcertar) {
    modal('<h2>' + esc(titulo) + '</h2><p>Introduce el código de la organización.</p><input id="campo-codigo" autocomplete="off" autocapitalize="characters">', [
      { texto: 'Aceptar', principal: true, accion: function () {
        var v = ($('#campo-codigo').value || '').trim().toUpperCase();
        if (v !== String(R.codigoOrganizacion).toUpperCase()) { toast('Código incorrecto'); return false; }
        setTimeout(alAcertar, 50);
      } },
      { texto: 'Cancelar' }
    ]);
    setTimeout(function () { var c = $('#campo-codigo'); if (c) c.focus(); }, 100);
  }
  function pintarCuentaAtras(el, fechaIso) {
    var falta = new Date(fechaIso).getTime() - Date.now();
    if (!el) return falta;
    if (falta <= 0) { el.innerHTML = ''; return falta; }
    var d = Math.floor(falta / 864e5), h = Math.floor(falta % 864e5 / 36e5), m = Math.floor(falta % 36e5 / 6e4), s = Math.floor(falta % 6e4 / 1e3);
    function celda(v, t) { return '<div class="celda"><b>' + String(v).padStart(2, '0') + '</b><small>' + t + '</small></div>'; }
    el.innerHTML = celda(d, 'días') + celda(h, 'horas') + celda(m, 'min') + celda(s, 'seg');
    return falta;
  }

  /* ------------------------------------------------------------------
     NAVEGACIÓN ENTRE PANTALLAS
     ------------------------------------------------------------------ */
  var PANTALLAS = {
    inicio: { titulo: '', padre: null },
    raid: { titulo: 'Raid 2027', padre: 'inicio' },
    inscripcion: { titulo: 'Inscripción', padre: 'raid' },
    ruta: { titulo: 'Ruta', padre: 'raid' },
    carnet: { titulo: 'Carnet fotográfico', padre: 'ruta' },
    puntos: { titulo: 'Puntos de ruta', padre: 'ruta' },
    ayuda: { titulo: 'Ayuda', padre: 'ruta' },
    evento: { titulo: 'Información del evento', padre: 'raid' },
    club: { titulo: 'El club', padre: 'inicio' },
    socio: { titulo: 'Socio', padre: 'inicio' },
    contacto: { titulo: 'Contacto', padre: 'inicio' }
  };
  var actual = 'inicio';

  function ir(nombre, sinHistorial) {
    if (!PANTALLAS[nombre]) nombre = 'inicio';
    actual = nombre;
    $$('.pantalla').forEach(function (s) { s.hidden = s.id !== 'p-' + nombre; });
    $('#barra').hidden = nombre === 'inicio';
    $('#barra-titulo').textContent = PANTALLAS[nombre].titulo;
    if (!sinHistorial && location.hash !== '#' + nombre) history.pushState(null, '', '#' + nombre);
    window.scrollTo(0, 0);
    pintar();
  }
  function atras() {
    var padre = PANTALLAS[actual].padre || 'inicio';
    ir(padre);
  }

  function pintar() {
    $('#aviso-prueba').hidden = !C.modoPrueba;
    if (actual === 'inicio') pintarInicio();
    if (actual === 'raid') pintarRaid();
    if (actual === 'inscripcion') pintarInscripcion();
    if (actual === 'ruta') pintarRuta();
    if (actual === 'carnet') pintarCarnet();
    if (actual === 'puntos') pintarPuntos();
    if (actual === 'ayuda') pintarAyuda();
    if (actual === 'evento') pintarEvento();
    if (actual === 'club') pintarClub();
    if (actual === 'socio') pintarSocio();
    if (actual === 'contacto') pintarContacto();
  }

  /* ------------------------------------------------------------------
     INICIO, RAID, EVENTO, CLUB, CONTACTO
     ------------------------------------------------------------------ */
  function pintarInicio() {
    $('#lema').textContent = C.club.lema;
    var falta = new Date(C.evento.fechaSalida).getTime() - Date.now();
    $('#inicio-cuenta').textContent = falta > 0 ? 'Faltan ' + Math.ceil(falta / 864e5) + ' días · ' + C.evento.reto : C.evento.reto;
    $('#pie-inicio').textContent = C.club.nombre + ' · ' + C.club.localidad + ' · v' + VERSION_APP;
  }

  function ultimaInscripcion() { return estado.inscripciones[estado.inscripciones.length - 1] || null; }

  function pintarRaid() {
    $('#raid-nombre').textContent = C.evento.nombre;
    $('#raid-reto').textContent = C.evento.reto;
    $('#raid-fechas').textContent = C.evento.fechas;
    pintarCuentaAtras($('#raid-cuenta'), C.evento.fechaSalida);
    var ins = ultimaInscripcion();
    $('#raid-estado-inscripcion').textContent = ins ? 'Inscrito · ' + referencia(ins) : 'Registro y pago';
    var n = numSellos();
    $('#raid-estado-ruta').textContent = !rutaDesbloqueada() ? 'Se desbloquea 24 h antes' : (n ? n + ' de ' + TOTAL + ' sellos' : 'Mapa y carnet de sellado');
  }

  function pintarEvento() {
    var E = C.evento, I = C.inscripcion;
    $('#ev-fechas').textContent = E.fechas;
    $('#ev-nombre').textContent = E.nombre;
    $('#ev-reto').textContent = E.reto;
    $('#ev-resumen').textContent = E.resumen;
    $('#ev-programa').innerHTML = E.programa.map(function (p) {
      return '<div class="fila"><div class="cuando">' + esc(p.dia) + '<small>' + esc(p.hora) + '</small></div>' +
        '<div class="que"><b>' + esc(p.titulo) + '</b><span>' + esc(p.texto) + '</span></div></div>';
    }).join('');
    $('#ev-precios').innerHTML = '<div class="precio"><b>' + euros(I.precioPiloto) + '</b><span>Piloto</span></div>' +
      '<div class="precio"><b>' + euros(I.precioAcompanante) + '</b><span>Acompañante</span></div>';
    $('#ev-incluye').innerHTML = E.incluye.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('#ev-salida').textContent = E.lugarSalida;
    $('#ev-llegada').textContent = E.lugarFinal;
    $('#ev-avisos').innerHTML = E.avisos.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('#ev-bloque-sorteo').hidden = !E.sorteo;
    $('#ev-sorteo').textContent = E.sorteo || '';
    $('#ev-bloque-video').hidden = !E.video;
    $('#ev-video').href = E.video || '#';
    $('#ev-bloque-alojamiento').hidden = !E.alojamiento;
    $('#ev-alojamiento').href = E.alojamiento || '#';
    $('#ev-bloque-patrocinadores').hidden = !(E.patrocinadores && E.patrocinadores.length);
    $('#ev-patrocinadores').innerHTML = (E.patrocinadores || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  }

  function pintarClub() {
    $('#club-lema').textContent = C.club.lema;
    $('#club-presentacion').innerHTML = '<h3>Quiénes somos</h3>' + C.club.presentacion.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    $('#club-actividades').innerHTML = C.club.actividades.map(function (a) {
      return '<div class="actividad"><b>' + esc(a.nombre) + '</b><div class="suave">' + esc(a.texto) + '</div></div>';
    }).join('');
  }

  function htmlTelefonos() {
    return C.contacto.telefonos.map(function (t) {
      return '<a href="tel:+34' + esc(t.numero) + '"><span>' + esc(t.nombre) + '</span><b>' + esc(telBonito(t.numero)) + '</b></a>';
    }).join('');
  }
  function htmlBotonesContacto() {
    var K = C.contacto;
    var b = [];
    if (K.whatsapp) b.push('<a class="boton boton-whatsapp" target="_blank" rel="noopener" href="https://wa.me/34' + esc(K.whatsapp) + '">WhatsApp</a>');
    if (K.instagram) b.push('<a class="boton boton-instagram" target="_blank" rel="noopener" href="https://www.instagram.com/' + esc(K.instagram) + '/">Instagram</a>');
    if (K.facebook) b.push('<a class="boton boton-facebook" target="_blank" rel="noopener" href="' + esc(K.facebook) + '">Facebook</a>');
    if (K.email) b.push('<a class="boton" href="mailto:' + esc(K.email) + '">Correo</a>');
    if (K.mapa) b.push('<a class="boton" target="_blank" rel="noopener" href="' + esc(K.mapa) + '">Cómo llegar</a>');
    return b.join('');
  }
  function pintarContacto() {
    $('#ct-telefonos').innerHTML = htmlTelefonos();
    $('#ct-botones').innerHTML = htmlBotonesContacto();
    $('#ct-bloque-instalar').hidden = esApp();
  }
  function pintarSocio() {
    var S = C.socio;
    $('#socio-portada').src = S.portada;
    $('#socio-portada').hidden = !S.portada;
    $('#socio-titulo').textContent = S.tituloRutas;
    var cont = $('#socio-rutas');
    if (!cont.childElementCount) {
      cont.innerHTML = S.rutas.map(function (r) {
        return '<article class="ruta-socio"><div class="ruta-fecha"><span>' + esc(r.fecha) + '</span></div>' +
          '<img class="ruta-cartel" loading="lazy" decoding="async"' + (r.ancho ? ' width="' + r.ancho + '" height="' + r.alto + '"' : '') + ' src="' + esc(r.cartel) + '" alt="' + esc(r.nombre || ('Ruta del ' + r.fecha)) + '"></article>';
      }).join('');
    }
    $('#socio-texto').innerHTML = S.hazteSocio.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    $('#socio-telefonos').innerHTML = htmlTelefonos();
    $('#socio-botones').innerHTML = htmlBotonesContacto();
  }
  function esApp() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

  /* ------------------------------------------------------------------
     INSCRIPCIÓN Y PAGO
     Flujo: formulario → servidor (guarda la solicitud y crea el pago)
            → pasarela (tarjeta, Apple Pay, Google Pay, Bizum)
            → vuelta a la app → comprobación → inscripción válida con Nº
     ------------------------------------------------------------------ */
  var I = C.inscripcion;
  function referencia(ins) {
    if (ins.estado === 'pagada' && ins.numero) return 'Nº ' + String(ins.numero).padStart(3, '0');
    return 'pendiente de pago';
  }
  function concepto(ins) { return 'RAID27 ' + ins.apellidos.split(' ')[0].toUpperCase() + ' ' + ins.dni.slice(-4); }

  /* Importe: se recalcula en el servidor, esto es solo para mostrarlo */
  function lineasImporte(d) {
    var l = [['Inscripción piloto', I.precioPiloto]];
    if (d.conAcompanante) l.push(['Inscripción acompañante', I.precioAcompanante]);
    if (I.cena && I.cena.activa) {
      var n = (d.cenaPiloto ? 1 : 0) + (d.conAcompanante && d.cenaAcomp ? 1 : 0);
      if (n) l.push(['Gran cena de recepción · ' + n + (n > 1 ? ' personas' : ' persona'), n * I.cena.precio]);
    }
    return l;
  }
  function totalLineas(l) { return l.reduce(function (t, x) { return t + x[1]; }, 0); }
  function htmlDesglose(l) {
    return l.map(function (x) { return '<div class="linea"><span>' + esc(x[0]) + '</span><b>' + euros(x[1]) + '</b></div>'; }).join('');
  }
  function datosFormulario() {
    var f = $('#form-inscripcion');
    var con = f.conAcompanante.checked;
    return {
      nombre: f.nombre.value.trim(), apellidos: f.apellidos.value.trim(), dni: normalizarDni(f.dni.value),
      telefono: f.telefono.value.trim(), email: f.email.value.trim(), localidad: f.localidad.value.trim(),
      moto: f.moto.value.trim(), talla: f.talla.value,
      conAcompanante: con,
      acompNombre: con ? f.acompNombre.value.trim() : '', acompDni: con ? normalizarDni(f.acompDni.value) : '', acompTalla: con ? f.acompTalla.value : '',
      cenaPiloto: !!(I.cena && I.cena.activa && f.cenaPiloto.checked),
      cenaAcomp: !!(I.cena && I.cena.activa && con && f.cenaAcomp.checked)
    };
  }

  var mostrarFormulario = false;
  function pintarInscripcion() {
    var ins = ultimaInscripcion();
    var verForm = I.abierta && (!ins || mostrarFormulario);
    $('#insc-cerrada').hidden = I.abierta || !!ins;
    $('#form-inscripcion').hidden = !verForm;
    $('#insc-hecha').hidden = verForm || !ins;
    if (verForm) {
      $('#insc-intro').textContent = C.evento.nombre + ' · ' + C.evento.fechas + '. Piloto ' + euros(I.precioPiloto) + ', acompañante ' + euros(I.precioAcompanante) + '.';
      $$('.precio-acomp').forEach(function (e) { e.textContent = euros(I.precioAcompanante); });
      $('#bloque-cena').hidden = !(I.cena && I.cena.activa);
      if (I.cena) { $('#cena-texto').innerHTML = I.cena.texto; $$('.precio-cena').forEach(function (e) { e.textContent = euros(I.cena.precio); }); }
      var cond = $('#texto-condiciones');
      if (!cond.childElementCount) cond.innerHTML = '<h4>Condiciones de participación y exención de responsabilidad</h4>' +
        I.condiciones.map(function (c) { return '<h4>' + esc(c[0]) + '</h4><p>' + esc(c[1]) + '</p>'; }).join('');
      $('#texto-datos').textContent = I.textoDatos;
      $('#texto-metodos').textContent = I.metodos;
      actualizarTotal();
    } else if (ins) {
      pintarInscripcionHecha(ins);
    }
  }
  function actualizarTotal() {
    var con = $('#con-acompanante').checked;
    $('#bloque-acompanante').hidden = !con;
    $('#fila-cena-acomp').hidden = !con;
    var l = lineasImporte(datosFormulario());
    $('#insc-desglose').innerHTML = htmlDesglose(l);
    $('#insc-total').textContent = euros(totalLineas(l));
  }

  function pintarInscripcionHecha(ins) {
    var pagada = ins.estado === 'pagada';
    var t = $('#insc-tarjeta-estado');
    t.className = 'tarjeta ' + (pagada ? 'tarjeta-ok' : 'tarjeta-pendiente');
    $('#insc-etiqueta').textContent = pagada ? 'Inscripción confirmada' : 'Inscripción pendiente de pago';
    $('#insc-numero').textContent = pagada ? 'Nº ' + String(ins.numero).padStart(3, '0') : euros(ins.total);
    $('#insc-resumen').innerHTML = '<p><b>' + esc(ins.nombre + ' ' + ins.apellidos) + '</b> · ' + esc(ins.moto || '') +
      (ins.conAcompanante ? '<br>Acompañante: ' + esc(ins.acompNombre) : '') +
      ((ins.cenaPiloto || ins.cenaAcomp) ? '<br>Cena de recepción: ' + ((ins.cenaPiloto ? 1 : 0) + (ins.cenaAcomp ? 1 : 0)) + ' persona(s)' : '') + '</p>' +
      '<span class="estado-chip ' + (pagada ? 'pagada">Pagada ✓' : 'pendiente">Pendiente de pago') + '</span>';
    $('#insc-estado-envio').textContent = pagada ? 'Ya puedes entrar en la Ruta con tu DNI el día del evento.' :
      (ins.estado === 'sin-enviar' ? 'Aún no se ha podido enviar al club. Necesitas conexión.' : '');
    $('#bloque-pago').hidden = pagada;
    $('#boton-ir-ruta-insc').hidden = !pagada;
    if (pagada) return;
    $('#pago-desglose').innerHTML = htmlDesglose(lineasImporte(ins));
    $('#pago-total').textContent = euros(ins.total);
    var hayPasarela = !!ins.urlPago;
    $('#boton-pagar').hidden = !hayPasarela && ins.estado !== 'sin-enviar';
    $('#boton-pagar').textContent = ins.estado === 'sin-enviar' ? 'Enviar inscripción y pagar' : 'Pagar ' + euros(ins.total);
    $('#pago-metodos').textContent = hayPasarela ? I.metodos : '';
    var manual = [];
    if (!hayPasarela && ins.estado === 'pendiente') {
      if (I.bizum) manual.push('<div class="dato-pago">Bizum al <b>' + esc(telBonito(I.bizum)) + '</b></div>');
      if (I.iban) manual.push('<div class="dato-pago">Transferencia a <b>' + esc(I.iban) + '</b><br>Titular: ' + esc(I.titular) + '</div>');
      manual.push(manual.length ? '<p class="suave">Concepto: <b>' + esc(concepto(ins)) + '</b>. El club confirmará tu inscripción al recibir el pago.</p>'
        : '<p class="suave">El club te indicará cómo pagar. Tu solicitud está guardada.</p>');
    }
    $('#pago-manual').hidden = !manual.length;
    $('#pago-manual').innerHTML = manual.join('');
    $('#boton-comprobar-pago').hidden = ins.estado === 'sin-enviar';
  }

  function llamarServidor(datos) {
    return fetch(C.urlServidor, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'Error del servidor'); return res; });
  }

  function errorInscripcion(t) { var e = $('#insc-error'); e.textContent = t || ''; e.hidden = !t; if (t) e.scrollIntoView({ block: 'center' }); }

  function enviarInscripcion(ev) {
    ev.preventDefault();
    var f = ev.target, d = datosFormulario();
    errorInscripcion('');
    var faltan = ['nombre', 'apellidos', 'telefono', 'email', 'moto'].filter(function (k) { return !f[k].value.trim(); });
    if (faltan.length) { errorInscripcion('Rellena todos los datos del piloto.'); return; }
    if (!f.talla.value) { errorInscripcion('Elige la talla de camiseta del piloto.'); return; }
    if (!f.email.checkValidity()) { errorInscripcion('El correo electrónico no es correcto.'); return; }
    if (!dniValido(d.dni)) { errorInscripcion('El DNI/NIE del piloto no es correcto. Revisa números y letra.'); return; }
    if (d.conAcompanante) {
      if (!d.acompNombre) { errorInscripcion('Escribe el nombre del acompañante.'); return; }
      if (!dniValido(d.acompDni)) { errorInscripcion('El DNI/NIE del acompañante no es correcto.'); return; }
      if (d.acompDni === d.dni) { errorInscripcion('El DNI del acompañante no puede ser el mismo que el del piloto.'); return; }
    }
    if (!f.acepta.checked) { errorInscripcion('Tienes que aceptar las condiciones de participación y responsabilidad.'); return; }
    if (!f.aceptaDatos.checked) { errorInscripcion('Tienes que aceptar el tratamiento de datos.'); return; }
    if (estado.inscripciones.some(function (x) { return x.dni === d.dni && x.estado === 'pagada'; })) { errorInscripcion('Ese DNI ya tiene una inscripción pagada.'); return; }

    var ins = d;
    ins.id = 'I' + Date.now();
    ins.fecha = new Date().toISOString();
    ins.aceptaCondiciones = new Date().toISOString();
    ins.total = totalLineas(lineasImporte(d));
    ins.estado = 'sin-enviar';
    ins.numero = null; ins.idSolicitud = null; ins.urlPago = null;
    // sustituye una solicitud anterior sin pagar del mismo DNI
    estado.inscripciones = estado.inscripciones.filter(function (x) { return !(x.dni === d.dni && x.estado !== 'pagada'); });
    estado.inscripciones.push(ins);
    guardar();
    mostrarFormulario = false;
    enviarSolicitud(ins, true);
  }

  /* Envía la solicitud al club y, si hay pasarela, abre el pago */
  function enviarSolicitud(ins, irAPagar) {
    if (!C.urlServidor) {
      ins.estado = 'pendiente'; guardar(); pintarInscripcion(); window.scrollTo(0, 0);
      if (C.modoPrueba) toast('Modo prueba: servidor sin configurar');
      return;
    }
    if (!navigator.onLine) { pintarInscripcion(); toast('Necesitas conexión para enviar la inscripción'); return; }
    var b = $('#boton-inscribir'); b.disabled = true; b.textContent = 'Enviando…';
    var datos = JSON.parse(JSON.stringify(ins));
    datos.accion = 'inscripcion'; datos.idLocal = ins.id; datos.urlApp = location.origin + location.pathname;
    llamarServidor(datos).then(function (res) {
      ins.estado = res.estado === 'pagada' ? 'pagada' : 'pendiente';
      ins.idSolicitud = res.idSolicitud; ins.urlPago = res.urlPago || null; ins.total = res.total || ins.total;
      if (res.numero) ins.numero = res.numero;
      guardar(); pintarInscripcion(); window.scrollTo(0, 0);
      if (irAPagar && ins.urlPago && ins.estado !== 'pagada') location.href = ins.urlPago;
    }).catch(function (e) {
      pintarInscripcion(); toast(e.message || 'No se pudo enviar. Inténtalo de nuevo.', 5000);
    }).then(function () { b.disabled = false; b.textContent = 'Continuar al pago'; });
  }

  function pagarAhora() {
    var ins = ultimaInscripcion(); if (!ins) return;
    if (ins.estado === 'sin-enviar' || !ins.urlPago) { enviarSolicitud(ins, true); return; }
    // el enlace de pago caduca: pedimos uno nuevo al servidor
    enviarSolicitud(ins, true);
  }

  function comprobarPago(ins, silencioso) {
    if (!ins || !ins.idSolicitud || !C.urlServidor) return Promise.resolve();
    if (!silencioso) toast('Comprobando el pago…', 6000);
    return llamarServidor({ accion: 'estadoPago', idSolicitud: ins.idSolicitud }).then(function (res) {
      if (res.estado === 'pagada') {
        ins.estado = 'pagada'; ins.numero = res.numero; guardar(); pintarInscripcion();
        $('#toast').hidden = true;
        modal('<h2>¡Inscripción confirmada!</h2><p style="font-size:20px">Nº <b>' + String(res.numero).padStart(3, '0') + '</b></p><p>Nos vemos en el ' + esc(C.evento.nombre) + '. Con tu DNI podrás entrar en la Ruta.</p>');
      } else if (!silencioso) {
        toast('Todavía no consta el pago. Si acabas de pagar, espera un minuto.', 5000);
      }
    }).catch(function () { if (!silencioso) toast('No se pudo comprobar ahora mismo'); });
  }

  /* Vuelta desde la pasarela de pago */
  function volverDePago() {
    var q = new URLSearchParams(location.search);
    var pago = q.get('pago');
    if (!pago) return;
    history.replaceState(null, '', location.pathname + '#inscripcion');
    ir('inscripcion', true);
    var ins = ultimaInscripcion();
    if (pago === 'ok') comprobarPago(ins, false);
    else toast('Pago cancelado. Puedes volver a intentarlo cuando quieras.', 5000);
  }

  /* ------------------------------------------------------------------
     RUTA: acceso con DNI, menú del participante, carnet fotográfico
     y puntos de ruta (se van desvelando al sellar cada foto)
     ------------------------------------------------------------------ */
  function distancia(a, b) {
    var Rt = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * Rt * Math.asin(Math.sqrt(h));
  }
  function textoDistancia(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km'; }
  function hora(iso) { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  function dorsalTexto(n) { return /^\d+$/.test(String(n)) ? String(n).padStart(3, '0') : String(n); }

  function esDemo() { return !!(estado.participante && estado.participante.demo); }
  function numSellos() { return R.puntos.filter(function (p) { return estado.sellos[p.id]; }).length; }
  function indiceActual() { var i = 0; while (i < TOTAL && estado.sellos[R.puntos[i].id]) i++; return i; }
  function completado() { return indiceActual() >= TOTAL; }
  function destinoActual() { var i = indiceActual(); return i < TOTAL ? R.puntos[i] : R.llegada; }
  function rutaDesbloqueada() { return C.modoPrueba || esDemo() || Date.now() >= new Date(R.desbloqueo).getTime(); }
  function paradas() { return [R.salida].concat(R.puntos, [R.llegada]); }
  function ultimoTramoVisible() { return (R.modo === 'completa' || estado.verCompleta) ? TOTAL : indiceActual(); }
  function simulacionPermitida() { return C.modoPrueba || esDemo(); }

  /* Enlace de Google Maps de un tramo (0 = salida → punto 1) */
  function enlaceTramo(i) {
    var p = paradas(), a = p[i], b = p[i + 1];
    if (b.enlaceMaps) return b.enlaceMaps;
    var u = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + a.lat + ',' + a.lng + '&destination=' + b.lat + ',' + b.lng;
    if (b.via && b.via.length) u += '&waypoints=' + encodeURIComponent(b.via.map(function (v) { return v[0] + ',' + v[1]; }).join('|'));
    return u;
  }

  /* GPS */
  var posicion = null, errorGps = null, vigilancia = null;
  function iniciarGps() {
    if (vigilancia !== null || !('geolocation' in navigator)) return;
    vigilancia = navigator.geolocation.watchPosition(function (p) {
      posicion = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, t: Date.now() };
      errorGps = null; pintarSellar();
    }, function (e) {
      errorGps = e.code === 1 ? 'Permiso de ubicación denegado' : 'Buscando señal GPS…'; pintarSellar();
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }
  function posicionReciente() { return posicion && (Date.now() - posicion.t) < 120000 ? posicion : null; }

  function puedeSellar() {
    if (completado()) return { si: false };
    if (simulacionPermitida()) return { si: true };
    var pos = posicionReciente();
    if (!pos) return { si: false, motivo: errorGps || 'Buscando señal GPS…' };
    var d = distancia(pos, destinoActual());
    return { si: d <= R.radioSelladoMetros + Math.min(pos.precision, 100), distancia: d };
  }

  /* Guardas: sin participante, a la pantalla de acceso */
  function exigirParticipante() {
    if (estado.participante) return true;
    setTimeout(function () { ir('ruta'); }, 0);
    return false;
  }

  /* ---- Menú de la ruta ---- */
  function pintarRuta() {
    var p = estado.participante;
    $('#form-ruta').hidden = !!p;
    $('#ruta-home').hidden = !p;
    if (!p) {
      var ins = ultimaInscripcion(), f = $('#form-ruta');
      if (ins && ins.estado === 'pagada' && !f.dni.value) f.dni.value = ins.dni || '';
      return;
    }
    $('#ficha-nombre').textContent = p.nombre;
    $('#ficha-dni').textContent = 'DNI ' + (p.dni ? p.dni.slice(0, -4).replace(/./g, '•') + p.dni.slice(-4) : '');
    $('#ficha-extra').textContent = [p.moto, p.acompanante ? 'Acompañante: ' + p.acompanante : '', p.telefono].filter(Boolean).join(' · ');
    $('#ficha-dorsal').textContent = dorsalTexto(p.dorsal);
    $('#demo-aviso').hidden = !p.demo;
    $('#ruta-logo').src = R.logo || 'icons/logo.png';
    $('#ruta-reto').textContent = C.evento.reto;
    var n = numSellos();
    $('#home-progreso').style.width = (n / TOTAL * 100) + '%';
    $('#home-progreso-texto').textContent = completado() ? '¡Desafío completado!' : n + ' de ' + TOTAL + ' sellos';
    var desbloq = rutaDesbloqueada();
    $('#ruta-bloqueada').hidden = desbloq;
    if (!desbloq) pintarCuentaAtras($('#ruta-cuenta'), R.desbloqueo);
    $$('#ruta-home .menu-grande .boton-menu').forEach(function (b) { b.disabled = !desbloq; });
    $('#home-sub-carnet').textContent = completado() ? 'Completo ✓' : 'Siguiente foto: punto ' + (indiceActual() + 1);
    $('#home-sub-puntos').textContent = completado() ? 'Rumbo a meta' : 'Tramo ' + (indiceActual() + 1) + ' de ' + (TOTAL + 1);
    pintarCola();
  }

  /* ---- Carnet fotográfico ---- */
  function pintarCarnet() {
    if (!exigirParticipante()) return;
    iniciarGps();
    var p = estado.participante, n = numSellos(), act = indiceActual();
    $('#carnet-nombre').textContent = p.nombre + ' · Dorsal ' + dorsalTexto(p.dorsal);
    $('#progreso-valor').style.width = (n / TOTAL * 100) + '%';
    $('#progreso-texto').textContent = n + ' de ' + TOTAL + ' sellos';
    $('#enhorabuena').hidden = !completado();
    if (completado()) $('#enhorabuena').innerHTML = htmlEnhorabuena();
    var rej = $('#rejilla-carnet'); rej.innerHTML = '';
    R.puntos.forEach(function (pt, i) {
      if (i > act && !estado.verCompleta) return; // solo se ven los puntos ya desvelados
      var s = estado.sellos[pt.id];
      var el = document.createElement(s ? 'div' : 'button');
      el.className = 'casilla-foto ' + (s ? 'hecha' : (i === act ? 'siguiente' : ''));
      el.innerHTML = '<span class="casilla-num">' + (i + 1) + '</span>' +
        (s ? '<span class="casilla-pie"><b>' + esc(pt.nombre) + '</b>' + hora(s.hora) + (s.subido ? ' · ✓ enviado' : (esDemo() ? ' · demo' : ' · ⏳ pendiente')) + '</span>'
           : '<span class="camara">📷</span><span class="casilla-pie"><b>' + esc(pt.nombre) + '</b><span class="pulsa">Pulsa para sellar</span></span>');
      if (!s && i === act) el.addEventListener('click', pulsarSellar);
      rej.appendChild(el);
      if (s) fotos.leer(pt.id).then(function (u) { if (u) el.style.backgroundImage = 'url("' + u + '")'; });
    });
    pintarSellar();
  }
  function pintarSellar() {
    if (actual !== 'carnet' || !estado.participante) return;
    var fin = completado(), dest = destinoActual(), i = indiceActual();
    $('#bloque-sellar').hidden = fin;
    if (fin) return;
    $('#sellar-etiqueta').textContent = 'Punto ' + (i + 1) + ' de ' + TOTAL;
    $('#sellar-nombre').textContent = dest.nombre;
    $('#sellar-pista').textContent = dest.pista || '';
    var pos = posicionReciente(), el = $('#sellar-distancia'), e = puedeSellar();
    if (pos) {
      var d = distancia(pos, dest), enPunto = d <= R.radioSelladoMetros + Math.min(pos.precision, 100);
      el.textContent = enPunto ? '¡Estás en el punto! Ya puedes sellar' : 'Estás a ' + textoDistancia(d) + ' en línea recta';
      el.classList.toggle('cerca', enPunto);
    } else { el.textContent = errorGps || 'Buscando señal GPS…'; el.classList.remove('cerca'); }
    $('#boton-sellar').disabled = !e.si;
    $('#boton-simular').hidden = !simulacionPermitida();
  }

  /* ---- Puntos de ruta ---- */
  function pintarPuntos() {
    if (!exigirParticipante()) return;
    var p = paradas(), act = indiceActual(), hasta = ultimoTramoVisible(), html = [];
    for (var i = 0; i <= hasta && i <= TOTAL; i++) {
      var dest = p[i + 1], meta = i === TOTAL, hecho = !meta && estado.sellos[dest.id];
      html.push('<a class="punto' + (hecho ? ' hecho' : '') + (meta ? ' meta' : '') + '" href="' + esc(enlaceTramo(i)) + '" target="_blank" rel="noopener">' +
        '<span class="punto-num">' + (meta ? '🏁' : (i + 1)) + '</span><span>' +
        '<span class="punto-tramo">Tramo ' + (i + 1) + ' · ' + esc(p[i].nombre) + ' →</span>' +
        '<span class="punto-nombre" style="display:block">' + esc(dest.nombre) + '</span>' +
        '<span class="punto-info" style="display:block">' + esc(dest.lugar || (meta ? 'Llegada y entrega de diplomas' : '')) +
        (hecho ? ' · ✓ sellado a las ' + hora(estado.sellos[dest.id].hora) : (i === act ? ' · siguiente' : '')) + '</span>' +
        '<span class="punto-abrir">Abrir en Google Maps ↗</span></span></a>');
    }
    var ocultos = TOTAL - Math.min(hasta, TOTAL);
    if (ocultos > 0) html.push('<div class="punto-oculto">🔒 ' + ocultos + ' tramo' + (ocultos > 1 ? 's' : '') + ' más por desvelar · sella la foto del punto ' + (act + 1) + '</div>');
    $('#lista-puntos').innerHTML = html.join('');
  }

  function pintarAyuda() {
    $('#ayuda-final').textContent = C.evento.lugarFinal;
    $('#ayuda-telefonos').innerHTML = htmlTelefonos();
    $('#boton-emergencia').hidden = R.modo === 'completa';
    $('#boton-emergencia').textContent = estado.verCompleta ? 'Ocultar ruta completa' : 'Ver ruta completa (organización)';
  }

  /* ---- Sellado ---- */
  var selloPendiente = null;
  function prepararSello(sinGps, simulado) {
    var pos = posicionReciente(), dest = destinoActual();
    selloPendiente = {
      punto: dest, lat: pos ? pos.lat : null, lng: pos ? pos.lng : null,
      precision: pos ? Math.round(pos.precision) : null, distancia: pos ? Math.round(distancia(pos, dest)) : null,
      sinGps: sinGps || !pos, simulado: !!simulado
    };
    var entrada = $('#entrada-foto'); entrada.value = ''; entrada.click();
  }
  function pulsarSellar() {
    var e = puedeSellar();
    if (!e.si) { toast(e.distancia ? 'Aún estás a ' + textoDistancia(e.distancia) + ' del punto' : (e.motivo || 'Sin GPS')); return; }
    prepararSello(false, simulacionPermitida() && !posicionReciente());
  }
  function pulsarSinGps() {
    modal('<h2>¿Problemas con el GPS?</h2><p>Si estás en el punto y el móvil no lo detecta, puedes sellar igualmente. La organización revisará la foto.</p>', [
      { texto: 'Sellar igualmente', principal: true, accion: function () { prepararSello(true, false); } },
      { texto: 'Cancelar' }
    ]);
  }
  function pulsarSimular() {
    var d = destinoActual();
    posicion = { lat: d.lat + 0.0005, lng: d.lng + 0.0005, precision: 15, t: Date.now() };
    pintarSellar(); prepararSello(false, true);
  }
  function comprimirFoto(archivo, lado, calidad) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () {
        var k = Math.min(1, lado / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la foto')); };
      img.src = url;
    });
  }
  function fotoElegida(ev) {
    var archivo = ev.target.files && ev.target.files[0], datos = selloPendiente;
    selloPendiente = null;
    if (!archivo || !datos) return;
    toast('Guardando sello…', 8000);
    comprimirFoto(archivo, 1280, 0.75).then(function (dataUrl) {
      var p = datos.punto;
      return fotos.guardar(p.id, dataUrl).then(function () {
        estado.sellos[p.id] = { hora: new Date().toISOString(), lat: datos.lat, lng: datos.lng, precision: datos.precision, distancia: datos.distancia, sinGps: datos.sinGps, simulado: datos.simulado, subido: false };
        if (!esDemo()) estado.cola.push({ tipo: 'sello', id: p.id });
        guardar(); $('#toast').hidden = true; pintar();
        if (completado()) {
          modal(htmlEnhorabuena(), [{ texto: 'Ver ruta a meta', principal: true, accion: function () { ir('puntos'); } }, { texto: 'Ver mi carnet' }]);
        } else {
          var sig = destinoActual();
          modal('<h2>¡Sello ' + numSellos() + ' de ' + TOTAL + '!</h2><img class="modal-foto" src="' + dataUrl + '" alt=""><p>' + esc(p.nombre) +
            ' conseguido.</p><p>Nuevo punto desbloqueado:<br><b style="font-size:20px">' + esc(sig.nombre) + '</b></p>',
            [{ texto: 'Abrir el tramo en Google Maps', principal: true, accion: function () { window.open(enlaceTramo(indiceActual()), '_blank'); } },
             { texto: 'Ver puntos de ruta', accion: function () { ir('puntos'); } }, { texto: 'Seguir en el carnet' }]);
        }
        procesarCola();
      });
    }).catch(function (err) { modal('<h2>Error</h2><p>No se pudo guardar la foto. Inténtalo otra vez.</p><p class="suave">' + esc(err.message) + '</p>'); });
  }
  function htmlEnhorabuena() {
    var nombre = estado.participante ? estado.participante.nombre.split(' ')[0] : '';
    return '<h2>¡Enhorabuena' + (nombre ? ', ' + esc(nombre) : '') + '!</h2><p style="font-size:18px">Has completado el <b>' + esc(C.evento.reto) + '</b>.</p>' +
      '<p>' + TOTAL + ' de ' + TOTAL + ' sellos. Pon rumbo a <b>' + esc(C.evento.lugarFinal) + '</b>: te esperamos para entregarte tu diploma.</p><p class="suave">Enseña tu carnet al llegar.</p>';
  }

  /* ---- Acceso con DNI ---- */
  function errorAcceso(html) { var e = $('#acceso-error'); e.innerHTML = html; e.hidden = !html; }
  function entrarRuta(datos) {
    estado.participante = {
      nombre: datos.nombre, dorsal: datos.dorsal, dni: datos.dni, telefono: datos.telefono || '',
      moto: datos.moto || '', acompanante: datos.acompanante || '', demo: !!datos.demo, alta: new Date().toISOString()
    };
    if (!datos.demo) estado.cola.push({ tipo: 'registro' });
    guardar(); errorAcceso(''); pintarRuta(); procesarCola();
    toast('¡Bienvenido al desafío, ' + datos.nombre.split(' ')[0] + '!');
  }
  function accesoRuta(ev) {
    ev.preventDefault();
    var dni = normalizarDni(ev.target.dni.value);
    errorAcceso('');
    // Usuario de demostración
    if (R.demo && dni === normalizarDni(R.demo.dni)) {
      var D = R.demo;
      entrarRuta({ nombre: D.nombre + ' ' + D.apellidos, dorsal: D.dorsal, dni: dni, telefono: D.telefono, moto: D.moto, acompanante: D.acompanante, demo: true });
      return;
    }
    if (!dniValido(dni)) { errorAcceso('El DNI/NIE no es correcto. Revisa los números y la letra.'); return; }
    // Inscrito y pagado desde este mismo móvil
    var local = estado.inscripciones.filter(function (x) { return (x.dni === dni || x.acompDni === dni) && x.estado === 'pagada'; })[0];
    if (local) {
      var esA = local.acompDni === dni;
      entrarRuta({ nombre: esA ? local.acompNombre : local.nombre + ' ' + local.apellidos, dorsal: local.numero, dni: dni, telefono: local.telefono, moto: local.moto, acompanante: esA ? '' : local.acompNombre });
      return;
    }
    if (!C.urlServidor) {
      if (C.modoPrueba) { entrarRuta({ nombre: 'Participante de prueba', dorsal: 'PRUEBA', dni: dni }); toast('Modo prueba: acceso sin comprobar'); return; }
      errorAcceso('No se puede comprobar la inscripción ahora mismo. Contacta con la organización.');
      return;
    }
    if (!navigator.onLine) { errorAcceso('Necesitas conexión a internet para comprobar tu inscripción la primera vez.'); return; }
    var b = $('#boton-acceso'); b.disabled = true; b.textContent = 'Comprobando…';
    llamarServidor({ accion: 'acceso', dni: dni }).then(function (res) {
      if (!res.encontrado) {
        errorAcceso('Este DNI no aparece entre las inscripciones pagadas. Si acabas de pagar espera un momento; si no, <b>inscríbete</b> o contacta con el club.');
        return;
      }
      entrarRuta({ nombre: res.nombre, dorsal: res.numero, dni: dni, telefono: res.telefono, moto: res.moto, acompanante: res.acompanante });
    }).catch(function () { errorAcceso('No se ha podido comprobar ahora mismo. Inténtalo de nuevo en unos segundos.'); })
      .then(function () { b.disabled = false; b.textContent = 'Entrar'; });
  }

  /* ------------------------------------------------------------------
     ENVÍO AL SERVIDOR (cola con reintentos)
     ------------------------------------------------------------------ */
  var enviando = false;
  function construirEnvio(item) {
    if (item.tipo === 'inscripcion') return Promise.resolve(null); // las inscripciones ya no van por la cola
    var p = estado.participante || {};
    var base = { accion: item.tipo, nombre: p.nombre, dorsal: p.dorsal, dni: p.dni || '', telefono: p.telefono || '', evento: C.evento.nombre, total: TOTAL };
    if (item.tipo === 'registro') return Promise.resolve(base);
    var idx = -1; R.puntos.forEach(function (pt, k) { if (pt.id === item.id) idx = k; });
    var s = estado.sellos[item.id];
    if (!s || idx < 0) return Promise.resolve(null);
    return fotos.leer(item.id).then(function (u) {
      base.puntoId = item.id; base.puntoNombre = R.puntos[idx].nombre; base.orden = idx + 1;
      base.hora = s.hora; base.lat = s.lat; base.lng = s.lng; base.precision = s.precision; base.distancia = s.distancia;
      base.sinGps = !!s.sinGps; base.simulado = !!s.simulado; base.foto = u ? u.split(',')[1] : '';
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
        return fetch(C.urlServidor, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (!res || !res.ok) throw new Error((res && res.error) || 'Respuesta no válida');
            if (item.tipo === 'sello' && estado.sellos[item.id]) estado.sellos[item.id].subido = true;
            if (item.tipo === 'inscripcion') estado.inscripciones.forEach(function (x) { if (x.id === item.id) { x.enviada = true; if (res.numero) x.numero = res.numero; } });
            estado.cola.shift(); guardar();
            return siguiente();
          });
      });
    }
    return siguiente().catch(function (err) { console.warn('Envío pendiente:', err.message); })
      .then(function () { enviando = false; pintar(); });
  }
  function pintarCola() {
    var n = estado.cola.filter(function (i) { return i.tipo === 'sello'; }).length;
    var b = $('#bloque-cola'); if (!b) return;
    b.hidden = n === 0;
    $('#texto-cola').textContent = !C.urlServidor ? 'Servidor no configurado todavía. Las fotos están guardadas en el móvil.'
      : n + ' foto(s) guardada(s) en el móvil. Se enviarán solas cuando haya cobertura.';
  }

  /* ------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------ */
  var eventoInstalar = null;
  function llenarTallas(sel, conVacio) {
    sel.innerHTML = (conVacio ? '<option value="">Elige talla</option>' : '<option value="" disabled selected>Elige talla</option>') +
      I.tallas.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
  }

  function iniciar() {
    llenarTallas($('[name=talla]'));
    llenarTallas($('[name=acompTalla]'), true);

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-ir]');
      if (el) { e.preventDefault(); ir(el.getAttribute('data-ir')); }
    });
    $('#boton-atras').addEventListener('click', atras);
    window.addEventListener('popstate', function () { ir((location.hash || '#inicio').slice(1), true); });

    $('#form-inscripcion').addEventListener('submit', enviarInscripcion);
    $('#form-inscripcion').addEventListener('change', actualizarTotal);
    $('#boton-pagar').addEventListener('click', pagarAhora);
    $('#boton-comprobar-pago').addEventListener('click', function () { comprobarPago(ultimaInscripcion(), false); });
    $('#boton-nueva-inscripcion').addEventListener('click', function () { mostrarFormulario = true; pintarInscripcion(); window.scrollTo(0, 0); });

    $('#form-ruta').addEventListener('submit', accesoRuta);
    $('#boton-sellar').addEventListener('click', pulsarSellar);
    $('#boton-sin-gps').addEventListener('click', pulsarSinGps);
    $('#boton-simular').addEventListener('click', pulsarSimular);
    $('#entrada-foto').addEventListener('change', fotoElegida);
    $('#boton-reintentar').addEventListener('click', function () {
      if (!navigator.onLine) toast('Sin conexión ahora mismo');
      else procesarCola().then(function () { toast(estado.cola.length ? 'Sigue pendiente, se reintentará' : 'Todo enviado ✓'); });
    });
    $('#boton-emergencia').addEventListener('click', function () {
      if (estado.verCompleta) { estado.verCompleta = false; guardar(); pintarAyuda(); return; }
      pedirCodigo('Ruta completa', function () { estado.verCompleta = true; guardar(); ir('puntos'); });
    });
    function borrarRuta() {
      return fotos.borrarTodo().then(function () {
        estado.participante = null; estado.sellos = {}; estado.verCompleta = false;
        estado.cola = estado.cola.filter(function (i) { return i.tipo === 'inscripcion'; });
        guardar();
      });
    }
    $('#boton-borrar').addEventListener('click', function () {
      pedirCodigo('Borrar datos de la ruta', function () { borrarRuta().then(function () { ir('ruta'); toast('Datos de la ruta borrados'); }); });
    });
    $('#boton-salir').addEventListener('click', function () {
      if (esDemo()) { borrarRuta().then(function () { pintarRuta(); toast('Demostración reiniciada'); }); return; }
      modal('<h2>¿Salir?</h2><p>Para volver a entrar necesitarás tu DNI. Tus fotos se conservan si vuelves a entrar con el mismo DNI en este móvil.</p>', [
        { texto: 'Salir', principal: true, accion: function () { estado.participante = null; guardar(); pintarRuta(); } }, { texto: 'Cancelar' }]);
    });
    $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') $('#modal').hidden = true; });

    window.addEventListener('online', function () { procesarCola(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { procesarCola(); pintar(); } });
    setInterval(function () { if (estado.cola.length) procesarCola(); }, 60000);
    setInterval(function () {
      if (actual === 'raid') pintarCuentaAtras($('#raid-cuenta'), C.evento.fechaSalida);
      if (actual === 'ruta' && estado.participante && !rutaDesbloqueada()) pintarCuentaAtras($('#ruta-cuenta'), R.desbloqueo);
      if (actual === 'ruta' && estado.participante && rutaDesbloqueada() && !$('#ruta-bloqueada').hidden) pintarRuta();
    }, 1000);

    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); eventoInstalar = e; $('#boton-instalar').hidden = false; });
    $('#boton-instalar').addEventListener('click', function () { if (eventoInstalar) { eventoInstalar.prompt(); eventoInstalar = null; $('#boton-instalar').hidden = true; } });

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW', e); });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

    var vieneDePago = !!new URLSearchParams(location.search).get('pago');
    ir((location.hash || '#inicio').slice(1), true);
    volverDePago();
    var pend = ultimaInscripcion();
    if (pend && pend.estado === 'pendiente' && !vieneDePago) comprobarPago(pend, true);
    procesarCola();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
