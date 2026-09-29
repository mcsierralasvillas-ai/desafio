/* =========================================================================
   SERVIDOR DE LA APP DEL MOTORCLUB SIERRA LAS VILLAS (Google Apps Script)
   Inscripciones del Raid + sellos del Desafío de las Presas
   -------------------------------------------------------------------------
   Qué hace:
     - Recibe las solicitudes de inscripción al Raid (hoja "Solicitudes"),
       crea el pago en Stripe (tarjeta, Apple Pay, Google Pay, Bizum) y,
       SOLO cuando el pago se completa, da un número y la pasa a la hoja
       "Inscritos" (que es la lista válida y se puede bajar a Excel).
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
  CORREO_CLUB: 'mcsierralasvillas@gmail.com',
  NOMBRE_EVENTO: 'Desafío de las Presas 2027',
  CARPETA_FOTOS: 'Desafío de las Presas 2027 - Fotos',
  // Adjuntar las fotos al correo del club (si no, solo van los enlaces)
  ADJUNTAR_FOTOS: true,
  // Enviar también un correo de enhorabuena al participante (si dejó email).
  // Ojo: una cuenta Gmail normal puede enviar unos 100 correos al día.
  CORREO_AL_PARTICIPANTE: false,
  // Avisar al club por correo de cada inscripción PAGADA
  AVISAR_INSCRIPCIONES: true,
  // Enviar al inscrito un correo de confirmación con su número
  CONFIRMAR_AL_INSCRITO: true,
  // Dirección de la app (para volver después de pagar)
  URL_APP: 'https://mcsierralasvillas-ai.github.io/desafio/'
};

// PRECIOS (en euros). Deben coincidir con js/config.js de la app.
var PRECIOS = { PILOTO: 25, ACOMPANANTE: 20, CENA: 20 };

// La clave secreta de Stripe NO se escribe aquí: se guarda en
// Configuración del proyecto → Propiedades del script → STRIPE_SECRET
// (sk_test_... para pruebas, sk_live_... para cobrar de verdad).
// ----------------------------------------------------

var COLS_PART = ['Dorsal', 'Nombre', 'Teléfono', 'Email', 'Alta', 'Sellos', 'Completado', 'Hora completado', 'Aviso enviado', 'Carpeta de fotos'];
// Columnas de "Solicitudes" (todas, pagadas o no)
var COLS_SOL = ['Id solicitud', 'Fecha', 'Estado', 'Nombre', 'Apellidos', 'DNI', 'Teléfono', 'Email', 'Localidad', 'Moto', 'Talla',
  'Acompañante', 'Nombre acompañante', 'DNI acompañante', 'Talla acompañante', 'Cena piloto', 'Cena acompañante', 'Importe (€)',
  'Método de pago', 'Id sesión Stripe', 'Nº inscripción', 'Condiciones aceptadas', 'Id app'];
var S = {}; COLS_SOL.forEach(function (c, i) { S[c] = i; });
// Columnas de "Inscritos" (solo pagados = inscripciones válidas)
var COLS_INSC = ['Nº', 'Fecha de pago', 'Nombre', 'Apellidos', 'DNI', 'Teléfono', 'Email', 'Localidad', 'Moto', 'Talla',
  'Acompañante', 'Nombre acompañante', 'DNI acompañante', 'Talla acompañante', 'Cena piloto', 'Cena acompañante', 'Personas en la cena',
  'Importe pagado (€)', 'Método de pago', 'Id solicitud'];
var COLS_SELLO = ['Recibido', 'Dorsal', 'Nombre', 'Orden', 'Punto', 'Hora de la foto', 'Distancia al punto (m)', 'Precisión GPS (m)', 'Sin GPS', 'Simulado (prueba)', 'Foto', 'Ubicación', 'Id punto'];

function doGet() {
  return responder({ ok: true, mensaje: 'Servidor del ' + AJUSTES.NOMBRE_EVENTO + ' funcionando' });
}

function doPost(e) {
  var cerrojo = LockService.getScriptLock();
  cerrojo.waitLock(30000); // evita que dos envíos a la vez se pisen
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.accion === 'inscripcion') return responder(solicitar(d));
    if (d.accion === 'estadoPago') return responder(estadoPago(d));
    if (d.accion === 'acceso') return responder(acceso(d));
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

// ------------------ Inscripciones y pagos ------------------
function normalizarDni(t) { return String(t || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
function dniValido(t) {
  var d = normalizarDni(t);
  if (!/^[XYZ]?\d{7,8}[A-Z]$/.test(d)) return false;
  var num = d.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2').slice(0, -1);
  return 'TRWAGMYFPDXBNJZSQVHLCKE'.charAt(parseInt(num, 10) % 23) === d.slice(-1);
}
function hojaSol() { return hoja('Solicitudes', COLS_SOL); }
function hojaInsc() { return hoja('Inscritos', COLS_INSC); }
function si(v) { return v === true || v === 'SÍ'; }

/** Importe calculado en el servidor (no nos fiamos del móvil) */
function lineas(d) {
  var l = [['Inscripción piloto', PRECIOS.PILOTO]];
  if (d.conAcompanante) l.push(['Inscripción acompañante', PRECIOS.ACOMPANANTE]);
  var n = (d.cenaPiloto ? 1 : 0) + (d.conAcompanante && d.cenaAcomp ? 1 : 0);
  if (n) l.push(['Gran cena de recepción (' + n + ' pers.)', n * PRECIOS.CENA]);
  return l;
}

/** Busca un DNI (del piloto o del acompañante) entre los INSCRITOS (pagados) */
function buscarInscrito(dni) {
  var datos = hojaInsc().getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (normalizarDni(datos[i][4]) === dni || normalizarDni(datos[i][12]) === dni) return { fila: i + 1, v: datos[i] };
  }
  return null;
}
function buscarSolicitud(id) {
  var h = hojaSol(), datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (String(datos[i][S['Id solicitud']]) === String(id)) return { hoja: h, fila: i + 1, v: datos[i] };
  return null;
}

/** Nueva solicitud (o reintento de pago de una existente) */
function solicitar(d) {
  var dni = normalizarDni(d.dni), dniA = normalizarDni(d.acompDni);
  if (!d.nombre || !d.apellidos || !d.telefono || !d.email) return { ok: false, error: 'Faltan datos del piloto' };
  if (!dniValido(dni)) return { ok: false, error: 'El DNI del piloto no es válido' };
  if (d.conAcompanante && !dniValido(dniA)) return { ok: false, error: 'El DNI del acompañante no es válido' };
  if (!d.aceptaCondiciones) return { ok: false, error: 'Hay que aceptar las condiciones' };
  var ya = buscarInscrito(dni) || (d.conAcompanante ? buscarInscrito(dniA) : null);
  if (ya) return { ok: false, error: 'Ese DNI ya está inscrito (Nº ' + ya.v[0] + '). Contacta con el club si hay un error.' };

  var total = lineas(d).reduce(function (t, x) { return t + x[1]; }, 0);
  var sol = null;
  // Reintento desde el mismo móvil: reutilizamos la solicitud
  var datos = hojaSol().getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (String(datos[i][S['Id app']]) === String(d.idLocal)) sol = { fila: i + 1, v: datos[i] };
  var h = hojaSol(), id;
  if (sol) {
    id = sol.v[S['Id solicitud']];
    if (sol.v[S['Estado']] === 'PAGADA') return { ok: true, idSolicitud: id, estado: 'pagada', numero: sol.v[S['Nº inscripción']], total: total };
  } else {
    id = 'S' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    h.appendRow([id, new Date(), 'PENDIENTE DE PAGO', d.nombre, d.apellidos, dni, d.telefono, d.email, d.localidad || '', d.moto || '', d.talla || '',
      d.conAcompanante ? 'SÍ' : 'NO', d.acompNombre || '', dniA, d.acompTalla || '', d.cenaPiloto ? 'SÍ' : 'NO', (d.conAcompanante && d.cenaAcomp) ? 'SÍ' : 'NO',
      total, '', '', '', d.aceptaCondiciones, d.idLocal || '']);
    sol = buscarSolicitud(id);
  }
  var url = null;
  if (claveStripe()) {
    var sesion = crearSesionStripe(id, d, (d.urlApp || AJUSTES.URL_APP));
    url = sesion.url;
    h.getRange(sol.fila, S['Id sesión Stripe'] + 1).setValue(sesion.id);
  }
  return { ok: true, idSolicitud: id, estado: 'pendiente', urlPago: url, total: total };
}

/** La app pregunta si ya se ha pagado */
function estadoPago(d) {
  var sol = buscarSolicitud(d.idSolicitud);
  if (!sol) return { ok: false, error: 'Solicitud no encontrada' };
  if (sol.v[S['Estado']] === 'PAGADA') return { ok: true, estado: 'pagada', numero: sol.v[S['Nº inscripción']] };
  var sid = sol.v[S['Id sesión Stripe']];
  if (sid && claveStripe()) {
    var ses = stripe('get', 'checkout/sessions/' + sid + '?expand[]=payment_intent.payment_method');
    if (ses.payment_status === 'paid') {
      var metodo = 'Stripe';
      try { metodo = ses.payment_intent.payment_method.type; if (ses.payment_intent.payment_method.card && ses.payment_intent.payment_method.card.wallet) metodo = ses.payment_intent.payment_method.card.wallet.type; } catch (e) {}
      var n = confirmarPago(sol, metodo);
      return { ok: true, estado: 'pagada', numero: n };
    }
  }
  return { ok: true, estado: 'pendiente' };
}

/** Pasa una solicitud a INSCRITOS con su número. Devuelve el número. */
function confirmarPago(sol, metodo) {
  var v = sol.v, h = sol.hoja || hojaSol();
  if (v[S['Estado']] === 'PAGADA' && v[S['Nº inscripción']]) return v[S['Nº inscripción']];
  var hi = hojaInsc();
  var numero = hi.getLastRow(); // fila 1 = cabecera → el primero es el Nº 1
  var personasCena = (si(v[S['Cena piloto']]) ? 1 : 0) + (si(v[S['Cena acompañante']]) ? 1 : 0);
  hi.appendRow([numero, new Date(), v[S['Nombre']], v[S['Apellidos']], v[S['DNI']], v[S['Teléfono']], v[S['Email']], v[S['Localidad']], v[S['Moto']], v[S['Talla']],
    v[S['Acompañante']], v[S['Nombre acompañante']], v[S['DNI acompañante']], v[S['Talla acompañante']], v[S['Cena piloto']], v[S['Cena acompañante']], personasCena,
    v[S['Importe (€)']], metodo, v[S['Id solicitud']]]);
  h.getRange(sol.fila, S['Estado'] + 1).setValue('PAGADA');
  h.getRange(sol.fila, S['Método de pago'] + 1).setValue(metodo);
  h.getRange(sol.fila, S['Nº inscripción'] + 1).setValue(numero);
  h.getRange(sol.fila, 1, 1, COLS_SOL.length).setBackground('#d9f7e6');
  avisarInscripcion(v, numero, personasCena, metodo);
  return numero;
}

function avisarInscripcion(v, numero, personasCena, metodo) {
  var quien = v[S['Nombre']] + ' ' + v[S['Apellidos']];
  if (AJUSTES.AVISAR_INSCRIPCIONES && MailApp.getRemainingDailyQuota() > 5) {
    MailApp.sendEmail({
      to: AJUSTES.CORREO_CLUB,
      subject: '✅ Inscripción pagada Nº ' + numero + ': ' + quien,
      htmlBody: '<p><b>' + limpiar(quien) + '</b> · DNI ' + limpiar(v[S['DNI']]) + ' · ' + limpiar(v[S['Teléfono']]) + ' · ' + limpiar(v[S['Email']]) + '</p>' +
        '<p>Moto: ' + limpiar(v[S['Moto']]) + ' · Talla ' + limpiar(v[S['Talla']]) +
        (si(v[S['Acompañante']]) ? '<br>Acompañante: ' + limpiar(v[S['Nombre acompañante']]) + ' · DNI ' + limpiar(v[S['DNI acompañante']]) + ' · Talla ' + limpiar(v[S['Talla acompañante']]) : '') +
        '<br>Cena de recepción: ' + personasCena + ' persona(s)</p><p>Pagado: <b>' + limpiar(v[S['Importe (€)']]) + ' €</b> (' + limpiar(metodo) + ')</p>',
      name: 'App Motorclub Sierra Las Villas'
    });
  }
  if (AJUSTES.CONFIRMAR_AL_INSCRITO && v[S['Email']] && MailApp.getRemainingDailyQuota() > 5) {
    MailApp.sendEmail({
      to: v[S['Email']],
      subject: 'Inscripción confirmada Nº ' + numero + ' · Motor Raid Sierra Las Villas',
      htmlBody: '<h2 style="color:#e3060b">¡Inscripción confirmada!</h2><p>Hola ' + limpiar(v[S['Nombre']]) + ', tu inscripción en el <b>Motor Raid Sierra Las Villas</b> está pagada.</p>' +
        '<p style="font-size:22px">Nº de inscripción: <b>' + numero + '</b></p>' +
        (personasCena ? '<p>Cena de recepción: ' + personasCena + ' persona(s). Te avisaremos del lugar.</p>' : '') +
        '<p>El día del evento entra en la app, apartado <b>Raid 2027 → Ruta</b>, con tu DNI.</p><p>Motorclub Sierra Las Villas · Gasolina, compañerismo y pasión por las motos</p>',
      name: 'Motorclub Sierra Las Villas'
    });
  }
}

/** La app pregunta si un DNI puede entrar en la ruta: solo INSCRITOS (pagados).
    Vale el DNI del piloto o el del acompañante. Para inscribir a alguien a mano
    (p. ej. en la KDD), basta con añadir una fila en "Inscritos" con Nº y DNI. */
function acceso(d) {
  var dni = normalizarDni(d.dni);
  if (!dni) return { ok: false, error: 'Falta el DNI' };
  var r = buscarInscrito(dni);
  if (!r) return { ok: true, encontrado: false };
  var esAcomp = normalizarDni(r.v[12]) === dni;
  return { ok: true, encontrado: true, numero: r.v[0], nombre: esAcomp ? String(r.v[11]) : (r.v[2] + ' ' + r.v[3]).trim(), telefono: String(r.v[5] || '') };
}

// ------------------ Stripe ------------------
function claveStripe() { return PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET'); }
function stripe(metodo, ruta, datos) {
  var r = UrlFetchApp.fetch('https://api.stripe.com/v1/' + ruta, {
    method: metodo, payload: datos, muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + claveStripe() }
  });
  var j = JSON.parse(r.getContentText());
  if (j.error) throw new Error('Stripe: ' + j.error.message);
  return j;
}
function crearSesionStripe(id, d, urlApp) {
  var p = {
    mode: 'payment', locale: 'es', client_reference_id: id, customer_email: d.email,
    success_url: urlApp + '?pago=ok#inscripcion',
    cancel_url: urlApp + '?pago=cancelado#inscripcion',
    'metadata[solicitud]': id, 'metadata[dni]': normalizarDni(d.dni),
    'payment_intent_data[description]': 'Motor Raid Sierra Las Villas · ' + d.nombre + ' ' + d.apellidos
  };
  lineas(d).forEach(function (x, i) {
    p['line_items[' + i + '][quantity]'] = 1;
    p['line_items[' + i + '][price_data][currency]'] = 'eur';
    p['line_items[' + i + '][price_data][unit_amount]'] = Math.round(x[1] * 100);
    p['line_items[' + i + '][price_data][product_data][name]'] = x[0];
  });
  // Los métodos (tarjeta, Apple Pay, Google Pay, Bizum) se activan en el panel de Stripe.
  return stripe('post', 'checkout/sessions', p);
}

/** Revisa los pagos pendientes (por si alguien paga y cierra la app sin volver).
    Se ejecuta sola cada 10 minutos tras ejecutar una vez activarRevisionAutomatica(). */
function revisarPagosPendientes() {
  if (!claveStripe()) return;
  var h = hojaSol(), datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][S['Estado']] === 'PENDIENTE DE PAGO' && datos[i][S['Id sesión Stripe']]) {
      try { estadoPago({ idSolicitud: datos[i][S['Id solicitud']] }); } catch (e) { console.warn(e); }
    }
  }
}
function activarRevisionAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'revisarPagosPendientes') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarPagosPendientes').timeBased().everyMinutes(10).create();
  Logger.log('Revisión automática de pagos activada (cada 10 minutos).');
}

// ------------------ Menú en la hoja de cálculo ------------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏍️ Motorclub')
    .addItem('Revisar pagos con tarjeta/Bizum ahora', 'revisarPagosPendientes')
    .addItem('Confirmar pagos manuales (Estado = PAGADA)', 'confirmarPagosManuales')
    .addSeparator()
    .addItem('Enviarme el Excel de inscritos por correo', 'enviarExcelInscritos')
    .addToUi();
}
/** Para pagos por Bizum/transferencia fuera de la app: cambia el Estado de la
    solicitud a PAGADA (en mayúsculas) y ejecuta esto desde el menú. */
function confirmarPagosManuales() {
  var h = hojaSol(), datos = h.getDataRange().getValues(), n = 0;
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][S['Estado']]).trim().toUpperCase() === 'PAGADA' && !datos[i][S['Nº inscripción']]) {
      datos[i][S['Estado']] = 'PENDIENTE';
      confirmarPago({ hoja: h, fila: i + 1, v: datos[i] }, datos[i][S['Método de pago']] || 'Manual'); n++;
    }
  }
  SpreadsheetApp.getUi().alert(n + ' inscripción(es) confirmada(s).');
}
/** Envía al correo del club la hoja "Inscritos" como archivo Excel (.xlsx) */
function enviarExcelInscritos() {
  var libro = SpreadsheetApp.getActiveSpreadsheet(), hi = hojaInsc();
  var url = 'https://docs.google.com/spreadsheets/d/' + libro.getId() + '/export?format=xlsx&gid=' + hi.getSheetId();
  var blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob()
    .setName('Inscritos Motor Raid ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd') + '.xlsx');
  MailApp.sendEmail({ to: AJUSTES.CORREO_CLUB, subject: 'Excel de inscritos (pagados) · Motor Raid', body: 'Adjunto la lista de inscripciones pagadas: ' + (hi.getLastRow() - 1) + ' inscripciones.', attachments: [blob] });
  try { SpreadsheetApp.getUi().alert('Excel enviado a ' + AJUSTES.CORREO_CLUB); } catch (e) {}
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
  hoja('Solicitudes', COLS_SOL);
  hoja('Inscritos', COLS_INSC);
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
