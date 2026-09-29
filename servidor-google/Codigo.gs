/* =========================================================================
   SERVIDOR DEL DESAFÍO DE LAS PRESAS  (Google Apps Script, gratis)
   Motorclub Sierra Las Villas
   -------------------------------------------------------------------------
   Qué hace:
     - Recibe el registro de cada participante y lo apunta en la hoja
       "Participantes".
     - Recibe cada sello (foto + hora + posición), guarda la foto en Google
       Drive (una carpeta por participante) y lo apunta en la hoja "Sellos".
     - Cuando alguien completa todos los sellos, envía un correo al club.

   Cómo instalarlo: ver GUIA.html, paso 2.
   ========================================================================= */

// ------------------ CONFIGURA ESTO ------------------
var AJUSTES = {
  // Correo(s) del club que reciben el aviso. Varios separados por coma.
  CORREO_CLUB: 'CAMBIA_ESTO@gmail.com',
  NOMBRE_EVENTO: 'Desafío de las Presas 2027',
  CARPETA_FOTOS: 'Desafío de las Presas 2027 - Fotos',
  // Adjuntar las fotos al correo del club (si no, solo van los enlaces)
  ADJUNTAR_FOTOS: true,
  // Enviar también un correo de enhorabuena al participante (si dejó email).
  // Ojo: una cuenta Gmail normal puede enviar unos 100 correos al día.
  CORREO_AL_PARTICIPANTE: false
};
// ----------------------------------------------------

var COLS_PART = ['Dorsal', 'Nombre', 'Teléfono', 'Email', 'Alta', 'Sellos', 'Completado', 'Hora completado', 'Aviso enviado', 'Carpeta de fotos'];
var COLS_SELLO = ['Recibido', 'Dorsal', 'Nombre', 'Orden', 'Punto', 'Hora de la foto', 'Distancia al punto (m)', 'Precisión GPS (m)', 'Sin GPS', 'Simulado (prueba)', 'Foto', 'Ubicación', 'Id punto'];

function doGet() {
  return responder({ ok: true, mensaje: 'Servidor del ' + AJUSTES.NOMBRE_EVENTO + ' funcionando' });
}

function doPost(e) {
  var cerrojo = LockService.getScriptLock();
  cerrojo.waitLock(30000); // evita que dos envíos a la vez se pisen
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d.dorsal || !d.nombre) return responder({ ok: false, error: 'Faltan nombre o dorsal' });
    d.dorsal = String(d.dorsal).trim().toUpperCase();
    if (d.accion === 'registro') return responder(registrar(d));
    if (d.accion === 'sello') return responder(sellar(d));
    return responder({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    console.error(err);
    return responder({ ok: false, error: String(err) });
  } finally {
    cerrojo.releaseLock();
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------ Hojas ------------------
function hoja(nombre, cabeceras) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.appendRow(cabeceras);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, cabeceras.length).setFontWeight('bold').setBackground('#d7261e').setFontColor('#ffffff');
  }
  return h;
}

function filaParticipante(dorsal) {
  var h = hoja('Participantes', COLS_PART);
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).toUpperCase() === dorsal) return { hoja: h, fila: i + 1, valores: datos[i] };
  }
  return { hoja: h, fila: 0, valores: null };
}

function registrar(d) {
  var p = filaParticipante(d.dorsal);
  var valores = [d.dorsal, d.nombre, d.telefono || '', d.email || '', new Date()];
  if (p.fila) {
    p.hoja.getRange(p.fila, 1, 1, 4).setValues([valores.slice(0, 4)]);
  } else {
    p.hoja.appendRow(valores.concat([0, '', '', '', '']));
  }
  return { ok: true };
}

// ------------------ Drive ------------------
function carpeta(padre, nombre) {
  var it = padre ? padre.getFoldersByName(nombre) : DriveApp.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return padre ? padre.createFolder(nombre) : DriveApp.createFolder(nombre);
}

function carpetaParticipante(d) {
  return carpeta(carpeta(null, AJUSTES.CARPETA_FOTOS), d.dorsal + ' - ' + d.nombre);
}

// ------------------ Sellos ------------------
function sellar(d) {
  var hs = hoja('Sellos', COLS_SELLO);
  var datos = hs.getDataRange().getValues();

  // ¿Ya teníamos este sello? (el móvil puede reintentar el envío)
  var hechos = {};
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][1]).toUpperCase() === d.dorsal) hechos[datos[i][12]] = true;
  }
  if (hechos[d.puntoId]) return { ok: true, repetido: true };

  // Guardar la foto en Drive
  var carpetaP = carpetaParticipante(d);
  var enlace = '';
  if (d.foto) {
    var blob = Utilities.newBlob(Utilities.base64Decode(d.foto), 'image/jpeg', d.orden + ' - ' + d.puntoNombre + '.jpg');
    var archivo = carpetaP.createFile(blob);
    enlace = archivo.getUrl();
  }

  var ubic = (d.lat != null && d.lng != null) ? 'https://www.google.com/maps?q=' + d.lat + ',' + d.lng : '';
  hs.appendRow([
    new Date(), d.dorsal, d.nombre, d.orden, d.puntoNombre, d.hora ? new Date(d.hora) : '',
    d.distancia == null ? '' : d.distancia, d.precision == null ? '' : d.precision,
    d.sinGps ? 'SÍ - revisar foto' : '', d.simulado ? 'SÍ' : '',
    enlace, ubic, d.puntoId
  ]);
  hechos[d.puntoId] = true;
  var num = Object.keys(hechos).length;

  // Actualizar la hoja de participantes
  var p = filaParticipante(d.dorsal);
  if (!p.fila) { registrar(d); p = filaParticipante(d.dorsal); }
  p.hoja.getRange(p.fila, 6).setValue(num);
  p.hoja.getRange(p.fila, 10).setValue(carpetaP.getUrl());

  var total = Number(d.total) || 0;
  if (total && num >= total && !p.valores[6]) {
    p.hoja.getRange(p.fila, 7, 1, 2).setValues([['SÍ', new Date()]]);
    p.hoja.getRange(p.fila, 1, 1, COLS_PART.length).setBackground('#d9f7e6');
    var enviado = avisarCompletado(d, carpetaP);
    p.hoja.getRange(p.fila, 9).setValue(enviado ? 'Sí' : 'PENDIENTE (sin cuota de correo)');
  }
  return { ok: true, sellos: num };
}

// ------------------ Correos ------------------
function avisarCompletado(d, carpetaP) {
  if (MailApp.getRemainingDailyQuota() < 2) return false;
  var adjuntos = [];
  var lista = [];
  var archivos = carpetaP.getFiles();
  while (archivos.hasNext()) {
    var f = archivos.next();
    lista.push({ nombre: f.getName(), url: f.getUrl(), f: f });
  }
  lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es', { numeric: true }); });
  if (AJUSTES.ADJUNTAR_FOTOS) lista.forEach(function (x) { adjuntos.push(x.f.getBlob()); });

  var html =
    '<h2 style="color:#d7261e">🏁 ' + limpiar(d.nombre) + ' ha completado el ' + limpiar(AJUSTES.NOMBRE_EVENTO) + '</h2>' +
    '<p><b>Dorsal:</b> ' + limpiar(d.dorsal) + '<br><b>Teléfono:</b> ' + limpiar(d.telefono || '-') +
    '<br><b>Email:</b> ' + limpiar(d.email || '-') + '<br><b>Hora del último sello:</b> ' +
    Utilities.formatDate(new Date(d.hora || new Date()), 'Europe/Madrid', 'dd/MM/yyyy HH:mm') + '</p>' +
    '<p><b>Fotos:</b></p><ol>' + lista.map(function (x) { return '<li><a href="' + x.url + '">' + limpiar(x.nombre) + '</a></li>'; }).join('') + '</ol>' +
    '<p><a href="' + carpetaP.getUrl() + '">Abrir carpeta de fotos en Drive</a></p>' +
    '<p style="color:#888">Revisa en la hoja "Sellos" si algún sello está marcado como "Sin GPS".</p>';

  MailApp.sendEmail({
    to: AJUSTES.CORREO_CLUB,
    subject: '✅ Desafío completado: ' + d.nombre + ' (dorsal ' + d.dorsal + ')',
    htmlBody: html,
    attachments: adjuntos,
    name: AJUSTES.NOMBRE_EVENTO
  });

  if (AJUSTES.CORREO_AL_PARTICIPANTE && d.email && MailApp.getRemainingDailyQuota() > 1) {
    MailApp.sendEmail({
      to: d.email,
      subject: '¡Enhorabuena! Has completado el ' + AJUSTES.NOMBRE_EVENTO,
      htmlBody: '<h2>¡Enhorabuena, ' + limpiar(d.nombre.split(' ')[0]) + '!</h2>' +
        '<p>Has completado el <b>' + limpiar(AJUSTES.NOMBRE_EVENTO) + '</b>. Te esperamos en la meta para entregarte tu diploma.</p>' +
        '<p>Motorclub Sierra Las Villas · Gasolina, compañerismo y pasión por las motos 🏍️</p>',
      name: 'Motorclub Sierra Las Villas'
    });
  }
  return true;
}

function limpiar(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

// ------------------ Utilidades para el club ------------------

/** Ejecuta esta función UNA VEZ desde el editor para dar permisos y crear las hojas. */
function probarServidor() {
  hoja('Participantes', COLS_PART);
  hoja('Sellos', COLS_SELLO);
  carpeta(null, AJUSTES.CARPETA_FOTOS);
  Logger.log('Hojas y carpeta listas. Correos que puedes enviar hoy: ' + MailApp.getRemainingDailyQuota());
}

/** Si un día se acaba la cuota de correo, ejecuta esto al día siguiente. */
function enviarAvisosPendientes() {
  var h = hoja('Participantes', COLS_PART);
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][8]).indexOf('PENDIENTE') === 0) {
      var d = { dorsal: String(datos[i][0]), nombre: datos[i][1], telefono: datos[i][2], email: datos[i][3], hora: datos[i][7] };
      if (avisarCompletado(d, carpetaParticipante(d))) h.getRange(i + 1, 9).setValue('Sí');
      else { Logger.log('Sin cuota de correo, prueba mañana'); return; }
    }
  }
}
